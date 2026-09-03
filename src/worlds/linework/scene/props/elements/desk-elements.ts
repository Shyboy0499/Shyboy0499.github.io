// 线稿桌面元素定义桌板、桌腿、显示器、键盘和鼠标等独立物件。
// 这些元素只创建几何，交互命中区由桌面资产统一注册。
import * as THREE from "three";
import {
  BLACK,
  PAPER,
  PAPER_SHADE,
  lineGeometry,
  type LineworkPropKit,
} from "../linework-prop-kit";

export function createLineworkDeskSurface(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  return kit.roundedBox(parent, [3.1, 0.18, 1.25], [0, 1.78, 0], 0.07, {
    ink,
    color: PAPER_SHADE,
  });
}

export function createLineworkDeskLeg(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  position: readonly [number, number, number],
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  return kit.roundedBox(parent, [0.18, 1.75, 0.18], position, 0.035, { ink });
}

export function createLineworkMonitor(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  const monitor = new THREE.Group();
  parent.add(monitor);
  kit.box(monitor, [2.0, 1.28, 0.12], [-0.2, 2.63, -0.42], { ink, color: BLACK });
  kit.box(monitor, [0.18, 0.72, 0.18], [-0.2, 2.0, -0.42], { ink });
  kit.box(monitor, [0.82, 0.08, 0.45], [-0.2, 1.88, -0.14], { ink });
  monitor.add(new THREE.Line(
    lineGeometry([
      new THREE.Vector3(-0.2, 1.98, -0.48),
      new THREE.Vector3(-0.2, 1.83, -0.5),
      new THREE.Vector3(-0.92, 1.72, -0.5),
      new THREE.Vector3(-0.92, 1.18, -0.5),
    ]),
    ink,
  ));
  return monitor;
}

export function createLineworkKeyboard(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  const keyboard = kit.box(parent, [0.76, 0.05, 0.52], [0.88, 1.89, 0.04], {
    ink,
    rotation: [-0.08, 0, 0],
    color: PAPER,
  });
  const keyboardLines: THREE.Vector3[] = [];
  for (let row = 0; row <= 3; row += 1) {
    const z = -0.15 + row * 0.1;
    keyboardLines.push(new THREE.Vector3(0.54, 1.925, z), new THREE.Vector3(1.22, 1.925, z));
  }
  for (let column = 0; column <= 7; column += 1) {
    const x = 0.54 + column * 0.097;
    keyboardLines.push(new THREE.Vector3(x, 1.925, -0.15), new THREE.Vector3(x, 1.925, 0.15));
  }
  kit.addSegments(parent, keyboardLines, ink);
  return keyboard;
}

export function createLineworkMouse(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  const mouse = kit.outlined(parent, new THREE.SphereGeometry(0.14, 16, 10), {
    position: [1.38, 1.94, -0.04],
    color: PAPER,
    ink,
    threshold: 18,
  });
  mouse.scale.set(0.62, 0.28, 1);
  return mouse;
}

export function createLineworkMonitorContent(
  kit: LineworkPropKit,
): {
  readonly monitorContent: THREE.Group;
  readonly monitorScanLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
} {
  const monitorContent = new THREE.Group();
  const screenGrid: THREE.Vector3[] = [];
  for (let x = -0.95; x <= 0.55; x += 0.3) {
    screenGrid.push(new THREE.Vector3(x, 2.18, -0.34), new THREE.Vector3(x, 3.06, -0.34));
  }
  for (let y = 2.22; y <= 3.02; y += 0.2) {
    screenGrid.push(new THREE.Vector3(-1.12, y, -0.34), new THREE.Vector3(0.7, y, -0.34));
  }
  const screenInk = new THREE.LineBasicMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.46 });
  kit.addSegments(monitorContent, screenGrid, screenInk);
  kit.addSegments(monitorContent, [
    new THREE.Vector3(-1.0, 2.9, -0.33),
    new THREE.Vector3(-0.38, 2.9, -0.33),
    new THREE.Vector3(-1.0, 2.72, -0.33),
    new THREE.Vector3(0.18, 2.72, -0.33),
    new THREE.Vector3(-1.0, 2.54, -0.33),
    new THREE.Vector3(-0.56, 2.54, -0.33),
  ], screenInk);
  const monitorScanLine = new THREE.Line(
    lineGeometry([new THREE.Vector3(-1.1, 0, -0.32), new THREE.Vector3(0.68, 0, -0.32)]),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.56 }),
  );
  monitorScanLine.renderOrder = 4;
  monitorContent.add(monitorScanLine);
  return { monitorContent, monitorScanLine };
}
