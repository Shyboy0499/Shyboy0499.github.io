// 线稿书架资产负责书柜、隔板和书本堆叠几何。
// 展品选中、高亮和语义内容仍由 LineworkRoom 与 binding 管理。
import * as THREE from "three";
import type { LineworkExhibitBinding } from "../../binding";
import {
  createLineworkBookshelfCase,
  createLineworkBookshelfShelf,
  createLineworkStackedBook,
  createLineworkStandingBook,
} from "./elements/bookshelf-elements";
import { PAPER, type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkBookshelf(
  kit: LineworkPropKit,
  group: THREE.Group,
  binding: LineworkExhibitBinding,
  ink: THREE.LineBasicMaterial,
): void {
  group.position.set(4.35, 0, -3.7);
  createLineworkBookshelfCase(kit, group, ink);
  for (const y of [0.72, 1.72, 2.72, 3.72]) {
    createLineworkBookshelfShelf(kit, group, y, ink);
  }
  const bookColors = [PAPER, 0xf7f7f7, PAPER, 0xeeeeee];
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let book = 0; book < 4; book += 1) {
      const height = 0.48 + ((book + shelf) % 3) * 0.1;
      createLineworkStandingBook(
        kit,
        group,
        [0.18 + (book % 2) * 0.04, height, 0.54],
        [-0.72 + book * 0.28, 0.84 + shelf + height / 2, 0.14],
        ink,
        bookColors[(book + shelf) % bookColors.length],
      );
    }
    createLineworkStackedBook(kit, group, [0.72, 0.1, 0.54], [0.54, 0.84 + shelf, 0.14], ink, bookColors[(shelf + 1) % bookColors.length]);
    createLineworkStackedBook(kit, group, [0.62, 0.1, 0.5], [0.58, 0.96 + shelf, 0.14], ink, bookColors[(shelf + 2) % bookColors.length], [0, 0.04 * (shelf % 2 === 0 ? 1 : -1), 0]);
  }
  kit.addHitTarget(group, binding.id, [2.6, 4.6, 1.2], [0, 2.25, 0]);
}
