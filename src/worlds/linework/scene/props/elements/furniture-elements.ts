// 线稿家具元素定义桌面、桌腿、书本、杯子和托盘等可复用小物件。
// 它们服务于多个静态陈设，不拥有场景级状态。
import * as THREE from "three";
import { PAPER, type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkFurniturePanel(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  options: { readonly rotation?: readonly [number, number, number] } = {},
): THREE.Group {
  return kit.box(parent, size, position, { color: PAPER, rotation: options.rotation });
}

export function createLineworkFurnitureLeg(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
): THREE.Group {
  return kit.box(parent, size, position);
}

export function createLineworkBookObject(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Group {
  return kit.box(parent, size, position, { color: PAPER, rotation });
}

export function createLineworkCupObject(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  position: readonly [number, number, number],
): THREE.Group {
  const cup = new THREE.Group();
  parent.add(cup);
  kit.outlined(cup, new THREE.CylinderGeometry(0.11, 0.1, 0.2, 16), {
    position,
    color: PAPER,
    threshold: 12,
  });
  kit.outlined(cup, new THREE.TorusGeometry(0.1, 0.018, 6, 20, Math.PI * 1.55), {
    position: [position[0] + 0.11, position[1] + 0.04, position[2]],
    rotation: [0, 0, -Math.PI / 2],
    color: PAPER,
    threshold: 8,
  });
  return cup;
}

export function createLineworkRoundTray(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  position: readonly [number, number, number],
): THREE.Group {
  return kit.outlined(parent, new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28), {
    position,
    color: PAPER,
    threshold: 12,
  });
}
