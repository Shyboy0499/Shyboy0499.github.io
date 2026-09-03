// 涌浪参数——GPU（水面顶点着色器）与 CPU（船的浮力）必须逐字同源，
// 否则船会悬空或穿浪。只用两支长波：柔和的远洋涌浪，短碎浪交给片元的波纹线去画。

/** [dirX, dirZ, steepness, wavelength] */
export const WAVES: [number, number, number, number][] = [
  [1.0, 0.3, 0.05, 50],
  [0.7, 1.0, 0.04, 28],
];

const TAU = Math.PI * 2;

/** CPU 端海面高度（船的浮力采样用，与 ocean.ts 顶点着色器公式一致） */
export function waveHeight(x: number, z: number, t: number): number {
  let y = 0;
  for (const [dx, dz, steep, len] of WAVES) {
    const il = 1 / Math.hypot(dx, dz);
    const ux = dx * il;
    const uz = dz * il;
    const k = TAU / len;
    const c = Math.sqrt(9.8 / k);
    const f = k * (ux * x + uz * z) - k * c * t;
    y += (steep / k) * Math.sin(f);
  }
  return y;
}
