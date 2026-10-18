// 任务房间的地图：网格数据、碰撞判断与一次性预渲染的背景（地板、墙面、窗户、地毯与阴影）。
// 不负责角色移动、物件状态与动态绘制（见 quest.ts、quest-sprites.ts）。
// 物件字符约定：S 告示牌，C 项目水晶（按从上到下、从左到右对应 projects），M 信箱，P 照片墙，D 大门，T 盆栽、B 书架、L 台灯（只装饰、可碰撞），O 隐藏的金色宝珠（全部任务完成后出现）。

export const TILE = 16;
export const COLS = 24;
export const ROWS = 14;

// 房间内坐标（不含外墙）。修改布局时只改这张表，外墙与索引由下方代码生成。
const PLACEMENTS: [string, number, number][] = [
  ["S", 2, 1],
  ["C", 4, 3],
  ["C", 10, 3],
  ["C", 16, 3],
  ["M", 1, 6],
  ["P", 12, 6],
  ["T", 3, 8],
  ["T", 18, 8],
  ["T", 5, 10],
  ["T", 16, 10],
  ["D", 10, 11],
  ["B", 18, 0],
  ["B", 19, 0],
  ["L", 20, 6],
  ["O", 21, 11],
];

// 地毯与猫咪都只在背景或绘制层出现，不参与碰撞；坐标为完整地图的瓦片坐标（含外墙）。
export const RUG = { x: 6, y: 7, w: 5, h: 3 };
export const CAT = { tx: 8, ty: 8 };
// 窗户占据顶部外墙的两个瓦片，窗下投下淡淡的光束；挂钟在两扇窗之间。
export const WINDOWS: [number, number][] = [
  [4, 0],
  [14, 0],
];
export const CLOCK = { tx: 10, ty: 0 };

export type MapObject = {
  char: string;
  // 可互动物件的键；装饰物没有键，只参与碰撞与绘制。
  key: string | null;
  tx: number;
  ty: number;
};

const grid: string[][] = [];
for (let y = 0; y < ROWS; y++) {
  grid.push(
    Array.from({ length: COLS }, (_, x) => (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? "#" : ".")),
  );
}

export const objects: MapObject[] = [];
let crystalIndex = 0;
// 按阅读顺序排列，保证水晶序号与 crystal:<n> 的键一一对应。
const ordered = [...PLACEMENTS].sort(([, ax, ay], [, bx, by]) => ay - by || ax - bx);
for (const [char, ix, iy] of ordered) {
  const tx = ix + 1;
  const ty = iy + 1;
  grid[ty][tx] = char;
  let key: string | null = null;
  if (char === "S") key = "sign";
  if (char === "C") key = `crystal:${crystalIndex++}`;
  if (char === "M") key = "mailbox";
  if (char === "P") key = "portrait";
  if (char === "D") key = "door";
  if (char === "O") key = "secret";
  objects.push({ char, key, tx, ty });
}

// 任何非空地块都视为实体：墙、物件与装饰都挡住角色。越界也视为实体。
export function isSolid(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return grid[ty][tx] !== ".";
}

// 地毯：粉橙色条纹，边缘一圈墨线，角落带流苏。
function drawRug(ctx: CanvasRenderingContext2D): void {
  const x0 = RUG.x * TILE;
  const y0 = RUG.y * TILE;
  const w = RUG.w * TILE;
  const h = RUG.h * TILE;
  ctx.fillStyle = "#1d1433";
  ctx.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      ctx.fillStyle = (px + py) % 10 < 5 ? "#ff9f8a" : "#ffc2b0";
      ctx.fillRect(x0 + px, y0 + py, 1, 1);
    }
  }
  // 两端的流苏。
  ctx.fillStyle = "#fff6e5";
  for (let py = 0; py < h; py += 3) {
    ctx.fillRect(x0 - 3, y0 + py, 1, 1);
    ctx.fillRect(x0 + w + 2, y0 + py, 1, 1);
  }
}

// 窗户：墨线窗框加天蓝色玻璃，玻璃上一朵白云，中间一道十字窗棂。
function drawWindow(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE;
  const y = ty * TILE;
  ctx.fillStyle = "#1d1433";
  ctx.fillRect(x + 1, y + 1, TILE * 2 - 2, TILE - 2);
  ctx.fillStyle = "#9be2ff";
  ctx.fillRect(x + 2, y + 2, TILE * 2 - 4, TILE - 4);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 5, y + 6, 8, 3);
  ctx.fillRect(x + 7, y + 4, 4, 3);
  ctx.fillStyle = "#1d1433";
  ctx.fillRect(x + TILE - 1, y + 2, 2, TILE - 4);
}

// 墙上的挂钟：白色表盘、墨线外圈与两根指针。
function drawClock(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = tx * TILE + 8;
  const y = ty * TILE + 8;
  ctx.fillStyle = "#1d1433";
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6e5";
  ctx.beginPath();
  ctx.arc(x, y, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1d1433";
  ctx.fillRect(x, y - 3, 1, 3);
  ctx.fillRect(x, y, 2, 1);
}

// 地板与墙面只画一次，之后每帧直接贴图，避免重复绘制上百个方块。
export function buildStaticLayer(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext("2d")!;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      if (grid[ty][tx] === "#") {
        // 墙面：天蓝色的墙加一圈奶白色的墙顶，底部一道墨线，卡通式的厚度感。
        ctx.fillStyle = "#1d1433";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#7ec8ff";
        ctx.fillRect(x, y + 3, TILE, TILE - 4);
        ctx.fillStyle = "#e9f8ff";
        ctx.fillRect(x, y, TILE, 3);
        ctx.fillStyle = "#5aa9e8";
        ctx.fillRect(x + (ty % 2 ? 4 : 10), y + 6, 1, 6);
      } else {
        // 地板：暖色木板，相邻两行错开接缝，画面更像手绘的房间。
        ctx.fillStyle = (tx + ty) % 2 === 0 ? "#f7d59a" : "#f2c78a";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#e0a85e";
        ctx.fillRect(x, y + 7, TILE, 1);
        ctx.fillRect(x + (ty % 2 ? 6 : 12), y, 1, 7);
        ctx.fillRect(x + (ty % 2 ? 12 : 4), y + 8, 1, 8);
      }
    }
  }

  // 窗下的光束：从窗台斜着照到地板上，颜色很淡，只是氛围。
  for (const [wx] of WINDOWS) {
    const left = wx * TILE;
    ctx.fillStyle = "rgba(255, 250, 210, 0.13)";
    ctx.beginPath();
    ctx.moveTo(left, TILE);
    ctx.lineTo(left + TILE * 2, TILE);
    ctx.lineTo(left + TILE * 2 + 26, TILE * 7);
    ctx.lineTo(left - 14, TILE * 7);
    ctx.closePath();
    ctx.fill();
  }

  drawRug(ctx);
  for (const [wx, wy] of WINDOWS) drawWindow(ctx, wx, wy);
  drawClock(ctx, CLOCK.tx, CLOCK.ty);

  // 每个实体物件的脚下都有一小块阴影，让它们像是放在地板上而不是贴在上面。
  ctx.fillStyle = "rgba(29, 20, 51, 0.22)";
  for (const o of objects) {
    if (o.char === "S") continue;
    ctx.fillRect(o.tx * TILE + 3, o.ty * TILE + 14, 10, 2);
  }
  return canvas;
}
