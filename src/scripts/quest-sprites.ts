// 任务房间的卡通素材：角色用字符矩阵，物件用带墨线的几何图形绘制；颜色沿用站点的明亮配色。
// 只负责把素材画到低分辨率缓冲区；位置、朝向与动画节奏由 quest.ts 决定。
import { TILE } from "./quest-map";

// 所有卡通描边统一使用深紫墨色，避免纯黑显得生硬。
export const INK = "#1d1433";

const PALETTE: Record<string, string> = {
  O: INK,
  H: "#7b5cff", // 头发
  S: "#ffd9b3", // 皮肤
  W: "#ffffff", // 眼白
  B: "#ff9ecf", // 腮红
  T: "#5ee6b8", // 上衣
  N: "#3b4cca", // 裤子
  R: "#ff6b6b", // 鞋
};

// 原创角色：16×22 像素，大头大眼，"." 为透明。
const PLAYER_IDLE: string[] = [
  "....OOOOOOOO....",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  ".OHHHHHHHHHHHHO.",
  ".OHHSSSSSSSSHHO.",
  ".OHSSSSSSSSSSHO.",
  ".OSSWWSSSSWWSSO.",
  ".OSSWOSSSSWOSSO.",
  ".OSSSSSSSSSSSSO.",
  ".OSSSSBBSSBBSSO.",
  ".OSSSSSOOSSSSSO.",
  "..OSSSSSSSSSSO..",
  "...OOOOOOOOOO...",
  "..OTTTTTTTTTTO..",
  ".OTTTTTTTTTTTTO.",
  ".OSOTTTTTTTTOSO.",
  ".OSOTTTTTTTTOSO.",
  ".OOOTTTTTTTTOOO.",
  "...OTTTTTTTTO...",
  "...ONNNNNNNNO...",
  "...ONNNONNNNO...",
  "..ORRRO..ORRRO..",
];

// 迈步时只改变最后一行的腿部位置，形成简单的两帧循环。
const PLAYER_STEP: string[] = [...PLAYER_IDLE.slice(0, 21), "...ORRRO.ORRRO.."];

export function playerFrame(walking: boolean, t: number): string[] {
  return walking && Math.floor(t * 8) % 2 === 1 ? PLAYER_STEP : PLAYER_IDLE;
}

// 按字符矩阵逐像素填充；flip 为真时水平镜像，用于角色朝左。
export function drawRows(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, flip: boolean): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const color = PALETTE[row[c]];
      if (!color) continue;
      const px = flip ? x + row.length - 1 - c : x + c;
      ctx.fillStyle = color;
      ctx.fillRect(px, y + r, 1, 1);
    }
  }
}

// 带墨线的色块：先画外侧一圈墨色，再填充内部，形成卡通描边。
function inkBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  // 顶部一道高光，让色块看起来有厚度。
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x, y, w, 1);
}

function inkPath(ctx: CanvasRenderingContext2D, points: [number, number][], fill: string): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

// 水晶：墨线菱形加一颗跳动的光点；点亮后颜色鲜艳并闪一下，未访问时灰色。
export function drawCrystal(ctx: CanvasRenderingContext2D, tx: number, ty: number, accent: string, lit: boolean, t: number): void {
  const cx = tx * TILE + 8;
  const cy = ty * TILE + 7 + Math.sin(t * 2 + tx) * 0.6;
  // 地面的椭圆阴影。
  ctx.fillStyle = "rgba(29,20,51,0.35)";
  ctx.fillRect(tx * TILE + 3, ty * TILE + 13, 10, 2);
  inkPath(
    ctx,
    [
      [cx, cy - 7],
      [cx + 5, cy],
      [cx, cy + 5],
      [cx - 5, cy],
    ],
    lit ? accent : "#c9c3dc",
  );
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.round(cx - 2), Math.round(cy - 4), 2, 2);
  if (lit && Math.floor(t * 3) % 3 === 0) {
    ctx.fillRect(Math.round(cx + 4), Math.round(cy - 6), 1, 1);
  }
}

// 告示牌：木柱加一块奶油色的牌面，牌面上画两道彩色"字条"。
export function drawSign(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  inkBox(ctx, x + 7, y + 10, 2, 6, "#c98b4a");
  inkBox(ctx, x + 2, y + 2, 12, 9, "#fff6e5");
  ctx.fillStyle = "#ff6b6b";
  ctx.fillRect(x + 4, y + 5, 8, 1);
  ctx.fillStyle = "#3b4cca";
  ctx.fillRect(x + 4, y + 8, 5, 1);
}

// 盆栽：胖胖的陶盆，两片圆润的叶子。
export function drawPlant(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  inkPath(ctx, [[x + 3, y + 3], [x + 6, y + 9], [x + 2, y + 8]], "#5ee6b8");
  inkPath(ctx, [[x + 13, y + 3], [x + 10, y + 9], [x + 14, y + 8]], "#5ee6b8");
  inkPath(ctx, [[x + 8, y + 1], [x + 11, y + 9], [x + 5, y + 9]], "#7bf0c7");
  inkBox(ctx, x + 4, y + 10, 8, 5, "#ff9f6b");
}

// 信箱：红色的箱子加一面小旗子。
export function drawMailbox(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  inkBox(ctx, x + 7, y + 10, 2, 5, "#c98b4a");
  inkBox(ctx, x + 2, y + 4, 11, 7, "#ff6b6b");
  ctx.fillStyle = INK;
  ctx.fillRect(x + 4, y + 6, 7, 1);
  inkBox(ctx, x + 13, y + 2, 1, 4, "#ffd23f");
}

// 照片墙：金色画框加一张照片；照片未加载时用紫色占位。
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  photo: HTMLImageElement | null,
): void {
  const x = tx * TILE;
  const y = ty * TILE;
  inkBox(ctx, x + 1, y + 1, 14, 13, "#ffd23f");
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, x + 3, y + 3, 10, 9);
  } else {
    ctx.fillStyle = "#9b7bff";
    ctx.fillRect(x + 3, y + 3, 10, 9);
  }
}

// 大门：黄色的门加一个圆门把手；锁住时挂一把锁，全部完成后门框闪着绿光。
export function drawDoor(ctx: CanvasRenderingContext2D, tx: number, ty: number, unlocked: boolean, t: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  inkBox(ctx, x + 2, y + 1, 12, 15, unlocked ? "#5ee6b8" : "#ffb020");
  ctx.fillStyle = "#fff6e5";
  ctx.fillRect(x + 11, y + 9, 2, 2);
  if (unlocked) {
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 4, y + 3, 2, 2);
    ctx.fillRect(x + 9, y + 11, 2, 2);
    ctx.globalAlpha = 1;
  } else {
    inkBox(ctx, x + 6, y + 7, 4, 4, "#c9c3dc");
  }
}

// 书架：木框加三层搁板，每层排着颜色不同的书脊，最上面放一个小盆栽。
export function drawBookshelf(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  inkBox(ctx, x + 1, y + 1, 14, 14, "#c98b4a");
  const spines = ["#ff6b6b", "#5ee6b8", "#9b7bff", "#ffd23f", "#ff9ecf"];
  for (let shelf = 0; shelf < 2; shelf++) {
    const sy = y + 3 + shelf * 6;
    ctx.fillStyle = INK;
    ctx.fillRect(x + 2, sy + 4, 12, 1);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = spines[(i + shelf * 2) % spines.length];
      ctx.fillRect(x + 3 + i * 2, sy, 2, 4);
    }
  }
  inkBox(ctx, x + 6, y - 1, 4, 2, "#5ee6b8");
}

// 台灯：圆底加细杆，黄色灯罩；灯光在地板上发出柔和的光晕，随时间轻轻闪烁。
export function drawLamp(ctx: CanvasRenderingContext2D, tx: number, ty: number, t: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  const glow = ctx.createRadialGradient(x + 8, y + 9, 0, x + 8, y + 9, 14);
  glow.addColorStop(0, `rgba(255, 210, 63, ${0.25 + 0.05 * Math.sin(t * 3)})`);
  glow.addColorStop(1, "rgba(255, 210, 63, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 6, y - 5, 28, 28);
  inkBox(ctx, x + 5, y + 13, 6, 2, "#5a4a7a");
  ctx.fillStyle = INK;
  ctx.fillRect(x + 7, y + 6, 2, 8);
  inkPath(
    ctx,
    [
      [x + 3, y + 7],
      [x + 13, y + 7],
      [x + 11, y + 2],
      [x + 5, y + 2],
    ],
    "#ffd23f",
  );
}

// 猫咪：趴在地毯上打盹的橘色小猫，尾巴轻轻摆动，耳朵随呼吸起伏。
// 原创形象，只做氛围，不参与交互与碰撞。
const CAT_IDLE: string[] = [
  "..OO....OO..",
  ".OCCO..OCCO.",
  ".OCCCCCCCCO.",
  "OCCCCCCCCCCO",
  "OCEECCCCEECO",
  "OCCCCWWWWCCO",
  "OCCCCCCCCCCO",
  ".OCCCCCCCCO.",
  ".OOOOOOOOOO.",
];
const CAT_PALETTE: Record<string, string> = { O: INK, C: "#ffb36b", E: INK, W: "#fff3e0" };

export function drawCat(ctx: CanvasRenderingContext2D, tx: number, ty: number, t: number): void {
  const x = tx * TILE + 2;
  const y = ty * TILE + 7 + (Math.floor(t * 1.5) % 2 === 0 ? 0 : 1);
  // 尾巴：从身体右侧弯出去，随时间左右摆。
  const sway = Math.sin(t * 2) * 2;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 7);
  ctx.quadraticCurveTo(x + 17, y + 3 + sway, x + 15, y - 2 + sway);
  ctx.stroke();
  ctx.strokeStyle = "#ffb36b";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (let r = 0; r < CAT_IDLE.length; r++) {
    const row = CAT_IDLE[r];
    for (let c = 0; c < row.length; c++) {
      const color = CAT_PALETTE[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c, y + r, 1, 1);
    }
  }
}

// 窗外的云：在玻璃范围内裁剪后横向慢慢飘过，两层速度不同形成一点视差。
export function drawWindowClouds(ctx: CanvasRenderingContext2D, wx: number, wy: number, t: number): void {
  const x0 = wx * TILE + 2;
  const y0 = wy * TILE + 2;
  const w = TILE * 2 - 4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, TILE - 4);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 2; i++) {
    const speed = 5 + i * 4;
    const cx = ((t * speed + i * 30) % (w + 24)) - 12;
    const cy = y0 + 3 + i * 3;
    ctx.fillRect(x0 + cx, cy, 8, 3);
    ctx.fillRect(x0 + cx + 2, cy - 2, 5, 2);
    ctx.fillRect(x0 + cx + 5, cy - 1, 4, 2);
  }
  ctx.restore();
}

// 隐藏的金色宝珠：只在全部任务完成后出现，轻轻脉动。
export function drawSecretOrb(ctx: CanvasRenderingContext2D, tx: number, ty: number, t: number): void {
  const cx = tx * TILE + 8;
  const cy = ty * TILE + 7 + Math.sin(t * 2.5) * 1;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
  glow.addColorStop(0, `rgba(255, 210, 63, ${0.55 + 0.2 * Math.sin(t * 4)})`);
  glow.addColorStop(1, "rgba(255, 210, 63, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 12, cy - 12, 24, 24);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd23f";
  ctx.beginPath();
  ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.round(cx - 2), Math.round(cy - 3), 2, 2);
}
