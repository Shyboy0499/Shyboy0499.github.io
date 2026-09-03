import * as THREE from "three";
import type { IslandFogSprite } from "./island-overlays";
import type { IslandStatus } from "./island-types";

export interface SmokeParticle {
  spr: THREE.Sprite;
  life: number;
  sx: number;
  sy: number;
  sz: number;
  drift: number;
}

export interface SmokeSource {
  x: number;
  y: number;
  z: number;
  every: number;
  next: number;
  color: string;
}

export function updateChestDisplay(
  chestGroup: THREE.Group,
  liftK: number,
  sim: number,
): void {
  chestGroup.visible = liftK > 0.02;
  if (!chestGroup.visible) return;

  const scale = Math.min(liftK, 1);
  for (const chest of chestGroup.children) {
    chest.scale.setScalar(1.3 * scale);
    chest.position.y =
      chest.userData.baseY + Math.sin(sim * 1.6 + chest.userData.bob) * 0.7;
    chest.rotation.y = sim * 0.5 + chest.userData.bob;
  }
}

export function updateHighlight(
  highlightRing: THREE.Mesh,
  highlighted: boolean,
  liftK: number,
  highlightK: number,
  sim: number,
  dt: number,
): number {
  const wantHighlight = highlighted && liftK < 0.1 ? 1 : 0;
  const nextHighlightK =
    highlightK + (wantHighlight - highlightK) * (1 - Math.exp(-5 * dt));
  const material = highlightRing.material as THREE.MeshBasicMaterial;
  material.opacity = nextHighlightK * (0.45 + 0.28 * Math.sin(sim * 3.2));
  const scale = 1 + 0.05 * Math.sin(sim * 3.2);
  highlightRing.scale.set(scale, 1, scale);
  return nextHighlightK;
}

export function updateSmoke(
  group: THREE.Group,
  smoke: SmokeParticle[],
  smokeSrc: SmokeSource[],
  sim: number,
  dt: number,
  glowTexture: THREE.Texture,
): void {
  for (const src of smokeSrc) {
    if (sim < src.next) continue;

    src.next = sim + src.every;
    let particle = smoke.find((item) => item.life <= 0);
    if (!particle) {
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: src.color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      group.add(spr);
      particle = { spr, life: 0, sx: 0, sy: 0, sz: 0, drift: 0 };
      smoke.push(particle);
    }
    particle.life = 1;
    particle.sx = src.x;
    particle.sy = src.y;
    particle.sz = src.z;
    particle.drift = (Math.random() - 0.5) * 0.7;
    (particle.spr.material as THREE.SpriteMaterial).color.set(src.color);
  }

  for (const particle of smoke) {
    if (particle.life <= 0) {
      particle.spr.visible = false;
      continue;
    }
    particle.life -= dt * 0.26;
    const age = 1 - particle.life;
    particle.spr.visible = particle.life > 0;
    particle.spr.position.set(
      particle.sx + particle.drift * age * 6,
      particle.sy + age * 11,
      particle.sz + particle.drift * age * 4,
    );
    particle.spr.scale.setScalar(1.6 + age * 5.5);
    (particle.spr.material as THREE.SpriteMaterial).opacity = Math.min(
      particle.life * 1.4,
      0.6,
    );
  }
}

export function updateLantern(
  lanternHead: THREE.Mesh,
  lanternGlow: THREE.Sprite,
  lanternOn: number,
  status: IslandStatus,
  sim: number,
  dt: number,
  nightK: number,
): number {
  const wantLantern = status === "visited" ? 1 : 0;
  const nextLanternOn =
    lanternOn + (wantLantern - lanternOn) * (1 - Math.exp(-3 * dt));
  const flicker = 1 + 0.06 * Math.sin(sim * 7.3) + 0.04 * Math.sin(sim * 2.9);
  (lanternHead.material as THREE.MeshLambertMaterial).emissiveIntensity =
    nextLanternOn * flicker * (0.9 + 0.9 * nightK);
  (lanternGlow.material as THREE.SpriteMaterial).opacity =
    nextLanternOn * flicker * (0.35 + 0.5 * nightK);
  return nextLanternOn;
}

export function updateFogSprites(
  fogSprites: IslandFogSprite[],
  sim: number,
  dt: number,
  fogOpacity: number,
): void {
  for (const fog of fogSprites) {
    const orbit = fog.userData.orbit;
    orbit.a += orbit.speed * dt;
    fog.position.set(
      Math.cos(orbit.a) * orbit.r,
      orbit.y + Math.sin(sim * 0.5 + orbit.a) * 0.8,
      Math.sin(orbit.a) * orbit.r,
    );
    const material = fog.material as THREE.SpriteMaterial;
    material.opacity +=
      (fogOpacity - material.opacity) * (1 - Math.exp(-2.5 * dt));
  }
}

export function updateBeacon(
  beacon: THREE.Sprite,
  status: IslandStatus,
  sim: number,
  dt: number,
  beaconPhase: number,
  growStart: number,
  unlockStart: number,
): number {
  const material = beacon.material as THREE.SpriteMaterial;
  let targetOpacity = 0;

  if (status === "locked" && growStart < 0) {
    material.color.set("#ffd27a");
    targetOpacity = 0.5 + 0.3 * Math.sin(sim * 2.1 + beaconPhase);
    beacon.scale.setScalar(9 + Math.sin(sim * 2.1 + beaconPhase) * 1.5);
  } else if (status === "visited") {
    material.color.set("#bfeee2");
    targetOpacity = 0.12 + 0.04 * Math.sin(sim * 1.3 + beaconPhase);
    beacon.scale.setScalar(7);
  }

  let nextUnlockStart = unlockStart;
  if (nextUnlockStart >= 0) {
    const unlockK = (sim - nextUnlockStart) / 1.8;
    if (unlockK < 1) targetOpacity += (1 - unlockK) * 1.1;
    else nextUnlockStart = -1;
  }

  material.opacity +=
    (targetOpacity - material.opacity) * (1 - Math.exp(-6 * dt));
  return nextUnlockStart;
}

export function updateLabel(
  label: THREE.Sprite,
  labelW: number,
  labelShown: number,
  status: IslandStatus,
  suppressLabel: boolean,
  unlockStart: number,
  sim: number,
  dt: number,
  easeOutBack: (t: number) => number,
): number {
  const wantLabel = status === "visited" && !suppressLabel ? 1 : 0;
  let nextLabelShown = labelShown;

  if (wantLabel > nextLabelShown && unlockStart >= 0) {
    const unlockK = Math.min((sim - unlockStart) / 1.0, 1);
    nextLabelShown = easeOutBack(unlockK) * (unlockK > 0 ? 1 : 0);
    if (unlockK >= 1) nextLabelShown = 1;
  } else {
    nextLabelShown += (wantLabel - nextLabelShown) * (1 - Math.exp(-4 * dt));
  }

  const scale = Math.max(nextLabelShown, 0);
  label.scale.set(5.5 * labelW * scale, 5.5 * scale, 1);
  return nextLabelShown;
}
