// 卡律布狄斯独立环境资产：负责活体巨口、深咽喉和内置小船吞食循环。
// 展示船只属于模型演出；外部船只碰撞、吸附和导航仍由挂载它的 World 决定。
import * as THREE from "three";
import { glowTexture } from "../core/sprites";
import { DAY, type ThemeVals } from "../env/themes";
import { Ship } from "../ship/ship";

interface ToothPart {
  mesh: THREE.Mesh;
  baseScale: number;
  phase: number;
  angle: number;
  radius: number;
  baseY: number;
}

interface MouthLobe {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  baseY: number;
  phase: number;
}

interface GulletTendril {
  mesh: THREE.Mesh;
  phase: number;
}

interface DebrisPart {
  mesh: THREE.Mesh;
  radius: number;
  angle: number;
  height: number;
  speed: number;
}

function createSpiralCurve(
  startAngle: number,
  startRadius: number,
  endRadius: number,
  turns: number,
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 34; i++) {
    const t = i / 33;
    const angle =
      startAngle +
      t * Math.PI * 2 * turns +
      Math.sin(t * Math.PI * 4 + startAngle * 1.8) * 0.085;
    const radius =
      THREE.MathUtils.lerp(startRadius, endRadius, Math.pow(t, 1.15)) +
      Math.sin(t * Math.PI * 7 + startAngle * 2.1) *
        THREE.MathUtils.lerp(0.24, 0.07, t);
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        0.2 - t * t * 1.02 + Math.sin(t * Math.PI * 5 + startAngle) * 0.075,
        Math.sin(angle) * radius,
      ),
    );
  }
  return new THREE.CatmullRomCurve3(points);
}

function orientToDirection(
  object: THREE.Object3D,
  direction: THREE.Vector3,
): void {
  object.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
}

export class CharybdisWhirlpool {
  readonly group = new THREE.Group();
  private readonly waterMaterial: THREE.ShaderMaterial;
  private readonly foamGroup = new THREE.Group();
  private readonly throat = new THREE.Group();
  private readonly outerTeeth: ToothPart[] = [];
  private readonly innerTeeth: ToothPart[] = [];
  private readonly throatRings: THREE.Mesh[] = [];
  private readonly mouthLobes: MouthLobe[] = [];
  private readonly gulletTendrils: GulletTendril[] = [];
  private readonly debris: DebrisPart[] = [];
  private readonly spray: THREE.Points;
  private readonly mist: THREE.Sprite[] = [];
  private readonly preyShip: Ship;
  private readonly effectColor = new THREE.Color();
  private readonly white = new THREE.Color(1, 1, 1);

  constructor() {
    this.group.name = "CharybdisWhirlpool";
    const deepWater = new THREE.MeshLambertMaterial({
      color: "#102e3a",
      flatShading: true,
    });
    const gullet = new THREE.MeshLambertMaterial({
      color: "#18242b",
      flatShading: true,
    });
    const gulletEdge = new THREE.MeshLambertMaterial({
      color: "#274653",
      flatShading: true,
    });
    const tooth = new THREE.MeshLambertMaterial({
      color: "#b9d7d5",
      emissive: "#274047",
      emissiveIntensity: 0.18,
      flatShading: true,
    });
    const toothDark = new THREE.MeshLambertMaterial({
      color: "#78999b",
      emissive: "#172c32",
      emissiveIntensity: 0.12,
      flatShading: true,
    });
    const wetTissue = new THREE.MeshLambertMaterial({
      color: "#41666c",
      emissive: "#102c32",
      emissiveIntensity: 0.32,
      flatShading: true,
    });
    const foamMaterial = new THREE.MeshBasicMaterial({
      color: "#d9fbf8",
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const abyss = new THREE.Mesh(
      new THREE.CircleGeometry(0.92, 52),
      new THREE.MeshBasicMaterial({
        color: "#010305",
        transparent: true,
        opacity: 0.99,
        depthWrite: false,
      }),
    );
    abyss.rotation.x = -Math.PI / 2;
    abyss.position.y = -4.52;
    this.throat.add(abyss);

    const throatWall = new THREE.Mesh(
      new THREE.CylinderGeometry(3.02, 0.92, 4.08, 48, 10, true),
      new THREE.MeshLambertMaterial({
        color: "#0b181d",
        emissive: "#071216",
        emissiveIntensity: 0.2,
        side: THREE.BackSide,
        flatShading: true,
      }),
    );
    throatWall.position.y = -2.48;
    this.throat.add(throatWall);

    // 分层肌肉环沿竖井向下收窄，动画时形成从口缘传向胃部的蠕动波。
    const throatRings = [
      { radius: 3.35, tube: 0.58, y: -0.46, color: deepWater },
      { radius: 2.56, tube: 0.43, y: -1.48, color: gulletEdge },
      { radius: 1.72, tube: 0.32, y: -2.72, color: gullet },
      { radius: 1.05, tube: 0.24, y: -3.82, color: gulletEdge },
    ];
    throatRings.forEach((ring, index) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(ring.radius, ring.tube, 7, 52),
        ring.color,
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.z = index * 0.31;
      mesh.scale.set(1 + index * 0.035, 1 - index * 0.04, 1);
      mesh.position.y = ring.y;
      mesh.userData.baseScaleX = mesh.scale.x;
      mesh.userData.baseScaleY = mesh.scale.y;
      mesh.userData.baseY = ring.y;
      mesh.userData.phase = index * 1.15;
      this.throatRings.push(mesh);
      this.throat.add(mesh);
    });

    for (let i = 0; i < 11; i++) {
      const angle = (i / 11) * Math.PI * 2 + 0.12;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(
          Math.cos(angle) * 3.25,
          -0.44,
          Math.sin(angle) * 3.25,
        ),
        new THREE.Vector3(
          Math.cos(angle + 0.16) * 2.2,
          -1.75,
          Math.sin(angle + 0.16) * 2.2,
        ),
        new THREE.Vector3(
          Math.cos(angle + 0.34) * 0.72,
          -4.08,
          Math.sin(angle + 0.34) * 0.72,
        ),
      ]);
      const rib = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 10, 0.1 + (i % 3) * 0.025, 5, false),
        i % 3 === 0 ? gulletEdge : gullet,
      );
      this.throat.add(rib);
    }

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * 2.7, -0.72, Math.sin(angle) * 2.7),
        new THREE.Vector3(
          Math.cos(angle + 0.45) * 1.75,
          -1.75,
          Math.sin(angle + 0.45) * 1.75,
        ),
        new THREE.Vector3(
          Math.cos(angle + 0.95) * 0.72,
          -3.45,
          Math.sin(angle + 0.95) * 0.72,
        ),
      ]);
      const tendril = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 18, 0.09 + (i % 2) * 0.025, 5, false),
        wetTissue,
      );
      this.gulletTendrils.push({ mesh: tendril, phase: i * 0.92 });
      this.throat.add(tendril);
    }
    this.group.add(this.throat);

    this.createTeeth(20, 3.28, 0.08, 2.28, tooth, this.outerTeeth, 0);
    this.createTeeth(12, 2.34, -0.62, 1.48, toothDark, this.innerTeeth, 0.19);

    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2 + 0.08;
      const lobe = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.42 + (i % 3) * 0.09, 0),
        i % 3 === 0 ? gulletEdge : deepWater,
      );
      lobe.position.set(
        Math.cos(angle) * 3.52,
        -0.42 + (i % 2) * 0.09,
        Math.sin(angle) * 3.52,
      );
      lobe.scale.set(1.35, 0.72, 0.9);
      lobe.rotation.set(i * 0.17, -angle, i * 0.11);
      this.mouthLobes.push({
        mesh: lobe,
        angle,
        radius: 3.52,
        baseY: lobe.position.y,
        phase: i * 0.58,
      });
      this.throat.add(lobe);
    }

    this.waterMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uSeaA: { value: DAY.seaA.clone() },
        uSeaB: { value: DAY.seaB.clone() },
        uSeaShallow: { value: DAY.seaShallow.clone() },
        uNightK: { value: 0 },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying float vFunnel;
        void main() {
          vUv = uv;
          vec3 p = position;
          float sourceRadius = length(position.xy) / 8.2;
          float angle = atan(position.y, position.x);
          float outerK = smoothstep(.28, 1.0, sourceRadius);

          // 多层不规则边缘扰动：让外圈轮廓产生波浪状凹凸（模拟资产墙的有机边缘）
          float boundaryWave = sin(angle * 3.0 + uTime * .11) * .052
            + sin(angle * 7.0 - uTime * .075 + .8) * .031
            + sin(angle * 12.0 + 2.1) * .014;
          // 追加大尺度不对称变形（让整体不是完美圆形）
          float asymmetry = sin(angle * 1.8 + uTime * .08) * .095
            + sin(angle * 4.2 - uTime * .06 + 1.3) * .068
            + sin(angle * 9.5 + 2.7) * .038;

          p.xy *= 1.0 + (boundaryWave + asymmetry) * outerK;

          float radius = length(p.xy) / 8.2;
          float funnel = 1.0 - smoothstep(.14, .98, radius);
          p.z -= pow(funnel, 1.42) * 3.72;
          p.z += sin(radius * 55.0 + atan(position.y, position.x) * 3.0) * .055 * (1.0 - funnel);
          vFunnel = funnel;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uSeaA;
        uniform vec3 uSeaB;
        uniform vec3 uSeaShallow;
        uniform float uNightK;
        varying vec2 vUv;
        varying float vFunnel;
        void main() {
          vec2 p = vUv - .5;
          float radius = length(p) * 2.0;
          float angle = atan(p.y, p.x);
          float edgeWarp = sin(angle * 3.0 + uTime * .11) * .052
            + sin(angle * 7.0 - uTime * .075 + .8) * .031
            + sin(angle * 12.0 + 2.1) * .014;
          float warpedRadius = radius - edgeWarp * smoothstep(.24, 1.0, radius);

          // 径向分层色阶：从中心深色向外过渡到浅青色（模拟资产墙效果）
          float layerK = smoothstep(.08, .38, radius);
          layerK += smoothstep(.38, .62, radius) * .4;
          layerK += smoothstep(.62, .82, radius) * .3;
          vec3 deepCore = vec3(.012, .04, .055);     // 深渊中心
          vec3 innerSea = mix(vec3(.035, .13, .18), uSeaA * .42, .46);
          vec3 midSea = mix(vec3(.08, .24, .28), mix(uSeaA, uSeaB, .5), .58);
          vec3 outerSea = mix(vec3(.18, .42, .48), uSeaB, .72);
          vec3 shallowRim = mix(vec3(.42, .68, .72), uSeaShallow, .82);

          vec3 sea = mix(deepCore, innerSea, smoothstep(.05, .22, radius));
          sea = mix(sea, midSea, smoothstep(.22, .48, radius));
          sea = mix(sea, outerSea, smoothstep(.48, .72, radius));
          sea = mix(sea, shallowRim, smoothstep(.72, .88, radius));

          // 螺旋纹理（保留原逻辑但降低强度）
          float spiral = sin(angle * 3.15 - warpedRadius * 27.0 + uTime * 2.25 + sin(angle * 5.0) * 1.05);
          float crossWave = sin(angle * 1.7 - warpedRadius * 16.0 + uTime * 1.35 + sin(angle * 7.0) * .72);
          float tear = sin(angle * 9.0 + warpedRadius * 18.0 - uTime * .82) * .5 + .5;

          // 环状泡沫分层推进（取代原来的叠加式 foam）
          float ring1 = 1.0 - smoothstep(.0, .12, abs(warpedRadius - .28 - sin(uTime * 1.8) * .05));
          float ring2 = 1.0 - smoothstep(.0, .15, abs(warpedRadius - .52 - sin(uTime * 1.5 + .8) * .06));
          float ring3 = 1.0 - smoothstep(.0, .18, abs(warpedRadius - .74 - sin(uTime * 1.2 + 1.6) * .07));
          float foamNoise = smoothstep(.3, .85, sin(angle * 8.0 + warpedRadius * 12.0 - uTime * 2.1) * .5 + .5);
          float foam = (ring1 + ring2 * .7 + ring3 * .5) * foamNoise * .6;
          foam += smoothstep(.68, .92, spiral * .5 + .5) * smoothstep(.35, .65, warpedRadius) * .18;

          float mouth = smoothstep(.54, .16, radius);
          vec3 color = mix(sea, deepCore, vFunnel * .88 + mouth * .82);
          vec3 foamTint = mix(uSeaShallow, vec3(1.0), mix(.34, .08, uNightK));
          color = mix(color, foamTint, clamp(foam, 0.0, 1.0) * mix(1.0, .72, uNightK));

          // 边缘雾化：外圈半透明柔化（模拟资产墙白色雾边）
          float edgeFade = 1.0 - smoothstep(.78, .95, radius);
          float alpha = (1.0 - smoothstep(.83 + edgeWarp, 1.03 + edgeWarp, radius)) * mix(.96, .28, mouth) * edgeFade;

          gl_FragColor = vec4(color, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    // 中心开孔让相机直接看到咽喉竖井，径向细分则负责真正下沉的水坡。
    // 环向细分提高到 256 让边缘扰动更平滑，径向 32 层让漏斗下沉更自然
    const water = new THREE.Mesh(
      new THREE.RingGeometry(1.08, 8.2, 256, 32),
      this.waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.32;
    water.renderOrder = 2;
    this.group.add(water);

    // 实体浪带负责近景轮廓和遮挡关系，Shader 只承担大面积旋流，避免透明纹理显得扁平。
    const ribbonSpecs = [
      { angle: 0.16, start: 7.46, end: 3.18, turns: 0.38, width: 0.06 },
      { angle: 1.28, start: 6.82, end: 2.84, turns: 0.29, width: 0.052 },
      { angle: 3.05, start: 7.58, end: 3.34, turns: 0.47, width: 0.074 },
      { angle: 4.72, start: 6.54, end: 2.96, turns: 0.35, width: 0.056 },
    ];
    ribbonSpecs.forEach((spec, i) => {
      const curve = createSpiralCurve(
        spec.angle,
        spec.start,
        spec.end,
        spec.turns,
      );
      const ribbon = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 42, spec.width, 5, false),
        foamMaterial.clone(),
      );
      (ribbon.material as THREE.MeshBasicMaterial).opacity =
        0.24 + (i % 4) * 0.06;
      this.foamGroup.add(ribbon);
    });
    const crestSpecs = [
      {
        radius: 3.72,
        tube: 0.085,
        arc: 0.48,
        angle: 0.15,
        y: -0.05,
        opacity: 0.35,
      },
      {
        radius: 4.28,
        tube: 0.11,
        arc: 0.73,
        angle: 1.08,
        y: -0.12,
        opacity: 0.28,
      },
      {
        radius: 5.63,
        tube: 0.072,
        arc: 0.42,
        angle: 2.34,
        y: -0.03,
        opacity: 0.4,
      },
      {
        radius: 4.91,
        tube: 0.095,
        arc: 0.88,
        angle: 3.68,
        y: -0.17,
        opacity: 0.3,
      },
      {
        radius: 6.45,
        tube: 0.065,
        arc: 0.57,
        angle: 4.54,
        y: -0.08,
        opacity: 0.34,
      },
      {
        radius: 3.96,
        tube: 0.12,
        arc: 0.36,
        angle: 5.64,
        y: -0.2,
        opacity: 0.25,
      },
      {
        radius: 7.05,
        tube: 0.07,
        arc: 0.68,
        angle: 5.98,
        y: -0.02,
        opacity: 0.32,
      },
    ];
    crestSpecs.forEach((spec) => {
      const crest = new THREE.Mesh(
        new THREE.TorusGeometry(spec.radius, spec.tube, 5, 28, spec.arc),
        foamMaterial.clone(),
      );
      crest.rotation.x = Math.PI / 2;
      crest.rotation.z = spec.angle;
      crest.position.y = spec.y;
      (crest.material as THREE.MeshBasicMaterial).opacity = spec.opacity;
      this.foamGroup.add(crest);
    });
    this.group.add(this.foamGroup);

    const wreckWood = new THREE.MeshLambertMaterial({
      color: "#4b342a",
      flatShading: true,
    });
    const wreckDark = new THREE.MeshLambertMaterial({
      color: "#261d1b",
      flatShading: true,
    });
    for (let i = 0; i < 14; i++) {
      const isBeam = i % 3 !== 0;
      const mesh = new THREE.Mesh(
        isBeam
          ? new THREE.BoxGeometry(0.12, 0.12, 0.72 + (i % 4) * 0.17)
          : new THREE.DodecahedronGeometry(0.13 + (i % 3) * 0.06, 0),
        i % 2 ? wreckWood : wreckDark,
      );
      const radius = 2.7 + (i % 5) * 0.7;
      const angle = i * 2.399;
      mesh.position.set(
        Math.cos(angle) * radius,
        0.22 + (i % 3) * 0.11,
        Math.sin(angle) * radius,
      );
      mesh.rotation.set(i * 0.31, angle, i * 0.17);
      this.debris.push({
        mesh,
        radius,
        angle,
        height: mesh.position.y,
        speed: 0.18 + (i % 4) * 0.035,
      });
      this.group.add(mesh);
    }

    const sprayPositions = new Float32Array(110 * 3);
    for (let i = 0; i < 110; i++) {
      const angle = i * 2.399;
      const radius = 2.5 + (i % 17) * 0.27;
      sprayPositions[i * 3] = Math.cos(angle) * radius;
      sprayPositions[i * 3 + 1] = 0.12 + (i % 9) * 0.08;
      sprayPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const sprayGeometry = new THREE.BufferGeometry();
    sprayGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(sprayPositions, 3),
    );
    this.spray = new THREE.Points(
      sprayGeometry,
      new THREE.PointsMaterial({
        map: glowTexture("#d9fbf8"),
        color: "#b8e5e4",
        size: 0.13,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.spray);

    this.preyShip = new Ship();
    this.preyShip.group.name = "CharybdisPreyShip";
    this.preyShip.arrow.visible = false;
    this.preyShip.group.scale.setScalar(0.23);
    this.preyShip.group.position.set(5.85, 0.68, 0);
    this.group.add(this.preyShip.group);

    const mistTexture = glowTexture("#9ad1d0");
    for (let i = 0; i < 9; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: mistTexture,
          color: "#779fa5",
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const angle = (i / 9) * Math.PI * 2;
      sprite.position.set(
        Math.cos(angle) * (3.1 + (i % 3) * 1.4),
        0.4 + (i % 2) * 0.18,
        Math.sin(angle) * (3.1 + (i % 3) * 1.4),
      );
      sprite.scale.set(2.6 + (i % 3) * 0.5, 1.1 + (i % 2) * 0.3, 1);
      sprite.userData.phase = i * 0.81;
      sprite.userData.baseScaleX = sprite.scale.x;
      sprite.userData.baseScaleY = sprite.scale.y;
      this.mist.push(sprite);
      this.group.add(sprite);
    }

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && !(mesh.material as THREE.Material).transparent) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number, theme: ThemeVals = DAY, nightK = 0): void {
    this.waterMaterial.uniforms.uTime.value = time;
    this.waterMaterial.uniforms.uSeaA.value.copy(theme.seaA);
    this.waterMaterial.uniforms.uSeaB.value.copy(theme.seaB);
    this.waterMaterial.uniforms.uSeaShallow.value.copy(theme.seaShallow);
    this.waterMaterial.uniforms.uNightK.value = nightK;
    // 资产墙省略主题参数时保持 DAY 外观；进入 World 后外围水效跟随当前海色色板。
    this.effectColor
      .copy(theme.seaShallow)
      .lerp(this.white, THREE.MathUtils.lerp(0.32, 0.08, nightK));
    this.foamGroup.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.color.copy(this.effectColor);
    });
    this.foamGroup.rotation.y = time * 0.23;
    this.throat.rotation.y = -time * 0.11;
    const feedingCycle = (time % 12) / 12;
    const bite =
      THREE.MathUtils.smoothstep(feedingCycle, 0.67, 0.75) *
      (1 - THREE.MathUtils.smoothstep(feedingCycle, 0.82, 0.93));
    const breath = 1 + Math.sin(time * 0.92) * 0.065 - bite * 0.17;
    this.throat.scale.set(
      breath,
      1 + Math.sin(time * 0.92 + 0.8) * 0.025,
      breath,
    );

    this.throatRings.forEach((ring, index) => {
      const contraction =
        1 +
        Math.sin(time * 1.7 - index * 1.08) * (0.055 + index * 0.012) -
        bite * (0.08 + index * 0.025);
      ring.scale.set(
        ring.userData.baseScaleX * contraction,
        ring.userData.baseScaleY * contraction,
        1,
      );
      ring.position.y =
        ring.userData.baseY +
        Math.sin(time * 1.35 + ring.userData.phase) * 0.08;
      ring.rotation.z = index * 0.31 + Math.sin(time * 0.58 + index) * 0.08;
    });
    this.mouthLobes.forEach((part) => {
      const pulse = 1 + Math.sin(time * 1.45 + part.phase) * 0.08 - bite * 0.12;
      const radius = part.radius * breath;
      part.mesh.position.set(
        Math.cos(part.angle) * radius,
        part.baseY + Math.sin(time * 1.45 + part.phase) * 0.06,
        Math.sin(part.angle) * radius,
      );
      part.mesh.scale.set(
        1.35 * pulse,
        0.72 * (1 + Math.sin(time * 1.2 + part.phase) * 0.12),
        0.9 * pulse,
      );
    });
    this.gulletTendrils.forEach((part, index) => {
      part.mesh.rotation.y =
        Math.sin(time * 0.75 + part.phase) * 0.24 +
        time * (index % 2 ? -0.05 : 0.045);
      part.mesh.scale.y =
        1 + Math.sin(time * 1.8 + part.phase) * 0.08 + bite * 0.14;
    });

    this.outerTeeth.forEach((part) => {
      const pulse =
        part.baseScale *
        (1 + Math.sin(time * 1.35 + part.phase) * 0.04 + bite * 0.08);
      part.mesh.scale.setScalar(pulse);
      const radius =
        part.radius * (1 - bite * 0.19 + Math.sin(time * 0.92) * 0.018);
      part.mesh.position.set(
        Math.cos(part.angle) * radius,
        part.baseY + Math.sin(time * 1.35 + part.phase) * 0.05,
        Math.sin(part.angle) * radius,
      );
    });
    this.innerTeeth.forEach((part) => {
      const pulse =
        part.baseScale *
        (1 + Math.sin(time * 1.5 + part.phase) * 0.05 + bite * 0.11);
      part.mesh.scale.setScalar(pulse);
      const radius = part.radius * (1 - bite * 0.24);
      part.mesh.position.set(
        Math.cos(part.angle) * radius,
        part.baseY + Math.sin(time * 1.5 + part.phase) * 0.035,
        Math.sin(part.angle) * radius,
      );
    });

    const pull = THREE.MathUtils.smoothstep(feedingCycle, 0.04, 0.84);
    const pullCurve = Math.pow(pull, 1.35);
    const shipAngle = -0.7 + pull * Math.PI * 4.35;
    const shipRadius = THREE.MathUtils.lerp(5.85, 0.2, pullCurve);
    const shipY = 0.7 + Math.sin(time * 2.5) * 0.09 - Math.pow(pull, 2.45) * 5;
    const swallowed = THREE.MathUtils.smoothstep(feedingCycle, 0.72, 0.9);
    this.preyShip.group.visible = feedingCycle < 0.92;
    this.preyShip.group.position.set(
      Math.cos(shipAngle) * shipRadius,
      shipY,
      Math.sin(shipAngle) * shipRadius,
    );
    this.preyShip.group.scale.setScalar(
      0.23 * THREE.MathUtils.lerp(1, 0.12, swallowed),
    );
    this.preyShip.group.rotation.y = -shipAngle + Math.PI * 0.5;
    this.preyShip.group.rotation.x =
      0.34 + pull * 0.66 + Math.sin(time * 2.3) * 0.08;
    this.preyShip.group.rotation.z =
      Math.sin(time * 3.6) * (0.06 + pull * 0.28) + pull * 0.82;

    this.debris.forEach((part, index) => {
      const angle = part.angle + time * part.speed;
      const pull = 0.12 * (1 + Math.sin(time * 0.35 + index) * 0.5);
      const radius = part.radius - pull;
      part.mesh.position.set(
        Math.cos(angle) * radius,
        part.height + Math.sin(time * 1.2 + index) * 0.12,
        Math.sin(angle) * radius,
      );
      part.mesh.rotation.x = time * (0.25 + index * 0.012);
      part.mesh.rotation.z = time * (0.18 + index * 0.009);
    });
    this.spray.rotation.y = time * 0.42;
    const sprayMaterial = this.spray.material as THREE.PointsMaterial;
    sprayMaterial.color.copy(this.effectColor);
    sprayMaterial.opacity = 0.55 + Math.sin(time * 1.7) * 0.13 + bite * 0.2;
    this.mist.forEach((sprite) => {
      const pulse = 1 + Math.sin(time * 0.72 + sprite.userData.phase) * 0.13;
      sprite.scale.set(
        sprite.userData.baseScaleX * pulse,
        sprite.userData.baseScaleY * pulse,
        1,
      );
      const material = sprite.material as THREE.SpriteMaterial;
      material.color.copy(this.effectColor);
      material.opacity =
        (0.08 + Math.sin(time * 0.9 + sprite.userData.phase) * 0.035) *
        THREE.MathUtils.lerp(1, 0.72, nightK);
    });
  }

  dispose(): void {
    this.preyShip.wake.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        if (!material) return;
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      });
    });
  }

  private createTeeth(
    count: number,
    radius: number,
    y: number,
    baseLength: number,
    material: THREE.Material,
    target: ToothPart[],
    angleOffset: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle =
        (i / count) * Math.PI * 2 + angleOffset + Math.sin(i * 2.17) * 0.045;
      const length = baseLength * (0.76 + (i % 5) * 0.08);
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.24 + (i % 3) * 0.045, length, 4),
        material,
      );
      const direction = new THREE.Vector3(
        -Math.cos(angle),
        -0.2 - (i % 3) * 0.045,
        -Math.sin(angle),
      );
      orientToDirection(mesh, direction);
      mesh.position.set(
        Math.cos(angle) * radius,
        y + (i % 2) * 0.055,
        Math.sin(angle) * radius,
      );
      mesh.rotation.y += i * 0.37;
      const baseScale = 0.9 + (i % 4) * 0.055;
      mesh.scale.setScalar(baseScale);
      target.push({
        mesh,
        baseScale,
        phase: i * 0.43,
        angle,
        radius,
        baseY: y + (i % 2) * 0.055,
      });
      this.group.add(mesh);
    }
  }
}
