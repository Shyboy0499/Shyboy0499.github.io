// 右墙「代码之外」展区：研究海报、拉花咖啡角、钓鱼与健身，各自注册为可交互展品。
// 只负责几何与命中区；文案和图片语义来自 Content Kernel，镜头角度来自 binding。
import * as THREE from "three";
import type { StudioExhibitBinding, StudioExhibitId } from "../../binding";
import type { StudioPropKit } from "./studio-prop-kit";

// 右墙内表面在 x≈5.9；挂件贴墙放置并整体绕 Y 轴转 -90°，使正面朝向房间（-X）。
const WALL_X = 5.84;
const FACE_ROOM: readonly [number, number, number] = [0, -Math.PI / 2, 0];

// StudioRoom 选中/悬停时会按组原点缩放展品；组原点必须落在墙面上，
// 否则以房间原点缩放会把挂画推进墙里。子物件按世界坐标建好后再整体平移到锚点。
function anchorAt(group: THREE.Group, anchor: readonly [number, number, number]): void {
  const offset = new THREE.Vector3(...anchor);
  group.children.forEach((child) => child.position.sub(offset));
  group.position.copy(offset);
}

export function createStudioLifeWall(
  kit: StudioPropKit,
  bindings: readonly StudioExhibitBinding[],
  deskWoodTexture: THREE.Texture,
): void {
  const binding = (id: StudioExhibitId) => bindings.find((item) => item.id === id)!;
  const wood = kit.material({ color: 0xb59a7a, map: deskWoodTexture, roughness: 0.62 });
  const white = kit.material({ color: 0xf4f2ee, roughness: 0.5 });
  const steel = kit.material({ color: 0xc4c8cc, roughness: 0.28, metalness: 0.72 });
  const charcoal = kit.material({ color: 0x33383e, roughness: 0.5, metalness: 0.2 });

  // 研究海报：precondition-library，挂在植物上方的后角。
  const poster = kit.imagePanel(kit.scene, "/studio-world/life/research-poster.webp", [1.0, 1.4], [WALL_X, 3.55, -3.55], FACE_ROOM);
  kit.registerExhibit(binding("research-poster"), poster);
  kit.addHitTarget("research-poster", [0.35, 1.6, 1.2], [WALL_X - 0.12, 3.55, -3.55]);

  // 拉花咖啡角：三幅拉花挂画 + 下方矮柜上的咖啡机、拉花缸和杯子。
  const latte = new THREE.Group();
  kit.scene.add(latte);
  [-1.4, -0.6, 0.2].forEach((z, index) => {
    const src = ["latte-tiger", "latte-unicorn", "latte-seahorse"][index];
    kit.imagePanel(latte, `/studio-world/life/${src}.webp`, [0.68, 0.68], [WALL_X, 3.6, z], FACE_ROOM);
  });
  kit.roundedBox(latte, [0.62, 1.0, 1.8], [5.56, 0.5, -0.6], white, 0.04);
  kit.roundedBox(latte, [0.7, 0.06, 1.9], [5.53, 1.03, -0.6], wood, 0.02);
  // 咖啡机：机身、顶部温杯盘、冲煮头与手柄。
  kit.roundedBox(latte, [0.5, 0.56, 0.56], [5.6, 1.34, -1.05], steel, 0.05);
  kit.roundedBox(latte, [0.46, 0.04, 0.5], [5.6, 1.64, -1.05], charcoal, 0.015);
  kit.cylinder(latte, 0.07, 0.07, 0.08, [5.3, 1.3, -1.05], charcoal);
  kit.roundedBox(latte, [0.26, 0.04, 0.05], [5.17, 1.28, -1.05], charcoal, 0.015);
  kit.roundedBox(latte, [0.36, 0.03, 0.36], [5.38, 1.08, -1.05], charcoal, 0.01);
  // 拉花缸与杯碟。
  kit.cylinder(latte, 0.075, 0.09, 0.2, [5.45, 1.16, -0.5], steel);
  kit.cylinder(latte, 0.15, 0.15, 0.015, [5.45, 1.07, -0.05], white);
  kit.cylinder(latte, 0.1, 0.075, 0.1, [5.45, 1.13, -0.05], white);
  kit.cylinder(latte, 0.085, 0.085, 0.005, [5.45, 1.18, -0.05], kit.material({ color: 0xc89466, roughness: 0.4 }));
  anchorAt(latte, [WALL_X, 0, -0.6]);
  kit.registerExhibit(binding("latte-art"), latte);
  kit.addHitTarget("latte-art", [0.8, 3.5, 2.1], [5.5, 2.2, -0.6]);

  // 钓鱼：海边插画 + 斜靠墙的鱼竿。
  const fishing = new THREE.Group();
  kit.scene.add(fishing);
  kit.imagePanel(fishing, "/studio-world/life/fishing.webp", [1.05, 0.7], [WALL_X, 3.4, 1.5], FACE_ROOM);
  kit.tubeBetween(fishing, [5.42, 0.06, 1.55], [5.84, 2.8, 1.95], 0.022, charcoal);
  kit.tubeBetween(fishing, [5.42, 0.06, 1.55], [5.52, 0.74, 1.65], 0.045, kit.material({ color: 0x8a5a3a, roughness: 0.7 }));
  kit.cylinder(fishing, 0.07, 0.07, 0.07, [5.5, 0.6, 1.63], steel, [0, 0, Math.PI / 2]);
  anchorAt(fishing, [WALL_X, 0, 1.6]);
  kit.registerExhibit(binding("fishing"), fishing);
  kit.addHitTarget("fishing", [0.7, 3.8, 1.2], [5.55, 1.9, 1.6]);

  // 健身：插画 + 地上的一对哑铃。
  const gym = new THREE.Group();
  kit.scene.add(gym);
  kit.imagePanel(gym, "/studio-world/life/gym.webp", [0.8, 0.8], [WALL_X, 3.3, 3.4], FACE_ROOM);
  [3.15, 3.65].forEach((z) => {
    kit.cylinder(gym, 0.025, 0.025, 0.46, [5.2, 0.12, z], steel, [0, 0, Math.PI / 2]);
    kit.cylinder(gym, 0.11, 0.11, 0.08, [4.99, 0.12, z], charcoal, [0, 0, Math.PI / 2]);
    kit.cylinder(gym, 0.11, 0.11, 0.08, [5.41, 0.12, z], charcoal, [0, 0, Math.PI / 2]);
  });
  anchorAt(gym, [WALL_X, 0, 3.4]);
  kit.registerExhibit(binding("gym"), gym);
  kit.addHitTarget("gym", [0.9, 3.6, 1.2], [5.35, 1.8, 3.4]);
}
