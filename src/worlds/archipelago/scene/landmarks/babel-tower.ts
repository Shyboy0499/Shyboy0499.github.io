// 巴别塔独立数字资产：负责阶梯塔体、螺旋坡道、拱廊和未完工塔冠的视觉演出。
// 它不承担世界碰撞、导航或任务状态，挂载场景只需驱动 update。
import * as THREE from "three";

interface AnimatedPart {
  mesh: THREE.Mesh;
  phase: number;
}

function createArchGeometry(
  width: number,
  height: number,
): THREE.ShapeGeometry {
  const radius = width * 0.5;
  const springY = height - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(-radius, springY);
  for (let index = 0; index <= 8; index++) {
    const angle = Math.PI - (index / 8) * Math.PI;
    shape.lineTo(Math.cos(angle) * radius, springY + Math.sin(angle) * radius);
  }
  shape.lineTo(radius, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createRampGeometry(
  startRadius: number,
  endRadius: number,
  startY: number,
  height: number,
  turns: number,
  width: number,
): THREE.BufferGeometry {
  const segments = 168;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segments; index++) {
    const t = index / segments;
    const angle = -0.55 + t * turns * Math.PI * 2;
    const radius =
      THREE.MathUtils.lerp(startRadius, endRadius, t) +
      Math.sin(t * Math.PI * 9) * 0.045;
    const y = startY + t * height;
    const innerRadius = radius - width * 0.52;
    const outerRadius = radius + width * 0.52;
    const thickness = 0.26;
    positions.push(
      Math.cos(angle) * innerRadius,
      y,
      Math.sin(angle) * innerRadius,
      Math.cos(angle) * outerRadius,
      y,
      Math.sin(angle) * outerRadius,
      Math.cos(angle) * outerRadius,
      y - thickness,
      Math.sin(angle) * outerRadius,
      Math.cos(angle) * innerRadius,
      y - thickness,
      Math.sin(angle) * innerRadius,
    );
    if (index === segments) continue;
    const offset = index * 4;
    const next = offset + 4;
    indices.push(
      offset,
      next + 1,
      offset + 1,
      offset,
      next,
      next + 1,
      offset + 1,
      next + 2,
      offset + 2,
      offset + 1,
      next + 1,
      next + 2,
      offset + 2,
      next + 3,
      offset + 3,
      offset + 2,
      next + 2,
      next + 3,
      offset + 3,
      next,
      offset,
      offset + 3,
      next + 3,
      next,
    );
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

function createRampCurve(
  startRadius: number,
  endRadius: number,
  startY: number,
  height: number,
  turns: number,
  radiusOffset: number,
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 112; index++) {
    const t = index / 112;
    const angle = -0.55 + t * turns * Math.PI * 2;
    const radius =
      THREE.MathUtils.lerp(startRadius, endRadius, t) + radiusOffset;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        startY + t * height + 0.07,
        Math.sin(angle) * radius,
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
    new THREE.CylinderGeometry(radius, radius, direction.length(), 5),
    material,
  );
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return beam;
}

function deterministic(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export class BabelTower {
  readonly group = new THREE.Group();
  private readonly dust: THREE.Points;
  private readonly dustBaseY: Float32Array;
  private readonly banners: AnimatedPart[] = [];
  private readonly lanterns: AnimatedPart[] = [];

  constructor() {
    this.group.name = "BabelTower";

    const brick = new THREE.MeshLambertMaterial({
      color: "#a65f3f",
      flatShading: true,
    });
    const brickDark = new THREE.MeshLambertMaterial({
      color: "#754235",
      flatShading: true,
    });
    const sandstone = new THREE.MeshLambertMaterial({
      color: "#d9b477",
      flatShading: true,
    });
    const paleStone = new THREE.MeshLambertMaterial({
      color: "#ead5a7",
      flatShading: true,
    });
    const recess = new THREE.MeshLambertMaterial({
      color: "#241d22",
      emissive: "#110e12",
      emissiveIntensity: 0.34,
      side: THREE.DoubleSide,
    });
    const timber = new THREE.MeshLambertMaterial({
      color: "#4d3326",
      flatShading: true,
    });
    const lapis = new THREE.MeshLambertMaterial({
      color: "#176d87",
      emissive: "#0a2934",
      emissiveIntensity: 0.28,
      flatShading: true,
    });
    const bannerMaterial = new THREE.MeshLambertMaterial({
      color: "#247f91",
      emissive: "#0c3038",
      emissiveIntensity: 0.24,
      side: THREE.DoubleSide,
    });
    const lanternMaterial = new THREE.MeshBasicMaterial({
      color: "#ffc05d",
      transparent: true,
      opacity: 0.88,
    });

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.25, 0.58, 14, 1),
      brickDark,
    );
    ground.position.y = 0.15;
    ground.scale.z = 0.9;
    this.group.add(ground);

    for (let index = 0; index < 17; index++) {
      const angle = (index / 17) * Math.PI * 2 + deterministic(index, 1) * 0.18;
      const radius = 5.9 + deterministic(index, 2) * 1.15;
      const rubble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(
          0.18 + deterministic(index, 3) * 0.24,
          0,
        ),
        index % 3 === 0 ? sandstone : brickDark,
      );
      rubble.position.set(
        Math.cos(angle) * radius,
        0.45,
        Math.sin(angle) * radius * 0.9,
      );
      rubble.rotation.set(
        deterministic(index, 4),
        angle,
        deterministic(index, 5),
      );
      rubble.scale.y = 0.55 + deterministic(index, 6) * 0.65;
      this.group.add(rubble);
    }

    const tierHeights = [1.98, 1.94, 1.9, 1.84, 1.76, 1.68, 1.58, 1.46];
    const tierRadii = [5.45, 4.94, 4.45, 3.98, 3.54, 3.14, 2.78, 2.46];
    let tierBaseY = 0.48;
    tierHeights.forEach((height, tierIndex) => {
      const radius = tierRadii[tierIndex];
      const topRadius = radius - 0.24;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, radius, height, 32, 1, false),
        tierIndex % 2 === 0 ? brick : brickDark,
      );
      body.position.y = tierBaseY + height * 0.5;
      body.rotation.y = tierIndex * 0.09;
      this.group.add(body);

      const ledge = new THREE.Mesh(
        new THREE.CylinderGeometry(
          topRadius + 0.26,
          topRadius + 0.31,
          0.18,
          32,
        ),
        tierIndex % 3 === 2 ? lapis : sandstone,
      );
      ledge.position.y = tierBaseY + height - 0.05;
      this.group.add(ledge);

      const archCount = 24 - tierIndex * 2;
      const archWidth = Math.min(0.72, (radius * Math.PI * 1.48) / archCount);
      const archHeight = height * 0.64;
      const archGeometry = createArchGeometry(archWidth, archHeight);
      const arches = new THREE.InstancedMesh(archGeometry, recess, archCount);
      const columnGeometry = new THREE.BoxGeometry(
        0.105,
        archHeight * 0.7,
        0.12,
      );
      const columns = new THREE.InstancedMesh(
        columnGeometry,
        paleStone,
        archCount * 2,
      );
      const archMatrix = new THREE.Matrix4();
      const columnMatrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3(1, 1, 1);
      for (let archIndex = 0; archIndex < archCount; archIndex++) {
        const angle = (archIndex / archCount) * Math.PI * 2 + tierIndex * 0.07;
        const facadeRadius = radius + 0.015;
        quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 2 - angle, 0));
        archMatrix.compose(
          new THREE.Vector3(
            Math.cos(angle) * facadeRadius,
            tierBaseY + 0.19,
            Math.sin(angle) * facadeRadius,
          ),
          quaternion,
          scale,
        );
        arches.setMatrixAt(archIndex, archMatrix);

        const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
        for (let side = 0; side < 2; side++) {
          const sign = side === 0 ? -1 : 1;
          const position = new THREE.Vector3(
            Math.cos(angle) * (facadeRadius + 0.025),
            tierBaseY + 0.19 + archHeight * 0.35,
            Math.sin(angle) * (facadeRadius + 0.025),
          ).addScaledVector(tangent, sign * archWidth * 0.49);
          columnMatrix.compose(position, quaternion, scale);
          columns.setMatrixAt(archIndex * 2 + side, columnMatrix);
        }
      }
      arches.instanceMatrix.needsUpdate = true;
      columns.instanceMatrix.needsUpdate = true;
      this.group.add(arches, columns);

      if (tierIndex === 2 || tierIndex === 5) {
        const glazedBand = new THREE.Mesh(
          new THREE.TorusGeometry(topRadius + 0.34, 0.07, 4, 48),
          lapis,
        );
        glazedBand.rotation.x = Math.PI / 2;
        glazedBand.position.y = tierBaseY + height + 0.06;
        this.group.add(glazedBand);
      }
      tierBaseY += height - 0.03;
    });

    // 连续坡道是巴别塔的第一识别特征，台阶纹理只做稀疏采样以控制近景复杂度。
    const rampStartRadius = 5.58;
    const rampEndRadius = 2.4;
    const rampStartY = 0.78;
    const rampHeight = 13.6;
    const rampTurns = 2.92;
    const rampWidth = 1.02;
    const ramp = new THREE.Mesh(
      createRampGeometry(
        rampStartRadius,
        rampEndRadius,
        rampStartY,
        rampHeight,
        rampTurns,
        rampWidth,
      ),
      sandstone,
    );
    this.group.add(ramp);

    const outerRail = new THREE.Mesh(
      new THREE.TubeGeometry(
        createRampCurve(
          rampStartRadius,
          rampEndRadius,
          rampStartY,
          rampHeight,
          rampTurns,
          rampWidth * 0.55,
        ),
        112,
        0.065,
        5,
        false,
      ),
      paleStone,
    );
    this.group.add(outerRail);

    const stepCount = 48;
    const steps = new THREE.InstancedMesh(
      new THREE.BoxGeometry(rampWidth * 0.92, 0.07, 0.15),
      paleStone,
      stepCount,
    );
    const stepMatrix = new THREE.Matrix4();
    const stepQuaternion = new THREE.Quaternion();
    for (let index = 0; index < stepCount; index++) {
      const t = (index + 0.5) / stepCount;
      const angle = -0.55 + t * rampTurns * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(rampStartRadius, rampEndRadius, t);
      stepQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
      stepMatrix.compose(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          rampStartY + t * rampHeight + 0.055,
          Math.sin(angle) * radius,
        ),
        stepQuaternion,
        new THREE.Vector3(1, 1, 1),
      );
      steps.setMatrixAt(index, stepMatrix);
    }
    steps.instanceMatrix.needsUpdate = true;
    this.group.add(steps);

    const summitY = tierBaseY;
    const summitTerrace = new THREE.Mesh(
      new THREE.CylinderGeometry(2.72, 2.86, 0.42, 24),
      sandstone,
    );
    summitTerrace.position.y = summitY + 0.06;
    this.group.add(summitTerrace);

    // 缺失的墙段和高低不齐的脚手架让塔顶保持“仍在修建”的叙事，而不是完整神殿。
    for (let index = 0; index < 14; index++) {
      if (index === 3 || index === 8 || index === 12) continue;
      const angle = (index / 14) * Math.PI * 2;
      const height = 1.45 + deterministic(index, 7) * 1.35;
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, height, 0.52),
        index % 4 === 0 ? sandstone : brick,
      );
      pier.position.set(
        Math.cos(angle) * 2.12,
        summitY + 0.22 + height * 0.5,
        Math.sin(angle) * 2.12,
      );
      pier.rotation.y = -angle;
      this.group.add(pier);
    }

    const scaffoldBaseY = summitY + 0.18;
    for (let index = 0; index < 9; index++) {
      const angle = (index / 9) * Math.PI * 2 + 0.12;
      const topY = scaffoldBaseY + 3.05 + deterministic(index, 8) * 0.85;
      const bottom = new THREE.Vector3(
        Math.cos(angle) * 2.58,
        scaffoldBaseY,
        Math.sin(angle) * 2.58,
      );
      const top = new THREE.Vector3(
        Math.cos(angle) * 2.58,
        topY,
        Math.sin(angle) * 2.58,
      );
      this.group.add(createBeam(bottom, top, 0.055, timber));
      const nextAngle = ((index + 1) / 9) * Math.PI * 2 + 0.12;
      this.group.add(
        createBeam(
          new THREE.Vector3(
            Math.cos(angle) * 2.58,
            scaffoldBaseY + 1.15,
            Math.sin(angle) * 2.58,
          ),
          new THREE.Vector3(
            Math.cos(nextAngle) * 2.58,
            scaffoldBaseY + 2.15,
            Math.sin(nextAngle) * 2.58,
          ),
          0.045,
          timber,
        ),
      );
    }
    for (const y of [scaffoldBaseY + 1.05, scaffoldBaseY + 2.2]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.58, 0.045, 4, 36),
        timber,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      this.group.add(ring);
    }

    const craneMastBottom = new THREE.Vector3(0.52, summitY + 0.2, -0.18);
    const craneMastTop = new THREE.Vector3(0.52, summitY + 4.85, -0.18);
    this.group.add(createBeam(craneMastBottom, craneMastTop, 0.09, timber));
    this.group.add(
      createBeam(
        new THREE.Vector3(-1.15, summitY + 4.62, -0.18),
        new THREE.Vector3(3.05, summitY + 4.62, -0.18),
        0.085,
        timber,
      ),
    );
    this.group.add(
      createBeam(
        new THREE.Vector3(0.52, summitY + 3.3, -0.18),
        new THREE.Vector3(2.75, summitY + 4.62, -0.18),
        0.05,
        timber,
      ),
    );
    const rope = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(2.72, summitY + 4.62, -0.18),
        new THREE.Vector3(2.72, summitY + 2.8, -0.18),
      ]),
      new THREE.LineBasicMaterial({ color: "#31231d" }),
    );
    this.group.add(rope);

    [
      { tier: 2.3, angle: 0.42, radius: 4.83 },
      { tier: 7.15, angle: 2.72, radius: 3.72 },
      { tier: 11.15, angle: 5.18, radius: 2.88 },
    ].forEach((spec, index) => {
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 1.18, 1, 3),
        bannerMaterial.clone(),
      );
      banner.position.set(
        Math.cos(spec.angle) * spec.radius,
        spec.tier,
        Math.sin(spec.angle) * spec.radius,
      );
      banner.rotation.y = Math.PI / 2 - spec.angle;
      banner.geometry.translate(0, -0.48, 0);
      this.banners.push({ mesh: banner, phase: index * 1.9 });
      this.group.add(banner);
    });

    for (let index = 0; index < 9; index++) {
      const t = (index + 0.8) / 10;
      const angle = -0.55 + t * rampTurns * Math.PI * 2;
      const radius =
        THREE.MathUtils.lerp(rampStartRadius, rampEndRadius, t) + 0.58;
      const lantern = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.075, 0),
        lanternMaterial.clone(),
      );
      lantern.position.set(
        Math.cos(angle) * radius,
        rampStartY + t * rampHeight + 0.24,
        Math.sin(angle) * radius,
      );
      this.lanterns.push({ mesh: lantern, phase: index * 0.74 });
      this.group.add(lantern);
    }

    const dustCount = 72;
    const dustPositions = new Float32Array(dustCount * 3);
    this.dustBaseY = new Float32Array(dustCount);
    for (let index = 0; index < dustCount; index++) {
      const angle = deterministic(index, 9) * Math.PI * 2;
      const radius = 2.15 + deterministic(index, 10) * 4.2;
      const y = 1.1 + deterministic(index, 11) * 17.6;
      dustPositions[index * 3] = Math.cos(angle) * radius;
      dustPositions[index * 3 + 1] = y;
      dustPositions[index * 3 + 2] = Math.sin(angle) * radius;
      this.dustBaseY[index] = y;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3),
    );
    this.dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: "#e1bf83",
        size: 0.09,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    this.group.add(this.dust);

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.material instanceof THREE.MeshLambertMaterial) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number): void {
    this.dust.rotation.y = time * 0.045;
    const dustPositions = this.dust.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    for (let index = 0; index < dustPositions.count; index++) {
      dustPositions.setY(
        index,
        this.dustBaseY[index] + Math.sin(time * 0.52 + index * 1.37) * 0.12,
      );
    }
    dustPositions.needsUpdate = true;

    this.banners.forEach(({ mesh, phase }) => {
      mesh.rotation.z = Math.sin(time * 1.25 + phase) * 0.055;
      mesh.scale.x = 1 + Math.sin(time * 1.8 + phase) * 0.08;
    });
    this.lanterns.forEach(({ mesh, phase }) => {
      const pulse = 1 + Math.sin(time * 3.7 + phase) * 0.18;
      mesh.scale.setScalar(pulse);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        0.72 + Math.sin(time * 4.1 + phase) * 0.18;
    });
  }
}
