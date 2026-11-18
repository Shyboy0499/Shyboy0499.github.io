// 大漩涡奥术版：在原版海洋漏斗上叠加紫蓝能量、闪电与悬浮岩群。
// 它只提供视觉资产和动画；进入判定、目的地和 World 生命周期由外层场景负责。
import * as THREE from "three";
import { ArchipelagoMaelstrom } from "./archipelago-maelstrom";
import { glowTexture } from "../core/sprites";
import type { ThemeVals } from "../env/themes";

interface FloatingRock {
  group: THREE.Group;
  radius: number;
  baseY: number;
  angle: number;
  speed: number;
  phase: number;
}

interface LightningBolt {
  mesh: THREE.Mesh;
  phase: number;
}

function createJaggedCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  phase: number,
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const tangent = new THREE.Vector3().subVectors(end, start);
  const side = new THREE.Vector3(-tangent.z, 0.15, tangent.x).normalize();
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const offset =
      i === 0 || i === 8
        ? 0
        : Math.sin(i * 5.17 + phase) * (0.16 + Math.sin(t * Math.PI) * 0.22);
    points.push(
      new THREE.Vector3()
        .lerpVectors(start, end, t)
        .addScaledVector(side, offset),
    );
  }
  return new THREE.CatmullRomCurve3(points);
}

export class ArchipelagoMaelstromV2 {
  readonly group = new THREE.Group();
  // 奥术入口会在 World 中整体放大，因此基础漏斗采用紧凑构图，避免礁峰和能量柱变成高墙。
  private readonly base = new ArchipelagoMaelstrom("compact");
  private readonly arcaneCore = new THREE.Group();
  private readonly arcaneMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly lightning: LightningBolt[] = [];
  private readonly floatingRocks: FloatingRock[] = [];
  private readonly runeRing = new THREE.Group();
  private readonly particles: THREE.Points;
  private readonly coreGlow: THREE.Sprite;
  private readonly arcaneLight: THREE.PointLight;

  constructor() {
    this.group.name = "ArchipelagoMaelstromV2";
    this.base.group.name = "ArchipelagoMaelstromBase";
    this.recolorBaseEnergy();
    this.group.add(this.base.group);

    const violet = new THREE.MeshBasicMaterial({
      color: "#7758ff",
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const blue = new THREE.MeshBasicMaterial({
      color: "#45a7ff",
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pale = new THREE.MeshBasicMaterial({
      color: "#d3c6ff",
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.arcaneMaterials.push(violet, blue, pale);

    // 三股不同方向的奥术流互相穿插，避免中心能量只表现成一根笔直光柱。
    for (let i = 0; i < 5; i++) {
      const points: THREE.Vector3[] = [];
      for (let step = 0; step < 18; step++) {
        const t = step / 17;
        const angle = i * 1.27 + t * (Math.PI * 2.2 + i * 0.34);
        const radius = 0.18 + Math.sin(t * Math.PI) * (1.05 + (i % 2) * 0.36);
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            -0.7 + t * (4.8 + (i % 3) * 0.45),
            Math.sin(angle) * radius,
          ),
        );
      }
      const stream = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          38,
          0.045 + (i % 3) * 0.018,
          5,
          false,
        ),
        this.arcaneMaterials[i % this.arcaneMaterials.length],
      );
      stream.userData.speed = i % 2 ? -0.55 - i * 0.035 : 0.46 + i * 0.04;
      stream.userData.phase = i * 1.3;
      this.arcaneCore.add(stream);
    }

    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          0.72 + i * 0.36,
          0.035 + i * 0.008,
          5,
          54,
          Math.PI * (1.25 + (i % 2) * 0.28),
        ),
        this.arcaneMaterials[(i + 1) % this.arcaneMaterials.length],
      );
      ring.rotation.x = Math.PI / 2 + (i % 2 ? 0.18 : -0.12);
      ring.rotation.z = i * 1.37;
      ring.position.y = -0.1 + i * 0.85;
      ring.userData.baseScale = 1 + i * 0.06;
      this.arcaneCore.add(ring);
    }

    this.coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#7658ff"),
        color: "#a98cff",
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.coreGlow.position.set(0, 1.45, 0);
    this.coreGlow.scale.set(2.5, 6.2, 1);
    this.arcaneCore.add(this.coreGlow);
    this.group.add(this.arcaneCore);

    const rockMaterial = new THREE.MeshLambertMaterial({
      color: "#263039",
      flatShading: true,
    });
    const rockEdgeMaterial = new THREE.MeshLambertMaterial({
      color: "#46505e",
      flatShading: true,
    });
    const crackMaterial = new THREE.MeshBasicMaterial({
      color: "#8f72ff",
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rockGlowTexture = glowTexture("#7257ff");
    for (let i = 0; i < 16; i++) {
      const rockGroup = new THREE.Group();
      const size = 0.22 + (i % 5) * 0.09;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        i % 3 ? rockMaterial : rockEdgeMaterial,
      );
      rock.scale.set(
        1 + (i % 2) * 0.7,
        0.85 + (i % 4) * 0.18,
        0.8 + (i % 3) * 0.22,
      );
      rock.rotation.set(i * 0.41, i * 0.67, i * 0.23);
      rockGroup.add(rock);
      if (i % 2 === 0) {
        const crack = new THREE.Mesh(
          new THREE.BoxGeometry(size * 1.65, 0.025, 0.018),
          crackMaterial,
        );
        crack.position.set(0, size * 0.26, size * 0.62);
        crack.rotation.z = ((i % 3) - 1) * 0.45;
        rockGroup.add(crack);
      }
      if (i % 3 === 0) {
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: rockGlowTexture,
            color: "#8d74ff",
            transparent: true,
            opacity: 0.32,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        glow.position.y = -size * 0.65;
        glow.scale.set(size * 2.8, size * 1.9, 1);
        rockGroup.add(glow);
      }
      const radius = 1.35 + (i % 6) * 0.42;
      const angle = i * 2.399;
      const baseY = 0.45 + (i % 7) * 0.43;
      rockGroup.position.set(
        Math.cos(angle) * radius,
        baseY,
        Math.sin(angle) * radius,
      );
      this.floatingRocks.push({
        group: rockGroup,
        radius,
        baseY,
        angle,
        speed: 0.12 + (i % 4) * 0.026,
        phase: i * 0.73,
      });
      this.group.add(rockGroup);
    }

    // 两组闪电分别连接外圈岩壁与能量柱，轮流闪现，形成雷暴而不是常亮霓虹线。
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2 + 0.25;
      const start = new THREE.Vector3(
        Math.cos(angle) * (i % 2 ? 0.5 : 1.05),
        0.25 + (i % 4) * 0.7,
        Math.sin(angle) * (i % 2 ? 0.5 : 1.05),
      );
      const end = new THREE.Vector3(
        Math.cos(angle + 0.28) * (3.6 + (i % 3) * 0.75),
        0.18 + (i % 3) * 0.4,
        Math.sin(angle + 0.28) * (3.6 + (i % 3) * 0.75),
      );
      const bolt = new THREE.Mesh(
        new THREE.TubeGeometry(
          createJaggedCurve(start, end, i * 0.67),
          22,
          0.04 + (i % 3) * 0.012,
          4,
          false,
        ),
        (i % 3 === 0 ? pale : blue).clone(),
      );
      const material = bolt.material as THREE.MeshBasicMaterial;
      if (!this.arcaneMaterials.includes(material))
        this.arcaneMaterials.push(material);
      this.lightning.push({ mesh: bolt, phase: i * 0.83 });
      this.group.add(bolt);
    }

    const runeMaterial = new THREE.MeshBasicMaterial({
      color: "#9b83ff",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.arcaneMaterials.push(runeMaterial);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const rune = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.085 + (i % 3) * 0.018, 0),
        runeMaterial,
      );
      rune.position.set(
        Math.cos(angle) * 2.18,
        0.12 + (i % 2) * 0.07,
        Math.sin(angle) * 2.18,
      );
      rune.rotation.set(angle, i * 0.4, Math.PI / 4);
      this.runeRing.add(rune);
    }
    this.group.add(this.runeRing);

    const particlePositions = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const angle = i * 2.399;
      const radius = 0.25 + (i % 17) * 0.13;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = -0.2 + (i % 25) * 0.18;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    this.particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        map: glowTexture("#876dff"),
        color: "#aa95ff",
        size: 0.12,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.group.add(this.particles);

    this.arcaneLight = new THREE.PointLight("#7860ff", 7.2, 30, 1.4);
    this.arcaneLight.position.set(0, 0.6, 0);
    this.group.add(this.arcaneLight);

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && !(mesh.material as THREE.Material).transparent) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number, theme: ThemeVals, nightK: number): void {
    this.base.update(time, theme, nightK);
    this.arcaneCore.children.forEach((child, index) => {
      if (child === this.coreGlow) return;
      const speed = child.userData.speed as number | undefined;
      const phase = child.userData.phase as number | undefined;
      child.rotation.y =
        speed === undefined
          ? time * (0.24 + index * 0.035)
          : time * speed + (phase ?? 0);
      if (child.userData.baseScale) {
        const pulse =
          child.userData.baseScale * (1 + Math.sin(time * 1.8 + index) * 0.09);
        child.scale.setScalar(pulse);
      }
    });
    this.runeRing.rotation.y = -time * 0.58;
    this.runeRing.children.forEach((rune, index) => {
      const pulse = 1 + Math.sin(time * 3.1 + index) * 0.18;
      rune.scale.setScalar(pulse);
    });
    this.floatingRocks.forEach((part, index) => {
      const angle = part.angle + time * part.speed;
      const radius = part.radius + Math.sin(time * 0.55 + part.phase) * 0.12;
      part.group.position.set(
        Math.cos(angle) * radius,
        part.baseY + Math.sin(time * 0.9 + part.phase) * 0.24,
        Math.sin(angle) * radius,
      );
      part.group.rotation.x = time * (0.14 + index * 0.008);
      part.group.rotation.y = -time * (0.2 + index * 0.011);
    });
    this.lightning.forEach(({ mesh, phase }, index) => {
      const flash = Math.sin(time * (7.5 + index * 0.37) + phase);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = flash > 0.62 ? 0.92 : flash > 0.42 ? 0.34 : 0.04;
      mesh.scale.setScalar(1 + Math.max(0, flash) * 0.025);
    });
    this.particles.rotation.y = time * 0.38;
    (this.particles.material as THREE.PointsMaterial).opacity =
      0.68 + Math.sin(time * 2.4) * 0.14;
    const energyPulse = 1 + Math.sin(time * 2.15) * 0.12;
    this.coreGlow.scale.set(2.5 * energyPulse, 6.2 * energyPulse, 1);
    (this.coreGlow.material as THREE.SpriteMaterial).opacity =
      (0.22 + Math.sin(time * 2.8) * 0.08) *
      THREE.MathUtils.lerp(1, 0.72, nightK);
    this.arcaneLight.intensity =
      THREE.MathUtils.lerp(7.2, 5.4, nightK) * energyPulse;
  }

  dispose(): void {
    this.base.dispose();
  }

  private recolorBaseEnergy(): void {
    const purple = new THREE.Color("#7558ff");
    const blue = new THREE.Color("#4e91ff");
    this.base.group.traverse((object) => {
      const light = object as THREE.PointLight;
      if (light.isPointLight && light.color.r > light.color.b * 1.4) {
        light.color.copy(purple);
      }
      const mesh = object as THREE.Mesh;
      if (!mesh.material) return;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material, index) => {
        const colored = material as
          THREE.MeshBasicMaterial | THREE.PointsMaterial | THREE.SpriteMaterial;
        if (!colored.color || colored.color.r <= colored.color.b * 1.35) return;
        colored.color.copy(index % 2 ? blue : purple);
      });
    });
  }
}
