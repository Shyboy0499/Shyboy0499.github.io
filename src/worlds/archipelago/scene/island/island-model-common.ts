// 程序化小岛的通用材质与基座工具；这里不决定具体主题，只提供复用积木。
import * as THREE from "three";
import { hash3 } from "../core/rng";
import type { BuildTree, MaterialFactory } from "./island-geometry";

const NIGHT_TINT = new THREE.Color("#6a5aa8"); // 紫夜滤镜：白天色 → 夜色的统一染色

export interface TrackedMat {
  mat: THREE.MeshLambertMaterial;
  base: THREE.Color; // 白天基色
  nightBase: THREE.Color; // 紫夜染色（由 base 推导）
  baseEmissive: number;
}

export function createMaterialFactory(mats: TrackedMat[]): MaterialFactory {
  return (
    hex: string,
    emissiveHex = "#000000",
    emissiveIntensity = 0,
  ): THREE.MeshLambertMaterial => {
    const mat = new THREE.MeshLambertMaterial({
      color: hex,
      flatShading: true,
      emissive: emissiveHex,
      emissiveIntensity,
    });
    const base = new THREE.Color(hex);
    const nightBase = base.clone().lerp(NIGHT_TINT, 0.42).multiplyScalar(0.6);
    mats.push({ mat, base, nightBase, baseEmissive: emissiveIntensity });
    return mat;
  };
}

export function trackLambertMaterials(
  group: THREE.Group,
  mats: TrackedMat[],
): void {
  const known = new Set(mats.map((item) => item.mat));
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      if (
        !(material instanceof THREE.MeshLambertMaterial) ||
        known.has(material)
      )
        continue;
      const base = material.color.clone();
      const nightBase = base.clone().lerp(NIGHT_TINT, 0.42).multiplyScalar(0.6);
      mats.push({
        mat: material,
        base,
        nightBase,
        baseEmissive: material.emissiveIntensity,
      });
      known.add(material);
    }
  });
}

export function jitter(
  geo: THREE.BufferGeometry,
  amp: number,
  salt: number,
): void {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // 按位置取哈希：共享/重合顶点位移一致，不撕面
    const hx = hash3(
      Math.round(x * 7) + salt,
      Math.round(y * 7),
      Math.round(z * 7),
    );
    const hz = hash3(
      Math.round(x * 7),
      Math.round(y * 7) + salt,
      Math.round(z * 7),
    );
    const hy = hash3(
      Math.round(x * 7),
      Math.round(y * 7),
      Math.round(z * 7) + salt,
    );
    pos.setXYZ(
      i,
      x + (hx - 0.5) * amp,
      y + (hy - 0.5) * amp * 0.5,
      z + (hz - 0.5) * amp,
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** 手绘 AO：按高度写灰度顶点色（山脚深、山顶亮），乘在材质色上，mood/夜染不受影响 */
export function applyGrad(mesh: THREE.Mesh, dark = 0.78, light = 1.12): void {
  const geo = mesh.geometry;
  geo.computeBoundingBox();
  const y0 = geo.boundingBox!.min.y;
  const y1 = geo.boundingBox!.max.y;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(
      (pos.getY(i) - y0) / Math.max(y1 - y0, 1e-4),
      0,
      1,
    );
    const v = dark + (light - dark) * (t * t * (3 - 2 * t));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  (mesh.material as THREE.MeshLambertMaterial).vertexColors = true;
}

export function createTreeFactory(
  group: THREE.Group,
  rng: () => number,
  salt: number,
  mk: MaterialFactory,
): BuildTree {
  const GREENS = ["#4db35e", "#63c46c", "#83d47f"];

  return (x: number, z: number, y: number, s: number): void => {
    const autumn = rng() < 0.1;
    if (rng() < 0.65) {
      // 阔叶树：树干 + 圆冠（Madbox 的西兰花树）
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 1.1 * s, 5),
        mk("#7a4f30"),
      );
      trunk.position.set(x, y + 0.55 * s, z);
      const crownGeo = new THREE.IcosahedronGeometry(1.15 * s, 1);
      jitter(crownGeo, 0.28 * s, salt + Math.round(x * 13) + Math.round(z * 7));
      const crown = new THREE.Mesh(
        crownGeo,
        mk(autumn ? "#ffa94f" : GREENS[Math.floor(rng() * 3)]),
      );
      crown.position.set(x, y + (1.1 + 0.85) * s, z);
      group.add(trunk, crown);
      return;
    }

    // 松树：双层锥
    const c1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.95 * s, 1.9 * s, 6),
      mk(autumn ? "#f0964a" : "#3d9c5d"),
    );
    c1.position.set(x, y + 1.15 * s, z);
    const c2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.65 * s, 1.4 * s, 6),
      mk(autumn ? "#ffab5e" : "#4fae68"),
    );
    c2.position.set(x, y + 2.1 * s, z);
    group.add(c1, c2);
  };
}

export function createIslandBase(
  group: THREE.Group,
  radius: number,
  salt: number,
  mk: MaterialFactory,
): void {
  // 沙滩基座（所有形态共用：岛都泊在一圈沙洲上）
  const baseGeo = new THREE.CylinderGeometry(
    radius * 1.0,
    radius * 1.3,
    2.4,
    12,
  );
  jitter(baseGeo, 1.4, salt);
  const base = new THREE.Mesh(baseGeo, mk("#f4dca4"));
  applyGrad(base, 0.8, 1.08);
  base.position.y = 0.1;
  group.add(base);

  // 湿沙水线：贴着水面一圈深色沙，把"岛泡在水里"的接触感做实
  const wetGeo = new THREE.CylinderGeometry(
    radius * 1.17,
    radius * 1.26,
    0.55,
    12,
  );
  jitter(wetGeo, 0.9, salt + 11);
  const wet = new THREE.Mesh(wetGeo, mk("#d2ab77"));
  wet.position.y = 0.14;
  group.add(wet);
}
