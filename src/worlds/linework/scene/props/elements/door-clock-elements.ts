// 线稿门钟元素定义门板、门格、门把手、钟面、刻度和指针。
// 门开合与指针走时由 LineworkRoom 持有，不进入元素层。
import * as THREE from "three";
import { BLACK, GRAPHITE, PAPER, lineGeometry, type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkDoorPanel(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.box(parent, [1.5, 4.0, 0.14], [0, 2.02, 0], { color: PAPER });
}

export function createLineworkDoorInset(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  y: number,
): THREE.Group {
  return kit.box(parent, [1.08, 1.55, 0.08], [0, y, 0.1]);
}

export function createLineworkDoorKnob(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.outlined(parent, new THREE.SphereGeometry(0.08, 12, 8), {
    position: [0.52, 2.04, 0.14],
    color: BLACK,
    threshold: 18,
  });
}

export function createLineworkClockFace(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.outlined(parent, new THREE.CylinderGeometry(0.58, 0.58, 0.12, 32), {
    rotation: [Math.PI / 2, 0, 0],
    color: PAPER,
    threshold: 12,
  });
}

export function createLineworkClockTicks(kit: LineworkPropKit, parent: THREE.Object3D): THREE.LineSegments {
  const handMaterial = new THREE.LineBasicMaterial({ color: GRAPHITE });
  const clockTicks: THREE.Vector3[] = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const innerRadius = index % 3 === 0 ? 0.39 : 0.43;
    clockTicks.push(
      new THREE.Vector3(Math.sin(angle) * innerRadius, Math.cos(angle) * innerRadius, 0.09),
      new THREE.Vector3(Math.sin(angle) * 0.49, Math.cos(angle) * 0.49, 0.09),
    );
  }
  return kit.addSegments(parent, clockTicks, handMaterial);
}

export function createLineworkClockHand(
  length: number,
  z: number,
  material: THREE.LineBasicMaterial,
  backLength = 0,
): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  return new THREE.Line(
    lineGeometry([new THREE.Vector3(0, -backLength, z), new THREE.Vector3(0, length, z)]),
    material,
  );
}

export function createLineworkClockPin(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.outlined(parent, new THREE.SphereGeometry(0.035, 10, 8), {
    position: [0, 0, 0.12],
    color: BLACK,
    threshold: 14,
  });
}
