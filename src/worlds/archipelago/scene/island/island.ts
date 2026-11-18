import * as THREE from "three";
import { easeOutCubic } from "../core/ease";
import { glowTexture } from "../core/sprites";
import {
  updateBeacon,
  updateChestDisplay,
  updateFogSprites,
  updateHighlight,
  updateLabel,
  updateLantern,
  updateSmoke,
  type SmokeParticle,
  type SmokeSource,
} from "./island-animation";
import type { IslandStatus } from "./island-types";
import { createIslandModel, type IslandModel } from "./island-model";
import type { TrackedMat } from "./island-model-common";

// 程序化 Madbox 风小岛：同一主题也有多种轮廓（圆丘/双丘/三层蛋糕/蘑菇石柱/雪塔…），
// 形态由确定性种子决定——同一座岛永远长一个样，但整片海没有两座重样的岛。
// 三种状态外观：迷雾（灰蒙下沉裹雾）/ 待解锁（金色微光）/ 已解锁（点亮灯笼 + 浮出名字）。

const GRAY = new THREE.Color("#7c8798");
const GRAY_NIGHT = new THREE.Color("#38324e"); // 夜里的迷雾岛剪影灰
const _themed = new THREE.Color();
const _gray = new THREE.Color();

let _glowTex: THREE.CanvasTexture | null = null;
function glowTex() {
  return (_glowTex ??= glowTexture("#ffffff"));
}

const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export class IslandObject {
  group = new THREE.Group();
  def!: import("../../islands").IslandDef;
  radius!: number;
  topY!: number;
  private mats: TrackedMat[] = [];
  private beacon!: THREE.Sprite;
  private beaconPhase!: number;
  private fogSprites: import("./island-overlays").IslandFogSprite[] = [];
  private label!: THREE.Sprite;
  private lanternHead!: THREE.Mesh;
  private lanternGlow!: THREE.Sprite;
  private lanternOn = 0;
  private labelW = 1;
  private labelShown = 0;
  private growStart = -1;
  private unlockStart = -1;
  private lastMoodK = 0;
  onGrown: (() => void) | null = null;
  // 聚焦升起 + 作品宝箱
  private lifted = false;
  private liftK = 0;
  chests: THREE.Mesh[] = []; // 可点击的作品宝箱网格（供射线拾取）
  private chestGroup = new THREE.Group();
  // 靠近高亮光环
  private highlighted = false;
  private highlightK = 0;
  private highlightRing!: THREE.Mesh;
  // 地标与动态装饰
  private smoke: SmokeParticle[] = [];
  private smokeSrc: SmokeSource[] = [];
  private propUpdate: ((sim: number, nightK: number) => void) | null = null; // 选中地标的逐帧动画

  constructor(def: import("../../islands").IslandDef) {
    this.def = def;
    const model: IslandModel = createIslandModel(def);
    this.group = model.group;
    this.mats = model.mats;
    this.radius = model.radius;
    this.topY = model.topY;
    this.beacon = model.beacon;
    this.beaconPhase = model.beaconPhase;
    this.fogSprites = model.fogSprites;
    this.label = model.label;
    this.labelW = model.labelW;
    this.lanternHead = model.lanternHead;
    this.lanternGlow = model.lanternGlow;
    this.chests = model.chests;
    this.chestGroup = model.chestGroup;
    this.highlightRing = model.highlightRing;
    this.smoke = model.smoke;
    this.smokeSrc = model.smokeSrc;
    this.propUpdate = model.propUpdate;

    // 迷雾岛预置"沉底+灰化"静息态：离屏门控可能从未 update 过它，
    // 否则会以满色亮岛、未下沉、还带泡沫环的样子闯入画面（超宽视口下可见）。
    if (this.def.projects.length === 0) {
      this.applyMood(1, 0); // lastMoodK=1 → foamRadius 返回 0、颜色转灰、缩小
      this.group.position.y = -3.2;
    }
  }

  /** 给水面 shader 用的泡沫半径：迷雾沉底时为 0（生长时泡沫随岛浮现） */
  get foamRadius(): number {
    if (this.lastMoodK > 0.65) return 0;
    const s = 0.9 + 0.1 * (1 - this.lastMoodK);
    return this.radius * 1.06 * s;
  }

  /** k: 1=完全迷雾态（灰、下沉、缩小），0=正常；nightK: 0=白天 1=紫夜 */
  private applyMood(k: number, nightK: number): void {
    this.lastMoodK = k;
    _gray.lerpColors(GRAY, GRAY_NIGHT, nightK);
    for (const t of this.mats) {
      _themed.lerpColors(t.base, t.nightBase, nightK);
      t.mat.color.lerpColors(_themed, _gray, k * 0.88);
      // 夜里发光体更亮（火山口/雪峰微光是夜景的点睛）
      t.mat.emissiveIntensity = t.baseEmissive * (1 - k) * (1 + 0.7 * nightK);
    }
    // 竖直下沉/升起并入 update() 里唯一那次 position.y 计算（此处若写会被其覆盖）
    const s = 0.9 + 0.1 * (1 - k);
    this.group.scale.setScalar(s);
  }

  /** 生长动画：从迷雾中升起（营期王牌时刻） */
  grow(sim: number): void {
    if (this.growStart < 0) this.growStart = sim;
  }

  playUnlock(sim: number): void {
    this.unlockStart = sim;
  }

  get growing(): boolean {
    return this.growStart >= 0;
  }

  /** 聚焦时把岛托起来、浮现作品宝箱 */
  setFocused(v: boolean): void {
    this.lifted = v;
  }

  /** 靠近时高亮这座岛（提示可登岛） */
  setHighlight(v: boolean): void {
    this.highlighted = v;
  }

  update(
    sim: number,
    dt: number,
    status: IslandStatus,
    suppressLabel = false,
    nightK = 0,
  ): void {
    // ---- 生长动画时间线 ----
    let moodK = status === "foggy" ? 1 : 0;
    let fogOpacity = status === "foggy" ? 0.55 : 0;
    if (this.growStart >= 0) {
      const k = Math.min((sim - this.growStart) / 3.5, 1);
      moodK = 1 - easeOutCubic(k);
      fogOpacity = 0.55 * (1 - easeOutCubic(Math.min(k * 1.4, 1)));
      if (k >= 1) {
        this.growStart = -1;
        this.unlockStart = sim; // 借解锁闪光作收尾
        this.onGrown?.();
      }
    }
    // 已点亮的岛在夜里保留一半本色（读作"被自己的灯照暖"，而非纯剪影）
    const effNight = status === "visited" ? nightK * 0.5 : nightK;
    this.applyMood(moodK, effNight);

    // 聚焦升起动画 + 浮出海面的轻晃
    this.liftK +=
      ((this.lifted ? 1 : 0) - this.liftK) * (1 - Math.exp(-3.2 * dt));
    const LIFT = 10;
    if (this.growStart < 0 && status !== "foggy") {
      const t = sim * 0.6 + this.beaconPhase;
      const bob = Math.sin(t) * 0.35 + Math.sin(t * 0.53 + 1.7) * 0.14;
      this.group.position.y = bob + this.liftK * LIFT - 3.2 * moodK;
      this.group.rotation.z =
        Math.sin(t * 0.7 + 0.6) * 0.012 * (1 - this.liftK);
      this.group.rotation.x = Math.cos(t * 0.62) * 0.012 * (1 - this.liftK);
    } else {
      // 迷雾岛下沉、生长时从水下缓缓升起（moodK 1→0）
      this.group.position.y = this.liftK * LIFT - 3.2 * moodK;
    }
    // 作品宝箱：升起时由小放大浮现、上下浮动、缓缓自转
    updateChestDisplay(this.chestGroup, this.liftK, sim);

    // 靠近高亮光环：淡入淡出 + 呼吸脉动（升起聚焦时不显示）
    this.highlightK = updateHighlight(
      this.highlightRing,
      this.highlighted,
      this.liftK,
      this.highlightK,
      sim,
      dt,
    );

    // 地标动态（风车转/灯塔扫光/篝火明灭/旗帜飘）由选中的注册表条目自己更新
    this.propUpdate?.(sim, nightK);
    // 冒烟：从火山口/篝火升起，上升扩散淡出（对象池复用）
    updateSmoke(this.group, this.smoke, this.smokeSrc, sim, dt, glowTex());

    // ---- 解锁灯笼 ----
    this.lanternOn = updateLantern(
      this.lanternHead,
      this.lanternGlow,
      this.lanternOn,
      status,
      sim,
      dt,
      nightK,
    );

    // ---- 雾团漂移 ----
    updateFogSprites(this.fogSprites, sim, dt, fogOpacity);

    // ---- 信标 ----
    this.unlockStart = updateBeacon(
      this.beacon,
      status,
      sim,
      dt,
      this.beaconPhase,
      this.growStart,
      this.unlockStart,
    );

    // ---- 岛名标签 ----
    this.labelShown = updateLabel(
      this.label,
      this.labelW,
      this.labelShown,
      status,
      suppressLabel,
      this.unlockStart,
      sim,
      dt,
      easeOutBack,
    );
  }
}
