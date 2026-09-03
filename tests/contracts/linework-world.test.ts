// Linework 契约测试校验 Binding 只引用 Content Kernel 中存在的稳定项目 ID。
// 具体 WebGL 画面交给浏览器截图验证，不在 jsdom 中模拟 renderer。
import { describe, expect, it } from "vitest";
import {
  portfolioCollectionById,
  portfolioPersonById,
  portfolioProjectById,
} from "../../src/content/portfolio";
import { lineworkBinding } from "../../src/worlds/linework/binding";
import { lineworkManifest } from "../../src/worlds/linework/manifest";
import { LINEWORK_CONTROL_IDS } from "../../src/worlds/linework/scene/linework-room";
import { WORLD_PORTALS } from "../../src/worlds/portals.config";
import { WORLD_NAMING } from "../../src/worlds/worlds.config";

describe("Linework World contract", () => {
  it("uses the centralized World naming entry", () => {
    expect(lineworkManifest.id).toBe(WORLD_NAMING.linework.id);
    expect(lineworkManifest.entryPoster).toBe(WORLD_NAMING.linework.entryPoster);
  });

  it("maps each exhibit to existing Content Kernel entries", () => {
    const ids = new Set<string>();

    for (const exhibit of lineworkBinding) {
      expect(ids.has(exhibit.id)).toBe(false);
      ids.add(exhibit.id);
      if (exhibit.kind === "project") {
        expect(portfolioProjectById(exhibit.portfolioId).id).toBe(exhibit.portfolioId);
        continue;
      }

      expect(portfolioPersonById(exhibit.personId).id).toBe(exhibit.personId);
      const collection = portfolioCollectionById(exhibit.collectionId);
      expect(collection.id).toBe(exhibit.collectionId);
      const mediaIds = new Set(collection.media.map((media) => media.id));
      exhibit.mediaIds.forEach((mediaId) => expect(mediaIds.has(mediaId)).toBe(true));
    }
  });

  it("extends the Portal cycle through Linework", () => {
    expect(WORLD_PORTALS.jianghuToLinework.targetWorldId).toBe(WORLD_NAMING.linework.id);
    expect(WORLD_PORTALS.lineworkToStudio.targetWorldId).toBe(WORLD_NAMING.studio.id);
  });

  it("keeps ambient controls separate from Portfolio exhibit IDs", () => {
    const exhibitIds = new Set<string>(lineworkBinding.map((exhibit) => exhibit.id));
    expect(new Set(LINEWORK_CONTROL_IDS).size).toBe(LINEWORK_CONTROL_IDS.length);
    LINEWORK_CONTROL_IDS.forEach((controlId) => expect(exhibitIds.has(controlId)).toBe(false));
  });
});
