// 线稿桌面资产负责工作桌、显示器、键盘和鼠标几何。
// 它只返回显示器动画所需引用，不持有房间交互状态。
import * as THREE from "three";
import type { LineworkExhibitBinding } from "../../binding";
import {
  createLineworkDeskLeg,
  createLineworkDeskSurface,
  createLineworkKeyboard,
  createLineworkMonitor,
  createLineworkMonitorContent,
  createLineworkMouse,
} from "./elements/desk-elements";
import { GUIDE_INK, type LineworkPropKit } from "./linework-prop-kit";

export interface LineworkDeskParts {
  readonly monitorContent: THREE.Group;
  readonly monitorScanLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

export function createLineworkDesk(
  kit: LineworkPropKit,
  group: THREE.Group,
  binding: LineworkExhibitBinding,
  ink: THREE.LineBasicMaterial,
): LineworkDeskParts {
  group.position.set(-2.6, 0, -2.6);
  createLineworkDeskSurface(kit, group, ink);
  for (const position of [
    [-1.3, 0.88, -0.45],
    [1.3, 0.88, -0.45],
    [-1.3, 0.88, 0.45],
    [1.3, 0.88, 0.45],
  ] as const) {
    createLineworkDeskLeg(kit, group, position, ink);
  }
  createLineworkMonitor(kit, group, ink);
  createLineworkKeyboard(kit, group, ink);
  createLineworkMouse(kit, group, ink);
  kit.roundedBox(group, [2.68, 0.16, 0.18], [0, 1.57, -0.48], 0.04, { ink });
  kit.roundedBox(group, [1.24, 0.12, 0.48], [-0.48, 1.45, -0.34], 0.04, { ink });
  kit.outlined(group, new THREE.TorusGeometry(0.1, 0.018, 6, 24), {
    position: [1.18, 1.89, -0.34],
    rotation: [Math.PI / 2, 0, 0],
    ink,
    threshold: 10,
  });
  kit.addSegments(group, [
    new THREE.Vector3(-0.2, 1.88, -0.5),
    new THREE.Vector3(-0.2, 1.55, -0.5),
    new THREE.Vector3(-0.48, 1.5, -0.48),
    new THREE.Vector3(-0.48, 1.38, -0.48),
  ]);
  const contactHatching: THREE.Vector3[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let x = -1.34 + row * 0.1; x <= 1.28; x += 0.4) {
      const z = 0.5 + row * 0.1;
      contactHatching.push(
        new THREE.Vector3(x, 0.018, z),
        new THREE.Vector3(x + 0.24, 0.018, z),
      );
    }
  }
  kit.addSegments(group, contactHatching, new THREE.LineBasicMaterial({
    color: GUIDE_INK,
    transparent: true,
    opacity: 0.3,
  }));
  const { monitorContent, monitorScanLine } = createLineworkMonitorContent(kit);
  group.add(monitorContent);
  kit.addHitTarget(group, "monitor", [2.12, 1.42, 0.38], [-0.2, 2.63, -0.34], "control");
  kit.addHitTarget(group, binding.id, [3.4, 3.2, 1.8], [0, 1.6, 0]);
  return { monitorContent, monitorScanLine };
}
