import * as THREE from "three";

// canvas 生成的贴图小工厂：光晕 / 雾团 / 云 / 涟漪环 / 文字标签，零外部资源。

function makeCanvas(
  size: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!];
}

/** 径向光晕：双层（亮核 + 宽柔晕） */
export function glowTexture(color: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color + "cc");
  g.addColorStop(0.55, color + "44");
  g.addColorStop(1, color + "00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 软雾团：多个错位径向渐变叠出的不规则棉絮 */
export function fogTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  const blobs: [number, number, number, number][] = [
    [128, 128, 110, 0.5],
    [88, 148, 70, 0.4],
    [172, 118, 78, 0.42],
    [120, 88, 62, 0.34],
    [160, 168, 60, 0.3],
  ];
  for (const [x, y, r, a] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 涟漪环 */
export function ringTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  const g = ctx.createRadialGradient(128, 128, 80, 128, 128, 126);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.55, "rgba(255,255,255,0.9)");
  g.addColorStop(0.75, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 岛名标签（宋体 + 深色柔影，防被辉光洗掉） */
export function labelTexture(text: string): {
  tex: THREE.CanvasTexture;
  aspect: number;
} {
  const font = `600 64px "Songti SC", "Noto Serif SC", "STSong", serif`;
  const [c0, measureCtx] = makeCanvas(8);
  measureCtx.font = font;
  const w = Math.ceil(measureCtx.measureText(text).width) + 64;
  void c0;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(10, 20, 40, 0.85)";
  ctx.shadowBlur = 14;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(12, 24, 44, 0.6)";
  ctx.strokeText(text, w / 2, 62);
  ctx.fillStyle = "#fdf3dd";
  ctx.fillText(text, w / 2, 62);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / 128 };
}
