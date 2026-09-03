// 线稿墙面元素定义房间面、线条、挂画框和图表线。
// 房间壳与墙面图表通过这些元素组合，不直接持有状态。
import * as THREE from "three";
import { GUIDE_INK, PAPER, lineGeometry, type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkRoomPlane(
  kit: LineworkPropKit,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
): THREE.Group {
  return kit.box(kit.scene, size, position, { color: PAPER });
}

export function createLineworkRoomEdge(
  kit: LineworkPropKit,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
): THREE.Group {
  return kit.box(kit.scene, size, position);
}

export function createLineworkFloorGuideLines(kit: LineworkPropKit): THREE.LineSegments {
  const floorLines: THREE.Vector3[] = [];
  for (let z = -4.05; z <= 4.05; z += 0.72) {
    floorLines.push(new THREE.Vector3(-5.85, 0.015, z), new THREE.Vector3(5.85, 0.015, z));
  }
  const guideInk = new THREE.LineBasicMaterial({
    color: GUIDE_INK,
    transparent: true,
    opacity: 0.28,
  });
  return kit.addSegments(kit.scene, floorLines, guideInk);
}

export function createLineworkWallGuideLines(kit: LineworkPropKit): THREE.LineSegments {
  const wallLines: THREE.Vector3[] = [];
  for (let y = 0.55; y < 5.9; y += 0.82) {
    wallLines.push(new THREE.Vector3(-5.91, y, -4.4), new THREE.Vector3(5.91, y, -4.4));
  }
  const paleInk = new THREE.LineBasicMaterial({
    color: GUIDE_INK,
    transparent: true,
    opacity: 0.2,
  });
  return kit.addSegments(kit.scene, wallLines, paleInk);
}

export function createLineworkWallPrintFrame(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  return kit.box(parent, [1.85, 1.5, 0.12], [0, 0, 0], { ink, color: PAPER });
}

export function createLineworkChartLine(
  parent: THREE.Object3D,
  ink: THREE.LineBasicMaterial,
): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  const graph = [
    new THREE.Vector3(-0.65, -0.42, 0.08),
    new THREE.Vector3(-0.28, 0.3, 0.08),
    new THREE.Vector3(0.04, -0.08, 0.08),
    new THREE.Vector3(0.58, 0.48, 0.08),
  ];
  const line = new THREE.Line(lineGeometry(graph), ink);
  parent.add(line);
  return line;
}
