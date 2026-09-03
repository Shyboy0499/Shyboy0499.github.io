// 飞翔的荷兰人号视觉资产；当前用于资产墙预览和候选地标实现。
// 它不负责船型选择、航行控制或持久化。
import * as THREE from "three";
import { glowTexture } from "../core/sprites";

function tatteredSailTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const edge = 10 + seed * 3;
  const sail = new Path2D();
  sail.moveTo(12, 12 + seed * 5);
  sail.lineTo(242, 20);
  sail.lineTo(229, 207);
  sail.lineTo(208, 189 + edge);
  sail.lineTo(187, 242);
  sail.lineTo(159, 205);
  sail.lineTo(132, 250 - edge);
  sail.lineTo(103, 207);
  sail.lineTo(77, 239);
  sail.lineTo(58, 198);
  sail.lineTo(31, 224);
  sail.lineTo(14, 190);
  sail.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, "#75806c");
  gradient.addColorStop(0.48, "#465248");
  gradient.addColorStop(1, "#222c29");
  ctx.fillStyle = gradient;
  ctx.fill(sail);
  ctx.save();
  ctx.clip(sail);
  ctx.globalAlpha = 0.38;
  for (let y = 34; y < 230; y += 31) {
    ctx.fillStyle = y % 2 ? "#1e2823" : "#96a184";
    ctx.fillRect(7, y, 245, 3);
  }
  for (let x = 24; x < 250; x += 46) {
    ctx.strokeStyle = "#202821";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x - 15, 238);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.56;
  ctx.fillStyle = "#74806c";
  ctx.strokeStyle = "#b2baa1";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  const patches = [
    [39 + seed * 5, 62, 46, 32],
    [142 - seed * 4, 124, 55, 38],
    [76 + seed * 7, 174, 39, 28],
  ];
  patches.forEach(([x, y, width, height], index) => {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((index - 1) * 0.12);
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    ctx.restore();
  });
  ctx.setLineDash([]);
  ctx.restore();

  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 5; i++) {
    const x = 42 + ((i * 47 + seed * 29) % 158);
    const y = 52 + ((i * 37 + seed * 41) % 116);
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      9 + (i % 3) * 6,
      4 + ((i + seed) % 3) * 5,
      (i - 2) * 0.27,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function beamBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const direction = b.clone().sub(a);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.15, direction.length(), 5),
    material,
  );
  beam.position.copy(a).addScaledVector(direction, 0.5);
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return beam;
}

function hangingWeed(
  points: THREE.Vector3[],
  material: THREE.Material,
): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      7,
      0.035,
      4,
      false,
    ),
    material,
  );
}

export class FlyingDutchman {
  group = new THREE.Group();
  private model = new THREE.Group();
  private sails: THREE.Mesh[] = [];
  private lanterns: THREE.Sprite[] = [];
  private weeds: THREE.Mesh[] = [];
  private mists: THREE.Sprite[] = [];

  constructor() {
    this.group.add(this.model);
    const blackWood = new THREE.MeshLambertMaterial({
      color: "#121916",
      flatShading: true,
    });
    const rottenWood = new THREE.MeshLambertMaterial({
      color: "#334037",
      flatShading: true,
    });
    const plankMat = new THREE.MeshLambertMaterial({
      color: "#52604b",
      flatShading: true,
    });
    const boneMat = new THREE.MeshLambertMaterial({
      color: "#9daa8e",
      flatShading: true,
    });
    const rustMat = new THREE.MeshLambertMaterial({
      color: "#432c27",
      flatShading: true,
    });
    const weedMat = new THREE.MeshLambertMaterial({
      color: "#496c4e",
      emissive: "#123d2a",
      emissiveIntensity: 0.24,
    });
    const glowMat = new THREE.MeshLambertMaterial({
      color: "#6dffc0",
      emissive: "#35f49b",
      emissiveIntensity: 2.2,
    });

    // The core is almost black; broken outer planks carry the readable hull shape.
    const outline = new THREE.Shape();
    outline.moveTo(0, 3.7);
    outline.quadraticCurveTo(1.3, 1.6, 1.05, -1.7);
    outline.quadraticCurveTo(0.72, -2.55, 0, -2.75);
    outline.quadraticCurveTo(-0.72, -2.55, -1.05, -1.7);
    outline.quadraticCurveTo(-1.3, 1.6, 0, 3.7);
    const coreGeometry = new THREE.ExtrudeGeometry(outline, {
      depth: 0.86,
      bevelEnabled: false,
    });
    coreGeometry.rotateX(Math.PI / 2);
    const core = new THREE.Mesh(coreGeometry, blackWood);
    core.position.y = 0.92;
    this.model.add(core);

    const widthAt = (z: number) =>
      0.5 + 1.05 * Math.max(0, 1 - Math.abs(z - 0.15) / 3.8);
    for (const side of [-1, 1]) {
      for (let row = 0; row < 5; row++) {
        for (let segment = 0; segment < 6; segment++) {
          if ((row * 7 + segment * 3 + (side > 0 ? 1 : 0)) % 8 === 0) continue;
          const z = -2.35 + segment * 0.93;
          const plank = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.22, 0.86),
            segment % 3 === 0 ? rottenWood : plankMat,
          );
          plank.position.set(
            side * widthAt(z),
            0.7 + row * 0.27 + (segment % 2) * 0.035,
            z,
          );
          plank.rotation.set(
            (segment - 2) * 0.012,
            side * (z * 0.045),
            side * (row - 2) * 0.014,
          );
          this.model.add(plank);
        }
      }
    }

    // Pale ribs show through deliberate gaps in the planking.
    for (const z of [-1.95, -0.95, 0.15, 1.25, 2.25]) {
      for (const side of [-1, 1]) {
        const rib = beamBetween(
          new THREE.Vector3(side * 0.42, 0.38, z),
          new THREE.Vector3(side * widthAt(z) * 1.1, 2.04, z),
          0.055,
          boneMat,
        );
        rib.rotation.z += side * 0.12;
        this.model.add(rib);
      }
    }

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(2.25, 0.16, 5.1),
      rottenWood,
    );
    deck.position.set(0, 1.95, -0.05);
    this.model.add(deck);

    // Crooked stern castle and three sickly windows.
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 1.3, 1.25),
      blackWood,
    );
    cabin.position.set(0, 2.58, -1.95);
    cabin.rotation.x = -0.04;
    const cabinRoof = new THREE.Mesh(
      new THREE.BoxGeometry(2.42, 0.18, 1.5),
      rottenWood,
    );
    cabinRoof.position.set(0, 3.28, -1.98);
    this.model.add(cabin, cabinRoof);
    for (const x of [-0.65, 0, 0.65]) {
      const window = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.38),
        glowMat,
      );
      window.position.set(x, 2.62, -2.581);
      this.model.add(window);
    }

    // Wheel, cannons, anchor chain and a hanging prisoner cage populate the deck.
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.065, 5, 10),
      rustMat,
    );
    wheel.position.set(0.45, 3.12, -1.12);
    wheel.rotation.y = 0.2;
    this.model.add(wheel);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.95, 0.035),
        rustMat,
      );
      spoke.position.copy(wheel.position);
      spoke.rotation.z = (i * Math.PI) / 3;
      this.model.add(spoke);
    }
    for (const side of [-1, 1]) {
      for (const z of [-0.55, 0.55]) {
        const cannon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.17, 0.8, 7),
          rustMat,
        );
        cannon.rotation.z = Math.PI / 2;
        cannon.position.set(side * 1.27, 2.18, z);
        this.model.add(cannon);
      }
    }
    const chain = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const link = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.035, 5, 8),
        rustMat,
      );
      link.position.set(-1.2, 1.75 - i * 0.17, 1.45 + i * 0.15);
      link.rotation.set(Math.PI / 2, i % 2 ? Math.PI / 2 : 0, 0);
      chain.add(link);
    }
    this.model.add(chain);

    const cage = new THREE.Group();
    const cageTop = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.045, 5, 8),
      rustMat,
    );
    const cageBottom = cageTop.clone();
    cageBottom.position.y = -1.0;
    cage.add(cageTop, cageBottom);
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1, 4),
        rustMat,
      );
      bar.position.set(
        Math.cos((i * Math.PI) / 3) * 0.34,
        -0.5,
        Math.sin((i * Math.PI) / 3) * 0.34,
      );
      cage.add(bar);
    }
    cage.position.set(-1.55, 3.25, -0.15);
    this.model.add(
      cage,
      beamBetween(
        new THREE.Vector3(-1.55, 4.65, -0.15),
        new THREE.Vector3(-1.55, 3.25, -0.15),
        0.025,
        rustMat,
      ),
    );

    const mastData = [
      {
        z: -0.72,
        height: 7.6,
        sails: [
          [5.35, 3.7, 2.8],
          [7.15, 2.7, 1.5],
        ],
      },
      {
        z: 1.38,
        height: 6.6,
        sails: [
          [4.85, 3.15, 2.55],
          [6.35, 2.25, 1.3],
        ],
      },
    ] as const;
    mastData.forEach((mastDef, mastIndex) => {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.18, mastDef.height, 6),
        rustMat,
      );
      mast.position.set(0, 2 + mastDef.height / 2, mastDef.z);
      mast.rotation.z = mastIndex ? -0.035 : 0.045;
      this.model.add(mast);
      mastDef.sails.forEach(([y, width, height], sailIndex) => {
        const yard = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.08, width + 0.45, 5),
          rottenWood,
        );
        yard.rotation.z = Math.PI / 2 + (sailIndex ? -0.035 : 0.025);
        yard.position.set(0, y + height * 0.42, mastDef.z);
        this.model.add(yard);
        const sail = new THREE.Mesh(
          new THREE.PlaneGeometry(width, height, 7, 5),
          new THREE.MeshLambertMaterial({
            map: tatteredSailTexture(mastIndex * 2 + sailIndex),
            transparent: true,
            alphaTest: 0.08,
            side: THREE.DoubleSide,
            color: "#87917d",
            emissive: "#294438",
            emissiveIntensity: 0.22,
          }),
        );
        sail.position.set(0, y, mastDef.z + 0.03);
        sail.rotation.y = mastIndex ? -0.07 : 0.07;
        this.sails.push(sail);
        this.model.add(sail);
        for (const side of [-1, 1]) {
          const x = side * width * (0.28 + sailIndex * 0.08);
          const weed = hangingWeed(
            [
              new THREE.Vector3(x, y + height * 0.42, mastDef.z + 0.07),
              new THREE.Vector3(
                x + side * 0.08,
                y + height * 0.08,
                mastDef.z + 0.12,
              ),
              new THREE.Vector3(
                x - side * 0.14,
                y - height * 0.52,
                mastDef.z + 0.18,
              ),
            ],
            weedMat,
          );
          this.weeds.push(weed);
          this.model.add(weed);
        }
      });
      this.model.add(
        beamBetween(
          new THREE.Vector3(0, 2.1 + mastDef.height, mastDef.z),
          new THREE.Vector3(0, 2.15, mastDef.z + 3.15),
          0.022,
          rustMat,
        ),
      );
      this.model.add(
        beamBetween(
          new THREE.Vector3(0, 1.95 + mastDef.height, mastDef.z),
          new THREE.Vector3(0, 2.15, mastDef.z - 2.8),
          0.022,
          rustMat,
        ),
      );
    });

    const bowsprit = beamBetween(
      new THREE.Vector3(0, 2.35, 2.65),
      new THREE.Vector3(0, 3.1, 5.25),
      0.11,
      boneMat,
    );
    const figurehead = hangingWeed(
      [
        new THREE.Vector3(0, 3.08, 5.18),
        new THREE.Vector3(0.12, 2.45, 5.55),
        new THREE.Vector3(-0.22, 1.98, 5.22),
      ],
      boneMat,
    );
    this.model.add(bowsprit, figurehead);

    // Barnacles and cold ghost lights break up the dark deck mass.
    for (let i = 0; i < 13; i++) {
      const barnacle = new THREE.Mesh(
        new THREE.ConeGeometry(0.08 + (i % 3) * 0.03, 0.16 + (i % 2) * 0.08, 5),
        boneMat,
      );
      barnacle.position.set(
        (i % 2 ? -1 : 1) * (1.05 + (i % 3) * 0.08),
        0.72 + (i % 5) * 0.25,
        -2.1 + ((i * 0.43) % 4.2),
      );
      barnacle.rotation.z = i % 2 ? -0.8 : 0.8;
      this.model.add(barnacle);
    }
    for (const position of [
      new THREE.Vector3(-0.75, 3.38, -2.65),
      new THREE.Vector3(0.75, 3.38, -2.65),
      new THREE.Vector3(0, 2.65, 3.02),
    ]) {
      const lantern = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture("#72ffc0"),
          color: "#55f5ac",
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      lantern.position.copy(position);
      lantern.scale.setScalar(1.45);
      this.lanterns.push(lantern);
      this.model.add(lantern);
    }

    const weedAnchors = [
      [-1.1, 1.1],
      [0.8, 0.25],
      [-0.6, -1.65],
      [1.05, -2.05],
    ] as const;
    weedAnchors.forEach(([x, z], index) => {
      const weed = hangingWeed(
        [
          new THREE.Vector3(x, 1.9, z),
          new THREE.Vector3(x + 0.18, 0.95, z + 0.13),
          new THREE.Vector3(x - 0.12, -0.05 - index * 0.09, z + 0.28),
        ],
        weedMat,
      );
      this.weeds.push(weed);
      this.model.add(weed);
    });
    const mistTexture = glowTexture("#5fffb3");
    for (let i = 0; i < 3; i++) {
      const mist = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: mistTexture,
          color: "#45d998",
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mist.position.set((i - 1) * 1.1, 0.2 - i * 0.16, -0.5 + i * 0.65);
      mist.scale.set(4.8 - i * 0.55, 1.2 + i * 0.2, 1);
      this.mists.push(mist);
      this.model.add(mist);
    }

    this.model.rotation.y = -0.62;
    this.model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number): void {
    this.group.position.y = Math.sin(time * 1.05) * 0.12;
    this.group.rotation.z = Math.sin(time * 0.72) * 0.016;
    this.model.rotation.y = -0.62 + Math.sin(time * 0.24) * 0.09;
    this.sails.forEach((sail, index) => {
      sail.rotation.y =
        (index < 2 ? 0.07 : -0.07) +
        Math.sin(time * 0.85 + index * 0.7) * 0.045;
    });
    this.lanterns.forEach((lantern, index) => {
      (lantern.material as THREE.SpriteMaterial).opacity =
        0.48 + Math.sin(time * 2.2 + index * 1.7) * 0.22;
    });
    this.weeds.forEach((weed, index) => {
      weed.rotation.z = Math.sin(time * 0.7 + index) * 0.035;
    });
    this.mists.forEach((mist, index) => {
      mist.position.x =
        (index - 1) * 1.1 + Math.sin(time * 0.35 + index) * 0.18;
      const material = mist.material as THREE.SpriteMaterial;
      material.opacity = 0.07 + Math.sin(time * 0.65 + index * 1.8) * 0.025;
    });
  }
}
