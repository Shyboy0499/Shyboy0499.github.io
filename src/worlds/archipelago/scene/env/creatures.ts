import * as THREE from "three";
import { DOLPHIN_SCALE, WHALE_SCALE, CREATURE_BOUND } from "../core/config";

// 海洋生物：海鸥(绕船飞) / 海豚(跃水+水下阴影) / 鲸(拱背喷水+阴影预告) / 鱼群(暗色群影)。
// 原先散在 world.ts 的构造/place/update，整体内聚到这里；World 只 new 一个、每帧 update() 一行。

type Bird = {
  g: THREE.Group;
  wl: THREE.Mesh;
  wr: THREE.Mesh;
  c: THREE.Vector3;
  r: number;
  sp: number;
  ph: number;
};
type Dolphin = {
  g: THREE.Group;
  shadow: THREE.Mesh;
  nextAt: number;
  dur: number;
  cx: number;
  cz: number;
  hy: number;
  height: number;
  dist: number;
};
type Whale = {
  g: THREE.Group;
  spout: THREE.Mesh;
  shadow: THREE.Mesh;
  nextAt: number;
  dur: number;
  cx: number;
  cz: number;
  hy: number;
};
type School = {
  g: THREE.Group;
  fish: THREE.Mesh[];
  cx: number;
  cz: number;
  a: number;
  speed: number;
};

export class CreatureManager {
  private birds: Bird[] = [];
  private dolphins: Dolphin[] = [];
  private whale!: Whale;
  private schools: School[] = [];

  constructor(scene: THREE.Scene) {
    // 海鸥：绕圈扇翅膀的小剪影，天空的"活"
    {
      const wingMat = new THREE.MeshBasicMaterial({
        color: "#39405a",
        side: THREE.DoubleSide,
      });
      const spots: [number, number, number, number][] = [
        [8, 42, -18, 46],
        [-48, 48, 28, 40],
        [52, 40, 44, 44],
      ];
      for (const [cx, cy, cz, cr] of spots) {
        const g = new THREE.Group();
        const wingGeo = new THREE.PlaneGeometry(1.6, 0.55);
        wingGeo.rotateX(-Math.PI / 2);
        wingGeo.translate(0.8, 0, 0);
        const wl = new THREE.Mesh(wingGeo, wingMat);
        const wingGeoR = wingGeo.clone();
        wingGeoR.scale(-1, 1, 1);
        const wr = new THREE.Mesh(wingGeoR, wingMat);
        g.add(wl, wr);
        scene.add(g);
        this.birds.push({
          g,
          wl,
          wr,
          c: new THREE.Vector3(cx, cy, cz),
          r: cr,
          sp: 0.16 + Math.abs(cx % 7) * 0.012,
          ph: cx,
        });
      }
    }

    // 海豚：定时跃出海面划一道弧再入水（不跃时藏在水下）
    {
      const dolMat = new THREE.MeshLambertMaterial({
        color: "#4a5c7e",
        flatShading: true,
      });
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.5, 2.0, 5, 9),
          dolMat,
        );
        body.rotation.x = Math.PI / 2; // 沿 +Z 躺平（+Z 为头）
        body.scale.set(0.82, 0.82, 1.3);
        const dorsal = new THREE.Mesh(
          new THREE.ConeGeometry(0.32, 0.78, 4),
          dolMat,
        );
        dorsal.position.set(0, 0.5, 0.05);
        dorsal.rotation.x = -0.25;
        const fluke = new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 0.5, 4),
          dolMat,
        );
        fluke.position.set(0, 0, -1.55);
        fluke.rotation.z = Math.PI / 2;
        fluke.scale.set(1, 0.28, 1);
        g.add(body, dorsal, fluke);
        g.scale.setScalar(DOLPHIN_SCALE); // 微缩海盘里放大成看得见的玩具海豚
        g.visible = false;
        scene.add(g);
        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(1, 20),
          new THREE.MeshBasicMaterial({
            color: "#08202e",
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
          }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.12;
        shadow.visible = false;
        scene.add(shadow);
        const d: Dolphin = {
          g,
          shadow,
          nextAt: 3 + i * 3.5,
          dur: 1.5,
          cx: 0,
          cz: 0,
          hy: 0,
          height: 2,
          dist: 8,
        };
        this.placeDolphin(d, 0, 0);
        this.dolphins.push(d);
      }
    }

    // 鲸鱼：偶尔缓缓拱起脊背出水、喷一道水柱再沉下
    {
      const wMat = new THREE.MeshLambertMaterial({
        color: "#3b4a63",
        flatShading: true,
      });
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), wMat);
      body.scale.set(2.1, 1.7, 5.6);
      const fluke = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.1, 4), wMat);
      fluke.position.set(0, 0, -5.7);
      fluke.rotation.z = Math.PI / 2;
      fluke.scale.set(1, 0.24, 1.5);
      const spout = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 3.4, 7),
        new THREE.MeshBasicMaterial({
          color: "#eaf6ff",
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      );
      spout.position.set(0, 2.4, 2.6);
      spout.visible = false;
      g.add(body, fluke, spout);
      g.scale.setScalar(WHALE_SCALE);
      g.visible = false;
      scene.add(g);
      // 水下阴影：贴水面的暗色椭圆，鲸鱼在水下也能看见它游动的影子
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(1, 28),
        new THREE.MeshBasicMaterial({
          color: "#08202e",
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.12;
      shadow.visible = false;
      scene.add(shadow);
      this.whale = {
        g,
        spout,
        shadow,
        nextAt: 9,
        dur: 5.5,
        cx: 0,
        cz: 0,
        hy: 0,
      };
      this.placeWhale(0, 0);
    }

    // 水下鱼群：一簇暗色小鱼贴着水面漂动（不透明海面下，用暗色群影表现"水下鱼群"）
    {
      const fMat = new THREE.MeshBasicMaterial({
        color: "#213141",
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      for (let s = 0; s < 3; s++) {
        const g = new THREE.Group();
        const fish: THREE.Mesh[] = [];
        for (let i = 0; i < 14; i++) {
          const f = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.7, 3), fMat);
          f.rotation.x = Math.PI / 2; // 平躺贴水面
          f.position.set(
            (i % 5) * 1.8 - 3.6 + Math.sin(i) * 1.2,
            0,
            Math.floor(i / 5) * 2.2 - 3,
          );
          g.add(f);
          fish.push(f);
        }
        g.position.y = 0.45;
        scene.add(g);
        const sc: School = {
          g,
          fish,
          cx: 0,
          cz: 0,
          a: (s / 3) * 6.28,
          speed: 0.35 + s * 0.12,
        };
        this.placeSchool(sc, 0, 0);
        this.schools.push(sc);
      }
    }
  }

  private placeDolphin(d: Dolphin, shipX: number, shipZ: number): void {
    // 在船周围一圈随机落点，保证跃水基本都在视野内
    const a = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 130;
    d.cx = shipX + Math.cos(a) * r;
    d.cz = shipZ + Math.sin(a) * r;
    const dist = Math.hypot(d.cx, d.cz);
    if (dist > CREATURE_BOUND) {
      d.cx *= CREATURE_BOUND / dist;
      d.cz *= CREATURE_BOUND / dist;
    }
    d.hy = Math.random() * Math.PI * 2;
    d.height = 1.8 + Math.random() * 1.4;
    d.dist = 6 + Math.random() * 5;
    d.dur = 1.4 + Math.random() * 0.6;
  }

  private placeWhale(shipX: number, shipZ: number): void {
    const w = this.whale;
    const a = Math.random() * Math.PI * 2;
    const r = 120 + Math.random() * 150;
    w.cx = shipX + Math.cos(a) * r;
    w.cz = shipZ + Math.sin(a) * r;
    const dist = Math.hypot(w.cx, w.cz);
    if (dist > CREATURE_BOUND) {
      w.cx *= CREATURE_BOUND / dist;
      w.cz *= CREATURE_BOUND / dist;
    }
    w.hy = Math.random() * Math.PI * 2;
    w.dur = 9 + Math.random() * 3; // 更长：留足影子预告的时间
  }

  private placeSchool(sc: School, shipX: number, shipZ: number): void {
    const a = Math.random() * Math.PI * 2;
    const r = 50 + Math.random() * 150;
    sc.cx = shipX + Math.cos(a) * r;
    sc.cz = shipZ + Math.sin(a) * r;
    sc.a = Math.random() * Math.PI * 2;
  }

  update(sim: number, dt: number, shipX: number, shipZ: number): void {
    // 海鸥绕圈 + 扇翅
    for (const bd of this.birds) {
      const a = sim * bd.sp + bd.ph;
      bd.g.position.set(
        shipX + bd.c.x + Math.cos(a) * bd.r,
        bd.c.y + Math.sin(sim * 0.8 + bd.ph) * 2.5,
        shipZ + bd.c.z + Math.sin(a) * bd.r,
      );
      bd.g.rotation.y = -a; // 沿切线方向飞
      const flap = Math.sin(sim * 9 + bd.ph) * 0.55;
      bd.wl.rotation.z = flap;
      bd.wr.rotation.z = -flap;
    }
    // 海豚跃水：弧线穿过水面，抬头出水、低头入水
    for (const d of this.dolphins) {
      const k = (sim - d.nextAt) / d.dur;
      if (k < 0 || k > 1) {
        d.g.visible = false;
        d.shadow.visible = false;
        if (k > 1) {
          d.nextAt = sim + 3 + Math.random() * 7;
          this.placeDolphin(d, shipX, shipZ);
        }
        continue;
      }
      d.g.visible = true;
      const dir = new THREE.Vector3(Math.sin(d.hy), 0, Math.cos(d.hy));
      const travel = (k - 0.5) * d.dist;
      const dx = d.cx + dir.x * travel;
      const dz = d.cz + dir.z * travel;
      const dy = Math.sin(k * Math.PI) * d.height - 0.35;
      d.g.position.set(dx, dy, dz);
      d.g.rotation.y = d.hy;
      d.g.rotation.x = -Math.cos(k * Math.PI) * 0.75;
      // 水下阴影
      d.shadow.visible = true;
      d.shadow.position.set(dx, 0.12, dz);
      d.shadow.scale.setScalar(3.2);
      (d.shadow.material as THREE.MeshBasicMaterial).opacity =
        0.28 * (1 - THREE.MathUtils.clamp(dy / 3, 0, 1));
    }
    // 鲸鱼：缓缓拱背出水 + 中段喷水
    {
      const wl = this.whale;
      const k = (sim - wl.nextAt) / wl.dur;
      if (k < 0 || k > 1) {
        wl.g.visible = false;
        wl.shadow.visible = false;
        if (k > 1) {
          wl.nextAt = sim + 14 + Math.random() * 18;
          this.placeWhale(shipX, shipZ);
        }
      } else {
        const dir = new THREE.Vector3(Math.sin(wl.hy), 0, Math.cos(wl.hy));
        const travel = (k - 0.5) * 70; // 更长的巡游路径
        const wx = wl.cx + dir.x * travel;
        const wz = wl.cz + dir.z * travel;
        // 深度曲线：大部分时间在水下（只有影子在水面预告），k≈0.58 处猛地拱背出水
        const bump = Math.exp(-Math.pow((k - 0.58) / 0.14, 2));
        const wy = -6.5 + bump * 8.4; // 深 -6.5 → 峰 ~1.9
        wl.g.visible = wy > -2.6; // 深处被不透明海面自然遮住，出水才见
        wl.g.position.set(wx, wy, wz);
        wl.g.rotation.y = wl.hy;
        wl.g.rotation.x = THREE.MathUtils.clamp((k - 0.58) * 3.0, -0.6, 0.6); // 出水抬头、入水低头
        wl.spout.visible = bump > 0.75;
        wl.spout.scale.setScalar(0.5 + bump * 0.9);
        // 阴影预告：整段贴水面可见，越贴近水面越浓越大 —— 出水前先看到影子游过来
        wl.shadow.visible = true;
        wl.shadow.position.set(wx, 0.12, wz);
        const near = THREE.MathUtils.clamp((wy + 6.5) / 6.5, 0, 1); // 0 深 → 1 出水
        wl.shadow.scale.setScalar(8 + near * 5);
        (wl.shadow.material as THREE.MeshBasicMaterial).opacity =
          0.1 + 0.28 * near;
      }
    }
    // 水下鱼群：贴水面漂动 + 摆尾，离船太远就挪回船附近
    for (const sc of this.schools) {
      sc.a += sc.speed * dt * 0.35;
      sc.cx += Math.cos(sc.a) * sc.speed * 7 * dt;
      sc.cz += Math.sin(sc.a) * sc.speed * 7 * dt;
      if (Math.hypot(sc.cx - shipX, sc.cz - shipZ) > 250)
        this.placeSchool(sc, shipX, shipZ);
      sc.g.position.set(sc.cx, 0.45, sc.cz);
      sc.g.rotation.y = -sc.a;
      for (let i = 0; i < sc.fish.length; i++)
        sc.fish[i].rotation.z = Math.sin(sim * 6 + i * 0.7) * 0.35;
    }
  }
}
