// 线稿沙发元素定义座面、靠背、扶手、坐垫、靠垫和靠枕。
// 每个函数返回自己的 Object3D，便于资产墙按元素追踪。
import * as THREE from "three";
import { PAPER, PAPER_SHADE, type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkSofaSeat(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.roundedBox(parent, [3.0, 0.64, 1.3], [0, 0.68, 0], 0.14, {
    color: PAPER_SHADE,
  });
}

export function createLineworkSofaBack(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.roundedBox(parent, [2.65, 1.15, 0.35], [0, 1.45, -0.48], 0.13, {
    color: PAPER_SHADE,
  });
}

export function createLineworkSofaArm(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  x: number,
): THREE.Group {
  return kit.roundedBox(parent, [0.36, 0.94, 1.4], [x, 1.02, 0], 0.12, {
    color: PAPER_SHADE,
  });
}

export function createLineworkSofaCushion(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  x: number,
): THREE.Group {
  return kit.roundedBox(parent, [1.24, 0.18, 1.02], [x, 1.08, 0.12], 0.08, {
    color: PAPER,
  });
}

export function createLineworkSofaBackCushion(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  x: number,
): THREE.Group {
  return kit.roundedBox(parent, [1.18, 0.78, 0.2], [x, 1.5, -0.26], 0.09, {
    color: PAPER,
    rotation: [0, 0, x < 0 ? -0.025 : 0.025],
  });
}

export function createLineworkSofaPillow(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.roundedBox(parent, [0.54, 0.5, 0.2], [0.84, 1.51, -0.08], 0.08, {
    color: PAPER,
    rotation: [0, 0, -0.12],
  });
}
