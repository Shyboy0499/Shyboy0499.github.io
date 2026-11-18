// StudioRoom 负责工作室的程序化几何、灯光、镜头控制与命中测试。
// renderer、帧循环、Portal 请求和 Portfolio 文案仍由外层 World/Runtime 持有。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { QualityBudget } from "../../../runtime/contracts";
import type {
  StudioExhibitBinding,
  StudioExhibitId,
} from "../binding";
import { createStudioArchitecture } from "./props/architecture";
import { createStudioBoards } from "./props/boards";
import { createStudioLights } from "./props/lights";
import { createStudioPlant } from "./props/plant";
import { createStudioShelf } from "./props/shelf";
import type { StudioPropKit } from "./props/studio-prop-kit";
import { createStudioWorkstation } from "./props/workstation";
import {
  WORLD_NAMING,
  type KnownWorldId,
} from "../../worlds.config";

export const STUDIO_CONTROL_IDS = ["lamp"] as const;
export type StudioControlId = (typeof STUDIO_CONTROL_IDS)[number];
export const STUDIO_PORTAL_TARGETS = {
  "portal-cosmic": WORLD_NAMING.cosmic.id,
  "portal-linework": WORLD_NAMING.linework.id,
  "portal-archipelago": WORLD_NAMING.archipelago.id,
} as const satisfies Record<string, KnownWorldId>;
export type StudioPortalTargetId = keyof typeof STUDIO_PORTAL_TARGETS;
export type StudioTargetId = StudioExhibitId | StudioControlId | StudioPortalTargetId;

// The site is a single room-tour experience: portal navigation to other worlds is
// disabled so visitors stay in the Studio room. The portal doors remain as decor
// but can never be activated.
export function isStudioPortalTarget(
  target: StudioTargetId | null,
): target is StudioPortalTargetId {
  return false;
}

// Bright, airy bedroom palette — white/light walls, light wood floor, soft daylight.
const DAY_BACKGROUND = new THREE.Color(0xeceff3);
const NIGHT_BACKGROUND = new THREE.Color(0x141821);
const DAY_WALL = new THREE.Color(0xf2f1ec);
const NIGHT_WALL = new THREE.Color(0x2b3140);
const DAY_FLOOR = new THREE.Color(0xc9b79b);
const NIGHT_FLOOR = new THREE.Color(0x252b36);
const ACCENT = 0x5aa9e6;

interface CameraState {
  yaw: number;
  pitch: number;
  distance: number;
}

export class StudioRoom {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 80);

  private readonly textureLoader: THREE.TextureLoader;
  private readonly textures = new Set<THREE.Texture>();
  private readonly textureLoads: Promise<void>[] = [];
  private readonly materials = new Set<THREE.Material>();
  private readonly plasterTexture = this.createSurfaceTexture("plaster", 3, 2);
  private readonly floorWoodTexture = this.createSurfaceTexture("wood", 5, 8);
  private readonly deskWoodTexture = this.createSurfaceTexture("wood", 4, 2);
  private readonly fabricTexture = this.createSurfaceTexture("fabric", 5, 5);
  private readonly hitTargets: THREE.Mesh[] = [];
  private readonly exhibits = new Map<StudioExhibitId, THREE.Group>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly rayPointer = new THREE.Vector2();
  private readonly currentTarget = new THREE.Vector3(0, 2.18, -1.7);
  private readonly desiredTarget = this.currentTarget.clone();
  private readonly currentCamera: CameraState = {
    yaw: 0.16,
    pitch: 0.2,
    distance: 14.4,
  };
  private readonly desiredCamera: CameraState = { ...this.currentCamera };
  private readonly wallMaterial = this.material({
    color: 0xd8d4ca,
    map: this.plasterTexture,
    roughness: 0.94,
  });
  private readonly floorMaterial = this.material({
    color: 0x9d9386,
    map: this.floorWoodTexture,
    roughness: 0.72,
  });
  private readonly sun = new THREE.DirectionalLight(0xfff0d1, 2.7);
  private readonly hemisphere = new THREE.HemisphereLight(0xe6efff, 0x655d52, 1.55);
  private readonly windowFill = new THREE.DirectionalLight(0xcfe7ff, 1.15);
  private readonly roomBounce = new THREE.PointLight(0xffdfbb, 1.1, 15, 1.65);
  private readonly deskLamp = new THREE.PointLight(0xffc879, 0, 5.4, 1.8);
  private readonly lampBulbMaterial = this.material({
    color: 0xffd9a0,
    emissive: 0xffa43a,
    emissiveIntensity: 0.08,
    roughness: 0.24,
  });
  private readonly windowCasements: readonly [THREE.Group, THREE.Group];
  private readonly chair: THREE.Group;
  private readonly choirBooks: readonly THREE.Group[];
  private readonly musicNotes: readonly THREE.Group[];
  private readonly noteMaterials: readonly THREE.MeshStandardMaterial[];
  private readonly plant = new THREE.Group();
  private selected: StudioExhibitId | null = null;
  private hovered: StudioTargetId | null = null;
  private night = false;
  // Desk lamp starts ON so the workspace has a warm light on the table.
  private lampOn = true;
  private ambientMotionScale = 1;
  private lastElapsed = 0;

  constructor(
    bindings: readonly StudioExhibitBinding[],
    loadingManager: THREE.LoadingManager,
  ) {
    this.textureLoader = new THREE.TextureLoader(loadingManager);
    this.scene.background = DAY_BACKGROUND.clone();
    this.scene.fog = new THREE.Fog(DAY_BACKGROUND, 16, 28);
    this.camera.position.set(2.25, 5.04, 12.1);
    this.camera.lookAt(this.currentTarget);

    const kit = this.createPropKit();
    createStudioLights(kit, {
      hemisphere: this.hemisphere,
      sun: this.sun,
      windowFill: this.windowFill,
      roomBounce: this.roomBounce,
      deskLamp: this.deskLamp,
    });
    const architecture = createStudioArchitecture(kit, {
      floor: this.floorMaterial,
      wall: this.wallMaterial,
      fabricTexture: this.fabricTexture,
    });
    this.windowCasements = architecture.windowCasements;
    const workstation = createStudioWorkstation(kit, bindings.find((item) => item.id === "workstation")!, {
      deskWoodTexture: this.deskWoodTexture,
      fabricTexture: this.fabricTexture,
      lampBulbMaterial: this.lampBulbMaterial,
    });
    this.chair = workstation.chair;
    createStudioBoards(
      kit,
      bindings.find((item) => item.id === "roadmap-board")!,
      bindings.find((item) => item.id === "contribution-frame")!,
    );
    const shelf = createStudioShelf(kit, this.deskWoodTexture);
    this.choirBooks = shelf.choirBooks;
    this.musicNotes = shelf.musicNotes;
    this.noteMaterials = shelf.noteMaterials;
    createStudioPlant(kit, this.plant);
    // Portals are removed entirely for the room-tour-only site: no portal doors,
    // draft door, or world compass are placed in the scene.
  }

  private createPropKit(): StudioPropKit {
    return {
      scene: this.scene,
      material: this.material.bind(this),
      basicMaterial: this.basicMaterial.bind(this),
      physicalMaterial: this.physicalMaterial.bind(this),
      box: this.box.bind(this),
      roundedBox: this.roundedBox.bind(this),
      cylinder: this.cylinder.bind(this),
      tubeBetween: this.tubeBetween.bind(this),
      imageMaterial: this.imageMaterial.bind(this),
      imagePanel: this.imagePanel.bind(this),
      addHitTarget: this.addHitTarget.bind(this),
      registerExhibit: this.registerExhibit.bind(this),
      trackMaterial: (material) => this.materials.add(material),
    };
  }

  resize(width: number, height: number): void {
    this.camera.aspect = Math.max(0.1, width / Math.max(1, height));
    this.camera.updateProjectionMatrix();
  }

  async ready(): Promise<void> {
    await Promise.all(this.textureLoads);
  }

  orbit(deltaX: number, deltaY: number): void {
    this.desiredCamera.yaw = THREE.MathUtils.clamp(
      this.desiredCamera.yaw - deltaX * 0.0045,
      -0.2,
      1.35,
    );
    this.desiredCamera.pitch = THREE.MathUtils.clamp(
      this.desiredCamera.pitch + deltaY * 0.0035,
      0.08,
      0.58,
    );
  }

  zoom(deltaY: number): void {
    const minimum = this.selected ? 3.7 : 7.2;
    const maximum = this.selected ? 7 : 17;
    this.desiredCamera.distance = THREE.MathUtils.clamp(
      this.desiredCamera.distance + deltaY * 0.008,
      minimum,
      maximum,
    );
  }

  select(id: StudioExhibitId | null): void {
    this.selected = id;
    const group = id ? this.exhibits.get(id) : null;
    const focus = group?.userData.focus as readonly [number, number, number] | undefined;
    this.desiredTarget.set(...(focus ?? [0, 2.18, -1.7]));
    this.desiredCamera.distance = id ? 5.2 : 14.4;
  }

  setNight(night: boolean): void {
    this.night = night;
  }

  toggleLamp(): boolean {
    this.lampOn = !this.lampOn;
    return this.lampOn;
  }

  activateControl(target: StudioTargetId): boolean {
    if (target === "lamp") {
      this.toggleLamp();
      return true;
    }
    return false;
  }

  setQuality(quality: QualityBudget): void {
    this.ambientMotionScale = quality.tier === "high"
      ? 1
      : quality.tier === "balanced"
        ? 0.72
        : quality.tier === "low"
          ? 0.34
          : 0;
    const shadows = quality.shadows !== "off";
    const shadowMapSize = quality.tier === "high" ? 2048 : 1024;
    if (this.sun.shadow.mapSize.width !== shadowMapSize) {
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    }
    this.sun.castShadow = shadows;
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = shadows && object.userData.noShadow !== true;
      object.receiveShadow = shadows;
    });
  }

  hitTest(pointer: THREE.Vector2): StudioTargetId | null {
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    this.rayPointer.set(pointer.x, -pointer.y);
    this.raycaster.setFromCamera(this.rayPointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.hitTargets, false)[0];
    return (hit?.object.userData.studioTarget as StudioTargetId | undefined) ?? null;
  }

  update(
    elapsed: number,
    pointer: THREE.Vector2,
    reducedMotion: boolean,
  ): StudioTargetId | null {
    const delta = this.lastElapsed === 0
      ? 0
      : Math.min(0.05, Math.max(0, elapsed - this.lastElapsed));
    this.lastElapsed = elapsed;
    this.hovered = this.hitTest(pointer);

    const damping = reducedMotion ? 1 : 0.075;
    this.currentTarget.lerp(this.desiredTarget, damping);
    this.currentCamera.yaw = THREE.MathUtils.lerp(
      this.currentCamera.yaw,
      this.desiredCamera.yaw,
      damping,
    );
    this.currentCamera.pitch = THREE.MathUtils.lerp(
      this.currentCamera.pitch,
      this.desiredCamera.pitch,
      damping,
    );
    this.currentCamera.distance = THREE.MathUtils.lerp(
      this.currentCamera.distance,
      this.desiredCamera.distance,
      damping,
    );

    const horizontal = Math.cos(this.currentCamera.pitch) * this.currentCamera.distance;
    this.camera.position.set(
      this.currentTarget.x + Math.sin(this.currentCamera.yaw) * horizontal,
      this.currentTarget.y + Math.sin(this.currentCamera.pitch) * this.currentCamera.distance,
      this.currentTarget.z + Math.cos(this.currentCamera.yaw) * horizontal,
    );
    this.camera.lookAt(this.currentTarget);

    this.exhibits.forEach((group, id) => {
      const wanted = id === this.selected ? 1.035 : id === this.hovered ? 1.018 : 1;
      const scale = reducedMotion ? wanted : THREE.MathUtils.lerp(group.scale.x, wanted, 0.13);
      group.scale.setScalar(scale);
    });

    this.updateAmbientObjects(elapsed, reducedMotion);
    this.plant.rotation.z = reducedMotion
      ? 0
      : Math.sin(elapsed * 0.75) * 0.018 * this.ambientMotionScale;

    const background = this.night ? NIGHT_BACKGROUND : DAY_BACKGROUND;
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(background);
    }
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(background);
    this.hemisphere.intensity = THREE.MathUtils.lerp(
      this.hemisphere.intensity,
      this.night ? 0.62 : 1.55,
      damping,
    );
    this.sun.intensity = THREE.MathUtils.lerp(
      this.sun.intensity,
      this.night ? 0.28 : 2.7,
      damping,
    );
    this.windowFill.intensity = THREE.MathUtils.lerp(
      this.windowFill.intensity,
      this.night ? 0.22 : 1.15,
      damping,
    );
    this.roomBounce.intensity = THREE.MathUtils.lerp(
      this.roomBounce.intensity,
      this.night ? 0.3 : 1.1,
      damping,
    );
    this.deskLamp.intensity = THREE.MathUtils.lerp(
      this.deskLamp.intensity,
      this.lampOn ? (this.night ? 6.4 : 3.2) : 0,
      damping,
    );
    this.lampBulbMaterial.emissiveIntensity = THREE.MathUtils.lerp(
      this.lampBulbMaterial.emissiveIntensity,
      this.lampOn ? 3.2 : 0.08,
      damping,
    );
    this.wallMaterial.color.lerp(this.night ? NIGHT_WALL : DAY_WALL, damping);
    this.floorMaterial.color.lerp(this.night ? NIGHT_FLOOR : DAY_FLOOR, damping);
    return this.hovered;
  }

  private updateAmbientObjects(elapsed: number, reducedMotion: boolean): void {
    const motion = reducedMotion ? 0 : this.ambientMotionScale;

    // 窗扇用开、停、关、停四段节奏，避免持续往复造成机械感。
    const windowCycle = (elapsed % 28) / 28;
    let windowOpen = 0;
    if (windowCycle >= 0.15 && windowCycle < 0.28) {
      windowOpen = THREE.MathUtils.smoothstep(windowCycle, 0.15, 0.28);
    } else if (windowCycle >= 0.28 && windowCycle < 0.58) {
      windowOpen = 1;
    } else if (windowCycle >= 0.58 && windowCycle < 0.72) {
      windowOpen = 1 - THREE.MathUtils.smoothstep(windowCycle, 0.58, 0.72);
    }
    this.windowCasements[0].rotation.y = -windowOpen * 0.48 * motion;
    this.windowCasements[1].rotation.y = windowOpen * 0.48 * motion;

    // 椅子只在少数时段轻微回转，并在每次方向变化后停留片刻。
    const chairCycle = ((elapsed + 5) % 36) / 36;
    let chairYaw = 0;
    if (chairCycle >= 0.18 && chairCycle < 0.32) {
      chairYaw = THREE.MathUtils.smoothstep(chairCycle, 0.18, 0.32) * 0.09;
    } else if (chairCycle >= 0.32 && chairCycle < 0.45) {
      chairYaw = 0.09;
    } else if (chairCycle >= 0.45 && chairCycle < 0.59) {
      chairYaw = THREE.MathUtils.lerp(
        0.09,
        -0.07,
        THREE.MathUtils.smoothstep(chairCycle, 0.45, 0.59),
      );
    } else if (chairCycle >= 0.59 && chairCycle < 0.72) {
      chairYaw = -0.07;
    } else if (chairCycle >= 0.72 && chairCycle < 0.86) {
      chairYaw = THREE.MathUtils.lerp(
        -0.07,
        0,
        THREE.MathUtils.smoothstep(chairCycle, 0.72, 0.86),
      );
    }
    this.chair.rotation.y = chairYaw * motion;

    // 合唱只占长周期的一小段，避免高频动作持续争夺工作台的视觉焦点。
    const chorus = THREE.MathUtils.smoothstep(Math.sin(elapsed * 0.22 - 1.1), 0.42, 0.9)
      * motion;
    this.choirBooks.forEach((book, index) => {
      const beat = Math.max(0, Math.sin(elapsed * 3.8 - index * 0.68)) ** 6;
      book.position.y = 5.01 + beat * chorus * 0.13;
      book.rotation.z = Number(book.userData.baseRotation)
        + Math.sin(elapsed * 3.8 - index * 0.68) * chorus * 0.045;
    });
    this.musicNotes.forEach((note, index) => {
      const travel = (elapsed * 0.42 + index * 0.31) % 1;
      const opacity = chorus * Math.sin(travel * Math.PI);
      const base = note.userData.basePosition as THREE.Vector3;
      note.visible = opacity > 0.015;
      note.position.set(
        base.x + Math.sin(elapsed * 1.8 + index) * 0.08 * chorus,
        base.y + travel * 0.72,
        base.z,
      );
      note.rotation.z = Math.sin(elapsed * 1.4 + index) * 0.22;
      note.scale.setScalar(0.72 + Math.sin(travel * Math.PI) * 0.32);
      this.noteMaterials[index].opacity = opacity;
    });
  }

  dispose(): void {
    // LightShadow 的 render target 不属于 scene traverse，必须由灯光所有者单独释放。
    this.sun.shadow.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    this.scene.traverse((object) => {
      const drawable = object as THREE.Object3D & { geometry?: THREE.BufferGeometry };
      if (drawable.geometry) geometries.add(drawable.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.scene.clear();
  }

  private material(parameters: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial(parameters);
    this.materials.add(material);
    return material;
  }

  private basicMaterial(parameters: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial(parameters);
    this.materials.add(material);
    return material;
  }

  private physicalMaterial(
    parameters: THREE.MeshPhysicalMaterialParameters,
  ): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial(parameters);
    this.materials.add(material);
    return material;
  }

  // 程序化表面纹理保留细节感，同时避免新增下载体积和外部资源授权问题。
  private createSurfaceTexture(
    kind: "plaster" | "wood" | "fabric",
    repeatX: number,
    repeatY: number,
  ): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;
    const base = kind === "wood" ? "#a8784e" : kind === "fabric" ? "#88918d" : "#ebe8df";
    context.fillStyle = base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    let seed = kind === "wood" ? 173 : kind === "fabric" ? 431 : 719;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    if (kind === "wood") {
      for (let index = 0; index < 90; index += 1) {
        const y = random() * 256;
        context.beginPath();
        context.moveTo(0, y);
        context.bezierCurveTo(64, y + random() * 10 - 5, 190, y + random() * 14 - 7, 256, y + random() * 8 - 4);
        context.strokeStyle = `rgba(70, 36, 20, ${0.035 + random() * 0.08})`;
        context.lineWidth = 0.5 + random() * 1.2;
        context.stroke();
      }
    } else if (kind === "fabric") {
      context.strokeStyle = "rgba(20, 28, 27, 0.16)";
      context.lineWidth = 1;
      for (let offset = 0; offset < 256; offset += 5) {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset, 256);
        context.moveTo(0, offset);
        context.lineTo(256, offset);
        context.stroke();
      }
    } else {
      for (let index = 0; index < 1600; index += 1) {
        const shade = random() > 0.5 ? 255 : 100;
        context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.012 + random() * 0.018})`;
        context.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = 4;
    this.textures.add(texture);
    return texture;
  }

  private box(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    rotation: readonly [number, number, number] = [0, 0, 0],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  private roundedBox(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    radius = 0.06,
    rotation: readonly [number, number, number] = [0, 0, 0],
  ): THREE.Mesh {
    const safeRadius = Math.min(radius, Math.min(...size) * 0.45);
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(size[0], size[1], size[2], 4, safeRadius),
      material,
    );
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  private cylinder(
    parent: THREE.Object3D,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    position: readonly [number, number, number],
    material: THREE.Material,
    rotation: readonly [number, number, number] = [0, 0, 0],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48),
      material,
    );
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  private tubeBetween(
    parent: THREE.Object3D,
    start: readonly [number, number, number],
    end: readonly [number, number, number],
    radius: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const startPoint = new THREE.Vector3(...start);
    const endPoint = new THREE.Vector3(...end);
    const direction = endPoint.clone().sub(startPoint);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 24),
      material,
    );
    mesh.position.copy(startPoint).add(endPoint).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    parent.add(mesh);
    return mesh;
  }

  private imageMaterial(src: string): THREE.MeshBasicMaterial {
    let settleTexture: () => void = () => undefined;
    const load = new Promise<void>((resolve) => {
      settleTexture = resolve;
    });
    const texture = this.textureLoader.load(
      src,
      settleTexture,
      undefined,
      settleTexture,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.textures.add(texture);
    this.textureLoads.push(load);
    return this.basicMaterial({ map: texture, toneMapped: false });
  }

  private imagePanel(
    parent: THREE.Object3D,
    src: string,
    size: readonly [number, number],
    position: readonly [number, number, number],
    rotation: readonly [number, number, number] = [0, 0, 0],
  ): THREE.Group {
    const panel = new THREE.Group();
    panel.position.set(...position);
    panel.rotation.set(...rotation);
    const frame = this.roundedBox(
      panel,
      [size[0] + 0.16, size[1] + 0.16, 0.09],
      [0, 0, 0],
      this.material({ color: 0x17191b, roughness: 0.38, metalness: 0.16 }),
      0.035,
    );
    frame.userData.noShadow = true;
    const image = new THREE.Mesh(new THREE.PlaneGeometry(...size), this.imageMaterial(src));
    image.position.z = 0.051;
    image.userData.noShadow = true;
    panel.add(image);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(...size),
      this.physicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        roughness: 0.08,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        depthWrite: false,
      }),
    );
    glass.position.z = 0.058;
    glass.userData.noShadow = true;
    panel.add(glass);
    parent.add(panel);
    return panel;
  }

  private addHitTarget(
    target: StudioTargetId,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    rotation: readonly [number, number, number] = [0, 0, 0],
  ): void {
    const material = this.basicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });
    const hitbox = this.box(this.scene, size, position, material, rotation);
    hitbox.userData.studioTarget = target;
    hitbox.userData.noShadow = true;
    this.hitTargets.push(hitbox);
  }

  private registerExhibit(binding: StudioExhibitBinding, group: THREE.Group): void {
    group.userData.focus = binding.focus;
    this.exhibits.set(binding.id, group);
  }

}
