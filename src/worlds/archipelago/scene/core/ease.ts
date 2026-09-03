// 缓动 / 帧率无关阻尼 / 角度工具 —— 原先散落在 world.ts / island.ts / ship.ts，统一到这里。

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const wrapAngle = (a: number): number =>
  ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

/** 帧率无关阻尼步长：k = 1 - e^(-rate·dt)，用作 lerp 的 t（λ 越大越快）。 */
export const damp = (dt: number, rate: number): number =>
  1 - Math.exp(-rate * dt);
