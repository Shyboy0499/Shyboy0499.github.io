// 线稿边桌资产负责小桌和圆形托盘几何。
// 它不注册展品，只为房间侧边补足生活陈设。
import * as THREE from "three";
import {
  createLineworkFurnitureLeg,
  createLineworkFurniturePanel,
  createLineworkRoundTray,
} from "./elements/furniture-elements";
import { type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkSideTable(kit: LineworkPropKit): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-4.65, 0, 1.15);
  kit.scene.add(group);
  createLineworkFurniturePanel(kit, group, [1.45, 0.14, 0.92], [0, 1.06, 0]);
  for (const x of [-0.58, 0.58]) {
    for (const z of [-0.34, 0.34]) createLineworkFurnitureLeg(kit, group, [0.11, 1.04, 0.11], [x, 0.52, z]);
  }
  createLineworkRoundTray(kit, group, [0, 1.18, 0]);
  return group;
}
