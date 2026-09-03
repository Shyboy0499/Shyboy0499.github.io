// Studio 书架资产负责搁板、书本合唱节点和可视化音符。
// 合唱节奏与减少动态效果策略由 StudioRoom 统一持有。
import * as THREE from "three";
import type { StudioPropKit } from "./studio-prop-kit";

export interface StudioShelfParts {
  readonly choirBooks: readonly THREE.Group[];
  readonly musicNotes: readonly THREE.Group[];
  readonly noteMaterials: readonly THREE.MeshStandardMaterial[];
}

export function createStudioShelf(
  kit: StudioPropKit,
  deskWoodTexture: THREE.Texture,
): StudioShelfParts {
  const wood = kit.material({ color: 0x9d6c43, map: deskWoodTexture, roughness: 0.56 });
  const bracket = kit.material({ color: 0x2d3134, roughness: 0.28, metalness: 0.7 });
  const colors = [0x31587a, 0xd4a24c, 0x8d4a52, 0xe5e0cd, 0x445046];
  const choirBooks: THREE.Group[] = [];
  const musicNotes: THREE.Group[] = [];
  const noteMaterials: THREE.MeshStandardMaterial[] = [];
  kit.roundedBox(kit.scene, [2.45, 0.17, 0.52], [0.45, 4.92, -4.55], wood, 0.055);
  for (const x of [-0.35, 1.25]) {
    kit.tubeBetween(kit.scene, [x, 4.84, -4.52], [x, 4.48, -4.7], 0.035, bracket);
    kit.tubeBetween(kit.scene, [x, 4.84, -4.52], [x, 4.48, -4.52], 0.035, bracket);
  }
  colors.forEach((color, index) => {
    const bookX = -0.18 + index * 0.32;
    const bookHeight = 0.74 + (index % 3) * 0.12;
    const book = new THREE.Group();
    book.position.set(bookX, 5.01, -4.5);
    book.userData.baseRotation = (index - 2) * 0.025;
    kit.scene.add(book);
    kit.roundedBox(
      book,
      [0.18 + (index % 2) * 0.05, bookHeight, 0.34],
      [0, bookHeight / 2, 0],
      kit.material({ color, roughness: 0.82 }),
      0.025,
    );
    kit.roundedBox(
      book,
      [0.035, bookHeight * 0.62, 0.018],
      [0, bookHeight / 2, 0.19],
      kit.material({ color: 0xe8e2d4, roughness: 0.8 }),
      0.008,
    );
    choirBooks.push(book);
  });
  for (const x of [-0.43, 1.43]) {
    const end = new THREE.Group();
    end.position.set(x, 5.12, -4.43);
    kit.scene.add(end);
    kit.roundedBox(end, [0.08, 0.46, 0.34], [0, 0.18, 0], bracket, 0.025);
    kit.roundedBox(end, [0.32, 0.08, 0.34], [x < 0 ? 0.12 : -0.12, -0.01, 0], bracket, 0.025);
  }
  for (let index = 0; index < 3; index += 1) {
    const note = new THREE.Group();
    note.position.set(-0.08 + index * 0.52, 5.92, -4.38);
    note.userData.basePosition = note.position.clone();
    const material = kit.material({
      color: index === 1 ? 0xd7ad56 : 0x425e68,
      emissive: index === 1 ? 0x72541c : 0x16343d,
      emissiveIntensity: 0.48,
      transparent: true,
      opacity: 0,
      roughness: 0.4,
      metalness: 0.18,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), material);
    head.scale.set(1.25, 0.8, 0.58);
    note.add(head);
    kit.cylinder(note, 0.015, 0.015, 0.34, [0.07, 0.17, 0], material);
    kit.roundedBox(note, [0.18, 0.025, 0.025], [0.14, 0.33, 0], material, 0.008, [0, 0, -0.3]);
    note.visible = false;
    kit.scene.add(note);
    musicNotes.push(note);
    noteMaterials.push(material);
  }
  return { choirBooks, musicNotes, noteMaterials };
}
