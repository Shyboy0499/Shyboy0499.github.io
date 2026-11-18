// 线稿茶几资产负责桌体、书本和杯子几何。
// 它只作为静态陈设挂入场景，不持有交互状态。
import * as THREE from "three";
import {
  createLineworkBookObject,
  createLineworkCupObject,
  createLineworkFurnitureLeg,
  createLineworkFurniturePanel,
} from "./elements/furniture-elements";
import { type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkCoffeeTable(kit: LineworkPropKit): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0.8, 0, 0.15);
  kit.scene.add(group);
  createLineworkFurniturePanel(kit, group, [2.3, 0.14, 1.25], [0, 0.78, 0]);
  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.42, 0.42]) createLineworkFurnitureLeg(kit, group, [0.12, 0.74, 0.12], [x, 0.37, z]);
  }
  createLineworkBookObject(kit, group, [0.56, 0.08, 0.38], [0.18, 0.88, -0.04]);
  createLineworkBookObject(kit, group, [0.48, 0.07, 0.34], [0.24, 0.96, -0.02], [0, 0.08, 0]);
  createLineworkCupObject(kit, group, [-0.45, 0.94, 0.16]);
  return group;
}
