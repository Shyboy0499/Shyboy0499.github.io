import * as THREE from "three";
import { waveHeight } from "../core/waves";
import { glowTexture } from "../core/sprites";
import { SHIP_MOTION } from "./ship-config";
import { NoahsArk } from "./noahs-ark";
import type { ShipVariant } from "../../store";

// 探险小帆船（冲奖版）：条纹帆布 + 三角旗 + 拉索 + 护舷板 + 甲板道具。
// 造型原则：主角红船身是全场唯一高饱和红；细节讲"有人生活在这条船上"的故事
// （木桶、缆绳圈、船头灯、宝箱），而不是堆多边形。
// 浮力：CPU 采样波高（船头/船尾/左/右四点）算起伏与俯仰侧倾。

/** 条纹帆布：canvas 画的，米白底 + 珊瑚红横条 */
function sailTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff6e2";
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = "#ff7a52";
  ctx.fillRect(0, 54, 128, 22);
  ctx.fillRect(0, 168, 128, 22);
  ctx.fillStyle = "rgba(160, 120, 70, 0.35)"; // 底边缝线
  ctx.fillRect(0, 248, 128, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Ship {
  group = new THREE.Group();
  /** 船尾迹（世界坐标，不随船动；由 world 挂进 scene） */
  wake = new THREE.Group();
  private readonly sloopGroup = new THREE.Group();
  private ark: NoahsArk | null = null;
  private wakePool: { mesh: THREE.Mesh; t0: number }[] = [];
  private lastWakeAt = -1;
  pos = new THREE.Vector3();
  heading = Math.PI; // 朝 -z（北，群岛方向）
  speed = 0;
  readonly cruiseSpeed = SHIP_MOTION.cruiseSpeed;
  readonly sprintSpeed = SHIP_MOTION.sprintSpeed;
  private sail!: THREE.Mesh;
  private pennant!: THREE.Mesh;
  private arrowGroup = new THREE.Group();
  arrow!: THREE.Mesh;
  private arrowGlowMat!: THREE.SpriteMaterial;
  private chestGlow!: THREE.Sprite;
  private pitch = 0;
  private roll = 0;
  private sprintK = 0;

  constructor() {
    const hullRed = new THREE.MeshLambertMaterial({
      color: "#b6452f",
      flatShading: true,
    });
    const cream = new THREE.MeshLambertMaterial({
      color: "#efdcb4",
      flatShading: true,
    });
    const darkWood = new THREE.MeshLambertMaterial({
      color: "#6e4a2a",
      flatShading: true,
    });
    const midWood = new THREE.MeshLambertMaterial({
      color: "#9a6a3c",
      flatShading: true,
    });
    const rope = new THREE.MeshLambertMaterial({ color: "#d8b986" });

    // ---- 船壳：尖艏圆艉轮廓，三层叠出护舷板 ----
    const outline = (w: number) => {
      const s = new THREE.Shape();
      s.moveTo(0, 3.6);
      s.quadraticCurveTo(1.3 * w, 1.9, 1.18 * w, -1.1);
      s.quadraticCurveTo(1.1 * w, -2.5, 0, -2.65);
      s.quadraticCurveTo(-1.1 * w, -2.5, -1.18 * w, -1.1);
      s.quadraticCurveTo(-1.3 * w, 1.9, 0, 3.6);
      return s;
    };
    const mkHullLayer = (
      w: number,
      depth: number,
      mat: THREE.Material,
    ): THREE.Mesh => {
      const g = new THREE.ExtrudeGeometry(outline(w), {
        depth,
        bevelEnabled: false,
      });
      g.rotateX(Math.PI / 2); // 甲板轮廓落到 XZ 平面，挤出方向朝下
      return new THREE.Mesh(g, mat);
    };
    const hull = mkHullLayer(1.0, 1.35, hullRed);
    hull.position.y = 0.95;
    const strake = mkHullLayer(1.06, 0.4, cream); // 米白护舷板：红船身上的一道亮线
    strake.position.y = 1.12;
    const rubrail = mkHullLayer(1.09, 0.13, darkWood); // 顶缘深木压条
    rubrail.position.y = 1.24;
    const deck = mkHullLayer(
      0.82,
      0.22,
      new THREE.MeshLambertMaterial({ color: "#e8d4b0", flatShading: true }),
    );
    deck.position.y = 1.1;
    this.sloopGroup.add(hull, strake, rubrail, deck);

    // 艏柱与船尾舵
    const stem = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 1.1, 0.34),
      darkWood,
    );
    stem.position.set(0, 1.45, 3.5);
    stem.rotation.x = 0.18;
    const rudder = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.3, 0.55),
      darkWood,
    );
    rudder.position.set(0, 0.45, -2.9);
    const tiller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 1.1, 5),
      midWood,
    );
    tiller.position.set(0, 1.45, -2.35);
    tiller.rotation.x = -0.9;
    this.sloopGroup.add(stem, rudder, tiller);

    // ---- 桅杆 / 帆桁 / 条纹帆 / 三角旗 ----
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 6.4, 7),
      midWood,
    );
    mast.position.set(0, 4.1, -0.5);
    const boom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6),
      midWood,
    );
    boom.rotation.z = Math.PI / 2;
    boom.position.set(0, 2.25, -0.5);
    this.sloopGroup.add(mast, boom);

    const sailGeo = new THREE.PlaneGeometry(3.6, 4.1, 8, 8);
    {
      const p = sailGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const u = x / 3.6 + 0.5;
        const v = y / 4.1 + 0.5;
        p.setZ(i, Math.sin(u * Math.PI) * (0.35 + 0.5 * (1 - v)) * 0.95);
      }
      sailGeo.computeVertexNormals();
    }
    this.sail = new THREE.Mesh(
      sailGeo,
      new THREE.MeshLambertMaterial({
        map: sailTexture(),
        emissive: "#cfc3a6",
        emissiveIntensity: 0.08, // 逆光下帆不塌成黑片，但夜里也不自己发白光
        side: THREE.DoubleSide,
      }),
    );
    this.sail.position.set(0, 4.45, -0.5);
    this.sloopGroup.add(this.sail);

    // 三角旗（比方旗多一倍神气）
    const penShape = new THREE.Shape();
    penShape.moveTo(0, 0);
    penShape.lineTo(1.3, 0.24);
    penShape.lineTo(0, 0.48);
    this.pennant = new THREE.Mesh(
      new THREE.ShapeGeometry(penShape),
      new THREE.MeshLambertMaterial({
        color: "#ff6b57",
        emissive: "#ff6b57",
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    this.pennant.position.set(0.1, 7.15, -0.5);
    this.sloopGroup.add(this.pennant);

    // 拉索：桅顶 → 艏 / 艉（细绳，手作感的关键一笔）
    const mkRope = (a: THREE.Vector3, b: THREE.Vector3): THREE.Mesh => {
      const dir = b.clone().sub(a);
      const len = dir.length();
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, len, 4),
        rope,
      );
      m.position.copy(a).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize(),
      );
      return m;
    };
    this.sloopGroup.add(
      mkRope(new THREE.Vector3(0, 7.2, -0.5), new THREE.Vector3(0, 1.7, 3.35)),
      mkRope(new THREE.Vector3(0, 7.2, -0.5), new THREE.Vector3(0, 1.6, -2.75)),
    );

    // ---- 甲板道具：木桶 / 缆绳圈 / 船头宝箱 / 船头灯 ----
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.46, 0.8, 8),
      midWood,
    );
    barrel.position.set(0.62, 1.6, -1.5);
    const barrelBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.14, 8),
      new THREE.MeshLambertMaterial({ color: "#c9a14e" }),
    );
    barrelBand.position.set(0.62, 1.62, -1.5);
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.11, 5, 10),
      rope,
    );
    coil.rotation.x = -Math.PI / 2;
    coil.position.set(-0.62, 1.3, -1.7);
    this.sloopGroup.add(barrel, barrelBand, coil);

    const chest = new THREE.Group();
    const chestBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.62, 0.72),
      new THREE.MeshLambertMaterial({ color: "#7a4a26", flatShading: true }),
    );
    const chestLid = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.3, 0.72),
      new THREE.MeshLambertMaterial({ color: "#8f5a30", flatShading: true }),
    );
    chestLid.position.set(0, 0.42, -0.14);
    chestLid.rotation.x = -0.55;
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, 0.14, 0.76),
      new THREE.MeshLambertMaterial({
        color: "#caa14e",
        emissive: "#ffcf6e",
        emissiveIntensity: 0.7,
      }),
    );
    band.position.y = 0.05;
    chest.add(chestBody, chestLid, band);
    chest.position.set(0, 1.7, 2.2);
    this.sloopGroup.add(chest);

    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture("#ffd98a"),
      color: "#ffcf6e",
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.chestGlow = new THREE.Sprite(glowMat);
    this.chestGlow.position.set(0, 2.0, 2.2);
    this.chestGlow.scale.setScalar(2.2);
    this.sloopGroup.add(this.chestGlow);

    // 船头灯笼：夜航的暖橙光核
    const lampPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.1, 5),
      darkWood,
    );
    lampPole.position.set(0, 1.9, 3.05);
    const lampHead = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshLambertMaterial({
        color: "#2a2438",
        emissive: "#ffb84d",
        emissiveIntensity: 1.6,
      }),
    );
    lampHead.position.set(0, 2.55, 3.05);
    const lampGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#ffc97a"),
        color: "#ffb04a",
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    lampGlow.position.set(0, 2.55, 3.05);
    lampGlow.scale.setScalar(3.2);
    this.sloopGroup.add(lampPole, lampHead, lampGlow);

    // 船尾小灯：追尾视角里一直能看到的暖光
    const sternLamp = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshLambertMaterial({
        color: "#2a2438",
        emissive: "#ffc25e",
        emissiveIntensity: 1.5,
      }),
    );
    sternLamp.position.set(0, 2.0, -2.55);
    const sternGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#ffc97a"),
        color: "#ffb04a",
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sternGlow.position.set(0, 2.0, -2.55);
    sternGlow.scale.setScalar(2.6);
    this.sloopGroup.add(sternLamp, sternGlow);

    // ---- 指路金箭（挂桅顶上方，不会被帆挡）----
    const arrowGeo = new THREE.ConeGeometry(0.42, 1.5, 4);
    arrowGeo.rotateX(Math.PI / 2);
    this.arrow = new THREE.Mesh(
      arrowGeo,
      new THREE.MeshBasicMaterial({
        color: "#ffa726",
        transparent: true,
        opacity: 0,
      }),
    );
    this.arrowGlowMat = new THREE.SpriteMaterial({
      map: glowTexture("#ffd98a"),
      color: "#ffcf6e",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const arrowGlow = new THREE.Sprite(this.arrowGlowMat);
    arrowGlow.scale.setScalar(2.6);
    this.arrowGroup.add(this.arrow, arrowGlow);
    this.arrowGroup.position.set(0, 8.5, -0.5);
    this.group.add(this.sloopGroup, this.arrowGroup);

    // ---- 尾迹泡沫池 ----
    const wakeTex = glowTexture("#ffffff");
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({
          map: wakeTex,
          color: "#ffffff",
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.15;
      this.wakePool.push({ mesh: m, t0: -99 });
      this.wake.add(m);
    }

    // 船体投影（尾迹/金箭是 Basic 材质，自动排除）
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (
        m.isMesh &&
        (m.material as THREE.Material).type === "MeshLambertMaterial"
      ) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }

  get forward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  setVariant(variant: ShipVariant): void {
    const useArk = variant === "ark";
    this.sloopGroup.visible = !useArk;
    if (useArk && !this.ark) {
      this.ark = new NoahsArk();
      this.ark.group.name = "PlayerNoahsArk";
      // 方舟作为可驾驶外观时缩到小船碰撞壳内，避免靠岸与漩涡捕获半径失真。
      this.ark.group.scale.set(0.51, 0.51, 0.51);
      this.ark.group.rotation.y = Math.PI;
      this.ark.group.position.set(0, -0.28, 0.2);
      this.group.add(this.ark.group);
    }
    if (this.ark) this.ark.group.visible = useArk;
  }

  /**
   * @param throttle -1..1  @param steer -1(右)..1(左)
   * @param sprintHeld 按住 Shift 时逐渐冲刺
   * @param speedCap 泊岸软减速上限
   */
  update(
    dt: number,
    sim: number,
    throttle: number,
    steer: number,
    sprintHeld: boolean,
    speedCap: number,
  ): void {
    const sprintTarget = sprintHeld && throttle > 0 ? 1 : 0;
    const sprintRise = 1 - Math.exp(-1.9 * dt);
    const sprintFall = 1 - Math.exp(-3.8 * dt);
    this.sprintK +=
      (sprintTarget - this.sprintK) *
      (sprintTarget > this.sprintK ? sprintRise : sprintFall);

    const maxSpeed = THREE.MathUtils.lerp(
      this.cruiseSpeed,
      this.sprintSpeed,
      this.sprintK,
    );
    const accel = THREE.MathUtils.lerp(
      SHIP_MOTION.accelCruise,
      SHIP_MOTION.accelSprint,
      this.sprintK,
    );
    const drag = SHIP_MOTION.drag;
    this.speed += (throttle * accel - drag * this.speed) * dt;
    this.speed = THREE.MathUtils.clamp(
      this.speed,
      SHIP_MOTION.reverseSpeed,
      Math.min(maxSpeed, speedCap),
    );
    const turnGain = 0.35 + 0.65 * Math.min(Math.abs(this.speed) / maxSpeed, 1);
    this.heading += steer * 1.15 * turnGain * dt * (this.speed >= 0 ? 1 : -1);

    const fwd = this.forward;
    this.pos.addScaledVector(fwd, this.speed * dt);

    // 浮力四点采样 → 起伏 + 俯仰 + 侧倾
    const left = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const hC = waveHeight(this.pos.x, this.pos.z, sim);
    const hF = waveHeight(this.pos.x + fwd.x * 3, this.pos.z + fwd.z * 3, sim);
    const hB = waveHeight(this.pos.x - fwd.x * 3, this.pos.z - fwd.z * 3, sim);
    const hL = waveHeight(
      this.pos.x + left.x * 1.6,
      this.pos.z + left.z * 1.6,
      sim,
    );
    const hR = waveHeight(
      this.pos.x - left.x * 1.6,
      this.pos.z - left.z * 1.6,
      sim,
    );
    const damp = 1 - Math.exp(-4 * dt);
    this.pitch += (Math.atan2(hF - hB, 6) - this.pitch) * damp;
    this.roll += (Math.atan2(hL - hR, 3.2) - this.roll) * damp;

    this.group.position.set(this.pos.x, hC * 0.7 - 0.18, this.pos.z);
    this.group.rotation.set(0, 0, 0);
    this.group.rotateY(this.heading);
    this.group.rotateX(-this.pitch);
    this.group.rotateZ(this.roll + steer * -0.06);

    // 帆随速度微鼓、三角旗飘动
    const sailScale = 1 + Math.min(Math.abs(this.speed) / maxSpeed, 1) * 0.08;
    this.sail.scale.set(sailScale, 1, sailScale);
    this.pennant.rotation.y =
      Math.sin(sim * 5.5) * 0.45 + Math.sin(sim * 9.1) * 0.15;
    this.chestGlow.material.opacity = 0.35 + 0.15 * Math.sin(sim * 2.4);
    this.ark?.update(sim);

    // 尾迹：够快才吐泡沫
    if (this.speed > 3.5 && sim - this.lastWakeAt > 0.13) {
      this.lastWakeAt = sim;
      const slot = this.wakePool.find((w) => sim - w.t0 > 1.3) ?? null;
      if (slot) {
        slot.t0 = sim;
        slot.mesh.position.set(
          this.pos.x - fwd.x * 2.9 + Math.sin(sim * 13.7) * 0.5,
          0.15,
          this.pos.z - fwd.z * 2.9 + Math.cos(sim * 11.3) * 0.5,
        );
      }
    }
    for (const w of this.wakePool) {
      const k = (sim - w.t0) / 1.3;
      const m = w.mesh.material as THREE.MeshBasicMaterial;
      if (k < 0 || k > 1) {
        m.opacity = 0;
        continue;
      }
      w.mesh.scale.setScalar(1 + k * 2.4);
      m.opacity = 0.42 * (1 - k);
    }
  }

  /** 金箭指向目标（世界坐标）；无目标时隐没（连同光晕一起） */
  pointArrowAt(target: THREE.Vector3 | null, sim: number, dt: number): void {
    const m = this.arrow.material as THREE.MeshBasicMaterial;
    const damp = 1 - Math.exp(-5 * dt);
    if (!target) {
      m.opacity += (0 - m.opacity) * damp;
      this.arrowGlowMat.opacity += (0 - this.arrowGlowMat.opacity) * damp;
      return;
    }
    m.opacity += (0.95 - m.opacity) * damp;
    this.arrowGlowMat.opacity += (0.35 - this.arrowGlowMat.opacity) * damp;
    const worldYaw = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    this.arrowGroup.rotation.y = worldYaw - this.heading;
    this.arrowGroup.position.y = 8.5 + Math.sin(sim * 2.2) * 0.3;
  }
}
