// 卧房工作台：一张大桌子承载 3 台显示器、分体无线（左右）倾斜键盘、无鼠标、
// 2 台 MacBook（一台 macOS 一台 Linux）、1 台 iPad（Obsidian todo）与 3 台 Mac mini 组成本地 LLM 集群。
// 屏幕贴图、桌灯发光材质、命中区和展品注册由 StudioRoom 注入与持有。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { StudioExhibitBinding } from "../../binding";
import type { StudioPropKit } from "./studio-prop-kit";

export interface StudioWorkstationParts {
  readonly group: THREE.Group;
  readonly chair: THREE.Group;
}

export function createStudioWorkstation(
  kit: StudioPropKit,
  binding: StudioExhibitBinding,
  materials: {
    readonly deskWoodTexture: THREE.Texture;
    readonly fabricTexture: THREE.Texture;
    readonly lampBulbMaterial: THREE.Material;
  },
): StudioWorkstationParts {
  const group = new THREE.Group();
  const wood = kit.material({
    color: 0xd3c0a5,
    map: materials.deskWoodTexture,
    roughness: 0.5,
  });
  const dark = kit.material({ color: 0x181b1f, roughness: 0.34, metalness: 0.4 });
  const metal = kit.material({ color: 0x40454b, roughness: 0.26, metalness: 0.78 });
  const white = kit.material({ color: 0xf1efe9, roughness: 0.34, metalness: 0.02 });
  const black = kit.material({ color: 0x0f1113, roughness: 0.4, metalness: 0.2 });
  const screenSpace = kit.material({ color: 0x06080b, roughness: 0.2, metalness: 0.1 });

  createStudioDeskSurface(kit, group, wood);
  createStudioDeskLegs(kit, group, metal);
  createStudioDeskDrawer(kit, group, wood, metal);

  // 中央大显示器 + 左右两台，共 3 台
  // 主显示器显示用户的 macOS 桌面截图
  createStudioMonitor(kit, group, dark, metal, screenSpace, 0, 2.75, -3.84, 2.4, 1.42, "/assets/screen.png");
  // 两台侧屏各显示一张不同桌面截图
  createStudioMonitor(kit, group, dark, metal, screenSpace, -1.66, 2.35, -3.7, 1.5, 1.0, "/assets/desktop-side.png");
  createStudioMonitor(kit, group, dark, metal, screenSpace, 1.66, 2.35, -3.7, 1.5, 1.0, "/assets/desktop-side2.png");

  // 分体无线键盘：左右各一块，各自向外倾斜（tenting），无鼠标
  createStudioSplitKeyboard(kit, group, black);

  // 2 台 MacBook，左右各一台：左侧 macOS，右侧 Arch Linux
  // 2 台 MacBook 已移除，桌面只留 3 台显示器与分体键盘。

  // 1 台 iPad（Obsidian todo）放在桌面右侧
  // iPad 与马克杯已移除，桌面只留键盘、显示器与两台 MacBook。
  const chair = createStudioChair(kit, group, materials.fabricTexture);
  createStudioDeskLamp(kit, group, white, materials.lampBulbMaterial);
  kit.scene.add(group);
  kit.registerExhibit(binding, group);
  kit.addHitTarget("workstation", [2.2, 1.5, 0.48], [0, 2.35, -3.56]);
  return { group, chair };
}

function createStudioDeskSurface(
  kit: StudioPropKit,
  parent: THREE.Object3D,
  wood: THREE.Material,
): THREE.Mesh {
  // 桌面加宽并向右延伸，让右边的桌灯稳稳落在桌面上
  return kit.roundedBox(parent, [7.6, 0.28, 2.0], [0.4, 1.5, -3.25], wood, 0.09);
}

function createStudioDeskLegs(
  kit: StudioPropKit,
  parent: THREE.Object3D,
  metal: THREE.Material,
): void {
  for (const x of [-3.3, 4.1]) {
    kit.tubeBetween(parent, [x, 0.12, -3.84], [x, 1.37, -3.84], 0.085, metal);
    kit.tubeBetween(parent, [x, 0.12, -2.66], [x, 1.37, -2.66], 0.085, metal);
    kit.tubeBetween(parent, [x, 0.12, -3.84], [x, 0.12, -2.66], 0.085, metal);
  }
}

function createStudioDeskDrawer(
  kit: StudioPropKit,
  parent: THREE.Object3D,
  wood: THREE.Material,
  metal: THREE.Material,
): THREE.Group {
  const drawer = new THREE.Group();
  parent.add(drawer);
  kit.roundedBox(drawer, [1.04, 0.5, 1.46], [-1.83, 1.12, -3.24], wood, 0.055);
  for (const y of [1.24, 1.02]) {
    kit.roundedBox(drawer, [0.86, 0.16, 1.29], [-1.83, y, -3.18], wood, 0.035);
    kit.roundedBox(drawer, [0.25, 0.025, 0.025], [-1.83, y, -2.52], metal, 0.01);
  }
  return drawer;
}

function createStudioMonitor(
  kit: StudioPropKit,
  parent: THREE.Object3D,
  dark: THREE.Material,
  metal: THREE.Material,
  screen: THREE.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  img?: string,
): THREE.Group {
  const monitor = new THREE.Group();
  parent.add(monitor);
  kit.roundedBox(monitor, [w, h, 0.14], [x, y, z], dark, 0.075);
  // 有 img 时用真实图片当作屏幕，否则用纯色占位。
  const screenMat = img ? kit.imageMaterial(img) : screen;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, h - 0.3), screenMat);
  s.position.set(x, y, z + 0.075);
  monitor.add(s);
  kit.roundedBox(monitor, [0.12, 0.5, 0.12], [x, y - h / 2 - 0.1, z + 0.08], metal, 0.02);
  kit.roundedBox(monitor, [0.6, 0.07, 0.4], [x, y - h / 2 - 0.38, z + 0.1], metal, 0.03);
  return monitor;
}

function createStudioSplitKeyboard(
  kit: StudioPropKit,
  parent: THREE.Object3D,
  black: THREE.Material,
): THREE.Group {
  const kb = new THREE.Group();
  parent.add(kb);
  const keyMaterial = kit.material({ color: 0x2a2f36, roughness: 0.48, metalness: 0.08 });
  const keyGeometry = new RoundedBoxGeometry(0.095, 0.035, 0.09, 2, 0.014);
  // Desk surface: y=1.5, thickness 0.28 => top at 1.64.
  const deskTop = 1.64;
  // 左右两块，各自向内倾斜形成 tenting
  for (const side of [-1, 1]) {
    const half = new THREE.Group();
    half.position.set(side * 0.52, 2.08, -2.78);
    half.rotation.x = -0.06;
    half.rotation.z = -side * 0.34; // tenting 向内倾斜（手腕向内收），更明显的坡角
    kit.roundedBox(half, [0.8, 0.07, 0.4], [0, 0, 0], black, 0.045);
    // 直立支架（作为 kb 的兄弟节点，不随键盘倾斜，从桌面一路撑到键盘下方）
    const stand = new THREE.Group();
    stand.position.set(side * 0.52, 0, -2.78);
    kb.add(stand);
    kit.cylinder(stand, 0.42, 0.34, 0.05, [0, deskTop + 0.025, 0], black);          // 桌面椭圆脚垫
    kit.cylinder(stand, 0.26, 0.2, 0.18, [0, deskTop + 0.14, 0.02], black);         // 立柱下段
    kit.cylinder(stand, 0.2, 0.16, 0.12, [0, deskTop + 0.28, 0.03], black);         // 立柱上段
    kit.cylinder(stand, 0.3, 0.26, 0.04, [0, deskTop + 0.36, 0.03], black);         // 顶部托盘
    const keys = new THREE.InstancedMesh(keyGeometry, keyMaterial, 28);
    const matrix = new THREE.Matrix4();
    let keyIndex = 0;
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        matrix.makeTranslation(-0.33 + column * 0.11, 0.05, -0.12 + row * 0.09);
        keys.setMatrixAt(keyIndex, matrix);
        keyIndex += 1;
      }
    }
    keys.instanceMatrix.needsUpdate = true;
    half.add(keys);
    kb.add(half);
  }
  return kb;
}

function createStudioChair(
  kit: StudioPropKit,
  parent: THREE.Object3D,
  fabricTexture: THREE.Texture,
): THREE.Group {
  const chairPivot = new THREE.Group();
  chairPivot.position.set(0, 0, -0.75);
  const chair = new THREE.Group();
  chair.position.z = 0.75;
  chairPivot.add(chair);
  parent.add(chairPivot);
  const meshFabric = kit.material({
    color: 0x8a8a86,
    map: fabricTexture,
    roughness: 0.94,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
  });
  const cushion = kit.material({ color: 0x8a8a84, map: fabricTexture, roughness: 0.92 });
  const whiteFrame = kit.physicalMaterial({
    color: 0xf3f1eb,
    roughness: 0.28,
    metalness: 0.02,
    clearcoat: 0.34,
    clearcoatRoughness: 0.24,
  });
  const chrome = kit.material({ color: 0xbfc3c2, roughness: 0.2, metalness: 0.82 });
  const rubber = kit.material({ color: 0x17191a, roughness: 0.86 });

  kit.roundedBox(chair, [1.46, 0.18, 1.08], [0, 1.02, -0.75], whiteFrame, 0.16);
  kit.roundedBox(chair, [1.34, 0.22, 0.96], [0, 1.16, -0.72], cushion, 0.17);
  kit.roundedBox(chair, [0.58, 0.18, 0.52], [0, 0.91, -0.72], rubber, 0.08);

  const back = new THREE.Group();
  back.position.set(0, 2.14, -0.31);
  back.rotation.x = -0.08;
  chair.add(back);
  createChairMeshFrame(back, 1.36, 1.42, 0.12, 0.14, whiteFrame, meshFabric);

  kit.roundedBox(back, [0.18, 0.78, 0.13], [0, -0.43, 0.12], whiteFrame, 0.07);
  kit.tubeBetween(back, [0, -0.58, 0.1], [-0.43, -0.16, 0.08], 0.055, whiteFrame);
  kit.tubeBetween(back, [0, -0.58, 0.1], [0.43, -0.16, 0.08], 0.055, whiteFrame);
  kit.roundedBox(back, [0.72, 0.24, 0.11], [0, -0.32, 0.17], cushion, 0.1);

  const headrest = new THREE.Group();
  headrest.position.set(0, 3.24, -0.13);
  headrest.rotation.x = -0.06;
  chair.add(headrest);
  createChairMeshFrame(headrest, 0.9, 0.42, 0.1, 0.11, whiteFrame, meshFabric);
  kit.roundedBox(chair, [0.16, 0.5, 0.12], [0, 2.92, -0.12], whiteFrame, 0.055);

  for (const x of [-0.72, 0.72]) {
    kit.tubeBetween(chair, [x * 0.88, 1.03, -0.68], [x, 1.35, -0.58], 0.06, whiteFrame);
    kit.tubeBetween(chair, [x, 1.35, -0.58], [x, 1.56, -0.49], 0.06, whiteFrame);
    kit.roundedBox(chair, [0.3, 0.1, 0.68], [x, 1.58, -0.58], whiteFrame, 0.05);
    kit.roundedBox(chair, [0.24, 0.06, 0.58], [x, 1.64, -0.57], cushion, 0.035);
  }

  kit.cylinder(chair, 0.11, 0.11, 0.66, [0, 0.63, -0.75], chrome);
  kit.cylinder(chair, 0.16, 0.16, 0.5, [0, 0.54, -0.75], whiteFrame);
  kit.cylinder(chair, 0.23, 0.2, 0.18, [0, 0.32, -0.75], whiteFrame);
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const endX = Math.sin(angle) * 0.78;
    const endZ = -0.75 + Math.cos(angle) * 0.78;
    kit.tubeBetween(chair, [0, 0.29, -0.75], [endX, 0.17, endZ], 0.065, whiteFrame);
    kit.tubeBetween(chair, [endX, 0.17, endZ], [endX, 0.1, endZ], 0.035, chrome);
    kit.cylinder(chair, 0.095, 0.095, 0.18, [endX, 0.08, endZ], rubber, [Math.PI / 2, 0, 0]);
  }
  return chairPivot;
}

function createChairMeshFrame(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  frameWidth: number,
  frameMaterial: THREE.Material,
  meshMaterial: THREE.Material,
): THREE.Group {
  const frame = new THREE.Group();
  const outer = createChairPanelPoints(width, height);
  const inner = createChairPanelPoints(width - frameWidth * 2, height - frameWidth * 2);
  const frameShape = new THREE.Shape(outer);
  frameShape.holes.push(new THREE.Path([...inner].reverse()));
  const frameGeometry = new THREE.ExtrudeGeometry(frameShape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.022,
    bevelSegments: 3,
  });
  frameGeometry.translate(0, 0, -depth / 2);
  frame.add(new THREE.Mesh(frameGeometry, frameMaterial));

  const panel = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(inner), 32), meshMaterial);
  panel.position.z = -depth * 0.54;
  frame.add(panel);
  parent.add(frame);
  return frame;
}

function createChairPanelPoints(width: number, height: number): THREE.Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const anchors = [
    new THREE.Vector3(-halfWidth * 0.48, -halfHeight, 0),
    new THREE.Vector3(-halfWidth * 0.88, -halfHeight * 0.55, 0),
    new THREE.Vector3(-halfWidth * 0.96, halfHeight * 0.58, 0),
    new THREE.Vector3(-halfWidth * 0.68, halfHeight, 0),
    new THREE.Vector3(halfWidth * 0.68, halfHeight, 0),
    new THREE.Vector3(halfWidth * 0.96, halfHeight * 0.58, 0),
    new THREE.Vector3(halfWidth * 0.88, -halfHeight * 0.55, 0),
    new THREE.Vector3(halfWidth * 0.48, -halfHeight, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(anchors, true, "catmullrom", 0.18);
  return curve.getSpacedPoints(40).map((point) => new THREE.Vector2(point.x, point.y));
}

function createStudioDeskLamp(
  kit: StudioPropKit,
  parent: THREE.Object3D,
  material: THREE.Material,
  lampBulbMaterial: THREE.Material,
): THREE.Group {
  const lamp = new THREE.Group();
  parent.add(lamp);
  const joint = kit.material({ color: 0x52585d, roughness: 0.22, metalness: 0.78 });
  kit.cylinder(lamp, 0.34, 0.38, 0.09, [3.4, 1.62, -3.2], material);
  kit.tubeBetween(lamp, [3.4, 1.68, -3.2], [3.56, 2.3, -3.2], 0.045, joint);
  kit.tubeBetween(lamp, [3.56, 2.3, -3.2], [3.1, 2.78, -3.2], 0.045, joint);
  for (const point of [[3.4, 1.68, -3.2], [3.56, 2.3, -3.2]] as const) {
    const jointBall = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16), joint);
    jointBall.position.set(point[0], point[1], point[2]);
    lamp.add(jointBall);
  }
  const shade = kit.cylinder(lamp, 0.18, 0.42, 0.52, [2.98, 2.89, -3.2], material, [0, 0, -1.08]);
  shade.userData.noShadow = true;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), lampBulbMaterial);
  bulb.position.set(2.78, 2.98, -3.2);
  lamp.add(bulb);
  kit.addHitTarget("lamp", [1.15, 1.9, 0.85], [3.2, 2.2, -3.16]);
  return lamp;
}
