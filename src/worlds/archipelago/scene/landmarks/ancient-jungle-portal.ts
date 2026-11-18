// 远古丛林 Portal 的独立视觉资产；当前未接入 Archipelago World，仅供资产预览和后续路线使用。
// 它不负责目标 World、触发条件或 Portal Journey。
import * as THREE from "three";
import { glowTexture } from "../core/sprites";

function tube(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      20,
      radius,
      5,
      false,
    ),
    material,
  );
}

function runeTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 96, 96);
  ctx.shadowColor = "#66d9ff";
  ctx.shadowBlur = 16;
  ctx.strokeStyle = "#c6f7ff";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(48, 14);
  ctx.lineTo(48, 82);
  for (let branch = 0; branch < 3; branch++) {
    const y = 29 + branch * 19;
    const direction = (seed >> branch) & 1 ? 1 : -1;
    ctx.moveTo(48, y);
    ctx.lineTo(
      48 + direction * (20 + ((seed + branch) % 8)),
      y - 12 + branch * 4,
    );
  }
  if (seed % 3 === 0) {
    ctx.moveTo(48, 38);
    ctx.lineTo(61, 48);
    ctx.lineTo(48, 59);
    ctx.lineTo(35, 48);
    ctx.closePath();
  }
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class AncientJunglePortal {
  group = new THREE.Group();
  private portalMaterial: THREE.ShaderMaterial;
  private rings: THREE.Mesh[] = [];
  private runes: THREE.Sprite[] = [];
  private motes: THREE.Points;
  private hangingVines: THREE.Mesh[] = [];

  constructor() {
    const stone = new THREE.MeshLambertMaterial({
      color: "#727e6f",
      flatShading: true,
    });
    const stoneLight = new THREE.MeshLambertMaterial({
      color: "#a6ad91",
      flatShading: true,
    });
    const stoneDark = new THREE.MeshLambertMaterial({
      color: "#3d4a42",
      flatShading: true,
    });
    const crack = new THREE.MeshBasicMaterial({ color: "#25332e" });
    const moss = new THREE.MeshLambertMaterial({
      color: "#315f38",
      flatShading: true,
    });
    const mossLight = new THREE.MeshLambertMaterial({
      color: "#56844b",
      flatShading: true,
    });
    const vine = new THREE.MeshLambertMaterial({
      color: "#244a31",
      flatShading: true,
    });

    // Deep backing keeps the vortex dark even against a bright world.
    const abyss = new THREE.Mesh(
      new THREE.CircleGeometry(2.08, 64),
      new THREE.MeshBasicMaterial({ color: "#020c1d" }),
    );
    abyss.position.set(0, 0.35, -0.08);
    this.group.add(abyss);

    this.portalMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - .5;
          float r = length(p) * 2.0;
          float a = atan(p.y, p.x);
          float spiral = sin(r * 30.0 - uTime * 3.2 + a * 3.0 + sin(a * 5.0) * .55);
          float current = sin(r * 57.0 + uTime * 2.1 - a * 2.0) * .5 + .5;
          float outer = smoothstep(1.0, .72, r);
          float core = smoothstep(.34, .08, r);
          float halo = exp(-pow((r - .62) * 7.0, 2.0));
          vec3 deep = vec3(.005, .025, .11);
          vec3 blue = vec3(.015, .32, .78);
          vec3 cyan = vec3(.12, .88, 1.0);
          vec3 color = mix(deep, blue, max(0.0, spiral) * .42 + (1.0 - r) * .24);
          color = mix(color, cyan, halo * .7 + current * .13 * (1.0 - core));
          color *= 1.0 - core * .88;
          float alpha = outer * (.9 + halo * .1);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    const surface = new THREE.Mesh(
      new THREE.CircleGeometry(2.04, 96),
      this.portalMaterial,
    );
    surface.position.set(0, 0.35, -0.02);
    this.group.add(surface);

    const energyMaterials = [
      new THREE.MeshBasicMaterial({
        color: "#47bfff",
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#8eeeff",
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#2579ff",
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ];
    const ringRadii = [0.78, 1.15, 1.56];
    ringRadii.forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.025 + index * 0.012, 6, 72),
        energyMaterials[index],
      );
      ring.position.set(0, 0.35, 0.035 + index * 0.012);
      ring.scale.y = 0.92 + index * 0.025;
      this.rings.push(ring);
      this.group.add(ring);
    });

    // Five shallow steps lead into the threshold and give the asset a readable base.
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(5.15 - i * 0.34, 0.28, 2.25 - i * 0.28),
        i % 2 ? stone : stoneDark,
      );
      step.position.set(0, -2.72 + i * 0.23, 1.2 - i * 0.18);
      step.rotation.y = (i - 2) * 0.005;
      this.group.add(step);
    }

    const plinths: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const x = side * 2.5;
      const plinth = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.48, 0.62, 1.45),
        stoneDark,
      );
      base.position.y = -2.12;
      const baseTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.22, 1.65),
        stoneLight,
      );
      baseTop.position.y = -1.72;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 4.2, 10),
        stone,
      );
      shaft.position.y = 0.45;
      const lowerBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.64, 0.64, 0.22, 10),
        stoneLight,
      );
      lowerBand.position.y = -1.58;
      const upperBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.61, 0.54, 0.34, 10),
        stoneLight,
      );
      upperBand.position.y = 2.56;
      const capital = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.32, 1.36),
        stoneDark,
      );
      capital.position.y = 2.88;
      plinth.add(base, baseTop, shaft, lowerBand, upperBand, capital);

      // Offset crack strips stop the columns from reading as pristine cylinders.
      for (let i = 0; i < 4; i++) {
        const scar = tube(
          [
            new THREE.Vector3(i % 2 ? -0.2 : 0.22, -1.25 + i * 0.78, 0.49),
            new THREE.Vector3(i % 2 ? 0.08 : -0.1, -0.88 + i * 0.74, 0.515),
            new THREE.Vector3(i % 2 ? -0.15 : 0.14, -0.48 + i * 0.71, 0.5),
          ],
          0.025,
          crack,
        );
        plinth.add(scar);
      }
      plinth.position.x = x;
      plinth.rotation.z = side * 0.018;
      plinths.push(plinth);
      this.group.add(plinth);
    }

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.42, 8, 36, Math.PI),
      stone,
    );
    arch.position.set(0, 0.48, 0);
    this.group.add(arch);
    const archLip = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.51, 5, 36, Math.PI),
      stoneDark,
    );
    archLip.position.set(0, 0.48, -0.08);
    this.group.add(archLip);
    const innerArch = new THREE.Mesh(
      new THREE.TorusGeometry(2.16, 0.12, 6, 36, Math.PI),
      stoneLight,
    );
    innerArch.position.set(0, 0.48, 0.13);
    this.group.add(innerArch);

    // Broken crown fragments suggest that the gateway once continued higher.
    for (const side of [-1, 1]) {
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(1.28, 0.75, 1.05),
        stone,
      );
      crown.position.set(side * 2.18, 3.36, -0.02);
      crown.rotation.z = side * 0.17;
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.2, 1.24),
        stoneLight,
      );
      cap.position.set(side * 2.12, 3.75, -0.02);
      cap.rotation.z = side * 0.11;
      this.group.add(crown, cap);
    }

    // Vines wrap the pillars and bridge the ruined arch.
    const vinePaths = [
      [
        new THREE.Vector3(-2.72, -1.55, 0.55),
        new THREE.Vector3(-2.2, -0.6, 0.7),
        new THREE.Vector3(-2.72, 0.45, 0.6),
        new THREE.Vector3(-2.25, 1.55, 0.72),
        new THREE.Vector3(-2.48, 3.05, 0.58),
      ],
      [
        new THREE.Vector3(2.34, -1.45, 0.62),
        new THREE.Vector3(2.8, -0.28, 0.65),
        new THREE.Vector3(2.28, 0.85, 0.74),
        new THREE.Vector3(2.72, 2.15, 0.62),
        new THREE.Vector3(1.8, 3.34, 0.65),
      ],
      [
        new THREE.Vector3(-2.02, 3.2, 0.54),
        new THREE.Vector3(-0.9, 3.42, 0.68),
        new THREE.Vector3(0.15, 3.05, 0.72),
        new THREE.Vector3(1.35, 3.42, 0.63),
        new THREE.Vector3(2.25, 3.15, 0.55),
      ],
    ];
    vinePaths.forEach((points, index) => {
      const mesh = tube(points, index === 2 ? 0.12 : 0.09, vine);
      this.group.add(mesh);
    });

    const mossAnchors = [
      [-2.48, 3.28],
      [-1.65, 3.42],
      [-0.82, 3.55],
      [0.1, 3.28],
      [1.08, 3.48],
      [2.18, 3.26],
      [-2.55, -1.6],
      [2.54, -1.58],
    ] as const;
    mossAnchors.forEach(([x, y], index) => {
      const clump = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.32 + (index % 3) * 0.09, 0),
        index % 2 ? moss : mossLight,
      );
      clump.position.set(x, y, 0.46 + (index % 2) * 0.08);
      clump.scale.set(1.45, 0.72, 0.72);
      this.group.add(clump);
      if (index < 6) {
        const hanging = tube(
          [
            new THREE.Vector3(x, y, 0.5),
            new THREE.Vector3(x + 0.08, y - 0.45, 0.55),
            new THREE.Vector3(x - 0.06, y - 0.8 - (index % 3) * 0.25, 0.58),
          ],
          0.028,
          moss,
        );
        this.hangingVines.push(hanging);
        this.group.add(hanging);
      }
    });

    const leafGeometry = new THREE.ConeGeometry(0.14, 0.5, 4);
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? -1 : 1;
      const leaf = new THREE.Mesh(leafGeometry, i % 3 ? moss : mossLight);
      leaf.position.set(
        side * (2.55 + (i % 3) * 0.18),
        -1.65 + (i % 7) * 0.72,
        0.68,
      );
      leaf.rotation.set(0, 0, side * (0.75 + (i % 3) * 0.18));
      this.group.add(leaf);
    }

    const runeCount = 8;
    for (let index = 0; index < runeCount; index++) {
      const angle = (index / runeCount) * Math.PI * 2 + 0.2;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: runeTexture(index + 1),
          color: "#8deaff",
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set(
        Math.cos(angle) * 1.58,
        0.35 + Math.sin(angle) * 1.58,
        0.18,
      );
      sprite.scale.setScalar(0.5);
      this.runes.push(sprite);
      this.group.add(sprite);
    }

    const particlePositions = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      const angle = (i * 2.399) % (Math.PI * 2);
      const radius = 1.1 + ((i * 17) % 100) / 42;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] =
        0.35 + Math.sin(angle) * radius + ((i % 7) - 3) * 0.08;
      particlePositions[i * 3 + 2] = 0.16 + (i % 5) * 0.04;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    this.motes = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        map: glowTexture("#76e9ff"),
        color: "#79dfff",
        size: 0.13,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.motes);

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number): void {
    this.portalMaterial.uniforms.uTime.value = time;
    this.rings.forEach((ring, index) => {
      ring.rotation.z = time * (index % 2 ? -0.16 : 0.12) + index * 0.4;
      ring.scale.x = 1 + Math.sin(time * 1.3 + index) * 0.025;
      ring.scale.y = 0.94 + index * 0.025 + Math.sin(time * 1.1 + index) * 0.02;
    });
    this.runes.forEach((rune, index) => {
      const material = rune.material as THREE.SpriteMaterial;
      material.opacity = 0.58 + Math.sin(time * 2 + index * 0.9) * 0.28;
      rune.scale.setScalar(0.47 + Math.sin(time * 1.4 + index) * 0.045);
    });
    this.motes.rotation.z = time * 0.045;
    this.hangingVines.forEach((vine, index) => {
      vine.rotation.z = Math.sin(time * 0.55 + index) * 0.02;
    });
  }
}
