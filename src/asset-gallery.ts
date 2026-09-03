// 3D 资产墙的独立预览运行时；每个 canvas 拥有自己的轻量 renderer。
// 预览按可见范围延迟初始化并集中释放，避免资产页一次性占满 GPU 资源。
import * as THREE from "three";
import type { IslandDef } from "./worlds/archipelago/islands";
import { IslandObject } from "./worlds/archipelago/scene/island/island";
import { ISLAND_PROPS } from "./worlds/archipelago/scene/island/island-props";
import { createMobileBoostModel } from "./worlds/archipelago/scene/ship/mobile-boost-model";
import { Ship } from "./worlds/archipelago/scene/ship/ship";
import { FlyingDutchman } from "./worlds/archipelago/scene/landmarks/flying-dutchman";
import { AncientJunglePortal } from "./worlds/archipelago/scene/landmarks/ancient-jungle-portal";
import { VoxelNetherPortal } from "./worlds/archipelago/scene/landmarks/voxel-nether-portal";
import { TidepoolArenaPortal } from "./worlds/archipelago/scene/landmarks/tidepool-arena-portal";
import { KameIslandScene } from "./worlds/archipelago/scene/island/kame-island-scene";
import { ArchipelagoMaelstrom } from "./worlds/archipelago/scene/landmarks/archipelago-maelstrom";
import { ArchipelagoMaelstromV2 } from "./worlds/archipelago/scene/landmarks/archipelago-maelstrom-v2";
import { CharybdisWhirlpool } from "./worlds/archipelago/scene/landmarks/charybdis-whirlpool";
import { BabelTower } from "./worlds/archipelago/scene/landmarks/babel-tower";
import { NoahsArk } from "./worlds/archipelago/scene/ship/noahs-ark";
import { DAY } from "./worlds/archipelago/scene/env/themes";
import { hashString, mulberry32 } from "./worlds/archipelago/scene/core/rng";

type PreviewDisposer = () => void;

interface PreviewRuntime {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  subject: THREE.Object3D;
  update?: (time: number, dt: number) => void;
}

type IslandPreviewTheme = IslandDef["theme"];

interface IslandPreviewSpec {
  theme: IslandPreviewTheme;
  seedId: string;
  name: string;
  scale?: number;
  cameraY?: number;
  cameraZ?: number;
  lookAtY?: number;
  rotationY?: number;
}

interface LandmarkPreviewSpec {
  index: number;
  title: string;
  seedId: string;
  scale: number;
  cameraY: number;
  cameraZ: number;
  lookAtY: number;
  subjectY: number;
}

const previews: PreviewRuntime[] = [];
const disposers: PreviewDisposer[] = [];
const initializedPreviewCanvases = new Set<HTMLCanvasElement>();
const previewDisposersByCanvas = new Map<HTMLCanvasElement, PreviewDisposer>();
let lastTime = performance.now();
let boostPulseTimer: number | null = null;
let activeDialogCanvas: HTMLCanvasElement | null = null;
let activeDialogImage: HTMLImageElement | null = null;
let activeCanvasAnchor: Comment | null = null;
let galleryCurrent = 3;
let galleryTarget = 3;
let galleryPointerDown = false;
let galleryPointerStartX = 0;
let galleryPointerStartTarget = 0;
let galleryDragDistance = 0;
let suppressNextGalleryClick = false;

function createRuntime(canvas: HTMLCanvasElement): PreviewRuntime {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 4.4, 12);
  camera.lookAt(0, 1.7, 0);

  const subject = new THREE.Group();
  scene.add(subject);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x263b55, 2.6));

  const key = new THREE.DirectionalLight(0xfff0ce, 3.5);
  key.position.set(-4, 8, 7);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x7de6ff, 1.1);
  fill.position.set(5, 3, -6);
  scene.add(fill);

  return { renderer, camera, scene, subject };
}

function resizePreview(runtime: PreviewRuntime): void {
  const canvas = runtime.renderer.domElement;
  const width = Math.max(1, Math.floor(canvas.clientWidth));
  const height = Math.max(1, Math.floor(canvas.clientHeight));
  const size = runtime.renderer.getSize(new THREE.Vector2());
  if (size.x !== width || size.y !== height) {
    runtime.renderer.setSize(width, height, false);
    runtime.camera.aspect = width / height;
    runtime.camera.updateProjectionMatrix();
  }
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material?.dispose());
  });
}

function disposePreviewForCanvas(canvas: HTMLCanvasElement): void {
  const dispose = previewDisposersByCanvas.get(canvas);
  if (!dispose) return;
  dispose();
  previewDisposersByCanvas.delete(canvas);
  initializedPreviewCanvases.delete(canvas);
}

function setIslandProductCamera(camera: THREE.PerspectiveCamera): void {
  camera.fov = 26;
  camera.near = 0.1;
  camera.far = 120;
  camera.position.set(0, 7.4, 9.6);
  camera.lookAt(0, -0.05, 0);
  camera.updateProjectionMatrix();
}

function createIslandPreviewBase(): THREE.Group {
  const group = new THREE.Group();
  const lagoon = new THREE.Mesh(
    new THREE.CircleGeometry(3.1, 56),
    new THREE.MeshBasicMaterial({
      color: "#6fd7d6",
      transparent: true,
      opacity: 0.95,
    }),
  );
  lagoon.rotation.x = -Math.PI / 2;
  lagoon.position.y = -1.02;

  const shallow = new THREE.Mesh(
    new THREE.RingGeometry(1.42, 2.42, 64),
    new THREE.MeshBasicMaterial({
      color: "#f6f1bf",
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    }),
  );
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.y = -1.0;

  const foam = new THREE.Mesh(
    new THREE.RingGeometry(2.08, 2.7, 72),
    new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = -0.98;

  group.add(lagoon, shallow, foam);
  return group;
}

function createLandmarkBase(): THREE.Group {
  const group = new THREE.Group();
  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.55, 0.26, 16),
    new THREE.MeshLambertMaterial({ color: "#d8c089", flatShading: true }),
  );
  sand.position.y = -1.0;
  const wet = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.45, 0.1, 16),
    new THREE.MeshLambertMaterial({ color: "#ad8b59", flatShading: true }),
  );
  wet.position.y = -1.12;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 2.55, 52),
    new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.02;
  group.add(wet, sand, ring);
  return group;
}

function createIslandDef(theme: IslandDef["theme"], id: string, name: string): IslandDef {
  return {
    id,
    name,
    builder: "SHYBOY0499",
    description: "Asset preview",
    theme,
    position: [0, 0],
    projects: [{ id: `${id}-project`, name: "Preview", url: "#" }],
    photos: [],
  };
}

function setLandmarkCamera(camera: THREE.PerspectiveCamera, spec: LandmarkPreviewSpec): void {
  camera.fov = 28;
  camera.near = 0.1;
  camera.far = 120;
  camera.position.set(0, spec.cameraY, spec.cameraZ);
  camera.lookAt(0, spec.lookAtY, 0);
  camera.updateProjectionMatrix();
}

function attachLandmarkPreview(
  canvas: HTMLCanvasElement,
  spec: LandmarkPreviewSpec,
): void {
  const runtime = createRuntime(canvas);
  setLandmarkCamera(runtime.camera, spec);
  const base = createLandmarkBase();
  const propGroup = new THREE.Group();
  propGroup.position.y = spec.subjectY;
  propGroup.scale.setScalar(spec.scale);
  base.add(propGroup);
  runtime.subject.add(base);

  const rng = mulberry32(hashString(spec.seedId));
  const update = ISLAND_PROPS[spec.index]?.(propGroup, {
    ang: rng() * Math.PI * 2,
    rng,
    px: 0,
    pz: 0,
    addSmoke: () => undefined,
  });

  runtime.subject.rotation.y = -0.18;
  runtime.update = (time, _dt) => {
    runtime.subject.rotation.y = -0.18 + Math.sin(time * 0.34) * 0.08;
    update?.(time, 0.5);
  };

  previews.push(runtime);
  disposers.push(() => {
    disposeObject(base);
    runtime.renderer.dispose();
  });
}

function attachShipPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  const ship = new Ship();
  ship.group.scale.setScalar(0.23);
  ship.group.rotation.y = Math.PI;
  runtime.subject.add(ship.group);
  runtime.subject.position.y = -0.85;
  runtime.update = (time) => {
    runtime.subject.rotation.y = Math.sin(time * 0.45) * 0.35;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(ship.group);
    disposeObject(ship.wake);
    runtime.renderer.dispose();
  });
}

function attachFlyingDutchmanPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  const ship = new FlyingDutchman();
  ship.group.scale.setScalar(0.48);
  ship.group.position.y = -1.05;
  runtime.subject.add(ship.group);
  runtime.update = (time) => ship.update(time);
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(ship.group);
    runtime.renderer.dispose();
  });
}

function attachAncientJunglePortalPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 31;
  runtime.camera.position.set(0, 2.4, 14.5);
  runtime.camera.lookAt(0, 0.25, 0);
  runtime.camera.updateProjectionMatrix();
  const portal = new AncientJunglePortal();
  portal.group.scale.setScalar(0.78);
  portal.group.position.y = -0.15;
  portal.group.rotation.y = -0.08;
  runtime.subject.add(portal.group);
  runtime.update = (time) => portal.update(time);
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(portal.group);
    runtime.renderer.dispose();
  });
}

function attachVoxelNetherPortalPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 31;
  runtime.camera.position.set(0, 2.1, 13.4);
  runtime.camera.lookAt(0, -0.1, 0);
  runtime.camera.updateProjectionMatrix();
  const portal = new VoxelNetherPortal();
  portal.group.scale.setScalar(0.86);
  portal.group.position.y = 0.05;
  portal.group.rotation.y = -0.1;
  runtime.subject.add(portal.group);
  runtime.update = (time) => portal.update(time);
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(portal.group);
    runtime.renderer.dispose();
  });
}

function attachTidepoolArenaPortalPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 30;
  runtime.camera.position.set(0, 7.7, 9.7);
  runtime.camera.lookAt(0, 0, 0);
  runtime.camera.updateProjectionMatrix();
  const portal = new TidepoolArenaPortal();
  portal.group.scale.setScalar(0.65);
  portal.group.rotation.y = -0.14;
  runtime.subject.add(portal.group);
  runtime.update = (time) => portal.update(time);
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(portal.group);
    runtime.renderer.dispose();
  });
}

function attachKameIslandPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 29;
  runtime.camera.position.set(7.4, 5.8, 10.8);
  runtime.camera.lookAt(0, 1.45, 0);
  runtime.camera.updateProjectionMatrix();
  const island = new KameIslandScene();
  island.group.scale.setScalar(0.49);
  island.group.position.y = -0.7;
  runtime.subject.add(island.group);
  runtime.update = (time) => {
    island.update(time);
    runtime.subject.rotation.y = -0.12 + Math.sin(time * 0.28) * 0.06;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(island.group);
    runtime.renderer.dispose();
  });
}

function attachArchipelagoMaelstromPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 30;
  runtime.camera.position.set(9.4, 12.2, 17.2);
  runtime.camera.lookAt(0, -1.05, 0);
  runtime.camera.updateProjectionMatrix();
  const maelstrom = new ArchipelagoMaelstrom();
  maelstrom.group.scale.setScalar(0.42);
  maelstrom.group.position.y = -1.1;
  runtime.subject.add(maelstrom.group);
  runtime.update = (time) => {
    maelstrom.update(time, DAY, 0);
    runtime.subject.rotation.y = -0.18 + Math.sin(time * 0.24) * 0.04;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(maelstrom.group);
    runtime.renderer.dispose();
  });
}

function attachArchipelagoMaelstromV2Preview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 30;
  runtime.camera.position.set(10.7, 11.1, 17.3);
  runtime.camera.lookAt(0, 2.15, 0);
  runtime.camera.updateProjectionMatrix();
  const maelstrom = new ArchipelagoMaelstromV2();
  maelstrom.group.scale.setScalar(0.43);
  maelstrom.group.position.y = -1.05;
  runtime.subject.add(maelstrom.group);
  runtime.update = (time) => {
    maelstrom.update(time, DAY, 0);
    runtime.subject.rotation.y = -0.2 + Math.sin(time * 0.22) * 0.045;
  };
  previews.push(runtime);
  disposers.push(() => {
    maelstrom.dispose();
    disposeObject(maelstrom.group);
    runtime.renderer.dispose();
  });
}

function attachCharybdisWhirlpoolPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 29;
  runtime.camera.position.set(5.4, 16.8, 10.6);
  runtime.camera.lookAt(0, -0.55, 0);
  runtime.camera.updateProjectionMatrix();
  const charybdis = new CharybdisWhirlpool();
  charybdis.group.scale.setScalar(0.5);
  charybdis.group.position.y = -0.4;
  runtime.subject.add(charybdis.group);
  runtime.update = (time) => {
    charybdis.update(time);
    runtime.subject.rotation.y = -0.25 + Math.sin(time * 0.2) * 0.045;
  };
  previews.push(runtime);
  disposers.push(() => {
    charybdis.dispose();
    disposeObject(charybdis.group);
    runtime.renderer.dispose();
  });
}

function attachBabelTowerPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 26;
  runtime.camera.position.set(12.8, 12.2, 22.6);
  runtime.camera.lookAt(0, 9.1, 0);
  runtime.camera.updateProjectionMatrix();
  const tower = new BabelTower();
  tower.group.scale.setScalar(0.56);
  tower.group.position.y = 3.65;
  runtime.subject.add(tower.group);
  runtime.update = (time) => {
    tower.update(time);
    runtime.subject.rotation.y = -0.38 + Math.sin(time * 0.22) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(tower.group);
    runtime.renderer.dispose();
  });
}

function attachNoahsArkPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.fov = 31;
  runtime.camera.position.set(9.5, 8.1, 20.5);
  runtime.camera.lookAt(0, 3.25, 0);
  runtime.camera.updateProjectionMatrix();
  const ark = new NoahsArk();
  ark.group.scale.setScalar(0.66);
  ark.group.position.y = -0.5;
  runtime.subject.add(ark.group);
  runtime.update = (time) => {
    ark.update(time);
    runtime.subject.rotation.y = -0.08 + Math.sin(time * 0.18) * 0.055;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(ark.group);
    runtime.renderer.dispose();
  });
}

function attachCosmicOriginPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.position.set(0, 3.7, 12);
  runtime.camera.lookAt(0, 0.6, 0);
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.2, 2),
    new THREE.MeshStandardMaterial({
      color: 0x3976ff,
      emissive: 0x123a9c,
      emissiveIntensity: 0.9,
      roughness: 0.34,
      metalness: 0.38,
    }),
  );
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xc8ff36,
    transparent: true,
    opacity: 0.78,
  });
  const orbitA = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.028, 8, 120), ringMaterial);
  const orbitB = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.018, 8, 120), ringMaterial.clone());
  orbitB.rotation.x = Math.PI * 0.52;
  orbitB.rotation.y = Math.PI * 0.14;
  const nodes = new THREE.Group();
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const node = new THREE.Mesh(
      new THREE.OctahedronGeometry(index % 3 === 0 ? 0.16 : 0.11, 0),
      new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0xff654b : 0x59e6ff }),
    );
    node.position.set(Math.cos(angle) * 3.15, Math.sin(angle) * 0.72, Math.sin(angle) * 1.1);
    nodes.add(node);
  }
  runtime.subject.add(core, orbitA, orbitB, nodes);
  runtime.update = (time) => {
    core.rotation.y = time * 0.45;
    orbitA.rotation.z = time * 0.22;
    orbitB.rotation.z = -time * 0.18;
    nodes.rotation.y = time * 0.16;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(runtime.subject);
    runtime.renderer.dispose();
  });
}

function attachCosmicMediaPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.position.set(0, 3.4, 12);
  runtime.camera.lookAt(0, 0.7, 0);
  const group = new THREE.Group();
  const colors = [0x3976ff, 0xff654b, 0xc8ff36];
  colors.forEach((color, index) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 2.15, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x15191f,
        emissive: color,
        emissiveIntensity: 0.16,
        roughness: 0.42,
        metalness: 0.36,
      }),
    );
    panel.position.set((index - 1) * 1.28, index === 1 ? 0.34 : -0.08, index === 1 ? 0.15 : -0.25);
    panel.rotation.y = (index - 1) * -0.18;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.18, 1.48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
    );
    screen.position.z = 0.071;
    panel.add(screen);
    group.add(panel);
  });
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = Math.sin(time * 0.28) * 0.16;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachCosmicElementPreview(canvas: HTMLCanvasElement, assetId: string): void {
  const runtime = createRuntime(canvas);
  runtime.camera.position.set(0, 3.5, 12);
  runtime.camera.lookAt(0, 0.4, 0);
  const group = new THREE.Group();
  const blue = 0x3976ff;
  const acid = 0xc8ff36;
  const coral = 0xff654b;
  const cyan = 0x59e6ff;
  const material = (color: THREE.ColorRepresentation, emissive: THREE.ColorRepresentation = 0x000000) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.28,
      metalness: 0.68,
      emissive,
      emissiveIntensity: emissive === 0x000000 ? 0 : 0.42,
    });
  const addOrbit = (
    radius: number,
    color: THREE.ColorRepresentation,
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.018, 8, 120),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
    );
    orbit.rotation.set(...rotation);
    group.add(orbit);
    return orbit;
  };
  const addPanel = (x: number, y: number, color: THREE.ColorRepresentation, scale = 1) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.5 * scale, 1.0 * scale, 0.12),
      material(0x15191f, color),
    );
    panel.position.set(x, y, 0);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15 * scale, 0.68 * scale),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 }),
    );
    screen.position.z = 0.07;
    panel.add(screen);
    group.add(panel);
    return panel;
  };
  const addColumns = (count: number, accent: THREE.ColorRepresentation) => {
    for (let index = 0; index < count; index += 1) {
      const height = 0.55 + (index % 5) * 0.28;
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.28, height, 0.28), material(index % 3 === 0 ? accent : blue));
      column.position.set(-1.55 + (index % 6) * 0.62, height * 0.5 - 1.25 + Math.floor(index / 6) * 0.48, 0);
      group.add(column);
    }
  };

  switch (assetId) {
    case "cosmic-orbit-rings":
      addOrbit(1.5, acid, [0.45, 0.12, 0]);
      addOrbit(2.1, blue, [1.15, 0.34, 0.2]);
      addOrbit(2.65, coral, [0.7, -0.4, -0.18]);
      break;
    case "cosmic-orbital-nodes":
      for (let index = 0; index < 18; index += 1) {
        const angle = (index / 18) * Math.PI * 2;
        const node = new THREE.Mesh(
          new THREE.IcosahedronGeometry(index % 4 === 0 ? 0.18 : 0.1, 1),
          new THREE.MeshBasicMaterial({ color: [acid, cyan, coral][index % 3] }),
        );
        node.position.set(Math.cos(angle) * 2.6, Math.sin(angle) * 0.9, Math.sin(angle * 2) * 0.55);
        group.add(node);
      }
      addOrbit(2.55, acid, [0.82, -0.2, 0.1]);
      break;
    case "cosmic-wire-core":
      group.add(new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.35, 2),
        new THREE.MeshBasicMaterial({ color: blue, wireframe: true, transparent: true, opacity: 0.86 }),
      ));
      addOrbit(2.2, cyan, [0.82, 0.28, 0.14]);
      break;
    case "cosmic-knot-core":
      group.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.22, 120, 18), material(coral, 0x481108)));
      addOrbit(2.2, coral, [0.65, -0.2, 0.28]);
      break;
    case "cosmic-satellite-set":
      group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.82, 1), material(blue, 0x102d77)));
      [
        new THREE.BoxGeometry(0.42, 0.42, 0.42),
        new THREE.OctahedronGeometry(0.36, 0),
        new THREE.TorusGeometry(0.34, 0.08, 10, 40),
        new THREE.DodecahedronGeometry(0.34, 0),
      ].forEach((geometry, index) => {
        const angle = (index / 4) * Math.PI * 2;
        const satellite = new THREE.Mesh(geometry, material([acid, cyan, coral, 0xffffff][index]));
        satellite.position.set(Math.cos(angle) * 2.3, Math.sin(angle) * 1.0, 0);
        group.add(satellite);
      });
      break;
    case "cosmic-collab-columns":
      addColumns(15, acid);
      addOrbit(2.55, acid, [0.82, 0.22, 0.16]);
      break;
    case "cosmic-internship-columns":
      addPanel(-1.25, 0.25, cyan, 1.15);
      addColumns(5, acid);
      addOrbit(2.7, cyan, [0.9, 0.28, 0.14]);
      break;
    case "cosmic-ride-route": {
      const points = [
        new THREE.Vector3(-2.3, 0.85, 0),
        new THREE.Vector3(-1.2, -1.15, 0),
        new THREE.Vector3(0.15, 1.22, 0),
        new THREE.Vector3(1.55, 0.2, 0),
        new THREE.Vector3(2.5, -1.05, 0),
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: acid })));
      points.forEach((point, index) => {
        addPanel(point.x, point.y, [coral, acid, cyan, 0xffffff, blue][index], index === 3 ? 0.95 : 0.62);
      });
      break;
    }
    case "cosmic-final-portal": {
      const outer = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 20, 140), material(acid, 0x456b00));
      const inner = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.045, 10, 120), new THREE.MeshBasicMaterial({ color: blue, transparent: true, opacity: 0.9 }));
      inner.rotation.set(0.32, 0.2, 0);
      const surface = new THREE.Mesh(new THREE.CircleGeometry(1.08, 72), new THREE.MeshBasicMaterial({ color: 0x0c6f91, transparent: true, opacity: 0.58 }));
      group.add(outer, inner, surface, new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), material(0xffffff, blue)));
      break;
    }
    default:
      attachCosmicMediaPreview(canvas);
      return;
  }

  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = Math.sin(time * 0.22) * 0.16;
    group.children.forEach((child, index) => {
      child.rotation.z += index % 2 === 0 ? 0.003 : -0.002;
    });
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function createInkMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color: 0x202020, transparent: true, opacity: 0.88 });
}

function addOutlinedBox(group: THREE.Group, size: [number, number, number], position: [number, number, number]): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshBasicMaterial({ color: 0xf5f1e8, transparent: true, opacity: 0.32 }),
  );
  mesh.position.set(...position);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), createInkMaterial());
  mesh.add(edges);
  group.add(mesh);
  return mesh;
}

function attachLineworkRoomPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.fov = 29;
  runtime.camera.position.set(5.4, 4.2, 9.8);
  runtime.camera.lookAt(0, 1.05, 0);
  const room = new THREE.Group();
  addOutlinedBox(room, [4.8, 0.08, 3.4], [0, -0.92, 0]);
  addOutlinedBox(room, [4.8, 2.8, 0.08], [0, 0.45, -1.7]);
  addOutlinedBox(room, [1.35, 0.78, 0.12], [-0.72, 0.65, -1.52]);
  addOutlinedBox(room, [2.2, 0.16, 0.82], [0, -0.12, -0.6]);
  addOutlinedBox(room, [0.28, 1.45, 0.1], [1.55, 0.18, -1.48]);
  runtime.subject.add(room);
  runtime.update = (time) => {
    room.rotation.y = -0.22 + Math.sin(time * 0.26) * 0.06;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(room);
    runtime.renderer.dispose();
  });
}

function attachLineworkPortalPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(0, 3.6, 10);
  runtime.camera.lookAt(0, 1.1, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [1.4, 2.85, 0.1], [0, 0.55, 0]);
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 80 }, (_, index) => {
        const angle = (index / 80) * Math.PI * 2;
        const radius = 0.55 + Math.sin(angle * 3) * 0.06;
        return new THREE.Vector3(Math.cos(angle) * radius, 0.55 + Math.sin(angle) * radius * 1.28, 0.08);
      }),
    ),
    createInkMaterial(),
  );
  group.add(ring);
  runtime.subject.add(group);
  runtime.update = (time) => {
    ring.rotation.z = time * 0.35;
    group.rotation.y = Math.sin(time * 0.25) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkDeskPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(4.8, 3.5, 8.4);
  runtime.camera.lookAt(0, 0.9, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [3.2, 0.16, 1.25], [0, -0.34, 0]);
  addOutlinedBox(group, [1.6, 1.02, 0.12], [-0.35, 0.48, -0.38]);
  addOutlinedBox(group, [0.18, 0.62, 0.18], [-0.35, -0.12, -0.38]);
  addOutlinedBox(group, [0.8, 0.05, 0.48], [0.82, -0.2, 0.08]);
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = -0.24 + Math.sin(time * 0.24) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkBookshelfPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(3.4, 3.2, 8.2);
  runtime.camera.lookAt(0, 1.2, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [2.1, 3.4, 0.45], [0, 0.9, 0]);
  for (const y of [-0.2, 0.65, 1.5, 2.35]) addOutlinedBox(group, [1.8, 0.08, 0.56], [0, y, 0.05]);
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let book = 0; book < 4; book += 1) {
      addOutlinedBox(group, [0.18, 0.52 + ((book + shelf) % 2) * 0.14, 0.44], [-0.62 + book * 0.32, 0.05 + shelf * 0.86, 0.14]);
    }
  }
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = -0.18 + Math.sin(time * 0.2) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkWallPrintPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(0, 1.8, 7.4);
  runtime.camera.lookAt(0, 0.2, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [2.4, 1.8, 0.12], [0, 0, 0]);
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.82, -0.48, 0.08),
      new THREE.Vector3(-0.32, 0.35, 0.08),
      new THREE.Vector3(0.08, -0.08, 0.08),
      new THREE.Vector3(0.72, 0.52, 0.08),
    ]),
    createInkMaterial(),
  ));
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = Math.sin(time * 0.18) * 0.1;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkPhotoWallPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(0, 2.8, 8);
  runtime.camera.lookAt(0, 1.2, 0);
  const group = new THREE.Group();
  const positions = [
    [-0.92, 1.4], [0, 1.5], [0.92, 1.36],
    [-0.52, 0.42], [0.52, 0.48],
  ] as const;
  positions.forEach(([x, y], index) => {
    const frame = addOutlinedBox(group, [0.72, 0.5, 0.1], [x, y, 0]);
    frame.rotation.z = (index % 2 === 0 ? -1 : 1) * 0.04;
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.34),
      new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0xe9ecef : 0xd7edf2, transparent: true, opacity: 0.6 }),
    );
    fill.position.z = 0.07;
    frame.add(fill);
  });
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = Math.sin(time * 0.2) * 0.1;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkPlantPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(0, 2.8, 7.8);
  runtime.camera.lookAt(0, 0.9, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [0.75, 0.7, 0.75], [0, -0.48, 0]);
  const ink = createInkMaterial();
  for (let index = 0; index < 8; index += 1) {
    const angle = -1.15 + index * 0.33;
    const tip = new THREE.Vector3(Math.sin(angle) * 0.86, 1.1 + (index % 3) * 0.18, Math.cos(angle) * 0.18);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.08, 0), tip]), ink));
    const leaf = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16),
      new THREE.MeshBasicMaterial({ color: 0xf5f1e8, transparent: true, opacity: 0.36 }),
    );
    leaf.position.copy(tip);
    leaf.scale.set(0.45, 1, 1);
    group.add(leaf);
  }
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = Math.sin(time * 0.22) * 0.12;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkGlobePreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(0, 2.7, 8.6);
  runtime.camera.lookAt(0, 0.78, 0);
  const group = new THREE.Group();
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 28, 18),
    new THREE.MeshBasicMaterial({ color: 0xf5f1e8, transparent: true, opacity: 0.34 }),
  );
  globe.add(new THREE.LineSegments(new THREE.EdgesGeometry(globe.geometry, 28), createInkMaterial()));
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 72 }, (_, index) => {
        const angle = (index / 72) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0);
      }),
    ),
    createInkMaterial(),
  );
  ring.rotation.z = -0.42;
  group.add(globe, ring);
  addOutlinedBox(group, [0.18, 0.85, 0.18], [0, -1.18, 0]);
  addOutlinedBox(group, [1.12, 0.16, 0.72], [0, -1.68, 0]);
  runtime.subject.add(group);
  runtime.update = (time) => {
    globe.rotation.y = time * 0.38;
    group.rotation.y = Math.sin(time * 0.22) * 0.16;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkFanPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(0, 3.1, 8);
  runtime.camera.lookAt(0, 0.2, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [0.16, 1.0, 0.16], [0, 0.55, 0]);
  addOutlinedBox(group, [0.5, 0.32, 0.5], [0, 0, 0]);
  for (let index = 0; index < 4; index += 1) {
    const angle = index * (Math.PI / 2);
    const blade = addOutlinedBox(group, [1.55, 0.07, 0.32], [Math.cos(angle) * 0.74, -0.05, Math.sin(angle) * 0.74]);
    blade.rotation.y = -angle;
  }
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = time * 0.74;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkSofaPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(4.6, 2.9, 8.6);
  runtime.camera.lookAt(0, 0.7, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [3.0, 0.68, 1.3], [0, -0.26, 0]);
  addOutlinedBox(group, [2.65, 1.05, 0.34], [0, 0.48, -0.48]);
  addOutlinedBox(group, [0.34, 0.96, 1.36], [-1.42, 0.08, 0]);
  addOutlinedBox(group, [0.34, 0.96, 1.36], [1.42, 0.08, 0]);
  addOutlinedBox(group, [1.12, 0.72, 0.18], [-0.58, 0.52, -0.22]);
  addOutlinedBox(group, [1.12, 0.72, 0.18], [0.58, 0.52, -0.22]);
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = -0.26 + Math.sin(time * 0.22) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkCoffeeTablePreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(3.8, 2.6, 7.6);
  runtime.camera.lookAt(0, 0.2, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [2.2, 0.14, 1.18], [0, 0.18, 0]);
  for (const x of [-0.82, 0.82]) {
    for (const z of [-0.38, 0.38]) addOutlinedBox(group, [0.12, 0.68, 0.12], [x, -0.22, z]);
  }
  addOutlinedBox(group, [0.58, 0.08, 0.34], [0.2, 0.3, -0.04]);
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.1, 0.22, 16),
    new THREE.MeshBasicMaterial({ color: 0xf5f1e8, transparent: true, opacity: 0.34 }),
  );
  cup.position.set(-0.46, 0.36, 0.16);
  cup.add(new THREE.LineSegments(new THREE.EdgesGeometry(cup.geometry, 12), createInkMaterial()));
  group.add(cup);
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = -0.3 + Math.sin(time * 0.22) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachLineworkSideTablePreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.renderer.setClearColor(0xffffff, 0);
  runtime.camera.position.set(3.2, 2.5, 7.4);
  runtime.camera.lookAt(0, 0.45, 0);
  const group = new THREE.Group();
  addOutlinedBox(group, [1.4, 0.14, 0.9], [0, 0.5, 0]);
  for (const x of [-0.52, 0.52]) {
    for (const z of [-0.32, 0.32]) addOutlinedBox(group, [0.1, 0.96, 0.1], [x, 0.0, z]);
  }
  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28),
    new THREE.MeshBasicMaterial({ color: 0xf5f1e8, transparent: true, opacity: 0.34 }),
  );
  tray.position.set(0, 0.66, 0);
  tray.add(new THREE.LineSegments(new THREE.EdgesGeometry(tray.geometry, 12), createInkMaterial()));
  group.add(tray);
  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = -0.22 + Math.sin(time * 0.22) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachStudioAssetPreview(canvas: HTMLCanvasElement, assetId: string): void {
  const runtime = createRuntime(canvas);
  runtime.camera.position.set(5.2, 4.2, 10.4);
  runtime.camera.lookAt(0, 0.9, 0);
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xa96f45, roughness: 0.48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.5 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x7d8588, roughness: 0.28, metalness: 0.6 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x59e6ff });

  const addBox = (
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };
  const addMonitor = () => {
    const monitor = addBox([1.65, 1.05, 0.14], [-0.18, 0.34, -0.38], dark);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.72), glow);
    screen.position.z = 0.081;
    monitor.add(screen);
    addBox([0.16, 0.48, 0.16], [-0.18, -0.44, -0.32], metal);
    addBox([0.82, 0.08, 0.42], [-0.18, -0.72, -0.18], metal);
  };
  const addDesk = () => {
    addBox([4.2, 0.32, 1.55], [0, -0.6, 0], wood);
    for (const x of [-1.75, 1.75]) {
      for (const z of [-0.55, 0.55]) addBox([0.12, 1.2, 0.12], [x, -1.22, z], metal);
    }
  };

  switch (assetId) {
    case "studio-architecture":
      runtime.camera.position.set(5.7, 4.6, 11.2);
      addBox([4.8, 0.16, 3.6], [0, -1.15, 0.2], wood);
      addBox([4.8, 2.8, 0.16], [0, 0.22, -1.55], new THREE.MeshStandardMaterial({ color: 0xd8d4ca }));
      addBox([0.16, 2.8, 3.6], [2.36, 0.22, 0.2], new THREE.MeshStandardMaterial({ color: 0xcfc9bf }));
      addBox([1.4, 1.0, 0.05], [-1.1, 0.62, -1.44], new THREE.MeshBasicMaterial({ color: 0x9ec8dc }));
      addBox([2.5, 0.04, 1.35], [0.2, -1.04, 0.3], new THREE.MeshStandardMaterial({ color: 0x496b64 }));
      break;
    case "studio-desk-surface":
      addBox([4.4, 0.32, 1.7], [0, -0.25, 0], wood);
      break;
    case "studio-desk-leg":
      for (const x of [-1.15, 1.15]) {
        for (const z of [-0.48, 0.48]) addBox([0.16, 1.7, 0.16], [x, -0.45, z], metal);
      }
      break;
    case "studio-desk-drawer":
      addBox([1.35, 1.18, 1.35], [0, -0.16, 0], wood);
      for (const y of [0.12, -0.24]) addBox([1.08, 0.22, 0.08], [0, y, 0.72], metal);
      break;
    case "studio-monitor":
      addMonitor();
      break;
    case "studio-keyboard":
      addBox([2.15, 0.14, 0.72], [0, -0.2, 0], dark);
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 12; column += 1) {
          addBox([0.12, 0.045, 0.09], [-0.72 + column * 0.13, -0.07, -0.24 + row * 0.14], metal);
        }
      }
      break;
    case "studio-mug": {
      const mugMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e3da, roughness: 0.24 });
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.62, 32), mugMaterial);
      cup.position.y = -0.1;
      group.add(cup);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.055, 12, 28, Math.PI * 1.55), mugMaterial);
      handle.position.set(0.36, -0.08, 0);
      handle.rotation.y = Math.PI / 2;
      group.add(handle);
      addBox([1.2, 0.06, 0.78], [0, -0.48, 0], wood);
      break;
    }
    case "studio-chair":
      addBox([1.65, 0.34, 1.25], [0, -0.52, 0], dark);
      addBox([1.7, 1.65, 0.24], [0, 0.28, -0.52], dark);
      addBox([0.16, 0.9, 0.16], [0, -1.15, 0], metal);
      for (let index = 0; index < 5; index += 1) {
        const angle = (index / 5) * Math.PI * 2;
        addBox([0.75, 0.08, 0.12], [Math.cos(angle) * 0.42, -1.55, Math.sin(angle) * 0.42], metal);
      }
      break;
    case "studio-desk-lamp": {
      const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffc879, emissive: 0x7a3b00, emissiveIntensity: 0.25 });
      addBox([0.72, 0.1, 0.72], [0, -0.86, 0], dark);
      const armA = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 16), metal);
      armA.position.set(-0.14, -0.25, 0);
      armA.rotation.z = -0.38;
      group.add(armA);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.64, 28), lampMaterial);
      shade.position.set(0.42, 0.42, 0);
      shade.rotation.z = -0.78;
      group.add(shade);
      break;
    }
    case "studio-boards":
      addBox([1.7, 1.08, 0.08], [-0.85, 0, 0], new THREE.MeshBasicMaterial({ color: 0x7cc6ff }));
      addBox([1.62, 1.16, 0.08], [0.95, 0.06, 0], new THREE.MeshBasicMaterial({ color: 0xc8ff36 }));
      break;
    case "studio-photo-wall":
      for (const [index, position] of [[0, [-0.95, 0.42, 0]], [1, [0, 0.66, 0]], [2, [0.95, 0.28, 0]], [3, [-0.42, -0.42, 0]], [4, [0.55, -0.5, 0]]] as const) {
        const frame = addBox([0.72, 0.52, 0.08], position as [number, number, number], wood);
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.36), new THREE.MeshBasicMaterial({ color: index % 2 ? 0xffc879 : 0x59e6ff }));
        photo.position.z = 0.045;
        frame.add(photo);
      }
      break;
    case "studio-shelf":
      addBox([2.55, 0.18, 0.52], [0, -0.28, 0], wood);
      for (let index = 0; index < 6; index += 1) {
        addBox([0.18, 0.72 + (index % 3) * 0.16, 0.34], [-0.75 + index * 0.3, 0.16, 0], new THREE.MeshStandardMaterial({ color: [0x31587a, 0xd4a24c, 0x8d4a52][index % 3] }));
      }
      break;
    case "studio-guitar": {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 18), new THREE.MeshStandardMaterial({ color: 0x163b49, roughness: 0.4 }));
      body.scale.set(0.72, 1, 0.18);
      body.position.y = -0.32;
      group.add(body);
      addBox([0.16, 1.82, 0.12], [0, 0.8, 0], wood);
      for (let string = 0; string < 6; string += 1) addBox([0.012, 2.25, 0.012], [-0.05 + string * 0.02, 0.34, 0.1], metal);
      break;
    }
    case "studio-turntable":
      addBox([1.9, 0.28, 1.35], [0, -0.56, 0], dark);
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 48), metal));
      addBox([0.52, 0.06, 0.12], [0.72, 0.2, 0.34], metal);
      break;
    case "studio-record":
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 64), dark));
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32), new THREE.MeshBasicMaterial({ color: 0xd94b55 })));
      break;
    case "studio-plant":
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.34, 0.72, 32), new THREE.MeshStandardMaterial({ color: 0xa9543a })));
      for (let index = 0; index < 8; index += 1) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), new THREE.MeshStandardMaterial({ color: 0x2e7257 }));
        leaf.scale.set(0.48, 1.35, 0.18);
        leaf.position.set((index - 3.5) * 0.16, 0.42 + (index % 3) * 0.24, Math.sin(index) * 0.2);
        leaf.rotation.z = (index - 3.5) * 0.16;
        group.add(leaf);
      }
      break;
    default:
      addDesk();
      addMonitor();
      group.add(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 20), new THREE.MeshStandardMaterial({ color: 0xffc879 })));
  }

  runtime.subject.add(group);
  runtime.update = (time) => {
    group.rotation.y = -0.32 + Math.sin(time * 0.24) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachStudioPortalPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  runtime.camera.position.set(0, 3.7, 10.2);
  runtime.camera.lookAt(0, 1.15, 0);
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 3.15, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xd7c3a4, roughness: 0.42 }),
  );
  const aperture = new THREE.Mesh(
    new THREE.PlaneGeometry(1.24, 2.48),
    new THREE.MeshBasicMaterial({ color: 0x10152a }),
  );
  aperture.position.z = 0.095;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(90);
  for (let index = 0; index < 30; index += 1) {
    starPositions[index * 3] = (mulberry32(index + 9)() - 0.5) * 1.0;
    starPositions[index * 3 + 1] = mulberry32(index + 19)() * 2.2 - 0.95;
    starPositions[index * 3 + 2] = 0.14;
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc8ff36, size: 0.045 }));
  group.add(frame, aperture, stars);
  runtime.subject.add(group);
  runtime.update = (time) => {
    stars.rotation.z = time * 0.12;
    group.rotation.y = Math.sin(time * 0.22) * 0.08;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(group);
    runtime.renderer.dispose();
  });
}

function attachIslandPreview(
  canvas: HTMLCanvasElement,
  spec: IslandPreviewSpec,
): void {
  const runtime = createRuntime(canvas);
  setIslandProductCamera(runtime.camera);
  if (spec.cameraY !== undefined || spec.cameraZ !== undefined || spec.lookAtY !== undefined) {
    runtime.camera.position.set(0, spec.cameraY ?? 7.4, spec.cameraZ ?? 9.6);
    runtime.camera.lookAt(0, spec.lookAtY ?? -0.05, 0);
    runtime.camera.updateProjectionMatrix();
  }
  const previewBase = createIslandPreviewBase();
  const island = new IslandObject(createIslandDef(spec.theme, spec.seedId, spec.name));
  const islandFrame = new THREE.Group();
  islandFrame.scale.setScalar(spec.scale ?? 0.095);
  islandFrame.add(island.group);
  runtime.subject.add(previewBase, islandFrame);
  runtime.subject.position.y = -0.2;
  runtime.subject.rotation.y = spec.rotationY ?? -0.48;
  runtime.update = (time, dt) => {
    island.update(time, dt, "visited", true, 0);
    runtime.subject.rotation.y = (spec.rotationY ?? -0.48) + Math.sin(time * 0.35) * 0.06;
    previewBase.rotation.z = Math.sin(time * 0.4) * 0.015;
  };
  previews.push(runtime);
  disposers.push(() => {
    disposeObject(previewBase);
    disposeObject(island.group);
    runtime.renderer.dispose();
  });
}

function attachBoostPreview(canvas: HTMLCanvasElement): void {
  const runtime = createRuntime(canvas);
  const boost = createMobileBoostModel();
  runtime.subject.add(boost.group);
  previews.push(runtime);
  let active = false;
  const onEnter = () => {
    active = true;
    boost.setActive(true);
  };
  const onLeave = () => {
    active = false;
    boost.setActive(false);
  };
  canvas.addEventListener("pointerenter", onEnter);
  canvas.addEventListener("pointerleave", onLeave);
  boost.setActive(false);
  boostPulseTimer = window.setInterval(() => {
    if (!active) boost.setActive(Math.sin(performance.now() * 0.003) > 0);
  }, 900);
  disposers.push(() => {
    canvas.removeEventListener("pointerenter", onEnter);
    canvas.removeEventListener("pointerleave", onLeave);
    if (boostPulseTimer !== null) {
      window.clearInterval(boostPulseTimer);
      boostPulseTimer = null;
    }
    boost.dispose();
    runtime.renderer.dispose();
  });
}

function wrapGalleryOffset(offset: number, total: number): number {
  const wrapped = ((offset % total) + total) % total;
  return wrapped > total / 2 ? wrapped - total : wrapped;
}

function updateCircularGallery(): void {
  const gallery = document.querySelector<HTMLElement>("[data-asset-gallery]");
  if (!gallery) return;

  const allCards = Array.from(gallery.querySelectorAll<HTMLElement>(".asset-card"));
  allCards
    .filter((card) => card.hidden)
    .forEach((card) => {
      const canvas = card.querySelector<HTMLCanvasElement>("[data-asset-preview]");
      if (canvas) disposePreviewForCanvas(canvas);
    });

  const cards = allCards.filter(
    (card) => !card.hidden,
  );
  if (cards.length === 0) return;

  galleryCurrent += (galleryTarget - galleryCurrent) * 0.075;
  const width = gallery.clientWidth || window.innerWidth;
  const height = gallery.clientHeight || 520;
  const spacing = Math.min(Math.max(width * 0.21, 180), 300);
  const bend = Math.min(Math.max(height * 0.28, 116), 188);
  const arcDepth = 0.31;
  const tiltZ = 7.2;
  const tiltY = 10.5;
  const visibleRange = Math.max(3.3, width / spacing + 0.8);

  cards.forEach((card, index) => {
    const offset = wrapGalleryOffset(index - galleryCurrent, cards.length);
    const distance = Math.abs(offset);
    const clamped = Math.min(distance, visibleRange);
    const x = offset * spacing;
    const y = Math.pow(clamped, 1.72) * bend * arcDepth;
    const z = -Math.pow(clamped, 1.22) * 118;
    const rotateZ = -offset * tiltZ;
    const rotateY = -offset * tiltY;
    const scale = Math.max(0.72, 1 - clamped * 0.055);
    const opacity = distance > visibleRange ? 0 : Math.max(0.16, 1 - clamped * 0.14);

    card.style.transform = [
      "translate3d(-50%, -50%, 0)",
      `translate3d(${x}px, ${y}px, ${z}px)`,
      `rotateY(${rotateY}deg)`,
      `rotateZ(${rotateZ}deg)`,
      `scale(${scale})`,
    ].join(" ");
    card.style.opacity = String(opacity);
    card.style.filter = `saturate(${Math.max(0.72, 1 - clamped * 0.05)}) brightness(${Math.max(0.62, 1 - clamped * 0.07)})`;
    card.style.zIndex = String(1000 - Math.round(distance * 100));
    card.style.pointerEvents = distance > 2.65 ? "none" : "auto";

    const canvas = card.querySelector<HTMLCanvasElement>("[data-asset-preview]");
    if (canvas) {
      if (distance <= Math.min(visibleRange, 3.25)) {
        attachPreviewForCanvas(canvas);
      } else {
        disposePreviewForCanvas(canvas);
      }
    }
  });
}

function initCircularGallery(): void {
  const gallery = document.querySelector<HTMLElement>("[data-asset-gallery]");
  if (!gallery) return;

  const moveBy = (delta: number): void => {
    galleryTarget += delta;
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    moveBy(Math.sign(delta) * 0.78);
  };

  const onPointerDown = (event: PointerEvent): void => {
    galleryPointerDown = true;
    galleryPointerStartX = event.clientX;
    galleryPointerStartTarget = galleryTarget;
    galleryDragDistance = 0;
    gallery.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!galleryPointerDown) return;
    galleryDragDistance = event.clientX - galleryPointerStartX;
    galleryTarget = galleryPointerStartTarget - galleryDragDistance / 185;
    if (Math.abs(galleryDragDistance) > 6) suppressNextGalleryClick = true;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!galleryPointerDown) return;
    galleryPointerDown = false;
    gallery.releasePointerCapture(event.pointerId);
    galleryTarget = Math.round(galleryTarget);
  };

  const onClick = (event: MouseEvent): void => {
    if (!suppressNextGalleryClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressNextGalleryClick = false;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(-1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      galleryTarget = 0;
    }
  };

  gallery.addEventListener("wheel", onWheel, { passive: false });
  gallery.addEventListener("pointerdown", onPointerDown);
  gallery.addEventListener("pointermove", onPointerMove);
  gallery.addEventListener("pointerup", onPointerUp);
  gallery.addEventListener("pointercancel", onPointerUp);
  gallery.addEventListener("click", onClick, true);
  gallery.addEventListener("keydown", onKeyDown);

  disposers.push(() => {
    gallery.removeEventListener("wheel", onWheel);
    gallery.removeEventListener("pointerdown", onPointerDown);
    gallery.removeEventListener("pointermove", onPointerMove);
    gallery.removeEventListener("pointerup", onPointerUp);
    gallery.removeEventListener("pointercancel", onPointerUp);
    gallery.removeEventListener("click", onClick, true);
    gallery.removeEventListener("keydown", onKeyDown);
  });
}

function initAssetFilters(): void {
  const gallery = document.querySelector<HTMLElement>("[data-asset-gallery]");
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-asset-filter]"));
  if (!gallery || buttons.length === 0) return;

  const cards = Array.from(gallery.querySelectorAll<HTMLElement>(".asset-card"));
  const applyFilter = (worldId: string): void => {
    galleryTarget = 0;
    galleryCurrent = 0;
    cards.forEach((card) => {
      card.hidden = worldId !== "all" && card.dataset.assetWorld !== worldId;
      const number = card.querySelector<HTMLElement>("[data-asset-number]");
      if (number) {
        number.textContent = worldId === "all"
          ? number.dataset.assetNumberAll ?? ""
          : number.dataset.assetNumberWorld ?? "";
      }
    });
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.assetFilter === worldId));
    });
    updateCircularGallery();
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.assetFilter ?? "all"));
  });
}

function renderLoop(now: number): void {
  const time = now * 0.001;
  const dt = Math.min((now - lastTime) * 0.001, 0.05);
  lastTime = now;
  updateCircularGallery();
  previews.forEach((runtime) => {
    resizePreview(runtime);
    runtime.update?.(time, dt);
    runtime.renderer.render(runtime.scene, runtime.camera);
  });
  requestAnimationFrame(renderLoop);
}

function attachPreviewForCanvas(canvas: HTMLCanvasElement): void {
  if (initializedPreviewCanvases.has(canvas)) return;
  initializedPreviewCanvases.add(canvas);
  const previewStart = previews.length;
  const disposerStart = disposers.length;
  try {
    const preview = canvas.dataset.assetPreview;
    if (preview === "ship") attachShipPreview(canvas);
    if (preview === "flying-dutchman") attachFlyingDutchmanPreview(canvas);
    if (preview === "ancient-jungle-portal") attachAncientJunglePortalPreview(canvas);
    if (preview === "voxel-nether-portal") attachVoxelNetherPortalPreview(canvas);
    if (preview === "tidepool-arena-portal") attachTidepoolArenaPortalPreview(canvas);
    if (preview === "kame-island-scene") attachKameIslandPreview(canvas);
    if (preview === "archipelago-maelstrom") attachArchipelagoMaelstromPreview(canvas);
    if (preview === "archipelago-maelstrom-v2") attachArchipelagoMaelstromV2Preview(canvas);
    if (preview === "charybdis-whirlpool") attachCharybdisWhirlpoolPreview(canvas);
    if (preview === "babel-tower") attachBabelTowerPreview(canvas);
    if (preview === "noahs-ark") attachNoahsArkPreview(canvas);
    if (preview === "forest-dome") attachIslandPreview(canvas, { theme: "forest", seedId: "asset-10", name: "森林岛 · 圆丘", scale: 0.086, cameraY: 8.2, cameraZ: 11.9, lookAtY: 0.25, rotationY: -0.32 });
    if (preview === "forest-double") attachIslandPreview(canvas, { theme: "forest", seedId: "asset-2", name: "森林岛 · 双丘" });
    if (preview === "forest-tiered") attachIslandPreview(canvas, { theme: "forest", seedId: "asset-15", name: "森林岛 · 层叠", scale: 0.1, cameraY: 6.3, cameraZ: 10.6, lookAtY: 0.9, rotationY: -0.64 });
    if (preview === "forest-pillar") attachIslandPreview(canvas, { theme: "forest", seedId: "asset-4", name: "森林岛 · 峰柱" });
    if (preview === "volcano-island") attachIslandPreview(canvas, { theme: "volcano", seedId: "asset-volcano", name: "火山岛" });
    if (preview === "snow-spire") attachIslandPreview(canvas, { theme: "snow", seedId: "asset-6", name: "雪峰岛 · 尖塔" });
    if (preview === "landmark-lighthouse") attachLandmarkPreview(canvas, { index: 0, title: "灯塔", seedId: "landmark-lighthouse", scale: 0.72, cameraY: 6.1, cameraZ: 10.2, lookAtY: 2.6, subjectY: 0 });
    if (preview === "landmark-windmill") attachLandmarkPreview(canvas, { index: 1, title: "风车", seedId: "landmark-windmill", scale: 0.85, cameraY: 5.3, cameraZ: 10.0, lookAtY: 2.4, subjectY: 0 });
    if (preview === "landmark-campfire") attachLandmarkPreview(canvas, { index: 2, title: "篝火", seedId: "landmark-campfire", scale: 1.2, cameraY: 3.8, cameraZ: 8.6, lookAtY: 1.0, subjectY: 0.05 });
    if (preview === "landmark-flag") attachLandmarkPreview(canvas, { index: 3, title: "旗帜", seedId: "landmark-flag", scale: 0.82, cameraY: 5.0, cameraZ: 9.6, lookAtY: 2.2, subjectY: 0 });
    if (preview === "boost") attachBoostPreview(canvas);
    if (preview === "cosmic-origin-hub") attachCosmicOriginPreview(canvas);
    if (preview === "cosmic-media-panel") attachCosmicMediaPreview(canvas);
    if (preview?.startsWith("cosmic-") && preview !== "cosmic-origin-hub" && preview !== "cosmic-media-panel") {
      attachCosmicElementPreview(canvas, preview);
    }
    if (preview === "linework-room") attachLineworkRoomPreview(canvas);
    if (preview === "linework-paper-portal") attachLineworkPortalPreview(canvas);
    if (preview === "linework-room-shell") attachLineworkRoomPreview(canvas);
    if (preview === "linework-desk") attachLineworkDeskPreview(canvas);
    if (preview === "linework-desk-surface") attachLineworkDeskPreview(canvas);
    if (preview === "linework-desk-leg") attachLineworkDeskPreview(canvas);
    if (preview === "linework-monitor") attachLineworkDeskPreview(canvas);
    if (preview === "linework-keyboard") attachLineworkDeskPreview(canvas);
    if (preview === "linework-mouse") attachLineworkDeskPreview(canvas);
    if (preview === "linework-bookshelf") attachLineworkBookshelfPreview(canvas);
    if (preview === "linework-bookshelf-case") attachLineworkBookshelfPreview(canvas);
    if (preview === "linework-bookshelf-book") attachLineworkBookshelfPreview(canvas);
    if (preview === "linework-wall-print") attachLineworkWallPrintPreview(canvas);
    if (preview === "linework-wall-chart-line") attachLineworkWallPrintPreview(canvas);
    if (preview === "linework-photo-wall") attachLineworkPhotoWallPreview(canvas);
    if (preview === "linework-photo-frame") attachLineworkPhotoWallPreview(canvas);
    if (preview === "linework-photo-plane") attachLineworkPhotoWallPreview(canvas);
    if (preview === "linework-door-clock") attachLineworkPortalPreview(canvas);
    if (preview === "linework-door-panel") attachLineworkPortalPreview(canvas);
    if (preview === "linework-door-knob") attachLineworkPortalPreview(canvas);
    if (preview === "linework-clock-face") attachLineworkPortalPreview(canvas);
    if (preview === "linework-clock-hand") attachLineworkPortalPreview(canvas);
    if (preview === "linework-plant") attachLineworkPlantPreview(canvas);
    if (preview === "linework-plant-pot") attachLineworkPlantPreview(canvas);
    if (preview === "linework-plant-leaf") attachLineworkPlantPreview(canvas);
    if (preview === "linework-globe") attachLineworkGlobePreview(canvas);
    if (preview === "linework-globe-sphere") attachLineworkGlobePreview(canvas);
    if (preview === "linework-globe-graticule") attachLineworkGlobePreview(canvas);
    if (preview === "linework-globe-stand") attachLineworkGlobePreview(canvas);
    if (preview === "linework-ceiling-fan") attachLineworkFanPreview(canvas);
    if (preview === "linework-fan-rod") attachLineworkFanPreview(canvas);
    if (preview === "linework-fan-hub") attachLineworkFanPreview(canvas);
    if (preview === "linework-fan-blade") attachLineworkFanPreview(canvas);
    if (preview === "linework-sofa") attachLineworkSofaPreview(canvas);
    if (preview === "linework-sofa-cushion") attachLineworkSofaPreview(canvas);
    if (preview === "linework-coffee-table") attachLineworkCoffeeTablePreview(canvas);
    if (preview === "linework-table-book") attachLineworkCoffeeTablePreview(canvas);
    if (preview === "linework-cup") attachLineworkCoffeeTablePreview(canvas);
    if (preview === "linework-side-table") attachLineworkSideTablePreview(canvas);
    if (preview === "linework-tray") attachLineworkSideTablePreview(canvas);
    if (preview?.startsWith("studio-") && preview !== "studio-portal-door") attachStudioAssetPreview(canvas, preview);
    if (preview === "studio-portal-door") attachStudioPortalPreview(canvas);
    const createdPreviews = previews.slice(previewStart);
    const createdDisposers = disposers.splice(disposerStart);
    if (createdPreviews.length === 0) {
      initializedPreviewCanvases.delete(canvas);
      return;
    }
    previewDisposersByCanvas.set(canvas, () => {
      createdPreviews.forEach((runtime) => {
        const index = previews.indexOf(runtime);
        if (index >= 0) previews.splice(index, 1);
      });
      createdDisposers.forEach((dispose) => dispose());
    });
  } catch {
    disposers.splice(disposerStart);
    previews.splice(previewStart);
    initializedPreviewCanvases.delete(canvas);
    const status = canvas.parentElement?.querySelector(".asset-stage-status");
    if (status) status.textContent = "PREVIEW UNAVAILABLE";
  }
}

initAssetFilters();
initCircularGallery();

const detailDialog = document.querySelector<HTMLDialogElement>("[data-asset-dialog]");
const detailPreview = document.querySelector<HTMLElement>("[data-asset-dialog-preview]");
const detailCopy = document.querySelector<HTMLElement>("[data-asset-dialog-copy]");

interface AssetCopyEntry {
  readonly title: string;
  readonly world: string;
  readonly file: string;
  readonly note: string;
  readonly tags: readonly string[];
  readonly codeRefs: readonly string[];
}

interface AssetSourcePayload {
  readonly assets: Record<string, AssetCopyEntry>;
  readonly files: Record<string, string | null>;
}

function getAssetSourcePayload(): AssetSourcePayload | null {
  const payload = document.querySelector<HTMLScriptElement>("#asset-source-payload")?.textContent;
  if (!payload) return null;
  try {
    return JSON.parse(payload) as AssetSourcePayload;
  } catch {
    return null;
  }
}

function assetCopyText(assetId: string): string | null {
  const sourcePayload = getAssetSourcePayload();
  const asset = sourcePayload?.assets[assetId];
  if (!asset || !sourcePayload) return null;
  const header = [
    `Asset: ${asset.title}`,
    `World: ${asset.world}`,
    `Source: ${asset.file}`,
    `Tags: ${asset.tags.join(", ")}`,
    `Note: ${asset.note}`,
  ];
  const sourceBlocks = asset.codeRefs.flatMap((ref) => {
    const source = sourcePayload.files[ref];
    if (!source) return [`===== ${ref} =====`, "[源码文件不存在或不可复制。]"];
    return [`===== ${ref} =====`, source.trimEnd()];
  });
  const fallback = [
    "===== 资源引用 =====",
    asset.file,
    "这个资产是图片、外部资源或组合说明，资产墙复制的是资源路径和展示说明。",
  ];
  return [...header, "", ...(sourceBlocks.length > 0 ? sourceBlocks : fallback)].join("\n");
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("Clipboard copy failed.");
}

function restoreDialogCanvas(): void {
  const activePreview = activeDialogCanvas ?? activeDialogImage;
  if (!activePreview || !activeCanvasAnchor?.parentNode) return;
  activeCanvasAnchor.parentNode.insertBefore(activePreview, activeCanvasAnchor);
  activeCanvasAnchor.remove();
  activeDialogCanvas = null;
  activeDialogImage = null;
  activeCanvasAnchor = null;
}

document.querySelectorAll<HTMLButtonElement>("[data-asset-open]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!detailDialog || !detailPreview || !detailCopy) return;
    restoreDialogCanvas();
    const source = document.querySelector<HTMLElement>(`#asset-detail-${button.dataset.assetOpen}`);
    const preview = button.querySelector<HTMLCanvasElement | HTMLImageElement>("[data-asset-preview], .asset-poster");
    if (!source || !preview) return;

    activeCanvasAnchor = document.createComment("asset-preview-anchor");
    preview.parentNode?.insertBefore(activeCanvasAnchor, preview);
    detailPreview.replaceChildren(preview);
    if (preview instanceof HTMLCanvasElement) activeDialogCanvas = preview;
    else activeDialogImage = preview;
    detailCopy.replaceChildren(...Array.from(source.children).map((child) => child.cloneNode(true)));
    detailDialog.showModal();
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-asset-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const assetId = button.dataset.assetCopy;
    if (!assetId) return;
    const text = assetCopyText(assetId);
    const label = button.querySelector("span");
    const previousLabel = label?.textContent ?? "Copy";
    button.disabled = true;
    if (label) label.textContent = "Copying";
    button.classList.add("is-copying");
    try {
      if (!text) throw new Error("Asset source payload is unavailable.");
      await writeClipboard(text);
      if (label) label.textContent = "Copied";
      button.classList.add("is-copied");
    } catch {
      if (label) label.textContent = "Failed";
      button.classList.add("is-failed");
    } finally {
      window.setTimeout(() => {
        if (label) label.textContent = previousLabel;
        button.disabled = false;
        button.classList.remove("is-copying", "is-copied", "is-failed");
      }, 1400);
    }
  });
});

document.querySelector<HTMLButtonElement>("[data-asset-close]")?.addEventListener("click", () => {
  detailDialog?.close();
});

detailDialog?.addEventListener("close", restoreDialogCanvas);

requestAnimationFrame(renderLoop);

window.addEventListener("pagehide", () => {
  restoreDialogCanvas();
  if (boostPulseTimer !== null) {
    window.clearInterval(boostPulseTimer);
    boostPulseTimer = null;
  }
  [...previewDisposersByCanvas.keys()].forEach(disposePreviewForCanvas);
  disposers.forEach((dispose) => dispose());
});
