import * as THREE from "three";
import { glowTexture } from "../core/sprites";

export type PropUpdate = (sim: number, nightK: number) => void;

export interface PropCtx {
  ang: number;
  rng: () => number;
  px: number;
  pz: number;
  addSmoke: (
    x: number,
    y: number,
    z: number,
    every: number,
    color: string,
  ) => void;
}

export const ISLAND_PROPS: ((
  group: THREE.Group,
  ctx: PropCtx,
) => PropUpdate)[] = [
  (group) => {
    const white = new THREE.MeshLambertMaterial({
      color: "#f3f0e8",
      flatShading: true,
    });
    const red = new THREE.MeshLambertMaterial({
      color: "#e0604a",
      flatShading: true,
    });
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 6, 10),
      white,
    );
    tower.position.y = 3;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 1.02, 1.4, 10),
      red,
    );
    stripe.position.y = 3.1;
    const room = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 0.9, 1.2, 10),
      new THREE.MeshLambertMaterial({ color: "#39485a", flatShading: true }),
    );
    room.position.y = 6.4;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.1, 10), red);
    roof.position.y = 7.5;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 10, 8),
      new THREE.MeshBasicMaterial({ color: "#fff2c0" }),
    );
    lamp.position.y = 6.4;
    const beamMat = new THREE.MeshBasicMaterial({
      color: "#fff0b0",
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 15, 14, 1, true),
      beamMat,
    );
    beamMesh.rotation.z = Math.PI / 2;
    beamMesh.position.x = 7.5;
    const beam = new THREE.Group();
    beam.add(beamMesh);
    beam.position.y = 6.4;
    group.add(tower, stripe, room, roof, lamp, beam);
    return (sim, nightK) => {
      beam.rotation.y = sim * 0.7;
      beamMat.opacity = 0.04 + nightK * 0.22;
    };
  },
  (group, ctx) => {
    group.rotation.y = -ctx.ang;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.4, 5, 8),
      new THREE.MeshLambertMaterial({ color: "#e8dcc0", flatShading: true }),
    );
    body.position.y = 2.5;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 1.6, 8),
      new THREE.MeshLambertMaterial({ color: "#9a5a3a", flatShading: true }),
    );
    roof.position.y = 5.6;
    const blades = new THREE.Group();
    const bladeMat = new THREE.MeshLambertMaterial({
      color: "#f2ede0",
      flatShading: true,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 3.2, 0.08),
        bladeMat,
      );
      blade.position.y = 1.7;
      const arm = new THREE.Group();
      arm.add(blade);
      arm.rotation.z = (i * Math.PI) / 2;
      blades.add(arm);
    }
    blades.position.set(0, 4.4, 1.55);
    group.add(body, roof, blades);
    return (sim) => {
      blades.rotation.z = sim * 0.8;
    };
  },
  (group, ctx) => {
    const logMat = new THREE.MeshLambertMaterial({
      color: "#5a3a22",
      flatShading: true,
    });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 1.9, 6),
        logMat,
      );
      log.rotation.set(Math.PI / 2.3, (i * Math.PI) / 2, 0);
      log.position.y = 0.3;
      group.add(log);
    }
    const fire = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 1.4, 7),
      new THREE.MeshBasicMaterial({ color: "#ff8a3a" }),
    );
    fire.position.y = 0.95;
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#ffffff"),
        color: "#ff9a4a",
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(5);
    glow.position.y = 1;
    group.add(fire, glow);
    ctx.addSmoke(ctx.px, 3.0, ctx.pz, 0.7, "#8a8a90");
    return (sim, nightK) => {
      const flicker =
        0.55 + 0.25 * Math.sin(sim * 8) + 0.15 * Math.sin(sim * 13.7);
      (glow.material as THREE.SpriteMaterial).opacity =
        0.4 + 0.25 * flicker + nightK * 0.35;
      glow.scale.setScalar(4.5 + flicker * 1.3);
    };
  },
  (group, ctx) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 5, 6),
      new THREE.MeshLambertMaterial({ color: "#8a6a44" }),
    );
    pole.position.y = 2.5;
    group.add(pole);
    const colors = ["#e0604a", "#4aa0d0", "#f4c561", "#6dc07e"];
    const flags: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.95),
        new THREE.MeshLambertMaterial({
          color: colors[Math.floor(ctx.rng() * colors.length)],
          side: THREE.DoubleSide,
          flatShading: true,
        }),
      );
      flag.position.set(0.9, 4.2 - i * 1.25, 0);
      flags.push(flag);
      group.add(flag);
    }
    return (sim) => {
      for (let i = 0; i < flags.length; i++) {
        const flag = flags[i];
        flag.rotation.y = Math.sin(sim * 3 + i) * 0.32;
        flag.scale.x = 1 + Math.sin(sim * 4 + i) * 0.08;
      }
    };
  },
];
