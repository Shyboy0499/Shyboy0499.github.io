// Studio 契约测试校验第五世界只通过稳定 ID 引用 Content Kernel。
// WebGL 布局、拖拽与光照效果由浏览器验证，不在 jsdom 中模拟。
import { describe, expect, it } from "vitest";
import {
  portfolioCollectionById,
  portfolioPersonById,
  portfolioProjectById,
} from "../../src/content/portfolio";
import { studioBinding } from "../../src/worlds/studio/binding";
import { studioManifest } from "../../src/worlds/studio/manifest";
import {
  STUDIO_CONTROL_IDS,
  STUDIO_PORTAL_TARGETS,
} from "../../src/worlds/studio/scene/studio-room";
import { WORLD_PORTALS } from "../../src/worlds/portals.config";
import { WORLD_NAMING } from "../../src/worlds/worlds.config";

describe("Studio World contract", () => {
  it("uses the centralized World naming entry", () => {
    expect(studioManifest.id).toBe(WORLD_NAMING.studio.id);
    expect(studioManifest.entryPoster).toBe(WORLD_NAMING.studio.entryPoster);
  });

  it("maps every exhibit to existing Content Kernel entries", () => {
    const ids = new Set<string>();

    for (const exhibit of studioBinding) {
      expect(ids.has(exhibit.id)).toBe(false);
      ids.add(exhibit.id);
      // Studio is a room-tour-only build: every exhibit is a project.
      expect(exhibit.kind).toBe("project");
      expect(portfolioProjectById(exhibit.portfolioId).id).toBe(exhibit.portfolioId);
    }
  });

  it("keeps Studio as the sole world (portals are disabled on the room-tour build)", () => {
    // Studio is the only world a visitor can inhabit; portal traversal is disabled.
    expect(STUDIO_PORTAL_TARGETS).toEqual({
      "portal-cosmic": WORLD_NAMING.cosmic.id,
      "portal-linework": WORLD_NAMING.linework.id,
      "portal-archipelago": WORLD_NAMING.archipelago.id,
    });
  });

  it("keeps room controls separate from Portfolio exhibit IDs", () => {
    const exhibitIds = new Set<string>(studioBinding.map((exhibit) => exhibit.id));
    expect(new Set(STUDIO_CONTROL_IDS).size).toBe(STUDIO_CONTROL_IDS.length);
    STUDIO_CONTROL_IDS.forEach((controlId) => expect(exhibitIds.has(controlId)).toBe(false));
  });
});
