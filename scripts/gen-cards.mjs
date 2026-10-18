// 生成卡片里的原创插画（SVG），输出到 public/art/cards/。
// 书籍封面、猫与植物都是用几何图形程序画出来的，不使用任何现成图片；纯 Node，无依赖，结果固定可复现。
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../public/art/cards/", import.meta.url));
const INK = "#1d1433";

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 书籍封面：一块底色、一种几何图案、底部的书名条。
function cover({ bg, accent, motif, title }) {
  const W = 240;
  const H = 320;
  let shapes = "";
  if (motif === "circles") {
    for (let i = 0; i < 6; i++) {
      shapes += `<circle cx="120" cy="120" r="${20 + i * 14}" fill="none" stroke="${accent}" stroke-width="3" opacity="${(0.9 - i * 0.12).toFixed(2)}"/>`;
    }
  } else if (motif === "grid") {
    for (let x = 0; x < W; x += 30) {
      for (let y = 0; y < 200; y += 30) {
        const on = ((x + y) / 30) % 3 === 0;
        shapes += `<rect x="${x + 4}" y="${y + 4}" width="22" height="22" rx="6" fill="${accent}" opacity="${on ? 0.9 : 0.25}"/>`;
      }
    }
  } else if (motif === "waves") {
    for (let i = 0; i < 5; i++) {
      let d = `M0 ${60 + i * 32}`;
      for (let x = 0; x <= W; x += 20) d += ` L${x} ${(60 + i * 32 + Math.sin(x / 22 + i) * 14).toFixed(1)}`;
      shapes += `<path d="${d}" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>`;
    }
  } else if (motif === "triangles") {
    for (let i = 0; i < 7; i++) {
      shapes += `<polygon points="${20 + i * 32},200 ${36 + i * 32},${60 + (i % 3) * 30} ${52 + i * 32},200" fill="${accent}" opacity="${(0.35 + (i % 3) * 0.2).toFixed(2)}"/>`;
    }
  } else {
    for (let x = 0; x < W; x += 24) {
      for (let y = 0; y < 200; y += 24) {
        shapes += `<circle cx="${x + 12}" cy="${y + 12}" r="${2 + (((x + y) / 24) % 4)}" fill="${accent}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" rx="18" fill="${bg}"/>
${shapes}
<rect x="10" y="10" width="220" height="300" rx="14" fill="none" stroke="${INK}" stroke-width="4"/>
<rect x="22" y="232" width="196" height="50" rx="10" fill="${INK}"/>
<text x="120" y="263" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="700" fill="#fff6e5">${escapeXml(title)}</text>
</svg>
`;
}

// 猫：橘色的圆脸小猫，开心地眯着眼，头顶飘着一颗爱心。
const CAT_HAPPY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<rect width="240" height="240" rx="24" fill="#ffe7c2"/>
<path d="M180 175 Q232 160 214 118" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
<path d="M180 175 Q232 160 214 118" fill="none" stroke="#ffb36b" stroke-width="8" stroke-linecap="round"/>
<ellipse cx="120" cy="172" rx="70" ry="48" fill="#ffb36b" stroke="${INK}" stroke-width="5"/>
<circle cx="120" cy="104" r="52" fill="#ffb36b" stroke="${INK}" stroke-width="5"/>
<path d="M78 74 L86 28 L112 60 Z" fill="#ffb36b" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M162 74 L154 28 L128 60 Z" fill="#ffb36b" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M88 104 q11 -11 22 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
<path d="M130 104 q11 -11 22 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
<circle cx="80" cy="120" r="7" fill="#ff9ecf" opacity="0.7"/>
<circle cx="160" cy="120" r="7" fill="#ff9ecf" opacity="0.7"/>
<ellipse cx="120" cy="118" rx="6" ry="4" fill="#ff9ecf" stroke="${INK}" stroke-width="2"/>
<path d="M112 128 q8 8 16 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
<path d="M190 46 c-6 -10 -20 -2 -10 8 l10 10 l10 -10 c10 -10 -4 -18 -10 -8 z" fill="#ff6b6b" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
</svg>
`;

// 植物：陶盆里的一株开花的绿植，叶子饱满，花心是黄色的。
const PLANT_WATERED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<rect width="240" height="240" rx="24" fill="#d8f7ea"/>
<path d="M120 150 C 92 120, 78 84, 98 48 C 114 78, 118 110, 120 150 Z" fill="#5ee6b8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M120 150 C 148 120, 162 84, 142 48 C 126 78, 122 110, 120 150 Z" fill="#7bf0c7" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M120 150 C 108 118, 110 88, 120 58 C 130 88, 132 118, 120 150 Z" fill="#5ee6b8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
<g transform="translate(120 56)">
<circle cx="0" cy="-22" r="13" fill="#9b7bff" stroke="${INK}" stroke-width="4"/>
<circle cx="20" cy="-6" r="13" fill="#9b7bff" stroke="${INK}" stroke-width="4"/>
<circle cx="12" cy="16" r="13" fill="#9b7bff" stroke="${INK}" stroke-width="4"/>
<circle cx="-12" cy="16" r="13" fill="#9b7bff" stroke="${INK}" stroke-width="4"/>
<circle cx="-20" cy="-6" r="13" fill="#9b7bff" stroke="${INK}" stroke-width="4"/>
<circle cx="0" cy="-2" r="9" fill="#ffd23f" stroke="${INK}" stroke-width="4"/>
</g>
<path d="M70 150 H170 L158 206 H82 Z" fill="#ff9f6b" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
<rect x="66" y="142" width="108" height="14" rx="6" fill="#ff9f6b" stroke="${INK}" stroke-width="5"/>
</svg>
`;

const books = {
  "book-notes-1.svg": { bg: "#9b7bff", accent: "#fff6e5", motif: "circles", title: "The Tests Nobody Wrote" },
  "book-notes-2.svg": { bg: "#5ee6b8", accent: "#1d1433", motif: "grid", title: "Tools That Self-Check" },
  "book-notes-3.svg": { bg: "#ff9ecf", accent: "#ffd23f", motif: "dots", title: "Small Scripts, Big Habits" },
  "book-tools-1.svg": { bg: "#ffd23f", accent: "#3b4cca", motif: "waves", title: "Git, Slowly" },
  "book-tools-2.svg": { bg: "#ff6b6b", accent: "#fff6e5", motif: "triangles", title: "Agents on Desks" },
  "book-tools-3.svg": { bg: "#3b4cca", accent: "#5ee6b8", motif: "grid", title: "The Mac Setup Diary" },
};

mkdirSync(OUT, { recursive: true });
for (const [name, spec] of Object.entries(books)) writeFileSync(OUT + name, cover(spec));
writeFileSync(OUT + "cat-happy.svg", CAT_HAPPY);
writeFileSync(OUT + "plant-watered.svg", PLANT_WATERED);
console.log(`wrote ${Object.keys(books).length + 2} card illustrations to ${OUT}`);
