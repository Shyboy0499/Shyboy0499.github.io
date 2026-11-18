// 线稿沙发资产负责沙发主体、扶手、靠垫和靠枕几何。
// 它是静态陈设，不参与 Linework 的展品选择状态。
import * as THREE from "three";
import {
  createLineworkSofaArm,
  createLineworkSofaBack,
  createLineworkSofaBackCushion,
  createLineworkSofaCushion,
  createLineworkSofaPillow,
  createLineworkSofaSeat,
} from "./elements/sofa-elements";
import { GUIDE_INK, type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkSofa(kit: LineworkPropKit): THREE.Group {
  const group = new THREE.Group();
  group.position.set(1.65, 0, -2.55);
  kit.scene.add(group);
  createLineworkSofaSeat(kit, group);
  createLineworkSofaBack(kit, group);
  createLineworkSofaArm(kit, group, -1.42);
  createLineworkSofaArm(kit, group, 1.42);
  for (const position of [
    [-1.18, 0.2, -0.42],
    [1.18, 0.2, -0.42],
    [-1.18, 0.2, 0.42],
    [1.18, 0.2, 0.42],
  ] as const) {
    kit.box(group, [0.16, 0.55, 0.16], position);
  }
  for (const x of [-0.67, 0.67]) {
    createLineworkSofaCushion(kit, group, x);
    createLineworkSofaBackCushion(kit, group, x);
  }
  createLineworkSofaPillow(kit, group);

  // 软包接缝和落地排线只补充体积关系，避免把白色沙发重新画成实心物块。
  kit.addSegments(group, [
    new THREE.Vector3(-1.3, 0.54, 0.66),
    new THREE.Vector3(1.3, 0.54, 0.66),
    new THREE.Vector3(0, 1.18, -0.34),
    new THREE.Vector3(0, 1.18, 0.58),
    new THREE.Vector3(-1.28, 1.25, -0.14),
    new THREE.Vector3(1.28, 1.25, -0.14),
  ]);
  const contactHatching: THREE.Vector3[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let x = -1.24 + row * 0.1; x <= 1.18; x += 0.38) {
      const z = 0.7 + row * 0.1;
      contactHatching.push(
        new THREE.Vector3(x, 0.018, z),
        new THREE.Vector3(x + 0.22, 0.018, z),
      );
    }
  }
  kit.addSegments(group, contactHatching, new THREE.LineBasicMaterial({
    color: GUIDE_INK,
    transparent: true,
    opacity: 0.3,
  }));
  return group;
}
