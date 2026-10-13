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
