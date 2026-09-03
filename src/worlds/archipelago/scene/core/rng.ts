// 确定性随机：决定构图的随机必须可复现（同一座岛每次长得一样）

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 按空间位置取稳定伪随机（顶点抖动用：共享顶点位移一致，不撕面） */
export function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(
    (x * 73856093) ^ (y * 19349663) ^ (z * 83492791),
    2654435761,
  );
  return ((h >>> 0) % 100000) / 100000;
}
