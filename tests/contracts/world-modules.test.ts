import { describe, expect, it } from "vitest";
import { worldRegistry } from "../../src/worlds/registry";

describe("World Module contract", () => {
  for (const [worldId, entry] of Object.entries(worldRegistry)) {
    it(`${worldId} exposes the registry Manifest from its World Module`, async () => {
      const world = await entry.load();

      expect(world.manifest).toBe(entry.manifest);
      expect(world.manifest.id).toBe(worldId);
      expect(world.manifest.supportedActivities).toContain("active");
    });
  }
});
