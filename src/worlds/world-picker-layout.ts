// 世界入口拼贴的纯布局算法：根据图片数量生成位置，不读取 DOM 或 World 生命周期。
// 视觉遮罩仍由站点样式负责，避免配置层持有具体表现。
export interface LiquidWorldPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function createLiquidWorldPlacement(
  index: number,
  count: number,
  maxColumns: number,
): LiquidWorldPlacement {
  if (count < 1 || index < 0 || index >= count || maxColumns < 1) {
    throw new RangeError("Invalid liquid World placement input.");
  }

  const columns = Math.min(maxColumns, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const itemsInRow = Math.min(columns, count - row * columns);
  const column = index - row * columns;
  const cellWidth = 100 / itemsInRow;
  const cellHeight = 100 / rows;

  return {
    left: (column + 0.5) * cellWidth,
    top: (row + 0.5) * cellHeight,
    width: Math.min(142, cellWidth * 1.48),
    height: Math.min(142, cellHeight * 1.5),
  };
}
