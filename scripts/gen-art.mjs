// 生成站点的原创生成艺术（SVG），输出到 public/art/。
// 纯 Node 脚本、无依赖；每个作品使用固定随机种子，重复运行结果一致，便于审阅差异。
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../public/art/", import.meta.url));
const SIZE = 1000;
// 与站点 :root 的强调色保持一致，让图片与页面风格统一。
const BG = "#07070b";
const VIOLET = "#7c5cff";
const TEAL = "#36d6c3";
const CORAL = "#ff7a59";
const INK = "#ecedf2";

// 可复现的伪随机数（mulberry32）。
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
// 在两种颜色之间线性插值，用于渐变式的色彩过渡。
const mix = (a, b, t) => {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex(from.map((v, i) => v + (to[i] - v) * t));
};

// 统一外壳：深色底 + 可选的 defs（渐变等）。
function frame(body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
<defs>${defs}</defs>
<rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
${body}
</svg>
`;
}

// 1. 流场：沿角度场逐段前进的细线，形成类似气流的纹理。
function flowField() {
  const r = rng(7);
  const angle = (x, y) => Math.sin(x * 0.012 + Math.cos(y * 0.009) * 2) + Math.cos(y * 0.011 - x * 0.004);
  let body = "";
  const COUNT = 260;
  for (let i = 0; i < COUNT; i++) {
    let x = r() * SIZE;
    let y = r() * SIZE;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let s = 0; s < 60; s++) {
      const a = angle(x, y) * Math.PI;
      x += Math.cos(a) * 4;
      y += Math.sin(a) * 4;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    const color = mix(VIOLET, TEAL, i / COUNT);
    const opacity = (0.15 + r() * 0.45).toFixed(2);
    const width = (0.6 + r() * 1.2).toFixed(2);
    body += `<path d="${d}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;
  }
  return frame(body);
}

// 2. 轨道：同心圆上的行星点，中心一团珊瑚色光晕。
function orbits() {
  const r = rng(21);
  const c = SIZE / 2;
  const defs = `<radialGradient id="glow"><stop offset="0" stop-color="${CORAL}" stop-opacity="0.9"/><stop offset="1" stop-color="${CORAL}" stop-opacity="0"/></radialGradient>`;
  let body = `<circle cx="${c}" cy="${c}" r="150" fill="url(#glow)"/>`;
  const palette = [VIOLET, TEAL, CORAL];
  for (let i = 1; i <= 14; i++) {
    const R = i * 34;
    body += `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${INK}" stroke-opacity="0.08"/>`;
    const dots = 1 + Math.floor(r() * 3);
    for (let k = 0; k < dots; k++) {
      const a = r() * Math.PI * 2;
      const color = palette[Math.floor(r() * palette.length)];
      body += `<circle cx="${(c + Math.cos(a) * R).toFixed(1)}" cy="${(c + Math.sin(a) * R).toFixed(1)}" r="${(2 + r() * 5).toFixed(1)}" fill="${color}"/>`;
    }
  }
  return frame(body, defs);
}

// 3. Truchet 瓷砖：每格随机旋转两段四分之一圆弧，拼出连续的曲线图案。
function truchet() {
  const r = rng(3);
  const N = 12;
  const t = SIZE / N;
  const h = t / 2;
  let body = "";
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = i * t;
      const y = j * t;
      const color = r() < 0.5 ? VIOLET : TEAL;
      const opacity = (0.3 + r() * 0.6).toFixed(2);
      const flip = r() < 0.5;
      const arcs = flip
        ? [`M${x} ${y + h} A${h} ${h} 0 0 1 ${x + h} ${y}`, `M${x + h} ${y + t} A${h} ${h} 0 0 1 ${x + t} ${y + h}`]
        : [`M${x + h} ${y} A${h} ${h} 0 0 0 ${x + t} ${y + h}`, `M${x} ${y + h} A${h} ${h} 0 0 0 ${x + h} ${y + t}`];
      for (const d of arcs) {
        body += `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="5"/>`;
      }
    }
  }
  return frame(body);
}

// 4. 碎片网格：抖动的三角网格，颜色沿对角线从紫过渡到青再到珊瑚。
function shards() {
  const r = rng(11);
  const N = 14;
  const t = SIZE / N;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    pts.push([]);
    for (let j = 0; j <= N; j++) {
      // 边界点不抖动，保证网格覆盖整张画面。
      const edge = i === 0 || j === 0 || i === N || j === N;
      const jx = edge ? 0 : (r() - 0.5) * t * 0.7;
      const jy = edge ? 0 : (r() - 0.5) * t * 0.7;
      pts[i].push([i * t + jx, j * t + jy]);
    }
  }
  let body = "";
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const a = pts[i][j];
      const b = pts[i + 1][j];
      const c = pts[i + 1][j + 1];
      const d = pts[i][j + 1];
      const tri = (p, q, s) => {
        const u = (p[0] + q[0] + s[0]) / 3 / SIZE;
        const v = (p[1] + q[1] + s[1]) / 3 / SIZE;
        const color = u + v < 1 ? mix(VIOLET, TEAL, (u + v) / 1) : mix(TEAL, CORAL, (u + v - 1) / 1);
        const opacity = (0.2 + r() * 0.6).toFixed(2);
        const path = `M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${q[0].toFixed(1)} ${q[1].toFixed(1)} L${s[0].toFixed(1)} ${s[1].toFixed(1)} Z`;
        return `<path d="${path}" fill="${color}" fill-opacity="${opacity}" stroke="${BG}" stroke-width="1.5"/>`;
      };
      body += tri(a, b, c) + tri(a, c, d);
    }
  }
  return frame(body);
}

// 5. 光环：一组逐渐变淡的同心环，中心一颗发光的内核。
function halo() {
  const defs = `<radialGradient id="core"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="0.35" stop-color="${TEAL}" stop-opacity="0.6"/><stop offset="1" stop-color="${TEAL}" stop-opacity="0"/></radialGradient>`;
  const c = SIZE / 2;
  let body = `<circle cx="${c}" cy="${c}" r="120" fill="url(#core)"/>`;
  const palette = [VIOLET, TEAL, CORAL];
  for (let i = 0; i < 30; i++) {
    const R = 40 + i * 16;
    const color = palette[i % 3];
    const opacity = (0.75 - i / 45).toFixed(2);
    const width = i % 4 === 0 ? 2.5 : 1;
    body += `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
  }
  return frame(body, defs);
}

// 6. 地层：起伏的正弦层层叠加，从远处的紫色过渡到近处的珊瑚色。
function strata() {
  const r = rng(5);
  const LAYERS = 9;
  let body = "";
  for (let l = 0; l < LAYERS; l++) {
    const base = 250 + l * 75;
    const amp = 30 + r() * 40;
    const f = 0.004 + r() * 0.004;
    const phase = r() * Math.PI * 2;
    let d = `M0 ${SIZE} L0 ${base}`;
    for (let x = 0; x <= SIZE; x += 10) {
      const y = base + Math.sin(x * f + phase) * amp + Math.sin(x * f * 2.3 + phase * 1.7) * amp * 0.4;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    d += ` L${SIZE} ${SIZE} Z`;
    const color = mix(VIOLET, CORAL, l / (LAYERS - 1));
    const opacity = (0.35 + (l / LAYERS) * 0.5).toFixed(2);
    body += `<path d="${d}" fill="${color}" fill-opacity="${opacity}"/>`;
  }
  return frame(body);
}

const works = {
  "flow.svg": flowField(),
  "orbits.svg": orbits(),
  "truchet.svg": truchet(),
  "shards.svg": shards(),
  "halo.svg": halo(),
  "strata.svg": strata(),
};

mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(works)) {
  writeFileSync(OUT + name, content);
}
console.log(`wrote ${Object.keys(works).length} artworks to ${OUT}`);
