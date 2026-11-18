// 线稿吊扇资产负责吊杆、机身、四片叶片和控制命中区。
// 是否旋转与旋转速度由 LineworkRoom 的 Activity 状态决定。
import * as THREE from "three";
import { createLineworkFanBlade, createLineworkFanHub, createLineworkFanRod } from "./elements/fan-elements";
import { type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkCeilingFan(kit: LineworkPropKit): THREE.Group {
  const fan = new THREE.Group();
  fan.position.set(-0.2, 5.35, -0.85);
  kit.scene.add(fan);
  createLineworkFanRod(kit, fan);
  createLineworkFanHub(kit, fan);
  for (let index = 0; index < 4; index += 1) {
    createLineworkFanBlade(kit, fan, index * (Math.PI / 2));
  }
  kit.addHitTarget(fan, "fan", [1.2, 0.82, 1.2], [0, 0, 0], "control");
  return fan;
}
