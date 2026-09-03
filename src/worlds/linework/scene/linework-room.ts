// 线稿房间负责程序化几何、边线、命中测试和镜头聚焦。
// 它不拥有 renderer、帧循环、Portal 或 Portfolio 语义内容。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { PortalJourneyState } from "../../../runtime/contracts";
import { portfolioCollectionById } from "../../../content/portfolio";
import type {
  LineworkExhibitBinding,
  LineworkExhibitId,
  LineworkProfileExhibitBinding,
} from "../binding";
import { createLineworkBookshelf } from "./props/bookshelf";
import { createLineworkCeilingFan } from "./props/ceiling-fan";
import { createLineworkCoffeeTable } from "./props/coffee-table";
import { createLineworkDesk } from "./props/desk";
import { createLineworkDoorAndClock } from "./props/door-clock";
import { createLineworkGlobe } from "./props/globe";
import {
  BLACK,
  DETAIL_INK,
  GRAPHITE,
  PAPER,
  lineGeometry,
  type LineworkPropKit,
  type OutlinedMeshOptions,
} from "./props/linework-prop-kit";
import { createLineworkPhotoWall } from "./props/photo-wall";
import { createLineworkPlant } from "./props/plant";
import { createLineworkRoomShell } from "./props/room-shell";
import { createLineworkSideTable } from "./props/side-table";
import { createLineworkSofa } from "./props/sofa";
import { createLineworkWallPrint } from "./props/wall-print";

export const LINEWORK_CONTROL_IDS = ["monitor", "fan", "door"] as const;
export type LineworkControlId = (typeof LINEWORK_CONTROL_IDS)[number];
export type LineworkTargetId = LineworkExhibitId | LineworkControlId | "portal";

interface ExhibitNode {
  readonly binding: LineworkExhibitBinding;
  readonly group: THREE.Group;
  readonly ink: THREE.LineBasicMaterial;
}

export class LineworkRoom {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-7, 7, 5.3, -5.3, 0.1, 80);

  private readonly fillMaterials = new Map<number, THREE.MeshBasicMaterial>();
  private readonly ownedTextures = new Set<THREE.Texture>();
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly staticInk = new THREE.LineBasicMaterial({
    color: GRAPHITE,
    transparent: true,
    opacity: 0.94,
  });
  private readonly detailInk = new THREE.LineBasicMaterial({
    color: DETAIL_INK,
    transparent: true,
    opacity: 0.58,
  });
  private readonly hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  private readonly exhibits = new Map<LineworkExhibitId, ExhibitNode>();
  private readonly hitTargets: THREE.Mesh[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly rayPointer = new THREE.Vector2();
  private readonly baseOffset = new THREE.Vector3(10.5, 8.4, 12.6);
  private readonly currentTarget = new THREE.Vector3(0, 1.65, -0.25);
  private readonly desiredTarget = this.currentTarget.clone();
  private readonly currentPosition = this.currentTarget.clone().add(this.baseOffset);
  private readonly desiredPosition = this.currentPosition.clone();
  private readonly portalFocus = new THREE.Vector3(4.2, 1.65, 1.35);
  private readonly fan: THREE.Group;
  private readonly globeTilt: THREE.Group;
  private readonly globeSurface: THREE.Group;
  private readonly doorPivot: THREE.Group;
  private readonly plantStems: THREE.Group;
  private readonly monitorContent: THREE.Group;
  private monitorScanLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private clockHourHand: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private clockMinuteHand: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private clockSecondHand: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private selected: LineworkExhibitId | null = null;
  private hovered: LineworkTargetId | null = null;
  private currentZoom = 1;
  private fanAngle = 0.35;
  private globeAngle = 0.18;
  private lastElapsed = 0;
  private monitorOn = true;
  private fanOn = true;
  private doorOpen = false;
  private portalState: PortalJourneyState = "dormant";
  private portalCharge = 0;
  private disposed = false;

  constructor(bindings: readonly LineworkExhibitBinding[]) {
    this.scene.background = new THREE.Color(PAPER);
    this.camera.position.copy(this.currentPosition);
    this.camera.userData.frustum = 5.3;
    this.camera.lookAt(this.currentTarget);
    const kit = this.createPropKit();
    createLineworkRoomShell(kit);
    const deskNode = this.registerExhibit(bindings.find((item) => item.id === "desk")!, new THREE.Group());
    this.scene.add(deskNode.group);
    const desk = createLineworkDesk(kit, deskNode.group, deskNode.binding, deskNode.ink);
    this.monitorContent = desk.monitorContent;
    this.monitorScanLine = desk.monitorScanLine;
    const bookshelfNode = this.registerExhibit(bindings.find((item) => item.id === "bookshelf")!, new THREE.Group());
    this.scene.add(bookshelfNode.group);
    createLineworkBookshelf(kit, bookshelfNode.group, bookshelfNode.binding, bookshelfNode.ink);
    const wallPrintNode = this.registerExhibit(bindings.find((item) => item.id === "wall-print")!, new THREE.Group());
    this.scene.add(wallPrintNode.group);
    createLineworkWallPrint(kit, wallPrintNode.group, wallPrintNode.binding, wallPrintNode.ink);
    const profileBinding = bindings.find(
      (item): item is LineworkProfileExhibitBinding => item.kind === "profile",
    )!;
    const photoWallNode = this.registerExhibit(profileBinding, new THREE.Group());
    this.scene.add(photoWallNode.group);
    const collection = portfolioCollectionById(profileBinding.collectionId);
    createLineworkPhotoWall(
      kit,
      photoWallNode.group,
      profileBinding,
      photoWallNode.ink,
      collection.media,
      this.photoMaterial.bind(this),
    );
    createLineworkSofa(kit);
    createLineworkCoffeeTable(kit);
    createLineworkSideTable(kit);
    const doorClock = createLineworkDoorAndClock(kit);
    this.doorPivot = doorClock.doorPivot;
    this.clockHourHand = doorClock.clockHourHand;
    this.clockMinuteHand = doorClock.clockMinuteHand;
    this.clockSecondHand = doorClock.clockSecondHand;
    this.updateClock();
    this.plantStems = createLineworkPlant(kit);
    const globe = createLineworkGlobe(kit);
    this.globeTilt = globe.globeTilt;
    this.globeSurface = globe.globeSurface;
    this.fan = createLineworkCeilingFan(kit);
  }

  private createPropKit(): LineworkPropKit {
    return {
      scene: this.scene,
      box: this.box.bind(this),
      roundedBox: this.roundedBox.bind(this),
      outlined: this.outlined.bind(this),
      addSegments: this.addSegments.bind(this),
      addHitTarget: (parent, target, size, position, priority) =>
        this.addHitTarget(parent, target as LineworkTargetId, size, position, priority),
    };
  }

  update(elapsed: number, pointer: THREE.Vector2, reducedMotion: boolean): LineworkTargetId | null {
    const delta = this.lastElapsed === 0
      ? 0
      : Math.min(0.05, Math.max(0, elapsed - this.lastElapsed));
    this.lastElapsed = elapsed;
    this.hovered = this.hitTest(pointer);
    this.exhibits.forEach((node, id) => {
      const emphasized = id === this.selected ? 1.035 : id === this.hovered ? 1.018 : 1;
      const next = reducedMotion
        ? emphasized
        : THREE.MathUtils.lerp(node.group.scale.x, emphasized, 0.13);
      node.group.scale.setScalar(next);
      node.ink.color.setHex(id === this.selected || id === this.hovered ? BLACK : GRAPHITE);
      node.ink.opacity = id === this.selected ? 1 : id === this.hovered ? 0.98 : 0.94;
    });

    const portalActive =
      this.portalState === "preparing" || this.portalState === "crossing";
    const portalDamping = reducedMotion
      ? 1
      : 1 - Math.exp(-Math.max(delta, 1 / 60) * 9);
    this.portalCharge = THREE.MathUtils.lerp(
      this.portalCharge,
      portalActive ? 1 : 0,
      portalDamping,
    );
    const binding = this.selected ? this.exhibits.get(this.selected)?.binding : null;
    this.desiredTarget.set(...(binding?.focus ?? [0, 1.65, -0.25]));
    this.desiredTarget.lerp(this.portalFocus, this.portalCharge);
    const distance = THREE.MathUtils.lerp(binding ? 0.56 : 1, 0.72, this.portalCharge);
    this.desiredPosition.copy(this.desiredTarget).addScaledVector(this.baseOffset, distance);
    const damping = reducedMotion ? 1 : 0.085;
    this.currentTarget.lerp(this.desiredTarget, damping);
    this.currentPosition.lerp(this.desiredPosition, damping);
    this.camera.position.copy(this.currentPosition);
    if (!reducedMotion) {
      this.camera.position.x += pointer.x * 0.13;
      this.camera.position.y -= pointer.y * 0.07;
    }
    this.camera.lookAt(this.currentTarget);
    const desiredZoom = (binding ? 1.36 : 1) + this.portalCharge * 0.18;
    this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, desiredZoom, damping);
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();

    if (!reducedMotion) {
      this.globeAngle += delta * (0.09 + this.portalCharge * 7.2);
    }
    this.globeSurface.rotation.y = reducedMotion ? 0.18 : this.globeAngle;
    this.globeTilt.rotation.z =
      -THREE.MathUtils.degToRad(23.5) +
      (reducedMotion ? 0 : Math.sin(elapsed * 7) * this.portalCharge * 0.025);
    this.globeSurface.scale.setScalar(1 + this.portalCharge * 0.08);
    if (!reducedMotion && this.fanOn) this.fanAngle += delta * 0.72;
    this.fan.rotation.y = this.fanAngle;
    this.doorPivot.rotation.y = THREE.MathUtils.lerp(
      this.doorPivot.rotation.y,
      this.doorOpen ? -1.05 : 0,
      reducedMotion ? 1 : 0.1,
    );
    if (!reducedMotion) {
      this.plantStems.rotation.z = Math.sin(elapsed * 0.72) * 0.014;
      if (this.monitorScanLine && this.monitorOn) {
        this.monitorScanLine.position.y = 2.2 + ((elapsed * 0.34) % 0.82);
        this.monitorScanLine.material.opacity = 0.45 + Math.sin(elapsed * 3.2) * 0.16;
      }
    } else {
      this.plantStems.rotation.z = 0;
      if (this.monitorScanLine) this.monitorScanLine.position.y = 2.58;
    }
    this.updateClock(reducedMotion);
    return this.hovered;
  }

  hitTest(pointer: THREE.Vector2): LineworkTargetId | null {
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    // Runtime 指针以屏幕向下为正，Three.js NDC 射线需要在边界处翻转 Y。
    this.rayPointer.set(pointer.x, -pointer.y);
    this.raycaster.setFromCamera(this.rayPointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitTargets, false);
    const hit = hits.find((candidate) => candidate.object.userData.lineworkPriority === "control")
      ?? hits[0];
    return (hit?.object.userData.lineworkTarget as LineworkTargetId | undefined) ?? null;
  }

  select(id: LineworkExhibitId | null): void {
    this.selected = id;
  }

  setPortalState(state: PortalJourneyState): void {
    this.portalState = state;
    if (state === "crossing") this.portalCharge = Math.max(this.portalCharge, 0.72);
    if (state === "arriving") this.portalCharge = 1;
  }

  // 环境控制只改变本 World 拥有的瞬时状态，不写入 Portfolio 或 Runtime。
  activateControl(target: LineworkTargetId): boolean {
    if (target === "monitor") {
      this.monitorOn = !this.monitorOn;
      this.monitorContent.visible = this.monitorOn;
      return true;
    }
    if (target === "fan") {
      this.fanOn = !this.fanOn;
      return true;
    }
    if (target === "door") {
      this.doorOpen = !this.doorOpen;
      return true;
    }
    return false;
  }

  dispose(): void {
    this.disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      const drawable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      if (drawable.geometry) geometries.add(drawable.geometry);
      const objectMaterials = Array.isArray(drawable.material)
        ? drawable.material
        : drawable.material
          ? [drawable.material]
          : [];
      objectMaterials.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.ownedTextures.forEach((texture) => texture.dispose());
    this.scene.clear();
  }

  private fill(color: number): THREE.MeshBasicMaterial {
    const existing = this.fillMaterials.get(color);
    if (existing) return existing;
    // 线稿面的职责仅是遮挡背面结构，不能通过光照产生彩色或体积化明暗。
    const material = new THREE.MeshBasicMaterial({
      color,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.fillMaterials.set(color, material);
    return material;
  }

  private outlined(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    options: OutlinedMeshOptions = {},
  ): THREE.Group {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, this.fill(Number(options.color ?? PAPER)));
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, options.threshold ?? 24),
      options.ink ?? this.staticInk,
    );
    edges.renderOrder = 2;
    group.add(mesh, edges);
    if (options.position) group.position.set(...options.position);
    if (options.rotation) group.rotation.set(...options.rotation);
    parent.add(group);
    return group;
  }

  private box(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    options: Omit<OutlinedMeshOptions, "position"> = {},
  ): THREE.Group {
    return this.outlined(parent, new THREE.BoxGeometry(...size), {
      ...options,
      position,
    });
  }

  private roundedBox(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    radius: number,
    options: Omit<OutlinedMeshOptions, "position"> = {},
  ): THREE.Group {
    const safeRadius = Math.min(radius, Math.min(...size) * 0.48);
    // 单段倒角能被 EdgesGeometry 稳定提取；多段光滑圆角反而会丢失线稿外轮廓。
    return this.outlined(parent, new RoundedBoxGeometry(...size, 1, safeRadius), {
      ...options,
      position,
    });
  }

  private addSegments(
    parent: THREE.Object3D,
    points: readonly THREE.Vector3[],
    material: THREE.LineBasicMaterial = this.detailInk,
  ): THREE.LineSegments {
    const lines = new THREE.LineSegments(lineGeometry(points), material);
    lines.renderOrder = 3;
    parent.add(lines);
    return lines;
  }

  private registerExhibit(binding: LineworkExhibitBinding, group: THREE.Group): ExhibitNode {
    const ink = new THREE.LineBasicMaterial({
      color: GRAPHITE,
      transparent: true,
      opacity: 0.94,
    });
    const node = { binding, group, ink };
    this.exhibits.set(binding.id, node);
    return node;
  }

  private addHitTarget(
    parent: THREE.Object3D,
    target: LineworkTargetId,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    priority: "control" | "default" = "default",
  ): void {
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(...size), this.hitMaterial);
    hitbox.position.set(...position);
    hitbox.userData.lineworkTarget = target;
    hitbox.userData.lineworkPriority = priority;
    parent.add(hitbox);
    this.hitTargets.push(hitbox);
  }

  private photoMaterial(src: string): THREE.ShaderMaterial {
    const texture = this.textureLoader.load(src, (loaded) => {
      if (this.disposed) {
        loaded.dispose();
        return;
      }
      material.uniforms.uLoaded.value = 1;
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    this.ownedTextures.add(texture);

    // 照片保留真实颜色，白色占位保证异步加载期间仍符合线稿场景。
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uLoaded: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uLoaded;
        varying vec2 vUv;
        void main() {
          vec3 source = texture2D(uMap, vUv).rgb;
          source = clamp((source - 0.5) * 1.08 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(vec3(1.0), source, uLoaded), 1.0);
        }
      `,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    return material;
  }

  private updateClock(reducedMotion = false): void {
    if (!this.clockHourHand || !this.clockMinuteHand || !this.clockSecondHand) return;
    const now = new Date();
    const seconds = reducedMotion ? 0 : now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    this.clockHourHand.rotation.z = -(hours / 12) * Math.PI * 2;
    this.clockMinuteHand.rotation.z = -(minutes / 60) * Math.PI * 2;
    this.clockSecondHand.rotation.z = -(seconds / 60) * Math.PI * 2;
  }

}
