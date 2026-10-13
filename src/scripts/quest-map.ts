// 任务房间的地图：网格数据、碰撞判断与一次性预渲染的地板和墙面。
// 不负责角色移动、物件状态与绘制细节（见 quest.ts、quest-sprites.ts）。
// 物件字符约定：S 告示牌，C 项目水晶（按从上到下、从左到右对应 projects），M 信箱，P 照片墙，D 大门，T 盆栽（只装饰）。

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
];

export type MapObject = {
  char: string;
  // 可互动物件的键；盆栽没有键，只参与碰撞与绘制。
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
  objects.push({ char, key, tx, ty });
}

// 任何非空地块都视为实体：墙、物件与盆栽都挡住角色。越界也视为实体。
export function isSolid(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return grid[ty][tx] !== ".";
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
        ctx.fillStyle = "#1b1b2e";
        ctx.fillRect(x, y, TILE, TILE);
        // 砖缝与底部阴影，让墙面有体积感。
        ctx.fillStyle = "#26263d";
        ctx.fillRect(x, y + 5, TILE, 1);
        ctx.fillRect(x + (ty % 2 ? 4 : 10), y + 6, 1, 5);
        ctx.fillStyle = "#0c0c16";
        ctx.fillRect(x, y + 15, TILE, 1);
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? "#131320" : "#16162a";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#1d1d33";
        ctx.fillRect(x + 4, y + 4, 1, 1);
        ctx.fillRect(x + 11, y + 10, 1, 1);
      }
    }
  }
  return canvas;
}
