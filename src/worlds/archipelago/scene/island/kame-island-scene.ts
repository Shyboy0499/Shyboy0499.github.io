import * as THREE from "three";

interface PalmLeaf {
  mesh: THREE.Mesh;
  baseRotation: number;
  phase: number;
}

function sidingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ef9fbd";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 8; y < 128; y += 14) {
    ctx.fillStyle = "rgba(139, 66, 102, .24)";
    ctx.fillRect(0, y, 128, 2);
    ctx.fillStyle = "rgba(255, 232, 239, .2)";
    ctx.fillRect(0, y + 2, 128, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function signTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(128, 80);
  ctx.rotate(-0.045);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 52px Arial, sans-serif";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 239, 239, .75)";
  ctx.fillStyle = "#b33e4d";
  ctx.strokeText("KAME", 0, -28);
  ctx.fillText("KAME", 0, -28);
  ctx.strokeText("HOUSE", 0, 30);
  ctx.fillText("HOUSE", 0, 30);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function palmLeafGeometry(length: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const segments = 7;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * length;
    const y = Math.sin(t * Math.PI) * 0.18 - t * t * 0.72;
    const width = Math.sin(t * Math.PI) * length * 0.11 + 0.025;
    vertices.push(x, y, -width, x, y, width);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class KameIslandScene {
  group = new THREE.Group();
  private leaves: PalmLeaf[] = [];

  constructor() {
    const pinkSiding = new THREE.MeshLambertMaterial({
      map: sidingTexture(),
      color: "#ffd0df",
      flatShading: true,
    });
    const pinkPlain = new THREE.MeshLambertMaterial({
      color: "#ef9fbd",
      flatShading: true,
    });
    const roofRed = new THREE.MeshLambertMaterial({
      color: "#9f332f",
      flatShading: true,
    });
    const roofLight = new THREE.MeshLambertMaterial({
      color: "#c84e43",
      flatShading: true,
    });
    const white = new THREE.MeshLambertMaterial({
      color: "#fff4e6",
      flatShading: true,
    });
    const glass = new THREE.MeshLambertMaterial({
      color: "#78a8b0",
      emissive: "#2a6470",
      emissiveIntensity: 0.16,
      flatShading: true,
    });
    const doorGreen = new THREE.MeshLambertMaterial({
      color: "#73b6aa",
      flatShading: true,
    });
    const sand = new THREE.MeshLambertMaterial({
      color: "#e8cf8e",
      flatShading: true,
    });
    const grass = new THREE.MeshLambertMaterial({
      color: "#7bab4c",
      flatShading: true,
    });
    const trunk = new THREE.MeshLambertMaterial({
      color: "#80572f",
      flatShading: true,
    });
    const trunkLight = new THREE.MeshLambertMaterial({
      color: "#a6793e",
      flatShading: true,
    });
    const leafGreen = new THREE.MeshLambertMaterial({
      color: "#3f9d43",
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const leafLight = new THREE.MeshLambertMaterial({
      color: "#65ba49",
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const bush = new THREE.MeshLambertMaterial({
      color: "#396f3a",
      flatShading: true,
    });
    const rock = new THREE.MeshLambertMaterial({
      color: "#b08d68",
      flatShading: true,
    });

    const ocean = new THREE.Mesh(
      new THREE.CircleGeometry(5.35, 72),
      new THREE.MeshBasicMaterial({
        color: "#5fd5df",
        transparent: true,
        opacity: 0.84,
      }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.42;
    this.group.add(ocean);
    const foam = new THREE.Mesh(
      new THREE.RingGeometry(3.8, 4.55, 72),
      new THREE.MeshBasicMaterial({
        color: "#f7ffff",
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
      }),
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.y = -0.34;
    this.group.add(foam);

    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(4.35, 4.72, 0.48, 36),
      sand,
    );
    beach.scale.z = 0.66;
    beach.position.y = -0.2;
    this.group.add(beach);
    const lawn = new THREE.Mesh(
      new THREE.CylinderGeometry(3.35, 3.75, 0.22, 32),
      grass,
    );
    lawn.scale.z = 0.67;
    lawn.position.set(-0.05, 0.1, -0.06);
    this.group.add(lawn);

    const house = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(4.15, 2.45, 3.15),
      pinkSiding,
    );
    walls.position.y = 1.45;
    house.add(walls);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-2.075, 0);
    gableShape.lineTo(0, 1.62);
    gableShape.lineTo(2.075, 0);
    gableShape.closePath();
    const frontGable = new THREE.Mesh(
      new THREE.ShapeGeometry(gableShape),
      pinkPlain,
    );
    frontGable.position.set(0, 2.67, 1.586);
    house.add(frontGable);

    const slope = 0.67;
    const roofLength = 2.72;
    for (const side of [-1, 1]) {
      const roofPanel = new THREE.Mesh(
        new THREE.BoxGeometry(roofLength, 0.19, 3.72),
        side > 0 ? roofRed : roofLight,
      );
      roofPanel.position.set(side * 1.02, 3.45, -0.03);
      roofPanel.rotation.z = side * slope;
      house.add(roofPanel);
    }

    const cornerPosts = [
      [-2.08, -1.56],
      [2.08, -1.56],
      [-2.08, 1.56],
      [2.08, 1.56],
    ];
    cornerPosts.forEach(([x, z]) => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 2.55, 0.11),
        white,
      );
      post.position.set(x, 1.48, z);
      house.add(post);
    });

    const addWindow = (x: number, y: number, z: number, rotationY = 0) => {
      const frame = new THREE.Group();
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(1.08, 0.92, 0.08),
        glass,
      );
      const horizontal = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 0.12),
        white,
      );
      const vertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.04, 0.12),
        white,
      );
      const borderTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.28, 0.1, 0.14),
        white,
      );
      const borderBottom = borderTop.clone();
      borderTop.position.y = 0.51;
      borderBottom.position.y = -0.51;
      frame.add(pane, horizontal, vertical, borderTop, borderBottom);
      frame.position.set(x, y, z);
      frame.rotation.y = rotationY;
      house.add(frame);
    };
    addWindow(-0.7, 1.46, 1.62);
    addWindow(-2.12, 1.45, -0.35, -Math.PI / 2);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 1.72, 0.11),
      doorGreen,
    );
    door.position.set(1.15, 1.0, 1.64);
    const doorFrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.11, 0.14),
      white,
    );
    doorFrameTop.position.set(1.15, 1.9, 1.68);
    const doorFrameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.86, 0.14),
      white,
    );
    doorFrameLeft.position.set(0.71, 1.02, 1.68);
    const doorFrameRight = doorFrameLeft.clone();
    doorFrameRight.position.x = 1.59;
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 4),
      roofLight,
    );
    handle.position.set(1.41, 1.02, 1.72);
    house.add(door, doorFrameTop, doorFrameLeft, doorFrameRight, handle);

    const porch = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.18, 0.9), white);
    porch.position.set(1.08, 0.25, 1.9);
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 0.48), rock);
    step.position.set(1.08, 0.08, 2.38);
    house.add(porch, step);
    for (const x of [0.38, 1.78]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 1.55, 0.09),
        white,
      );
      post.position.set(x, 1.12, 2.12);
      house.add(post);
    }
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.15, 1.15),
      roofRed,
    );
    awning.position.set(1.08, 2.0, 1.96);
    awning.rotation.x = -0.14;
    house.add(awning);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.78, 1.08),
      new THREE.MeshBasicMaterial({
        map: signTexture(),
        transparent: true,
        depthWrite: false,
      }),
    );
    sign.position.set(0.02, 3.2, 1.64);
    house.add(sign);

    const dormer = new THREE.Group();
    const dormerWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.82, 0.78),
      pinkPlain,
    );
    const dormerWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.45, 0.07),
      glass,
    );
    dormerWindow.position.set(0, 0, 0.43);
    const dormerRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.13, 1.02),
      roofRed,
    );
    dormerRoof.position.y = 0.48;
    dormerRoof.rotation.z = 0.06;
    dormer.add(dormerWall, dormerWindow, dormerRoof);
    dormer.position.set(-0.92, 3.95, -0.42);
    house.add(dormer);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.92, 5),
      white,
    );
    antenna.position.set(0.1, 4.55, -0.15);
    const vane = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.35, 4),
      roofLight,
    );
    vane.rotation.z = -Math.PI / 2;
    vane.position.set(0.18, 4.89, -0.15);
    house.add(antenna, vane);
    house.position.set(0.15, 0.18, -0.18);
    house.rotation.y = -0.04;
    this.group.add(house);

    const createPalm = (
      x: number,
      z: number,
      height: number,
      leanX: number,
      leanZ: number,
      phase: number,
    ) => {
      const crown = new THREE.Vector3(x + leanX, 0.32 + height, z + leanZ);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.18, z),
        new THREE.Vector3(x + leanX * 0.2, height * 0.34, z + leanZ * 0.12),
        new THREE.Vector3(x + leanX * 0.52, height * 0.68, z + leanZ * 0.48),
        crown,
      ]);
      const trunkMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 10, 0.14, 7, false),
        phase % 2 ? trunk : trunkLight,
      );
      this.group.add(trunkMesh);
      for (let leafIndex = 0; leafIndex < 9; leafIndex++) {
        const baseRotation = (leafIndex / 9) * Math.PI * 2 + phase;
        const leaf = new THREE.Mesh(
          palmLeafGeometry(1.65 + (leafIndex % 3) * 0.18),
          leafIndex % 2 ? leafGreen : leafLight,
        );
        leaf.position.copy(crown);
        leaf.rotation.y = baseRotation;
        leaf.rotation.z = -0.08 + (leafIndex % 3) * 0.06;
        this.leaves.push({
          mesh: leaf,
          baseRotation,
          phase: phase + leafIndex * 0.7,
        });
        this.group.add(leaf);
      }
      const crownCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.24, 0),
        leafGreen,
      );
      crownCore.position.copy(crown);
      this.group.add(crownCore);
    };
    createPalm(-3.0, -0.3, 5.6, -0.55, -0.1, 0.2);
    createPalm(2.85, -0.75, 5.9, 0.42, -0.28, 1.5);
    createPalm(2.75, -1.5, 3.8, 0.3, -0.12, 2.8);

    const bushPositions = [
      [-2.2, 1.1],
      [-1.8, 1.45],
      [2.2, -0.9],
      [2.55, 0.1],
    ] as const;
    bushPositions.forEach(([x, z], index) => {
      const cluster = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const shrub = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.38 + i * 0.08, 0),
          bush,
        );
        shrub.position.set(
          (i - 1) * 0.3,
          0.35 + (i % 2) * 0.12,
          (i % 2) * 0.22,
        );
        cluster.add(shrub);
      }
      cluster.position.set(x, 0.05, z);
      cluster.rotation.y = index;
      this.group.add(cluster);
    });

    for (let i = 0; i < 8; i++) {
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.22 + (i % 3) * 0.09, 0),
        rock,
      );
      const angle = (i / 8) * Math.PI * 2 + 0.3;
      boulder.position.set(
        Math.cos(angle) * (3.45 + (i % 2) * 0.35),
        0.08,
        Math.sin(angle) * (2.25 + (i % 2) * 0.22),
      );
      boulder.scale.y = 0.65;
      this.group.add(boulder);
    }

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number): void {
    this.leaves.forEach((leaf, index) => {
      leaf.mesh.rotation.y =
        leaf.baseRotation + Math.sin(time * 0.72 + leaf.phase) * 0.055;
      leaf.mesh.rotation.z =
        -0.06 + Math.sin(time * 0.9 + index * 0.37) * 0.025;
    });
  }
}
