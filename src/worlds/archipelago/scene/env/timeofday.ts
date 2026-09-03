import * as THREE from "three";
import {
  DAY,
  DUSK,
  NIGHT,
  DAWN,
  blendThemes,
  cloneTheme,
  type ThemeVals,
} from "./themes";
import { DAY_CYCLE_SEC } from "../core/config";
import { smoothstep, easeInOutQuad } from "../core/ease";
import { store } from "../../store";

// 全天时段系统：白天→黄昏→夜晚→黎明→…，随真实时间自然流转；点击切换走 ~1.7s 缓动过渡。
// night = 夜色程度（喂给岛屿灯火/泡沫收敛/云自发光/Bloom）；tint/tintAmt = 分时段专属调色。
// 原先这套状态散在 world.ts（~9 个字段 + sampleTOD + skip + loop 推进 + URL 钩子），整体内聚到这里。
const TOD_KEYS: {
  t: number;
  th: ThemeVals;
  night: number;
  label: string;
  tint: [number, number, number];
  tintAmt: number;
}[] = [
  { t: 0.0, th: DAY, night: 0.0, label: "白天", tint: [1, 1, 1], tintAmt: 0 },
  {
    t: 0.34,
    th: DUSK,
    night: 0.4,
    label: "黄昏",
    tint: [1.14, 1.0, 0.8],
    tintAmt: 0.55,
  },
  {
    t: 0.5,
    th: NIGHT,
    night: 1.0,
    label: "夜晚",
    tint: [0.82, 0.9, 1.2],
    tintAmt: 0.5,
  },
  {
    t: 0.84,
    th: DAWN,
    night: 0.22,
    label: "黎明",
    tint: [1.1, 1.0, 0.92],
    tintAmt: 0.42,
  },
  { t: 1.0, th: DAY, night: 0.0, label: "白天", tint: [1, 1, 1], tintAmt: 0 },
];

export class TimeOfDay {
  private tod = 0; // 0..1 全天相位
  private paused = false;
  private cycleScale = 1; // ?daycycle 缩放（>1 更慢）
  private from = 0;
  private to = 0;
  private anim = -1; // -1=非过渡；否则 0..1 进度
  private readonly animDur = 1.7;

  // 每帧采样输出，供 World 读取：
  readonly theme: ThemeVals = cloneTheme(DAY); // 当前混合出的主题色板
  nightK = 0;
  readonly tint = new THREE.Color(1, 1, 1);
  tintAmt = 0;

  constructor(q: URLSearchParams) {
    // 时段钩子：?tod=0..1 定相位（day≈0 / dusk≈0.34 / night≈0.5 / dawn≈0.84）；?daycycle=N 缩放周期，0=冻结
    const todQ = q.get("tod");
    if (todQ !== null) this.tod = (((parseFloat(todQ) || 0) % 1) + 1) % 1;
    else if (q.get("theme") === "night") this.tod = 0.5; // 兼容旧钩子
    const cycleQ = q.get("daycycle");
    if (cycleQ !== null) {
      const v = parseFloat(cycleQ);
      if (v === 0) this.paused = true;
      else if (Number.isFinite(v) && v > 0) this.cycleScale = v;
    }
    this.sample();
  }

  /** Hud 点击：平滑过渡到下一个时段（白天→黄昏→夜晚→黎明），~1.7s 缓动而非硬跳。 */
  skip(): void {
    const marks = [0.0, 0.34, 0.5, 0.84];
    const cur = ((this.tod % 1) + 1) % 1;
    const next = marks.find((m) => m > cur + 0.02);
    this.from = cur;
    this.to = next ?? 1.0; // 从黎明回到白天：过渡到 1.0（=0）
    this.anim = 0;
  }

  /** 每帧推进（缓动过渡优先，否则随真实时间流转）并采样出主题/夜色/调色。 */
  update(dt: number): void {
    if (this.anim >= 0) {
      this.anim += dt / this.animDur;
      const t = Math.min(this.anim, 1);
      this.tod = (this.from + (this.to - this.from) * easeInOutQuad(t)) % 1;
      if (this.anim >= 1) {
        this.tod = this.to % 1;
        this.anim = -1;
      }
    } else if (!this.paused) {
      this.tod = (this.tod + dt / (DAY_CYCLE_SEC * this.cycleScale)) % 1;
    }
    this.sample();
  }

  private sample(): void {
    const tod = ((this.tod % 1) + 1) % 1;
    let i = 0;
    while (i < TOD_KEYS.length - 2 && tod >= TOD_KEYS[i + 1].t) i++;
    const a = TOD_KEYS[i];
    const b = TOD_KEYS[i + 1];
    const span = Math.max(b.t - a.t, 1e-4);
    const k = smoothstep(0, 1, (tod - a.t) / span);
    blendThemes(a.th, b.th, k, this.theme);
    this.nightK = a.night + (b.night - a.night) * k;
    this.tint.setRGB(
      a.tint[0] + (b.tint[0] - a.tint[0]) * k,
      a.tint[1] + (b.tint[1] - a.tint[1]) * k,
      a.tint[2] + (b.tint[2] - a.tint[2]) * k,
    );
    this.tintAmt = a.tintAmt + (b.tintAmt - a.tintAmt) * k;
    // 标签按"离哪个关键帧近"取，在段中点切换，与画面同步
    const lbl = (k < 0.5 ? a : b).label;
    if (store.todLabel !== lbl) store.todLabel = lbl;
  }
}
