import * as THREE from "three";
import type { IslandDef } from "../../islands";
import { glowTexture, fogTexture, labelTexture } from "../core/sprites";

let _glowTex: THREE.CanvasTexture | null = null;
let _fogTex: THREE.CanvasTexture | null = null;

function glowTex() {
  return (_glowTex ??= glowTexture("#ffffff"));
}

function fogTex() {
  return (_fogTex ??= fogTexture());
}

export interface IslandFogSprite extends THREE.Sprite {
  userData: {
    orbit: {
      a: number;
      r: number;
      speed: number;
      y: number;
    };
  };
}

export function createPierLantern(
  group: THREE.Group,
  radius: number,
  rng: () => number,
) {
  const pierAngle = rng() * Math.PI * 2;
  const pier = new THREE.Group();
  const plankA = new THREE.MeshLambertMaterial({
    color: "#a06a3e",
    flatShading: true,
  });
  const plankB = new THREE.MeshLambertMaterial({
    color: "#8f5d35",
    flatShading: true,
  });
  const legMat = new THREE.MeshLambertMaterial({
    color: "#6e4a2a",
    flatShading: true,
  });
  const nPlanks = 6;
  const z0 = radius * 0.92;
  const z1 = radius * 1.52;
  const step = (z1 - z0) / nPlanks;

  for (let i = 0; i < nPlanks; i++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.22, step * 0.8),
      i % 2 ? plankA : plankB,
    );
    plank.position.set(0, 1.66, z0 + step * (i + 0.5));
    plank.rotation.y = (rng() - 0.5) * 0.06;
    pier.add(plank);
  }

  for (const [lx, lz] of [
    [-0.8, z0 + step * 1.2],
    [0.8, z0 + step * 1.6],
    [-0.8, z1 - step * 0.9],
    [0.8, z1 - step * 0.5],
  ] as [number, number][]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 2.4, 5),
      legMat,
    );
    leg.position.set(lx, 0.5, lz);
    pier.add(leg);
  }

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.16, 1.1, 5),
    legMat,
  );
  post.position.set(0.85, 2.1, z1 - 0.4);
  pier.add(post);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 2.1, 6),
    new THREE.MeshLambertMaterial({ color: "#3a3248", flatShading: true }),
  );
  pole.position.set(-0.6, 2.7, z1 - 0.45);

  const lanternHead = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshLambertMaterial({
      color: "#2a2438",
      emissive: "#ffb84d",
      emissiveIntensity: 0,
    }),
  );
  lanternHead.position.set(-0.6, 4.0, z1 - 0.45);

  const lanternGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex(),
      color: "#ffb04a",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  lanternGlow.position.set(-0.6, 4.0, z1 - 0.45);
  lanternGlow.scale.setScalar(6.5);

  pier.add(pole, lanternHead, lanternGlow);
  pier.rotation.y = Math.PI / 2 - pierAngle;
  group.add(pier);

  return { lanternHead, lanternGlow };
}

export function createBeacon(group: THREE.Group, topY: number) {
  const beacon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex(),
      color: "#ffd27a",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  beacon.position.y = topY + 4;
  beacon.scale.setScalar(9);
  group.add(beacon);
  return beacon;
}

export function createLabel(group: THREE.Group, name: string, topY: number) {
  const { tex, aspect } = labelTexture(name);
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    }),
  );
  label.position.y = topY + 9.5;
  label.scale.set(0, 0, 1);
  group.add(label);
  return { label, aspect };
}

export function createFogSprites(
  group: THREE.Group,
  radius: number,
  rng: () => number,
): IslandFogSprite[] {
  const fogSprites: IslandFogSprite[] = [];
  for (let i = 0; i < 5; i++) {
    const fog = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: fogTex(),
        color: "#a7b2c4",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    ) as IslandFogSprite;
    const a = (i / 5) * Math.PI * 2 + rng();
    fog.position.set(
      Math.cos(a) * radius * 0.85,
      2.5 + rng() * 3.5,
      Math.sin(a) * radius * 0.85,
    );
    fog.scale.setScalar(radius * (1.1 + rng() * 0.5));
    fog.userData.orbit = {
      a,
      r: radius * 0.85,
      speed: 0.05 + rng() * 0.05,
      y: fog.position.y,
    };
    fogSprites.push(fog);
    group.add(fog);
  }
  return fogSprites;
}

export function createChestDisplay(
  group: THREE.Group,
  def: IslandDef,
  radius: number,
  topY: number,
) {
  const chestGroup = new THREE.Group();
  const chests: THREE.Mesh[] = [];
  chestGroup.visible = false;

  def.projects.forEach((project, idx) => {
    const chest = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({
      color: "#8a5a30",
      emissive: "#3a2410",
      emissiveIntensity: 0.4,
      flatShading: true,
    });
    const gold = new THREE.MeshLambertMaterial({
      color: "#f4c561",
      emissive: "#e8a838",
      emissiveIntensity: 0.9,
      flatShading: true,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 1.9), wood);
    body.position.y = 0.75;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.7, 2.0), wood);
    lid.position.set(0, 1.65, -0.2);
    lid.rotation.x = -0.55;
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.26, 2.03), gold);
    band.position.y = 1.5;
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.22), gold);
    lock.position.set(0, 0.95, 1.0);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex(),
        color: "#ffdf9a",
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.scale.setScalar(7);
    halo.position.y = 1.0;
    chest.add(halo, body, lid, band, lock);

    const angle =
      def.projects.length > 1 ? (idx / def.projects.length) * Math.PI * 2 : 0;
    const ringRadius = def.projects.length > 1 ? radius * 0.55 : 0;
    const baseY = topY + 6;
    chest.position.set(
      Math.cos(angle) * ringRadius,
      baseY,
      Math.sin(angle) * ringRadius,
    );
    chest.userData.baseY = baseY;
    chest.userData.bob = idx * 1.7;
    chest.scale.setScalar(0.001);
    chestGroup.add(chest);

    for (const mesh of [body, lid, band, lock]) {
      mesh.userData.projectId = project.id;
      chests.push(mesh);
    }
  });

  group.add(chestGroup);

  const ringGeo = new THREE.RingGeometry(radius * 1.12, radius * 1.4, 44);
  ringGeo.rotateX(-Math.PI / 2);
  const highlightRing = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: "#ffe0a0",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  highlightRing.position.y = 1.85;
  group.add(highlightRing);

  return { chestGroup, chests, highlightRing };
}
