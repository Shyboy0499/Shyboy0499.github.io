// 任务房间的像素素材：角色用字符矩阵，物件用几何图形绘制；颜色沿用站点强调色。
// 只负责把素材画到低分辨率缓冲区；位置、朝向与动画节奏由 quest.ts 决定。
import { TILE } from "./quest-map";

const PALETTE: Record<string, string> = {
  K: "#0b0b12", // 描边与眼睛
  H: "#4a3b8a", // 头发
  S: "#f2c8a0", // 皮肤
  W: "#36d6c3", // 上衣
  P: "#2b2b44", // 裤子
};

// 原创角色：14×16 像素，"." 为透明。
const PLAYER_IDLE: string[] = [
  "....KKKKKK....",
  "...KHHHHHHK...",
  "..KHHHHHHHHK..",
  "..KHHSSSSHHK..",
  "..KSSSSSSSSK..",
  "..KSESSSSESK..",
  "..KSSSSSSSSK..",
  "...KSSSSSSK...",
  "....KWWWWK....",
  "..KWWWWWWWWK..",
  "..KWWWWWWWWK..",
  ".KSWWWWWWWWSK.",
  ".KSWWWWWWWWSK.",
  "..KKWWWWWWKK..",
  "....KPPPPK....",
  "...KPPKKPPK...",
];

// 迈步时只改变最后一行的腿部位置，形成简单的两帧循环。
const PLAYER_STEP: string[] = [...PLAYER_IDLE.slice(0, 15), "..KKK....KKK.."];

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

// 水晶：一块基座加一颗轻微漂浮的菱形；访问过后亮度提高。
export function drawCrystal(ctx: CanvasRenderingContext2D, tx: number, ty: number, accent: string, lit: boolean, t: number): void {
  const x = tx * TILE + 8;
  const y = ty * TILE + 7 + Math.sin(t * 2 + tx) * 0.6;
  ctx.fillStyle = "#1a1a25";
  ctx.fillRect(tx * TILE + 3, ty * TILE + 11, 10, 4);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 11);
  glow.addColorStop(0, accent);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = lit ? 0.55 : 0.2;
  ctx.fillStyle = glow;
  ctx.fillRect(x - 11, y - 11, 22, 22);
  ctx.globalAlpha = 1;
  ctx.fillStyle = lit ? accent : "#4a4a5e";
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x, y + 4);
  ctx.lineTo(x - 4, y);
  ctx.closePath();
  ctx.fill();
}

// 告示牌：一根立柱加一块带文字条纹的木牌。
export function drawSign(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = "#3a3350";
  ctx.fillRect(x + 7, y + 10, 2, 6);
  ctx.fillStyle = "#2a2440";
  ctx.fillRect(x + 2, y + 2, 12, 9);
  ctx.fillStyle = "#36d6c3";
  ctx.fillRect(x + 4, y + 5, 8, 1);
  ctx.fillRect(x + 4, y + 8, 5, 1);
}

// 盆栽：陶盆加两片叶子，只做装饰。
export function drawPlant(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = "#1f7f73";
  ctx.fillRect(x + 4, y + 3, 3, 6);
  ctx.fillRect(x + 9, y + 2, 3, 7);
  ctx.fillStyle = "#36d6c3";
  ctx.fillRect(x + 3, y + 2, 3, 2);
  ctx.fillRect(x + 10, y + 1, 3, 2);
  ctx.fillStyle = "#c9704f";
  ctx.fillRect(x + 4, y + 10, 8, 5);
}

// 信箱：立柱加一只箱子，箱口是一道暗缝。
export function drawMailbox(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = "#3a3350";
  ctx.fillRect(x + 7, y + 10, 2, 5);
  ctx.fillStyle = "#ff7a59";
  ctx.fillRect(x + 3, y + 4, 10, 7);
  ctx.fillStyle = "#0b0b12";
  ctx.fillRect(x + 4, y + 6, 8, 1);
}

// 照片墙：画框加一张照片；照片未加载时用纯色占位。
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  photo: HTMLImageElement | null,
): void {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = "#c9a46a";
  ctx.fillRect(x + 2, y + 2, 12, 11);
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, x + 3, y + 3, 10, 9);
  } else {
    ctx.fillStyle = "#7c5cff";
    ctx.fillRect(x + 3, y + 3, 10, 9);
  }
}

// 大门：锁住时带一把小锁，全部任务完成后门框发出青色光。
export function drawDoor(ctx: CanvasRenderingContext2D, tx: number, ty: number, unlocked: boolean, t: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = "#2b2b44";
  ctx.fillRect(x + 2, y + 1, 12, 15);
  ctx.fillStyle = unlocked ? "#36d6c3" : "#ff7a59";
  ctx.fillRect(x + 1, y + 1, 1, 15);
  ctx.fillRect(x + 14, y + 1, 1, 15);
  if (unlocked) {
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 3);
    ctx.fillStyle = "#36d6c3";
    ctx.fillRect(x + 3, y + 2, 10, 13);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "#ff7a59";
    ctx.fillRect(x + 7, y + 8, 2, 3);
    ctx.fillRect(x + 6, y + 6, 4, 2);
  }
}
