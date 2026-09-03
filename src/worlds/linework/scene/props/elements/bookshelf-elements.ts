// 线稿书架元素定义柜体、隔板、竖书和横放书。
// 书架资产负责布局循环，元素文件只关心单个物件。
import * as THREE from "three";
import { PAPER, type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkBookshelfCase(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  const frame = new THREE.Group();
  parent.add(frame);
  kit.box(frame, [2.25, 4.3, 0.5], [0, 2.15, 0], { ink, color: PAPER });
  kit.box(frame, [1.82, 3.86, 0.54], [0, 2.15, 0.04], { ink, color: PAPER });
  return frame;
}

export function createLineworkBookshelfShelf(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  y: number,
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  return kit.box(parent, [1.98, 0.12, 0.72], [0, y, 0.06], { ink });
}

export function createLineworkStandingBook(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  ink: THREE.LineBasicMaterial,
  color: number,
): THREE.Group {
  return kit.box(parent, size, position, { ink, color });
}

export function createLineworkStackedBook(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  ink: THREE.LineBasicMaterial,
  color: number,
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Group {
  return kit.box(parent, size, position, { ink, color, rotation });
}
