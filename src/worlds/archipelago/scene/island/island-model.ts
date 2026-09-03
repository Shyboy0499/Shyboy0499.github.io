import * as THREE from "three";
import type { IslandDef } from "../../islands";
import { mulberry32, hashString } from "../core/rng";
import {
  createBeacon,
  createChestDisplay,
  createFogSprites,
  createLabel,
  createPierLantern,
  type IslandFogSprite,
} from "./island-overlays";
import { ISLAND_PROPS, type PropUpdate } from "./island-props";
import { buildIslandGeometry } from "./island-geometry";
import type { SmokeParticle, SmokeSource } from "./island-animation";
import {
  applyGrad,
  createIslandBase,
  createMaterialFactory,
  createTreeFactory,
  jitter,
  trackLambertMaterials,
  type TrackedMat,
} from "./island-model-common";

export interface IslandModel {
  group: THREE.Group;
  mats: TrackedMat[];
  radius: number;
  topY: number;
  beacon: THREE.Sprite;
  beaconPhase: number;
  fogSprites: IslandFogSprite[];
  label: THREE.Sprite;
  labelW: number;
  lanternHead: THREE.Mesh;
  lanternGlow: THREE.Sprite;
  chests: THREE.Mesh[];
  chestGroup: THREE.Group;
  highlightRing: THREE.Mesh;
  smoke: SmokeParticle[];
  smokeSrc: SmokeSource[];
  propUpdate: PropUpdate | null;
}

function createIslandDecorations(
  def: IslandDef,
  group: THREE.Group,
  radius: number,
  topY: number,
  rng: () => number,
  salt: number,
  smokeSrc: SmokeSource[],
): PropUpdate | null {
  if (def.projects.length === 0) return null; // 迷雾岛（未开发）不加装饰
  if (def.theme === "volcano") {
    smokeSrc.push({
      x: 0,
      y: topY + 0.5,
      z: 0,
      every: 0.55,
      next: 0,
      color: "#5b5b66",
    });
  }

  // 按种子从注册表选一个地标，搭在滩上
  const ang = rng() * Math.PI * 2;
  const px = Math.cos(ang) * radius * 0.82;
  const pz = Math.sin(ang) * radius * 0.82;
  const propGroup = new THREE.Group();
  propGroup.position.set(px, 1.7, pz);
  group.add(propGroup);
  const prop = ISLAND_PROPS[salt % ISLAND_PROPS.length];
  return prop(propGroup, {
    ang,
    rng,
    px,
    pz,
    addSmoke: (x, y, z, every, color) =>
      smokeSrc.push({ x, y, z, every, next: 0, color }),
  });
}

export function createIslandModel(def: IslandDef): IslandModel {
  const rng = mulberry32(hashString(def.id));
  const salt = hashString(def.id) % 977;
  const group = new THREE.Group();
  const mats: TrackedMat[] = [];
  const radius = (13 + rng() * 7) * 1.15; // 岛放大：~15–23 半径
  const beaconPhase = rng() * Math.PI * 2;
  const mk = createMaterialFactory(mats);
  const mkTree = createTreeFactory(group, rng, salt, mk);

  group.position.set(def.position[0], 0, def.position[1]);
  if (def.theme !== "kame") createIslandBase(group, radius, salt, mk);

  // 形态档案（Madbox 式：轮廓各不相同）
  const geometryBuild = buildIslandGeometry({
    def,
    group,
    radius,
    salt,
    rng,
    mk,
    mkTree,
    jitter,
    applyGrad,
    trackMaterials: (subject) => trackLambertMaterials(subject, mats),
  });
  const topY = geometryBuild.topY;

  const chestDisplay = createChestDisplay(group, def, radius, topY);
  const smoke: SmokeParticle[] = [];
  const smokeSrc: SmokeSource[] = [];
  const propUpdate = createIslandDecorations(
    def,
    group,
    radius,
    topY,
    rng,
    salt,
    smokeSrc,
  );
  const modelUpdate =
    geometryBuild.update || propUpdate
      ? (sim: number, nightK: number) => {
          geometryBuild.update?.(sim);
          propUpdate?.(sim, nightK);
        }
      : null;
  const lantern = createPierLantern(group, radius, rng);
  const beacon = createBeacon(group, topY);
  const label = createLabel(group, `${def.builder} · ${def.name}`, topY);
  const fogSprites = createFogSprites(group, radius, rng);

  // 全体 Lambert 网格投影+受影（低多边形体积感的来源；发光 sprite 不参与）
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (
      mesh.isMesh &&
      (mesh.material as THREE.Material).type === "MeshLambertMaterial"
    ) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  return {
    group,
    mats,
    radius,
    topY,
    beacon,
    beaconPhase,
    fogSprites,
    label: label.label,
    labelW: label.aspect,
    lanternHead: lantern.lanternHead,
    lanternGlow: lantern.lanternGlow,
    chests: chestDisplay.chests,
    chestGroup: chestDisplay.chestGroup,
    highlightRing: chestDisplay.highlightRing,
    smoke,
    smokeSrc,
    propUpdate: modelUpdate,
  };
}
