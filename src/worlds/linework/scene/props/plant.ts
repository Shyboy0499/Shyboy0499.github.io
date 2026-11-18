// 线稿植物资产负责盆栽、茎线和叶片几何。
// 摆动动画由房间持有 plantStems 引用统一驱动。
import * as THREE from "three";
import {
  createLineworkPlantLeaf,
  createLineworkPlantPot,
  createLineworkPlantStemPoints,
} from "./elements/plant-elements";
import { type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkPlant(kit: LineworkPropKit): THREE.Group {
  const group = new THREE.Group();
  const plantStems = new THREE.Group();
  group.position.set(-0.75, 0, 3.3);
  kit.scene.add(group);
  createLineworkPlantPot(kit, group);
  const stems: THREE.Vector3[] = [];
  for (let index = 0; index < 8; index += 1) {
    const { root, tip, angle } = createLineworkPlantStemPoints(index);
    stems.push(root, tip);
    createLineworkPlantLeaf(kit, group, tip, angle, index);
  }
  kit.addSegments(plantStems, stems);
  group.add(plantStems);
  return plantStems;
}
