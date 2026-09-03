// 线稿吊扇元素定义吊杆、机身和单片叶片。
// 风扇旋转角度由 LineworkRoom 驱动，元素层只提供几何。
import * as THREE from "three";
import { PAPER, type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkFanRod(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.box(parent, [0.14, 1.0, 0.14], [0, 0.45, 0]);
}

export function createLineworkFanHub(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.outlined(parent, new THREE.CylinderGeometry(0.23, 0.3, 0.34, 16), {
    position: [0, 0, 0],
    color: PAPER,
    threshold: 12,
  });
}

export function createLineworkFanBlade(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  angle: number,
): THREE.Group {
  const blade = kit.box(parent, [1.8, 0.08, 0.34], [0, -0.04, 0], { color: PAPER });
  blade.position.set(Math.cos(angle) * 0.86, -0.04, Math.sin(angle) * 0.86);
  blade.rotation.y = -angle;
  return blade;
}
