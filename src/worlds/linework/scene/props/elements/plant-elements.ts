// 线稿植物元素定义花盆、单条茎线和单片叶子。
// 植物整体摆动由上层持有 stems group 后统一驱动。
import * as THREE from "three";
import { PAPER, type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkPlantPot(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.outlined(parent, new THREE.CylinderGeometry(0.42, 0.31, 0.85, 12), {
    position: [0, 0.43, 0],
    color: PAPER,
    threshold: 14,
  });
}

export function createLineworkPlantStemPoints(index: number): {
  readonly root: THREE.Vector3;
  readonly tip: THREE.Vector3;
  readonly angle: number;
} {
  const angle = -1.2 + index * 0.34;
  return {
    root: new THREE.Vector3(0, 0.85, 0),
    tip: new THREE.Vector3(Math.sin(angle) * 0.82, 2.0 + (index % 3) * 0.18, Math.cos(angle) * 0.32),
    angle,
  };
}

export function createLineworkPlantLeaf(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  tip: THREE.Vector3,
  angle: number,
  index: number,
): THREE.Group {
  const leaf = kit.outlined(parent, new THREE.CircleGeometry(0.24, 16), {
    position: [tip.x, tip.y, tip.z],
    rotation: [0, index % 2 === 0 ? 0.22 : -0.22, -angle * 0.55],
    color: PAPER,
    threshold: 10,
  });
  leaf.scale.set(0.48, 1, 1);
  return leaf;
}
