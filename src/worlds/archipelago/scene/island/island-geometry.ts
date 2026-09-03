// 小岛主题几何工厂：根据 IslandDef.theme 生成主体轮廓和可选逐帧动画。
// 覆盖层、作品宝箱和交互状态由 IslandObject 管，不在这里绑定 UI 行为。
import * as THREE from "three";
import type { IslandDef } from "../../islands";
import { KameIslandScene } from "./kame-island-scene";

export interface MaterialFactory {
  (
    hex: string,
    emissiveHex?: string,
    emissiveIntensity?: number,
  ): THREE.MeshLambertMaterial;
}

export interface BuildTree {
  (x: number, z: number, y: number, s: number): void;
}

export interface IslandGeometryContext {
  def: IslandDef;
  group: THREE.Group;
  radius: number;
  salt: number;
  rng: () => number;
  mk: MaterialFactory;
  mkTree: BuildTree;
  jitter: (geo: THREE.BufferGeometry, amp: number, salt: number) => void;
  applyGrad: (mesh: THREE.Mesh, dark?: number, light?: number) => void;
  trackMaterials: (group: THREE.Group) => void;
}

export interface IslandGeometryBuild {
  topY: number;
  update?: (time: number) => void;
}

export function buildIslandGeometry(
  ctx: IslandGeometryContext,
): IslandGeometryBuild {
  const {
    def,
    group,
    radius: r,
    salt,
    rng,
    mk,
    mkTree,
    jitter,
    applyGrad,
    trackMaterials,
  } = ctx;

  let topY = 6;
  if (def.theme === "kame") {
    const kame = new KameIslandScene();
    const scale = r / 4.72;
    kame.group.scale.setScalar(scale);
    kame.group.rotation.y = -0.18 + (rng() - 0.5) * 0.3;
    group.add(kame.group);
    trackMaterials(kame.group);
    const bounds = new THREE.Box3().setFromObject(kame.group);
    topY = Number.isFinite(bounds.max.y) ? bounds.max.y + 1.2 : r + 5;
    return { topY, update: (time) => kame.update(time) };
  } else if (def.theme === "forest") {
    const roll = rng();
    if (roll < 0.3) {
      const dh = r * 0.55;
      const domeRadius = r * 0.88;
      const domeGeo = new THREE.SphereGeometry(
        domeRadius,
        12,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      domeGeo.scale(1, dh / domeRadius, 1);
      jitter(domeGeo, 1.1, salt + 1);
      const dome = new THREE.Mesh(domeGeo, mk("#66c06d"));
      applyGrad(dome, 0.74, 1.14);
      dome.position.y = 1.0;
      group.add(dome);

      const n = 6 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2;
        const rr = (0.15 + rng() * 0.5) * domeRadius;
        const gy =
          1.0 +
          dh *
            Math.sqrt(Math.max(0, 1 - (rr / domeRadius) * (rr / domeRadius))) *
            0.96;
        mkTree(Math.cos(a) * rr, Math.sin(a) * rr, gy - 0.3, 1.1 + rng() * 0.9);
      }

      const flowerColors = ["#ff8fb3", "#ffd166", "#fff5f0"];
      for (let i = 0; i < 6; i++) {
        const a = rng() * Math.PI * 2;
        const rr = (0.3 + rng() * 0.55) * domeRadius;
        const gy =
          1.0 +
          dh *
            Math.sqrt(Math.max(0, 1 - (rr / domeRadius) * (rr / domeRadius))) *
            0.96;
        const flower = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.2 + rng() * 0.12, 0),
          mk(flowerColors[Math.floor(rng() * 3)]),
        );
        flower.position.set(Math.cos(a) * rr, gy + 0.1, Math.sin(a) * rr);
        group.add(flower);
      }
      topY = dh + 5;
    } else if (roll < 0.55) {
      const spots: [number, number, number, number][] = [
        [-r * 0.28, r * 0.14, r * 0.52, r * 0.42],
        [r * 0.34, -r * 0.18, r * 0.38, r * 0.28],
      ];
      for (const [ox, oz, domeRadius, dh] of spots) {
        const domeGeo = new THREE.SphereGeometry(
          domeRadius,
          10,
          7,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        );
        domeGeo.scale(1, dh / domeRadius, 1);
        jitter(domeGeo, 1.0, salt + Math.round(ox));
        const dome = new THREE.Mesh(domeGeo, mk("#6abf6e"));
        applyGrad(dome, 0.76, 1.12);
        dome.position.set(ox, 1.0, oz);
        group.add(dome);
        mkTree(
          ox + domeRadius * 0.1,
          oz - domeRadius * 0.1,
          1 + dh * 0.9,
          1.2 + rng() * 0.7,
        );
        mkTree(
          ox - domeRadius * 0.35,
          oz + domeRadius * 0.3,
          1 + dh * 0.55,
          0.9 + rng() * 0.6,
        );
      }
      topY = r * 0.42 + 5;
    } else if (roll < 0.8) {
      const tiers: [number, number][] = [
        [r * 0.86, r * 0.3],
        [r * 0.6, r * 0.26],
        [r * 0.36, r * 0.24],
      ];
      let yCursor = 1.0;
      for (const [tr, th] of tiers) {
        const rockGeo = new THREE.CylinderGeometry(tr * 0.94, tr, th, 10);
        jitter(rockGeo, 0.8, salt + Math.round(tr));
        const rock = new THREE.Mesh(rockGeo, mk("#b09a7e"));
        applyGrad(rock, 0.72, 1.1);
        rock.position.y = yCursor + th / 2;
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(tr * 0.96, tr * 0.9, 0.5, 10),
          mk("#6fc571"),
        );
        cap.position.y = yCursor + th + 0.22;
        group.add(rock, cap);
        yCursor += th + 0.42;
      }
      mkTree(0, 0, yCursor, 1.3 + rng() * 0.6);
      mkTree(r * 0.3, r * 0.16, tiers[0][1] + 1.5, 0.9);
      mkTree(-r * 0.36, -r * 0.1, tiers[0][1] + tiers[1][1] + 1.9, 0.85);
      topY = yCursor + 4.5;
    } else {
      const colH = r * 0.95;
      const colGeo = new THREE.CylinderGeometry(r * 0.38, r * 0.52, colH, 9);
      jitter(colGeo, 1.1, salt + 5);
      const col = new THREE.Mesh(colGeo, mk("#a08a72"));
      applyGrad(col, 0.68, 1.12);
      col.position.y = 1.0 + colH / 2;
      const capH = r * 0.22;
      const capGeo = new THREE.CylinderGeometry(r * 0.72, r * 0.56, capH, 10);
      jitter(capGeo, 0.7, salt + 6);
      const cap = new THREE.Mesh(capGeo, mk("#68c26e"));
      cap.position.y = 1.0 + colH + capH / 2;
      group.add(col, cap);
      const capTop = 1.0 + colH + capH;
      const n = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2;
        const rr = rng() * r * 0.42;
        mkTree(
          Math.cos(a) * rr,
          Math.sin(a) * rr,
          capTop - 0.2,
          0.9 + rng() * 0.7,
        );
      }
      topY = capTop + 4.5;
    }
  } else if (def.theme === "volcano") {
    const mh = r * 1.1;
    const coneGeo = new THREE.ConeGeometry(r * 0.85, mh, 9);
    jitter(coneGeo, 1.8, salt + 2);
    const cone = new THREE.Mesh(coneGeo, mk("#6b6474"));
    applyGrad(cone, 0.7, 1.16);
    cone.position.y = mh / 2 + 0.8;
    group.add(cone);

    const crater = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.14, r * 0.2, 0.8, 8),
      mk("#2a2028", "#ff6a2a", 1.5),
    );
    crater.position.y = mh * 0.96;
    group.add(crater);

    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      const from = new THREE.Vector3(
        Math.cos(a) * r * 0.13,
        mh * 0.92,
        Math.sin(a) * r * 0.13,
      );
      const scale = 0.5 + rng() * 0.25;
      const to = new THREE.Vector3(
        Math.cos(a) * r * scale,
        mh * 0.3,
        Math.sin(a) * r * scale,
      );
      const dir = to.clone().sub(from);
      const streak = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.12, dir.length()),
        mk("#3a2a30", "#ff5a22", 1.3),
      );
      streak.position.copy(from).addScaledVector(dir, 0.5);
      streak.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dir.normalize(),
      );
      group.add(streak);
    }

    for (let i = 0; i < 5; i++) {
      const a = rng() * Math.PI * 2;
      const rockGeo = new THREE.IcosahedronGeometry(1.1 + rng() * 1.5, 0);
      const rock = new THREE.Mesh(rockGeo, mk("#8d8598"));
      rock.position.set(
        Math.cos(a) * r * (0.75 + rng() * 0.2),
        1.5,
        Math.sin(a) * r * 0.8,
      );
      rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      group.add(rock);
    }
    topY = mh + 1.5;
  } else {
    if (rng() < 0.5) {
      const bh = r * 0.42;
      const baseMoundGeo = new THREE.ConeGeometry(r * 0.92, bh, 9);
      jitter(baseMoundGeo, 1.4, salt + 3);
      const baseMound = new THREE.Mesh(baseMoundGeo, mk("#a8bfd0"));
      applyGrad(baseMound, 0.8, 1.1);
      baseMound.position.y = bh / 2 + 1.0;
      group.add(baseMound);

      const ph = r * 1.15;
      const peakGeo = new THREE.ConeGeometry(r * 0.52, ph, 8);
      jitter(peakGeo, 1.2, salt + 4);
      const peak = new THREE.Mesh(peakGeo, mk("#f4f9fc", "#b8cfe4", 0.1));
      applyGrad(peak, 0.82, 1.12);
      peak.position.set(r * 0.08, ph / 2 + bh * 0.7, -r * 0.06);
      group.add(peak);

      const p2h = r * 0.7;
      const peak2 = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.34, p2h, 7),
        mk("#e8f1f8", "#a9c3da", 0.08),
      );
      peak2.position.set(-r * 0.38, p2h / 2 + bh * 0.75, r * 0.3);
      group.add(peak2);
      topY = ph + bh + 1;
    } else {
      const sh = r * 1.5;
      const spireGeo = new THREE.ConeGeometry(r * 0.4, sh, 7);
      jitter(spireGeo, 1.0, salt + 7);
      const spire = new THREE.Mesh(spireGeo, mk("#eef6fb", "#b8cfe4", 0.12));
      applyGrad(spire, 0.8, 1.14);
      spire.position.y = sh / 2 + 1.0;
      group.add(spire);

      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rng() * 0.5;
        const ch = r * (0.25 + rng() * 0.3);
        const shard = new THREE.Mesh(
          new THREE.ConeGeometry(ch * 0.32, ch, 5),
          mk("#d6e8f4", "#9fc0da", 0.08),
        );
        shard.position.set(
          Math.cos(a) * r * 0.62,
          ch / 2 + 1.2,
          Math.sin(a) * r * 0.62,
        );
        shard.rotation.z = (rng() - 0.5) * 0.25;
        group.add(shard);
      }
      topY = sh + 1.5;
    }

    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.5 + rng() * 0.45, 0),
        mk("#bfe6ff", "#8fd0f0", 0.4),
      );
      crystal.position.set(Math.cos(a) * r * 0.55, 1.9, Math.sin(a) * r * 0.55);
      crystal.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      group.add(crystal);
    }
  }

  return { topY };
}
