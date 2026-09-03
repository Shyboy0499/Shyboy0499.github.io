// 海岛世界的大漩涡：负责主题同步、环境表现和船体捕获演出。
// 它只报告进入完成，不直接预加载或提交跨 World Journey。
import * as THREE from "three";
import { glowTexture } from "../core/sprites";
import { SHIP_SCALE } from "../core/config";
import { damp, smoothstep, wrapAngle } from "../core/ease";
import type { ThemeVals } from "../env/themes";

interface MistSprite {
  sprite: THREE.Sprite;
  baseScale: number;
  phase: number;
}

export interface MaelstromShip {
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  group: THREE.Group;
}

export interface MaelstromApproach {
  speedCap: number;
  captureActive: boolean;
  startedCapture: boolean;
  entered: boolean;
  pullK: number;
}

interface MaelstromCapture {
  startedAt: number;
  startSpeed: number;
  startPosition: THREE.Vector3;
  startHeading: number;
  pullRadius: number | null;
  angle: number;
  pullK: number;
}

function spiralCurve(
  startAngle: number,
  startRadius: number,
  turns: number,
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    const angle =
      startAngle +
      t * Math.PI * 2 * turns +
      Math.sin(t * Math.PI * 5 + startAngle * 1.7) * 0.055;
    const radius =
      THREE.MathUtils.lerp(startRadius, 0.48, t) +
      Math.sin(t * Math.PI * 7 + startAngle * 2.3) *
        THREE.MathUtils.lerp(0.16, 0.035, t);
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        0.18 -
          Math.pow(t, 1.45) * 2.92 +
          Math.sin(t * Math.PI * 9 + startAngle) * 0.035,
        Math.sin(angle) * radius,
      ),
    );
  }
  return new THREE.CatmullRomCurve3(points);
}

function createRidgeGeometry(
  width: number,
  height: number,
  depth: number,
  variant: number,
): THREE.BufferGeometry {
  const x = [-width, -width * 0.48, width * 0.06, width * 0.58, width];
  const top = [
    height * (0.24 + (variant % 2) * 0.05),
    height * (0.66 + (variant % 3) * 0.08),
    height,
    height * (0.54 + (variant % 2) * 0.12),
    height * (0.3 + (variant % 3) * 0.04),
  ];
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < x.length; i++) {
    positions.push(
      x[i],
      0,
      depth,
      x[i],
      top[i],
      depth,
      x[i],
      0,
      -depth,
      x[i],
      top[i] * (0.9 + (i % 2) * 0.08),
      -depth,
    );
  }
  for (let i = 0; i < x.length - 1; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
    indices.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3);
    indices.push(a + 1, b + 1, a + 3, b + 1, b + 3, a + 3);
  }
  indices.push(0, 1, 2, 2, 1, 3);
  const end = (x.length - 1) * 4;
  indices.push(end, end + 2, end + 1, end + 2, end + 3, end + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class ArchipelagoMaelstrom {
  readonly group = new THREE.Group();
  private readonly compact: boolean;
  private readonly waterMaterial: THREE.ShaderMaterial;
  private readonly foamSpirals: THREE.Mesh[] = [];
  private readonly foamMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly energyTendrils: THREE.Mesh[] = [];
  private readonly energyMaterials: THREE.MeshBasicMaterial[];
  private readonly energyGlow: THREE.Sprite;
  private readonly mist: MistSprite[] = [];
  private readonly shards = new THREE.Group();
  private readonly sparks: THREE.Points;
  private readonly coreLight: THREE.PointLight;
  private capture: MaelstromCapture | null = null;
  private readonly foamColor = new THREE.Color();
  private readonly white = new THREE.Color(1, 1, 1);
  private readonly arcaneFoam = new THREE.Color("#7b9eff");

  get isCapturing(): boolean {
    return this.capture !== null;
  }

  constructor(composition: "standard" | "compact" = "standard") {
    const compact = composition === "compact";
    this.compact = compact;
    const rock = new THREE.MeshLambertMaterial({
      color: compact ? "#303b60" : "#263c40",
      emissive: compact ? "#11162f" : "#000000",
      emissiveIntensity: compact ? 0.3 : 0,
      flatShading: true,
    });
    const rockEdge = new THREE.MeshLambertMaterial({
      color: compact ? "#50648c" : "#38545a",
      emissive: compact ? "#17213f" : "#000000",
      emissiveIntensity: compact ? 0.26 : 0,
      flatShading: true,
    });
    const lava = new THREE.MeshBasicMaterial({
      color: "#ff5638",
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const foam = new THREE.MeshBasicMaterial({
      color: "#d8f9f4",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const abyss = new THREE.Mesh(
      new THREE.CircleGeometry(0.76, 56),
      new THREE.MeshBasicMaterial({
        color: "#061116",
        transparent: true,
        opacity: 0.96,
      }),
    );
    abyss.rotation.x = -Math.PI / 2;
    abyss.position.y = -4.34;
    this.group.add(abyss);

    const throatWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 0.48, 1.72, 32, 6, true),
      new THREE.MeshLambertMaterial({
        color: "#0c1b21",
        side: THREE.BackSide,
        flatShading: true,
      }),
    );
    throatWall.position.y = -3.48;
    this.group.add(throatWall);

    for (let i = 0; i < 3; i++) {
      const throatRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.52 + i * 0.29, 0.035 + i * 0.012, 5, 42),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? "#061015" : "#17333b",
          transparent: true,
          opacity: 0.76 - i * 0.12,
        }),
      );
      throatRing.rotation.x = Math.PI / 2;
      throatRing.position.y = -4.22 + i * 0.48;
      this.group.add(throatRing);
    }

    this.waterMaterial = new THREE.ShaderMaterial({
      // 水体已经跟随昼夜海色色板；关闭二次雾混色，避免远景把深渊重新洗成平面亮色。
      fog: false,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uSeaA: { value: new THREE.Color("#2f8ba0") },
          uSeaB: { value: new THREE.Color("#57c3cf") },
          uNightK: { value: 0 },
          uArcaneK: { value: compact ? 1 : 0 },
        },
      ]),
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        uniform float uTime;
        varying vec2 vUv;
        varying float vFunnel;
        void main() {
          vUv = uv;
          vec3 p = position;
          float sourceRadius = length(position.xy) / 7.2;
          float angle = atan(position.y, position.x);
          float outerK = smoothstep(.38, 1.0, sourceRadius);
          float boundaryWave = sin(angle * 3.0 + uTime * .08) * .035
            + sin(angle * 7.0 - uTime * .055 + 1.2) * .021
            + sin(angle * 13.0 + .4) * .009;
          p.xy *= 1.0 + boundaryWave * outerK;
          float radius = length(p.xy) / 7.2;
          float funnel = 1.0 - smoothstep(.08, .96, radius);
          p.z -= pow(funnel, 1.42) * 3.12;
          p.z += sin(radius * 48.0) * .06 * (1.0 - funnel);
          vFunnel = funnel;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform float uTime;
        uniform vec3 uSeaA;
        uniform vec3 uSeaB;
        uniform float uNightK;
        uniform float uArcaneK;
        varying vec2 vUv;
        varying float vFunnel;
        void main() {
          vec2 p = vUv - .5;
          float r = length(p) * 2.0;
          float a = atan(p.y, p.x);
          float edgeWarp = sin(a * 3.0 + uTime * .08) * .035
            + sin(a * 7.0 - uTime * .055 + 1.2) * .021
            + sin(a * 13.0 + .4) * .009;
          float warpedR = r - edgeWarp * smoothstep(.35, 1.0, r);
          float spiralA = sin(a * 4.0 - warpedR * 29.0 + uTime * 2.2 + sin(a * 3.0) * .75);
          float spiralB = sin(a * 2.35 - warpedR * 17.0 + uTime * 1.35 + sin(a * 5.0) * .72);
          float tear = sin(a * 11.0 + warpedR * 14.0 - uTime * .7) * .5 + .5;
          float ridge = smoothstep(.5, .91, spiralA * .5 + .5) * mix(.16, 1.0, smoothstep(.3, .7, tear));
          float broken = smoothstep(.64, .94, spiralB * .5 + .5) * mix(.22, 1.0, smoothstep(.38, .74, 1.0 - tear));
          float core = smoothstep(.5, .07, r);
          float heat = smoothstep(.2, .035, r) * (.76 + sin(uTime * 5.0) * .12);
          vec3 outerSea = mix(uSeaA, uSeaB, .44);
          vec3 stormSea = mix(uSeaA * .32, uSeaB * .16, .28);
          float arcaneNightK = uArcaneK * uNightK;
          outerSea = mix(outerSea, vec3(.10, .13, .3), arcaneNightK * .48);
          stormSea = mix(stormSea, vec3(.018, .026, .11), arcaneNightK * .62);
          vec3 neutralFoamTint = mix(uSeaB, vec3(1.0), mix(.58, .42, uNightK));
          vec3 arcaneFoamTint = mix(uSeaB, vec3(.48, .62, 1.0), .68);
          vec3 foamTint = mix(neutralFoamTint, arcaneFoamTint, arcaneNightK);
          vec3 color = mix(outerSea, stormSea, min(1.0, vFunnel * .96 + core * .72));
          color *= 1.0 - pow(vFunnel, 1.3) * .36;
          float abyssShade = smoothstep(.46, .12, r);
          color = mix(color, vec3(.006, .018, .024), abyssShade * .82);
          float depthBand = smoothstep(.72, .98, sin(vFunnel * 31.0 - uTime * .35) * .5 + .5);
          color *= 1.0 - depthBand * vFunnel * .1;
          float foamStrength = mix(1.0, .66, uNightK);
          color = mix(color, foamTint, (ridge * .16 * (1.0 - core) + broken * .065) * foamStrength);
          color += vec3(1.0, .13, .035) * heat * mix(1.35, .78, uNightK);
          float edge = 1.0 - smoothstep(.86 + edgeWarp, 1.025 + edgeWarp, r);
          gl_FragColor = vec4(color, edge * .96);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    // RingGeometry 的径向分段让顶点真正形成深漏斗；中心小孔交给独立咽喉封底。
    const water = new THREE.Mesh(
      new THREE.RingGeometry(1.16, 7.2, 112, 24),
      this.waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.28;
    this.group.add(water);

    // 不等角度、不同长度的实体浪带填补 Shader 层次，但不再拼成连续同心圆。
    const foamSpecs = [
      { angle: 0.08, radius: 6.72, turns: 0.46, width: 0.064 },
      { angle: 0.74, radius: 6.15, turns: 0.32, width: 0.052 },
      { angle: 1.83, radius: 6.54, turns: 0.52, width: 0.07 },
      { angle: 2.46, radius: 5.86, turns: 0.37, width: 0.048 },
      { angle: 3.72, radius: 6.68, turns: 0.43, width: 0.061 },
      { angle: 5.18, radius: 6.06, turns: 0.56, width: 0.054 },
    ];
    foamSpecs.forEach((spec, i) => {
      const curve = spiralCurve(spec.angle, spec.radius, spec.turns);
      const ribbon = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 36, spec.width, 5, false),
        foam.clone(),
      );
      const ribbonMaterial = ribbon.material as THREE.MeshBasicMaterial;
      ribbonMaterial.opacity = 0.42 + (i % 3) * 0.12;
      this.foamMaterials.push(ribbonMaterial);
      this.foamSpirals.push(ribbon);
      this.group.add(ribbon);
    });

    // 岩群按不等距角度布置，并让宽断崖与侧峰共用一个基座，打破整齐的环形栅栏感。
    const cragSpecs = [
      {
        angle: 0.06,
        radius: 7.45,
        height: 6.4,
        width: 1.45,
        depth: 0.72,
        lean: -0.1,
        faces: 5,
        sides: 2,
        seam: true,
      },
      {
        angle: 0.48,
        radius: 8.05,
        height: 3.15,
        width: 0.72,
        depth: 0.48,
        lean: 0.08,
        faces: 4,
        sides: 1,
        seam: false,
      },
      {
        angle: 1.38,
        radius: 7.2,
        height: 5.25,
        width: 1.78,
        depth: 0.62,
        lean: -0.05,
        faces: 5,
        sides: 3,
        seam: true,
      },
      {
        angle: 2.12,
        radius: 7.78,
        height: 3.5,
        width: 0.88,
        depth: 0.5,
        lean: 0.12,
        faces: 4,
        sides: 1,
        seam: false,
      },
      {
        angle: 2.38,
        radius: 7.18,
        height: 6.9,
        width: 1.25,
        depth: 0.7,
        lean: -0.13,
        faces: 5,
        sides: 2,
        seam: true,
      },
      {
        angle: 3.34,
        radius: 7.55,
        height: 4.4,
        width: 1.9,
        depth: 0.64,
        lean: 0.05,
        faces: 5,
        sides: 3,
        seam: true,
      },
      {
        angle: 4.28,
        radius: 8.12,
        height: 3.05,
        width: 0.68,
        depth: 0.46,
        lean: -0.11,
        faces: 4,
        sides: 1,
        seam: false,
      },
      {
        angle: 4.58,
        radius: 7.26,
        height: 5.8,
        width: 1.15,
        depth: 0.58,
        lean: 0.14,
        faces: 5,
        sides: 2,
        seam: true,
      },
      {
        angle: 5.57,
        radius: 7.42,
        height: 7.3,
        width: 1.62,
        depth: 0.76,
        lean: -0.08,
        faces: 5,
        sides: 3,
        seam: true,
      },
    ];
    cragSpecs.forEach((spec, i) => {
      const { angle, radius } = spec;
      const height = spec.height * (compact ? 0.58 : 1);
      const crag = new THREE.Group();
      const useRidge = spec.width > 1.3 || spec.sides >= 3;
      const body = new THREE.Mesh(
        useRidge
          ? createRidgeGeometry(spec.width, height, spec.depth, i)
          : new THREE.ConeGeometry(1, height, spec.faces),
        i % 3 ? rock : rockEdge,
      );
      if (!useRidge) body.scale.set(spec.width, 1, spec.depth);
      body.position.y = useRidge ? -0.08 : height * 0.5 - 0.08;
      body.rotation.y = i * 0.37;
      body.rotation.z = spec.lean;
      crag.add(body);

      for (let side = 0; side < spec.sides; side++) {
        const sideHeight = height * (0.38 + (side % 3) * 0.13);
        const sidePeak = new THREE.Mesh(
          new THREE.ConeGeometry(1, sideHeight, 4 + (side % 2)),
          side % 2 ? rockEdge : rock,
        );
        sidePeak.scale.set(
          spec.width * (0.42 + (side % 2) * 0.14),
          1,
          spec.depth * (0.72 + (side % 3) * 0.1),
        );
        sidePeak.position.set(
          (side % 2 ? 1 : -1) * spec.width * (0.68 + side * 0.16),
          sideHeight * 0.5 - 0.15,
          -0.08 + side * 0.13,
        );
        sidePeak.rotation.z = (side % 2 ? -0.13 : 0.15) + spec.lean * 0.5;
        sidePeak.rotation.y = side * 0.63;
        crag.add(sidePeak);
      }

      const baseRock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1, 0),
        i % 2 ? rock : rockEdge,
      );
      baseRock.scale.set(
        spec.width * 1.35,
        0.48 + (i % 3) * 0.12,
        spec.depth * 1.7,
      );
      baseRock.position.y = 0.16;
      baseRock.rotation.y = i * 0.51;
      crag.add(baseRock);
      if (spec.seam) {
        const seam = new THREE.Mesh(
          new THREE.BoxGeometry(0.065, height * 0.48, 0.045),
          lava,
        );
        seam.position.set(
          spec.width * (i % 2 ? 0.12 : -0.16),
          height * 0.4,
          spec.depth * 0.78,
        );
        seam.rotation.z = spec.lean * 1.6 + ((i % 3) - 1) * 0.08;
        crag.add(seam);
      }
      crag.position.set(
        Math.cos(angle) * radius,
        -0.1,
        Math.sin(angle) * radius,
      );
      crag.rotation.y = -angle - Math.PI / 2;
      this.group.add(crag);
    });

    this.energyMaterials = [
      new THREE.MeshBasicMaterial({
        color: "#ff4d32",
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#ff8a43",
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#ffb061",
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ];
    this.energyGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#ff4e2f"),
        color: "#ff5937",
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.energyGlow.position.set(0, compact ? -0.25 : 1.6, 0);
    this.energyGlow.scale.set(compact ? 1.65 : 1.5, compact ? 7.2 : 12.5, 1);
    this.group.add(this.energyGlow);
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.07, 6, 48),
      new THREE.MeshBasicMaterial({
        color: "#ff4b2c",
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    coreRing.rotation.x = -Math.PI / 2;
    coreRing.position.y = -4.14;
    this.group.add(coreRing);
    for (let i = 0; i < 3; i++) {
      const points: THREE.Vector3[] = [];
      for (let step = 0; step < 15; step++) {
        const t = step / 14;
        const angle = i * 2.1 + t * (3.1 + i * 0.45);
        const radius = 0.16 + Math.sin(t * Math.PI) * (0.28 + i * 0.13);
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            -4.04 + t * (compact ? 7.6 + i * 0.35 : 11.56 + i * 0.75),
            Math.sin(angle) * radius,
          ),
        );
      }
      const tendril = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          28,
          0.09 + i * 0.025,
          5,
          false,
        ),
        this.energyMaterials[i],
      );
      this.energyTendrils.push(tendril);
      this.group.add(tendril);
    }

    for (let i = 0; i < 9; i++) {
      const shard = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.12 + (i % 3) * 0.08, 0),
        i % 2 ? rockEdge : rock,
      );
      const angle = (i / 9) * Math.PI * 2;
      shard.position.set(
        Math.cos(angle) * (1.2 + (i % 3) * 0.35),
        compact ? 0.8 + (i % 4) * 0.45 : 2.1 + (i % 4) * 0.85,
        Math.sin(angle) * (1.2 + (i % 3) * 0.35),
      );
      shard.userData.baseY = shard.position.y;
      shard.userData.phase = i * 0.73;
      this.shards.add(shard);
    }
    this.group.add(this.shards);

    const mistTexture = glowTexture("#b7eeeb");
    for (let i = 0; i < 7; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: mistTexture,
          color: "#8fc9c8",
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const angle = (i / 7) * Math.PI * 2;
      const baseScale = 2.6 + (i % 3) * 0.7;
      sprite.position.set(
        Math.cos(angle) * 5.4,
        0.45 + (i % 2) * 0.25,
        Math.sin(angle) * 5.4,
      );
      sprite.scale.set(baseScale * 1.7, baseScale, 1);
      this.mist.push({ sprite, baseScale, phase: i * 1.17 });
      this.group.add(sprite);
    }

    const sparkPositions = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) {
      const angle = i * 2.399;
      const radius = 0.18 + (i % 9) * 0.075;
      sparkPositions[i * 3] = Math.cos(angle) * radius;
      sparkPositions[i * 3 + 1] = -3.82 + (i % 18) * (compact ? 0.36 : 0.58);
      sparkPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(sparkPositions, 3),
    );
    this.sparks = new THREE.Points(
      sparkGeometry,
      new THREE.PointsMaterial({
        map: glowTexture("#ff6b3d"),
        color: "#ff6840",
        size: 0.16,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.sparks);

    this.coreLight = new THREE.PointLight("#ff4b2c", 4.8, 26, 1.5);
    this.coreLight.position.set(0, -2.8, 0);
    this.group.add(this.coreLight);

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && !(mesh.material as THREE.Material).transparent) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(
    time: number,
    theme: ThemeVals,
    nightK: number,
    ship?: MaelstromShip,
  ): void {
    this.waterMaterial.uniforms.uTime.value = time;
    this.waterMaterial.uniforms.uSeaA.value.copy(theme.seaA);
    this.waterMaterial.uniforms.uSeaB.value.copy(theme.seaB);
    this.waterMaterial.uniforms.uNightK.value = nightK;
    const foamTarget =
      this.compact && nightK > 0 ? this.arcaneFoam : this.white;
    const foamMix = this.compact
      ? THREE.MathUtils.lerp(0.58, 0.68, nightK)
      : THREE.MathUtils.lerp(0.58, 0.42, nightK);
    this.foamColor.copy(theme.seaB).lerp(foamTarget, foamMix);
    const captureK = this.capture?.pullK ?? 0;
    const nightEnergy = THREE.MathUtils.lerp(1, 0.68, nightK);
    this.foamSpirals.forEach((spiral, index) => {
      spiral.rotation.y = time * (0.16 + index * 0.007 + captureK * 0.13);
      const material = this.foamMaterials[index];
      material.color.copy(this.foamColor);
      material.opacity =
        (0.13 + (index % 3) * 0.045 + Math.sin(time * 1.4 + index) * 0.03) *
        nightEnergy;
    });
    this.energyTendrils.forEach((tendril, index) => {
      tendril.rotation.y =
        time * (index % 2 ? -0.42 - captureK * 0.7 : 0.35 + captureK * 0.7) +
        index * 1.7;
      const material = this.energyMaterials[index];
      material.opacity =
        (0.38 + Math.sin(time * (3.2 + captureK * 5) + index) * 0.13) *
        nightEnergy;
    });
    const glowMaterial = this.energyGlow.material as THREE.SpriteMaterial;
    glowMaterial.opacity =
      (0.075 + Math.sin(time * (2.4 + captureK * 4)) * 0.028) * nightEnergy;
    this.shards.children.forEach((shard, index) => {
      shard.position.y =
        shard.userData.baseY +
        Math.sin(time * 1.1 + shard.userData.phase) * 0.18;
      shard.rotation.x = time * (0.2 + index * 0.015);
      shard.rotation.y = time * (0.28 + index * 0.012);
    });
    this.mist.forEach((mist) => {
      const pulse = 1 + Math.sin(time * 0.65 + mist.phase) * 0.12;
      mist.sprite.scale.set(
        mist.baseScale * 1.7 * pulse,
        mist.baseScale * pulse,
        1,
      );
      const material = mist.sprite.material as THREE.SpriteMaterial;
      material.color.copy(this.foamColor);
      material.opacity =
        (0.08 + Math.sin(time * 0.8 + mist.phase) * 0.035) * nightEnergy;
    });
    this.sparks.rotation.y = time * (0.34 + captureK * 0.9);
    (this.sparks.material as THREE.PointsMaterial).opacity =
      (0.62 + captureK * 0.24) * nightEnergy;
    this.coreLight.intensity =
      THREE.MathUtils.lerp(3.6, 2.4, nightK) * (1 + captureK * 0.28);

    if (this.capture && ship) {
      const scale = THREE.MathUtils.lerp(1, 0.06, Math.pow(captureK, 1.7));
      ship.group.scale.setScalar(SHIP_SCALE * scale);
      // 下沉集中在吸入后段，前半段优先保留船只绕圈收紧的可读性。
      ship.group.position.y -= captureK * captureK * captureK * 2.8;
      ship.group.rotation.z += Math.sin(time * 10) * captureK * 0.11;
    }
  }

  approach(
    ship: MaelstromShip,
    sim: number,
    dt: number,
    canCapture: boolean,
  ): MaelstromApproach {
    if (!this.capture) {
      const dx = ship.pos.x - this.group.position.x;
      const dz = ship.pos.z - this.group.position.z;
      const distance = Math.hypot(dx, dz);
      const visualRadius = 7.2 * Math.abs(this.group.scale.x);
      if (!canCapture || distance > visualRadius + 34) {
        return {
          speedCap: Infinity,
          captureActive: false,
          startedCapture: false,
          entered: false,
          pullK: 0,
        };
      }
      this.capture = {
        startedAt: sim,
        startSpeed: Math.max(Math.abs(ship.speed), 6),
        startPosition: ship.pos.clone(),
        startHeading: ship.heading,
        pullRadius: null,
        angle: Math.atan2(dz, dx),
        pullK: 0,
      };
      return this.advanceCapture(ship, sim, dt, true);
    }
    return this.advanceCapture(ship, sim, dt, false);
  }

  resetCapture(ship: MaelstromShip): void {
    if (!this.capture) return;
    ship.pos.copy(this.capture.startPosition);
    ship.heading = this.capture.startHeading;
    ship.speed = 0;
    ship.group.scale.setScalar(SHIP_SCALE);
    this.capture = null;
  }

  dispose(): void {
    this.capture = null;
  }

  private advanceCapture(
    ship: MaelstromShip,
    sim: number,
    dt: number,
    startedCapture: boolean,
  ): MaelstromApproach {
    const capture = this.capture!;
    const elapsed = sim - capture.startedAt;
    const center = this.group.position;

    // 捕获后的前两秒只收走动力，让镜头和玩家先感知到漩涡接管了小船。
    if (elapsed < 2) {
      const dx = center.x - ship.pos.x;
      const dz = center.z - ship.pos.z;
      const targetHeading = Math.atan2(dx, dz);
      const slowK = smoothstep(0, 2, elapsed);
      ship.heading +=
        wrapAngle(targetHeading - ship.heading) * damp(dt, 1 + slowK * 2);
      return {
        speedCap: Math.max(0.7, capture.startSpeed * Math.exp(-2.5 * elapsed)),
        captureActive: true,
        startedCapture,
        entered: false,
        pullK: 0,
      };
    }

    const dx = ship.pos.x - center.x;
    const dz = ship.pos.z - center.z;
    if (capture.pullRadius === null) {
      capture.pullRadius = Math.hypot(dx, dz);
      capture.angle = Math.atan2(dz, dx);
    }
    capture.pullK = smoothstep(0, 3.1, elapsed - 2);
    capture.angle += dt * THREE.MathUtils.lerp(0.65, 3.2, capture.pullK);
    const coreRadius = Math.max(1.8, Math.abs(this.group.scale.x) * 0.52);
    const radius = THREE.MathUtils.lerp(
      capture.pullRadius,
      coreRadius,
      capture.pullK * capture.pullK,
    );
    const nextX = center.x + Math.cos(capture.angle) * radius;
    const nextZ = center.z + Math.sin(capture.angle) * radius;
    const moveX = nextX - ship.pos.x;
    const moveZ = nextZ - ship.pos.z;
    if (Math.abs(moveX) + Math.abs(moveZ) > 1e-4) {
      const targetHeading = Math.atan2(moveX, moveZ);
      ship.heading +=
        wrapAngle(targetHeading - ship.heading) *
        damp(dt, 4 + capture.pullK * 8);
    }
    ship.speed = 0;
    ship.pos.set(nextX, 0, nextZ);

    return {
      speedCap: 0,
      captureActive: true,
      startedCapture,
      entered: capture.pullK >= 1,
      pullK: capture.pullK,
    };
  }
}
