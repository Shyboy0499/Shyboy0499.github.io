import * as THREE from "three";
import {
  store,
  statusOf,
  markVisited,
  islandById,
  showToast,
  foundCount,
  discoverableCount,
} from "../../store";
import type { IslandDef } from "../../islands";
import type { BABEL_TOWER_LANDMARK } from "../../landmarks";
import type { IslandObject } from "../island/island";

// 世界航行交互的状态边界：负责靠近、登岛、离岛和快速旅行，不负责具体 3D 造型。
// 地标和作品岛共用航行状态，但地标没有 docked 停靠面板，因此离开后需要单独防止原地重开。
const INACTIVE_ISLAND_MESSAGE = "这片海域正在等待下一件作品";
type LandmarkDef = typeof BABEL_TOWER_LANDMARK;

interface WorldNavigationDeps {
  getSimTime: () => number;
  clearControls: () => void;
  getShipState: () => { pos: THREE.Vector3; heading: number; speed: number };
  getIslandObject: (id: string) => IslandObject | undefined;
  getLandmark: (id: string) => LandmarkDef | undefined;
  spawnUnlockRing: (x: number, z: number, sim: number, color?: string) => void;
  enterLandmark: (id: string, sim: number) => void;
  leaveLandmark: (id: string) => void;
}

export class WorldNavigation {
  private readonly getSimTime: () => number;
  private readonly clearControls: () => void;
  private readonly getShipState: () => {
    pos: THREE.Vector3;
    heading: number;
    speed: number;
  };
  private readonly getIslandObject: (id: string) => IslandObject | undefined;
  private readonly getLandmark: (id: string) => LandmarkDef | undefined;
  private readonly spawnUnlockRing: (
    x: number,
    z: number,
    sim: number,
    color?: string,
  ) => void;
  private readonly enterLandmark: (id: string, sim: number) => void;
  private readonly leaveLandmark: (id: string) => void;

  private manualTargetId: string | null = null;
  private foggyToasted = new Set<string>();
  private noDockUntil = -1;
  private autoLandAt = -1;
  private suppressedLandmarkId: string | null = null;

  constructor(deps: WorldNavigationDeps) {
    this.getSimTime = deps.getSimTime;
    this.clearControls = deps.clearControls;
    this.getShipState = deps.getShipState;
    this.getIslandObject = deps.getIslandObject;
    this.getLandmark = deps.getLandmark;
    this.spawnUnlockRing = deps.spawnUnlockRing;
    this.enterLandmark = deps.enterLandmark;
    this.leaveLandmark = deps.leaveLandmark;
  }

  getAutoLandAt(): number {
    return this.autoLandAt;
  }

  clearAutoLand(): void {
    this.autoLandAt = -1;
  }

  markNoDockUntil(sim: number): void {
    this.noDockUntil = sim;
  }

  queueAutoLandAt(sim: number): void {
    this.autoLandAt = sim;
  }

  private faceAwayFromIsland(def: IslandDef): void {
    const ship = this.getShipState();
    const dx = ship.pos.x - def.position[0];
    const dz = ship.pos.z - def.position[1];
    const d = Math.hypot(dx, dz) || 1;
    ship.heading = Math.atan2(dx / d, dz / d);
  }

  fastTravelTo(id: string): void {
    const def = islandById(id);
    if (!def || store.mode === "landed") {
      if (!def) this.fastTravelToLandmark(id);
      return;
    }
    if (statusOf(def) === "foggy") {
      showToast(INACTIVE_ISLAND_MESSAGE);
      return;
    }
    const obj = this.getIslandObject(id);
    if (!obj) return;
    const ship = this.getShipState();
    let dx = ship.pos.x - def.position[0];
    let dz = ship.pos.z - def.position[1];
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl;
    dz /= dl;
    ship.pos.set(
      def.position[0] + dx * (obj.radius + 6),
      0,
      def.position[1] + dz * (obj.radius + 6),
    );
    ship.heading = Math.atan2(dx, dz);
    ship.speed = 0;
    this.clearControls();
    store.mode = "docked";
    store.dockedId = id;
    this.manualTargetId = null;
    this.noDockUntil = this.getSimTime() + 1.5;
    if (statusOf(def) === "locked") {
      this.unlockIsland(def, this.getSimTime());
    } else {
      showToast(`已抵达「${def.name}」`);
    }
    this.land();
  }

  setManualTarget(id: string): void {
    const def = islandById(id);
    if (!def) {
      const landmark = this.getLandmark(id);
      if (!landmark) return;
      store.targetId = id;
      showToast(`目标已设为「${landmark.name}」`);
      return;
    }
    if (statusOf(def) === "foggy") {
      showToast(INACTIVE_ISLAND_MESSAGE);
      return;
    }
    this.manualTargetId = id;
    store.targetId = id;
    showToast(`目标已设为「${def.name}」`);
  }

  pickAutoTarget(islandDefs: IslandDef[], shipPos: THREE.Vector3): void {
    if (this.manualTargetId) {
      const def = islandById(this.manualTargetId);
      if (!def || statusOf(def) === "foggy") this.manualTargetId = null;
      else {
        store.targetId = this.manualTargetId;
        return;
      }
    }
    const curDef = store.targetId ? islandById(store.targetId) : undefined;
    if (store.targetId && this.getLandmark(store.targetId)) return;
    if (curDef && statusOf(curDef) === "locked") return;
    let best: string | null = null;
    let bestD = Infinity;
    for (const def of islandDefs) {
      if (statusOf(def) !== "locked") continue;
      const d = Math.hypot(
        def.position[0] - shipPos.x,
        def.position[1] - shipPos.z,
      );
      if (d < bestD) {
        bestD = d;
        best = def.id;
      }
    }
    store.targetId = best;
  }

  tryDockCandidate(
    def: IslandDef,
    obj: IslandObject,
    d: number,
    sim: number,
  ): void {
    const st = statusOf(def);
    if (st === "foggy") {
      if (d >= obj.radius + 14) {
        this.foggyToasted.delete(def.id);
        return;
      }
      if (d < obj.radius + 10 && !this.foggyToasted.has(def.id)) {
        this.foggyToasted.add(def.id);
        showToast(INACTIVE_ISLAND_MESSAGE);
      }
      return;
    }
    if (d >= obj.radius + 8.5 || sim <= this.noDockUntil) {
      return;
    }
    const ship = this.getShipState();
    store.mode = "docked";
    store.dockedId = def.id;
    ship.speed = 0;
    this.faceAwayFromIsland(def);
    if (st === "locked") {
      this.manualTargetId =
        this.manualTargetId === def.id ? null : this.manualTargetId;
      this.unlockIsland(def, sim);
    }
    this.land();
  }

  tryDockLandmark(id: string, distance: number, sim: number): void {
    const landmark = this.getLandmark(id);
    if (
      !landmark ||
      distance >= landmark.radius + 8.5 ||
      sim <= this.noDockUntil
    )
      return;
    if (this.suppressedLandmarkId === landmark.id) return;
    const ship = this.getShipState();
    const [x, z] = landmark.position;
    store.mode = "docked";
    store.dockedId = landmark.id;
    ship.speed = 0;
    const dx = ship.pos.x - x;
    const dz = ship.pos.z - z;
    const d = Math.hypot(dx, dz) || 1;
    ship.heading = Math.atan2(dx / d, dz / d);
    this.manualTargetId =
      this.manualTargetId === landmark.id ? null : this.manualTargetId;
    this.spawnUnlockRing(x, z, sim, "#ffcf6e");
    this.enterLandmark(landmark.id, sim);
    this.land();
  }

  land(): void {
    if (!store.dockedId) return;
    const def = islandById(store.dockedId);
    const obj = this.getIslandObject(store.dockedId);
    const landmark = this.getLandmark(store.dockedId);
    if (landmark) {
      store.mode = "landed";
      return;
    }
    if (!def || !obj) return;
    store.mode = "landed";
    obj.setFocused(true);
  }

  leave(): void {
    if (store.mode !== "landed") return;
    if (store.dockedId) {
      this.getIslandObject(store.dockedId)?.setFocused(false);
      if (this.getLandmark(store.dockedId)) {
        this.leaveLandmark(store.dockedId);
        this.suppressedLandmarkId = store.dockedId;
        store.dockedId = null;
        store.targetId = null;
        store.mode = "sailing";
        return;
      }
    }
    store.mode = "docked";
  }

  private fastTravelToLandmark(id: string): void {
    const landmark = this.getLandmark(id);
    if (!landmark || store.mode === "landed") return;
    const ship = this.getShipState();
    const [x, z] = landmark.position;
    let dx = ship.pos.x - x;
    let dz = ship.pos.z - z;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl;
    dz /= dl;
    ship.pos.set(
      x + dx * (landmark.radius + 6),
      0,
      z + dz * (landmark.radius + 6),
    );
    ship.heading = Math.atan2(dx, dz);
    ship.speed = 0;
    this.clearControls();
    store.mode = "docked";
    store.dockedId = landmark.id;
    this.manualTargetId = null;
    this.noDockUntil = this.getSimTime() + 1.5;
    this.enterLandmark(landmark.id, this.getSimTime());
    this.land();
  }

  releaseSuppressedLandmark(id: string, distance: number): void {
    const landmark = this.getLandmark(id);
    if (!landmark || this.suppressedLandmarkId !== landmark.id) return;
    if (distance >= landmark.radius + 14) this.suppressedLandmarkId = null;
  }

  private unlockIsland(def: IslandDef, sim: number): void {
    const obj = this.getIslandObject(def.id);
    if (!obj) return;
    markVisited(def.id);
    obj.playUnlock(sim);
    this.spawnUnlockRing(def.position[0], def.position[1], sim);
    showToast(
      `发现「${def.name}」，已到访 ${foundCount.value} / ${discoverableCount.value} 座岛`,
    );
  }
}
