import { createArchipelagoIslandSources } from "./binding";
import { layoutIslandWorld, type IslandDef } from "./islands";

// The copied island implementation now consumes the Portfolio through the
// Archipelago World Binding. Its original geometry and sailing code stay intact.
export function loadPortfolioIslands(): IslandDef[] {
  return layoutIslandWorld(createArchipelagoIslandSources());
}
