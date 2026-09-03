// 潮池竞技场 Portal 的独立视觉资产；当前未接入 Archipelago World，仅供资产预览和后续路线使用。
// 它不负责目标 World、触发条件或 Portal Journey。
import * as THREE from "three";
import { glowTexture } from "../core/sprites";

interface Bubble {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  speed: number;
  phase: number;
}

function starGeometry(
  outerRadius: number,
  innerRadius: number,
): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export class TidepoolArenaPortal {
  group = new THREE.Group();
  private waterMaterial: THREE.ShaderMaterial;
  private foamMaterials: THREE.ShaderMaterial[] = [];
  private foamRibbons: THREE.Mesh[] = [];
  private bubbles: Bubble[] = [];
  private sparkles: THREE.Points;

  constructor() {
    const sand = new THREE.MeshLambertMaterial({
      color: "#d7b77a",
      flatShading: true,
    });
    const sandLight = new THREE.MeshLambertMaterial({
      color: "#f1d99f",
      flatShading: true,
    });
    const stone = new THREE.MeshLambertMaterial({
      color: "#a68f66",
      flatShading: true,
    });
    const coral = new THREE.MeshLambertMaterial({
      color: "#ef6d52",
      flatShading: true,
    });
    const pink = new THREE.MeshLambertMaterial({
      color: "#f47ea6",
      emissive: "#74263f",
      emissiveIntensity: 0.18,
      flatShading: true,
    });
    const pearl = new THREE.MeshLambertMaterial({
      color: "#f6f2de",
      emissive: "#9de7ff",
      emissiveIntensity: 0.18,
      flatShading: true,
    });

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(3.25, 3.48, 0.52, 32),
      sand,
    );
    island.scale.z = 0.88;
    island.position.y = -0.18;
    this.group.add(island);

    const innerShelf = new THREE.Mesh(
      new THREE.CylinderGeometry(2.72, 2.95, 0.28, 40),
      sandLight,
    );
    innerShelf.scale.z = 0.9;
    innerShelf.position.y = 0.16;
    this.group.add(innerShelf);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.42, 0.43, 12, 64),
      sandLight,
    );
    rim.rotation.x = -Math.PI / 2;
    rim.scale.z = 0.88;
    rim.position.y = 0.34;
    this.group.add(rim);

    for (let i = 0; i < 18; i++) {
      if (i === 3 || i === 11) continue;
      const angle = (i / 18) * Math.PI * 2;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(0.62 + (i % 3) * 0.08, 0.13, 0.36),
        i % 4 === 0 ? stone : sand,
      );
      tile.position.set(
        Math.cos(angle) * 2.93,
        0.11 + (i % 2) * 0.025,
        Math.sin(angle) * 2.56,
      );
      tile.rotation.y = -angle + Math.PI / 2 + ((i % 3) - 1) * 0.05;
      this.group.add(tile);
    }

    const deep = new THREE.Mesh(
      new THREE.CircleGeometry(2.23, 96),
      new THREE.MeshBasicMaterial({ color: "#01266f" }),
    );
    deep.rotation.x = -Math.PI / 2;
    deep.scale.y = 0.88;
    deep.position.y = 0.39;
    this.group.add(deep);

    this.waterMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          vec3 p = position;
          float radius = length(position.xy) / 2.23;
          float funnel = 1.0 - smoothstep(.08, .9, radius);
          p.z -= funnel * .58;
          vDepth = funnel;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vec2 p = vUv - .5;
          float r = length(p) * 2.0;
          float a = atan(p.y, p.x);
          float spiral = sin(r * 24.0 - uTime * 2.7 + a * 4.0 + sin(a * 3.0) * .55);
          float current = sin(r * 43.0 - uTime * 1.5 + a * 2.0) * .5 + .5;
          float core = smoothstep(.46, .08, r);
          float band = smoothstep(.45, .92, spiral * .5 + .5);
          vec3 abyss = vec3(.018, .27, .72);
          vec3 blue = vec3(.02, .68, 1.0);
          vec3 aqua = vec3(.24, 1.0, .94);
          vec3 color = mix(blue, aqua, r * .9 + band * .22);
          color = mix(color, abyss, core * .7 + vDepth * .12);
          color += aqua * current * .11 * (1.0 - core);
          float alpha = smoothstep(1.0, .94, r) * .96;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(2.22, 96),
      this.waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.scale.y = 0.88;
    water.position.y = 0.44;
    this.group.add(water);

    for (let layer = 0; layer < 2; layer++) {
      const foamMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uPhase: { value: layer * 2.1 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uPhase;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv - .5;
            float a = atan(p.y, p.x);
            float broken = sin(a * 8.0 + uTime * 1.3 + uPhase);
            broken += sin(a * 17.0 - uTime * .8) * .55;
            float alpha = smoothstep(.14, .82, broken) * .92;
            gl_FragColor = vec4(.88, 1.0, .97, alpha);
          }
        `,
      });
      const foam = new THREE.Mesh(
        new THREE.RingGeometry(1.72 - layer * 0.24, 2.14 - layer * 0.18, 96),
        foamMaterial,
      );
      foam.rotation.x = -Math.PI / 2;
      foam.scale.y = 0.88;
      foam.position.y = 0.48 + layer * 0.012;
      foam.rotation.z = layer * 0.4;
      this.foamMaterials.push(foamMaterial);
      this.group.add(foam);
    }

    const foamRibbonMaterial = new THREE.MeshBasicMaterial({
      color: "#f2fffb",
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let ribbonIndex = 0; ribbonIndex < 6; ribbonIndex++) {
      const points: THREE.Vector3[] = [];
      const start = (ribbonIndex / 6) * Math.PI * 2;
      for (let pointIndex = 0; pointIndex < 9; pointIndex++) {
        const angle = start + pointIndex * (0.075 + ribbonIndex * 0.004);
        const radius = 2.08 - pointIndex * 0.035;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            0.525,
            Math.sin(angle) * radius * 0.88,
          ),
        );
      }
      const ribbon = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          18,
          0.045 + (ribbonIndex % 2) * 0.012,
          5,
          false,
        ),
        foamRibbonMaterial,
      );
      this.foamRibbons.push(ribbon);
      this.group.add(ribbon);
    }

    const bubbleMaterial = new THREE.MeshBasicMaterial({
      color: "#d8fbff",
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 10; i++) {
      const size = 0.08 + (i % 4) * 0.035;
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 6),
        bubbleMaterial.clone(),
      );
      const angle = i * 2.13;
      const radius = 0.6 + (i % 5) * 0.32;
      const baseY = 0.55 + (i % 3) * 0.24;
      const baseX = Math.cos(angle) * radius;
      bubble.position.set(baseX, baseY, Math.sin(angle) * radius * 0.86);
      this.bubbles.push({
        mesh: bubble,
        baseX,
        baseY,
        speed: 0.18 + (i % 4) * 0.05,
        phase: i * 0.71,
      });
      this.group.add(bubble);
    }

    const star = new THREE.Mesh(starGeometry(0.34, 0.16), pink);
    star.rotation.x = -Math.PI / 2;
    star.rotation.z = 0.35;
    star.position.set(2.35, 0.73, 0.65);
    this.group.add(star);

    const shell = new THREE.Group();
    const shellBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 6),
      pearl,
    );
    shellBody.scale.set(1.25, 0.45, 0.85);
    const shellLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.045, 5, 10, Math.PI * 1.5),
      stone,
    );
    shellLip.rotation.x = Math.PI / 2;
    shellLip.position.set(0.03, 0.08, 0.18);
    shell.add(shellBody, shellLip);
    shell.position.set(-2.48, 0.68, 0.35);
    shell.rotation.y = -0.7;
    this.group.add(shell);

    const crab = new THREE.Group();
    const crabBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 5),
      coral,
    );
    crabBody.scale.set(1.25, 0.5, 0.88);
    crab.add(crabBody);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.055, 0.42, 5),
        coral,
      );
      arm.rotation.z = side * 0.92;
      arm.position.set(side * 0.3, 0.02, 0);
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), coral);
      claw.scale.set(1.15, 0.72, 0.75);
      claw.position.set(side * 0.48, 0.14, 0);
      crab.add(arm, claw);
      for (let leg = 0; leg < 3; leg++) {
        const limb = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.035, 0.32, 4),
          coral,
        );
        limb.rotation.z = side * (1.0 + leg * 0.13);
        limb.position.set(
          side * (0.24 + leg * 0.07),
          -0.08,
          -0.18 + leg * 0.16,
        );
        crab.add(limb);
      }
    }
    crab.position.set(2.55, 0.68, -0.55);
    crab.rotation.y = -0.35;
    this.group.add(crab);

    const sparklePositions = new Float32Array(44 * 3);
    for (let i = 0; i < 44; i++) {
      const angle = i * 2.399;
      const radius = 0.35 + ((i * 19) % 100) / 48;
      sparklePositions[i * 3] = Math.cos(angle) * radius;
      sparklePositions[i * 3 + 1] = 0.6 + (i % 7) * 0.12;
      sparklePositions[i * 3 + 2] = Math.sin(angle) * radius * 0.82;
    }
    const sparkleGeometry = new THREE.BufferGeometry();
    sparkleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(sparklePositions, 3),
    );
    this.sparkles = new THREE.Points(
      sparkleGeometry,
      new THREE.PointsMaterial({
        map: glowTexture("#a8fbff"),
        color: "#d5ffff",
        size: 0.11,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.sparkles);

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number): void {
    this.waterMaterial.uniforms.uTime.value = time;
    this.foamMaterials.forEach((material, index) => {
      material.uniforms.uTime.value = time * (index ? -0.75 : 1);
    });
    this.foamRibbons.forEach((ribbon, index) => {
      ribbon.rotation.y = time * (0.13 + index * 0.008);
      ribbon.scale.setScalar(0.96 + Math.sin(time * 1.2 + index) * 0.018);
    });
    this.bubbles.forEach((bubble, index) => {
      bubble.mesh.position.y =
        bubble.baseY + ((time * bubble.speed + bubble.phase) % 1.55);
      bubble.mesh.position.x =
        bubble.baseX + Math.sin(time * 0.7 + index) * 0.04;
      const material = bubble.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.38 + Math.sin(time * 2.1 + index) * 0.22;
    });
    this.sparkles.rotation.y = time * 0.12;
  }
}
