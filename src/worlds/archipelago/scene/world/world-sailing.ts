import * as THREE from "three";
import { store, statusOf } from "../../store";
import { wrapAngle } from "../core/ease";
import type { IslandDef } from "../../islands";
import type { IslandObject } from "../island/island";
import type { WorldNavigation } from "./world-navigation";

interface SailingContext {
  sim: number;
  dt: number;
  boundaryK: number;
  ship: {
    pos: THREE.Vector3;
    heading: number;
    speed: number;
    forward: THREE.Vector3;
  };
  islandDefs: IslandDef[];
  getIslandObject: (id: string) => IslandObject | undefined;
  navigation: WorldNavigation;
}

export interface SailingResult {
  speedCap: number;
  nearId: string | null;
}

export function updateSailing(ctx: SailingContext): SailingResult {
  let speedCap = Infinity;
  let nearId: string | null = null;
  let nearD = Infinity;

  if (store.mode !== "sailing") {
    return { speedCap, nearId };
  }

  for (const def of ctx.islandDefs) {
    const obj = ctx.getIslandObject(def.id);
    if (!obj) continue;
    const dx = ctx.ship.pos.x - def.position[0];
    const dz = ctx.ship.pos.z - def.position[1];
    const d = Math.hypot(dx, dz);
    const st = statusOf(def);

    const hardR = obj.radius * 0.9 + 2.5;
    if (d < hardR) {
      const push = (hardR - d) / Math.max(d, 0.01);
      ctx.ship.pos.x += dx * push;
      ctx.ship.pos.z += dz * push;
      ctx.ship.speed *= 0.4;
    }

    ctx.navigation.tryDockCandidate(def, obj, d, ctx.sim);
    if (store.mode !== "sailing") {
      break;
    }
    if (st === "foggy") {
      continue;
    }

    if (d < obj.radius + 30 && d < nearD) {
      nearD = d;
      nearId = def.id;
    }

    if (d < obj.radius + 30) {
      const tox = (def.position[0] - ctx.ship.pos.x) / Math.max(d, 0.01);
      const toz = (def.position[1] - ctx.ship.pos.z) / Math.max(d, 0.01);
      const fwd = ctx.ship.forward;
      if (fwd.x * tox + fwd.z * toz > 0.1) {
        speedCap = Math.min(
          speedCap,
          Math.max(2.6, (d - (obj.radius + 5)) * 0.6),
        );
      }
    }
  }

  if (ctx.boundaryK > 0.01) {
    const toCenter = Math.atan2(-ctx.ship.pos.x, -ctx.ship.pos.z);
    ctx.ship.heading +=
      wrapAngle(toCenter - ctx.ship.heading) *
      Math.min(ctx.boundaryK * 1.1, 1) *
      ctx.dt *
      1.2;
  }

  return { speedCap, nearId };
}
