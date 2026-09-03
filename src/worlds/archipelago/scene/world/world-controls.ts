// 海岛世界输入控制：把键鼠/触控转换为航行、登岛和传送入口意图。
// 它只做命中解析和意图分发，不直接修改 Three.js 世界状态。
import * as THREE from "three";
import { store } from "../../store";
import type { KnownWorldId } from "../../../worlds.config";

interface WorldControlsDeps {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  getPaused: () => boolean;
  land: () => void;
  fastTravelTo: (id: string) => void;
  findDockedChestHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  findWhirlpoolPortalHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  findLandmarkHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  findIslandHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  resolveIslandId: (object: THREE.Object3D | null) => string | undefined;
  openProject: (projectId: string) => void;
  requestWorldPortal: (worldId: KnownWorldId) => void;
}

export class WorldControls {
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.Camera;
  private readonly getPaused: () => boolean;
  private readonly land: () => void;
  private readonly fastTravelTo: (id: string) => void;
  private readonly findDockedChestHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  private readonly findWhirlpoolPortalHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  private readonly findLandmarkHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  private readonly findIslandHit: (
    raycaster: THREE.Raycaster,
  ) => THREE.Intersection<THREE.Object3D> | undefined;
  private readonly resolveIslandId: (
    object: THREE.Object3D | null,
  ) => string | undefined;
  private readonly openProject: (projectId: string) => void;
  private readonly requestWorldPortal: (worldId: KnownWorldId) => void;
  private readonly keys = new Set<string>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private touchThrottle = 0;
  private touchSteer = 0;
  private touchSprint = false;

  constructor(deps: WorldControlsDeps) {
    this.canvas = deps.canvas;
    this.camera = deps.camera;
    this.getPaused = deps.getPaused;
    this.land = deps.land;
    this.fastTravelTo = deps.fastTravelTo;
    this.findDockedChestHit = deps.findDockedChestHit;
    this.findWhirlpoolPortalHit = deps.findWhirlpoolPortalHit;
    this.findLandmarkHit = deps.findLandmarkHit;
    this.findIslandHit = deps.findIslandHit;
    this.resolveIslandId = deps.resolveIslandId;
    this.openProject = deps.openProject;
    this.requestWorldPortal = deps.requestWorldPortal;
  }

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("click", this.onCanvasClick);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("click", this.onCanvasClick);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  clearKeys(): void {
    this.keys.clear();
  }

  clearMovement(): void {
    this.keys.clear();
    this.touchThrottle = 0;
    this.touchSteer = 0;
    this.touchSprint = false;
  }

  setTouchMovement(throttle: number, steer: number, sprint = false): void {
    this.touchThrottle = THREE.MathUtils.clamp(throttle, -0.6, 1);
    this.touchSteer = THREE.MathUtils.clamp(steer, -1, 1);
    this.touchSprint = sprint;
  }

  movement(canSail: boolean): {
    throttle: number;
    steer: number;
    sprint: boolean;
  } {
    if (!canSail) {
      return { throttle: 0, steer: 0, sprint: false };
    }
    let throttle = this.touchThrottle;
    let steer = this.touchSteer;
    if (this.keys.has("w") || this.keys.has("arrowup")) throttle += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) throttle -= 0.6;
    if (this.keys.has("a") || this.keys.has("arrowleft")) steer += 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) steer -= 1;
    return {
      throttle: THREE.MathUtils.clamp(throttle, -0.6, 1),
      steer: THREE.MathUtils.clamp(steer, -1, 1),
      sprint: this.keys.has("shift") || this.touchSprint,
    };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
    )
      e.preventDefault();
    this.keys.add(e.key.toLowerCase());
    if (this.getPaused()) return;
    if (e.key === "Enter" && store.mode === "docked") this.land();
    // Esc belongs to the browser's fullscreen contract. Island navigation uses
    // the visible return control so one key cannot trigger two different exits.
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onBlur = (): void => {
    this.clearMovement();
  };

  private onVisibility = (): void => {
    if (document.hidden) this.clearMovement();
  };

  private onCanvasClick = (e: MouseEvent): void => {
    if (this.getPaused()) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    if (store.mode === "landed" && store.dockedId) {
      const hit = this.findDockedChestHit(this.raycaster);
      const projectId = hit?.object.userData.projectId as string | undefined;
      if (projectId) this.openProject(projectId);
      return;
    }
    const portalHit = this.findWhirlpoolPortalHit(this.raycaster);
    if (portalHit) {
      const targetWorldId = this.resolvePortalTargetWorldId(portalHit.object);
      if (targetWorldId) this.requestWorldPortal(targetWorldId);
      return;
    }
    const landmarkHit = this.findLandmarkHit(this.raycaster);
    if (landmarkHit) {
      const landmarkId = this.resolveLandmarkId(landmarkHit.object);
      if (landmarkId) this.fastTravelTo(landmarkId);
      return;
    }
    const hit = this.findIslandHit(this.raycaster);
    if (!hit) return;
    let object: THREE.Object3D | null = hit.object;
    while (object && object.userData.islandId === undefined)
      object = object.parent;
    const islandId = this.resolveIslandId(object);
    if (!islandId) return;
    if (store.mode === "docked" && store.dockedId === islandId) this.land();
    else this.fastTravelTo(islandId);
  };

  private resolveLandmarkId(object: THREE.Object3D | null): string | undefined {
    while (object) {
      const landmarkId = object.userData.landmarkId as string | undefined;
      if (landmarkId) return landmarkId;
      object = object.parent;
    }
    return undefined;
  }

  private resolvePortalTargetWorldId(
    object: THREE.Object3D | null,
  ): KnownWorldId | undefined {
    while (object) {
      const targetWorldId = object.userData.targetWorldId as
        KnownWorldId | undefined;
      if (targetWorldId) return targetWorldId;
      object = object.parent;
    }
    return undefined;
  }
}
