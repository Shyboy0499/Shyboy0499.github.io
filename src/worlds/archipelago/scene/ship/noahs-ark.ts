// 诺亚方舟独立数字资产：负责巨型封闭船体、分层舱楼与洪水水面的视觉演出。
// 它不承担玩家航行、碰撞或动物状态，挂载场景只需驱动 update。
import * as THREE from "three";

interface HullStation {
  z: number;
  width: number;
  rise: number;
}

interface AnimatedMesh {
  mesh: THREE.Mesh;
  phase: number;
}

const HULL_STATIONS: HullStation[] = [
  { z: -7.35, width: 0.24, rise: 0.5 },
  { z: -6.65, width: 0.72, rise: 0.22 },
  { z: -5.25, width: 0.94, rise: 0.05 },
  { z: -2.6, width: 1, rise: 0 },
  { z: 1.6, width: 1, rise: 0 },
  { z: 4.85, width: 0.92, rise: 0.08 },
  { z: 6.35, width: 0.66, rise: 0.38 },
  { z: 7.35, width: 0.2, rise: 0.82 },
];

function interpolateStation(z: number, key: "width" | "rise"): number {
  for (let index = 0; index < HULL_STATIONS.length - 1; index++) {
    const current = HULL_STATIONS[index];
    const next = HULL_STATIONS[index + 1];
    if (z > next.z) continue;
    const t = THREE.MathUtils.clamp(
      (z - current.z) / (next.z - current.z),
      0,
      1,
    );
    return THREE.MathUtils.lerp(current[key], next[key], t);
  }
  return HULL_STATIONS[HULL_STATIONS.length - 1][key];
}

function sectionWidth(localY: number): number {
  if (localY < 0.3) return THREE.MathUtils.lerp(0.08, 0.45, localY / 0.3);
  if (localY < 1.08)
    return THREE.MathUtils.lerp(0.45, 0.82, (localY - 0.3) / 0.78);
  if (localY < 2.18)
    return THREE.MathUtils.lerp(0.82, 1, (localY - 1.08) / 1.1);
  return THREE.MathUtils.lerp(
    1,
    1.04,
    THREE.MathUtils.clamp((localY - 2.18) / 1.06, 0, 1),
  );
}

function createHullGeometry(): THREE.BufferGeometry {
  const halfWidth = 2.42;
  const section = [
    [0, 0],
    [-0.45, 0.3],
    [-0.82, 1.08],
    [-1, 2.18],
    [-1.04, 3.24],
    [1.04, 3.24],
    [1, 2.18],
    [0.82, 1.08],
    [0.45, 0.3],
  ];
  const positions: number[] = [];
  const indices: number[] = [];
  HULL_STATIONS.forEach((station) => {
    section.forEach(([x, y]) => {
      positions.push(
        x * halfWidth * station.width,
        y + station.rise,
        station.z,
      );
    });
  });
  const ringSize = section.length;
  for (
    let stationIndex = 0;
    stationIndex < HULL_STATIONS.length - 1;
    stationIndex++
  ) {
    const offset = stationIndex * ringSize;
    const next = offset + ringSize;
    for (let pointIndex = 0; pointIndex < ringSize; pointIndex++) {
      const pointNext = (pointIndex + 1) % ringSize;
      indices.push(
        offset + pointIndex,
        next + pointNext,
        offset + pointNext,
        offset + pointIndex,
        next + pointIndex,
        next + pointNext,
      );
    }
  }
  const capStart = positions.length / 3;
  const first = HULL_STATIONS[0];
  const last = HULL_STATIONS[HULL_STATIONS.length - 1];
  positions.push(0, 1.55 + first.rise, first.z, 0, 1.55 + last.rise, last.z);
  for (let pointIndex = 0; pointIndex < ringSize; pointIndex++) {
    const nextPoint = (pointIndex + 1) % ringSize;
    indices.push(capStart, nextPoint, pointIndex);
    const lastOffset = (HULL_STATIONS.length - 1) * ringSize;
    indices.push(capStart + 1, lastOffset + pointIndex, lastOffset + nextPoint);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createSideCurve(
  side: number,
  localY: number,
  outset = 0,
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 34; index++) {
    const z = THREE.MathUtils.lerp(-7.05, 7.05, index / 34);
    const width =
      2.42 * interpolateStation(z, "width") * sectionWidth(localY) + outset;
    points.push(
      new THREE.Vector3(
        side * width,
        localY + interpolateStation(z, "rise"),
        z,
      ),
    );
  }
  return new THREE.CatmullRomCurve3(points);
}

function createBeam(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const direction = end.clone().sub(start);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 6),
    material,
  );
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return beam;
}

function createGable(
  width: number,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.lineTo(0, height);
  shape.lineTo(width * 0.5, 0);
  shape.closePath();
  return new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
}

function createRoof(
  width: number,
  length: number,
  baseY: number,
  pitch: number,
  material: THREE.Material,
): THREE.Group {
  const roof = new THREE.Group();
  const slopeLength = width * 0.55;
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(slopeLength, 0.14, length),
      material,
    );
    panel.position.set(
      side * width * 0.245,
      baseY + Math.sin(pitch) * slopeLength * 0.5,
      0,
    );
    panel.rotation.z = side * -pitch;
    roof.add(panel);
  }
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, length + 0.18, 6),
    material,
  );
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = baseY + Math.sin(pitch) * slopeLength;
  roof.add(ridge);
  return roof;
}

export class NoahsArk {
  readonly group = new THREE.Group();
  private readonly vessel = new THREE.Group();
  private readonly lanterns: AnimatedMesh[] = [];

  constructor() {
    this.group.name = "NoahsArk";
    this.vessel.name = "NoahsArkVessel";

    const cedar = new THREE.MeshLambertMaterial({
      color: "#a66b38",
      flatShading: true,
    });
    const cedarLight = new THREE.MeshLambertMaterial({
      color: "#cf9450",
      flatShading: true,
    });
    const cedarDark = new THREE.MeshLambertMaterial({
      color: "#593923",
      flatShading: true,
    });
    const roofWood = new THREE.MeshLambertMaterial({
      color: "#74452c",
      flatShading: true,
    });
    const windowDark = new THREE.MeshBasicMaterial({
      color: "#16272a",
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });
    const warmWindow = new THREE.MeshBasicMaterial({
      color: "#ffb65a",
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const rope = new THREE.MeshLambertMaterial({
      color: "#b38a57",
      flatShading: true,
    });

    const hull = new THREE.Mesh(createHullGeometry(), cedar);
    hull.name = "ArkHull";
    this.vessel.add(hull);

    // 木板压缝沿真实船壳曲率贯穿全长，避免巨大的船身读成一整块塑料曲面。
    for (const side of [-1, 1]) {
      for (let plankIndex = 0; plankIndex < 9; plankIndex++) {
        const localY = 0.38 + plankIndex * 0.345;
        const strake = new THREE.Mesh(
          new THREE.TubeGeometry(
            createSideCurve(side, localY, 0.018),
            42,
            0.033,
            4,
            false,
          ),
          plankIndex % 3 === 0 ? cedarDark : cedarLight,
        );
        this.vessel.add(strake);
      }
      const gunwale = new THREE.Mesh(
        new THREE.TubeGeometry(
          createSideCurve(side, 3.27, 0.08),
          42,
          0.09,
          6,
          false,
        ),
        cedarDark,
      );
      this.vessel.add(gunwale);
    }

    for (let ribIndex = 0; ribIndex < 11; ribIndex++) {
      const z = THREE.MathUtils.lerp(-5.8, 5.75, ribIndex / 10);
      const rise = interpolateStation(z, "rise");
      const stationWidth = interpolateStation(z, "width");
      for (const side of [-1, 1]) {
        const lowerWidth = 2.42 * stationWidth * sectionWidth(0.72);
        const upperWidth = 2.42 * stationWidth * sectionWidth(3.15);
        const rib = createBeam(
          new THREE.Vector3(side * (lowerWidth + 0.04), rise + 0.72, z),
          new THREE.Vector3(
            side * (upperWidth + 0.09),
            rise + 3.18,
            z + side * 0.06,
          ),
          0.045,
          cedarDark,
        );
        this.vessel.add(rib);
      }
    }

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(4.55, 0.22, 11.45),
      cedarDark,
    );
    deck.position.y = 3.32;
    this.vessel.add(deck);

    const mainCabin = new THREE.Mesh(
      new THREE.BoxGeometry(4.22, 1.72, 10.45),
      cedarLight,
    );
    mainCabin.position.y = 4.22;
    this.vessel.add(mainCabin);

    for (const side of [-1, 1]) {
      for (let windowIndex = 0; windowIndex < 10; windowIndex++) {
        const z = -4.42 + windowIndex * 0.98;
        if (side === 1 && (windowIndex === 5 || windowIndex === 6)) continue;
        const frame = new THREE.Mesh(
          new THREE.PlaneGeometry(0.47, 0.53),
          cedarDark,
        );
        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(0.31, 0.36),
          windowIndex % 4 === 1 ? warmWindow : windowDark,
        );
        frame.position.set(side * 2.116, 4.38, z);
        glass.position.set(side * 2.123, 4.38, z);
        frame.rotation.y = (side * Math.PI) / 2;
        glass.rotation.y = (side * Math.PI) / 2;
        this.vessel.add(frame, glass);
      }
    }
    for (const end of [-1, 1]) {
      for (const x of [-1.18, 0, 1.18]) {
        const frame = new THREE.Mesh(
          new THREE.PlaneGeometry(0.52, 0.58),
          cedarDark,
        );
        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(0.34, 0.39),
          x === 0 ? warmWindow : windowDark,
        );
        frame.position.set(x, 4.34, end * 5.23);
        glass.position.set(x, 4.34, end * 5.238);
        if (end < 0) {
          frame.rotation.y = Math.PI;
          glass.rotation.y = Math.PI;
        }
        this.vessel.add(frame, glass);
      }
      const vent = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 12),
        windowDark,
      );
      vent.position.set(0, 5.42, end * 5.6);
      if (end < 0) vent.rotation.y = Math.PI;
      this.vessel.add(vent);
    }

    const cargoDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 1.38),
      cedarDark,
    );
    cargoDoor.position.set(2.125, 4.12, 1.05);
    cargoDoor.rotation.y = Math.PI / 2;
    this.vessel.add(cargoDoor);
    this.vessel.add(
      createBeam(
        new THREE.Vector3(2.145, 3.6, 0.57),
        new THREE.Vector3(2.145, 4.63, 1.53),
        0.045,
        rope,
      ),
      createBeam(
        new THREE.Vector3(2.145, 4.63, 0.57),
        new THREE.Vector3(2.145, 3.6, 1.53),
        0.045,
        rope,
      ),
    );

    const lowerRoof = createRoof(4.85, 11.18, 5.1, 0.34, roofWood);
    lowerRoof.position.z = -0.02;
    this.vessel.add(lowerRoof);
    for (const z of [-5.59, 5.55]) {
      const gable = createGable(4.45, 0.82, cedarLight);
      gable.position.set(0, 5.08, z);
      if (z < 0) gable.rotation.y = Math.PI;
      this.vessel.add(gable);
    }

    const upperCabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.62, 0.94, 6.35),
      cedar,
    );
    upperCabin.position.y = 5.82;
    this.vessel.add(upperCabin);
    for (const side of [-1, 1]) {
      for (let windowIndex = 0; windowIndex < 6; windowIndex++) {
        const window = new THREE.Mesh(
          new THREE.PlaneGeometry(0.27, 0.34),
          windowIndex % 2 ? warmWindow : windowDark,
        );
        window.position.set(side * 1.315, 5.88, -2.46 + windowIndex * 0.98);
        window.rotation.y = (side * Math.PI) / 2;
        this.vessel.add(window);
      }
    }
    const upperRoof = createRoof(3.05, 6.85, 6.3, 0.42, roofWood);
    this.vessel.add(upperRoof);
    for (const z of [-3.43, 3.43]) {
      const gable = createGable(2.72, 0.69, cedar);
      gable.position.set(0, 6.28, z);
      if (z < 0) gable.rotation.y = Math.PI;
      this.vessel.add(gable);
    }

    const bowPost = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.5, 7.12),
          new THREE.Vector3(0, 2.25, 7.48),
          new THREE.Vector3(0, 4.2, 7.56),
          new THREE.Vector3(0, 4.78, 7.26),
        ]),
        18,
        0.13,
        6,
        false,
      ),
      cedarDark,
    );
    this.vessel.add(bowPost);
    this.vessel.add(
      createBeam(
        new THREE.Vector3(0, 0.52, -7.18),
        new THREE.Vector3(0, 4.25, -7.38),
        0.14,
        cedarDark,
      ),
    );

    for (const z of [-4.85, 4.7]) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.82, 0.58),
        cedarDark,
      );
      vent.position.set(0, 6.9, z * 0.45);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.46, 0.38, 4),
        roofWood,
      );
      cap.position.set(0, 7.38, z * 0.45);
      cap.rotation.y = Math.PI / 4;
      this.vessel.add(vent, cap);
    }

    for (let lanternIndex = 0; lanternIndex < 6; lanternIndex++) {
      const side = lanternIndex % 2 === 0 ? -1 : 1;
      const lantern = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.09, 0),
        warmWindow.clone(),
      );
      lantern.position.set(side * 2.34, 3.72, -4.25 + lanternIndex * 1.7);
      this.lanterns.push({ mesh: lantern, phase: lanternIndex * 0.83 });
      this.vessel.add(lantern);
    }

    this.vessel.position.y = 0.18;
    this.group.add(this.vessel);
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.material instanceof THREE.MeshLambertMaterial) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number): void {
    this.vessel.position.y = 0.18 + Math.sin(time * 0.62) * 0.075;
    this.vessel.rotation.z = Math.sin(time * 0.43) * 0.012;
    this.vessel.rotation.x = Math.sin(time * 0.31 + 0.8) * 0.008;
    this.lanterns.forEach(({ mesh, phase }) => {
      const pulse = 1 + Math.sin(time * 3.4 + phase) * 0.15;
      mesh.scale.setScalar(pulse);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        0.58 + Math.sin(time * 3.8 + phase) * 0.2;
    });
  }
}
