import * as THREE from "three";

// 场景常数集中（原先散落在 world.ts）：等距相机 / 全天周期 / 尺度 / 生物活动边界。

// 等距微缩机位：方位 45° / 仰角 35°（经典 2:1 isometric），世界锁死角度——
// 相机不随船头转，只随船平移 → 像俯瞰一张放在桌上的微缩玩具海。
export const ISO_AZ = Math.PI * 0.25;
export const ISO_EL = (35 * Math.PI) / 180;
export const ISO_DIST = 470; // 压低机位，让海面与岛屿更贴近镜头，但仍高过视野半高避免漏底
export const ISO_DIR = new THREE.Vector3(
  Math.cos(ISO_EL) * Math.sin(ISO_AZ),
  Math.sin(ISO_EL),
  Math.cos(ISO_EL) * Math.cos(ISO_AZ),
);
export const FRUSTUM = 84; // 正交半高：跟随船俯瞰（越小越放大）

export const DAY_CYCLE_SEC = 150; // 一整天流转的真实秒数

export const SHIP_SCALE = 2.0; // 微缩海里把船放大成看得清的玩具
export const DOLPHIN_SCALE = 1.7;
export const WHALE_SCALE = 2.9;

/** 生物活动边界：略小于 WORLD_RADIUS(640)，让海豚/鲸聚在船常去的内圈（原为散落的硬编码 540）。 */
export const CREATURE_BOUND = 540;
