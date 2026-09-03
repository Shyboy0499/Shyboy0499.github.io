// 线稿墙面图表资产负责挂画框和折线图形。
// 它只绘制几何和命中区，不解释项目语义。
import * as THREE from "three";
import type { LineworkExhibitBinding } from "../../binding";
import { createLineworkChartLine, createLineworkWallPrintFrame } from "./elements/wall-elements";
import { type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkWallPrint(
  kit: LineworkPropKit,
  group: THREE.Group,
  binding: LineworkExhibitBinding,
  ink: THREE.LineBasicMaterial,
): void {
  group.position.set(-4.25, 3.15, -4.34);
  createLineworkWallPrintFrame(kit, group, ink);
  createLineworkChartLine(group, ink);
  kit.addHitTarget(group, binding.id, [2.2, 1.85, 0.5], [0, 0, 0.12]);
}
