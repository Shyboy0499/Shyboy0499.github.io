import * as THREE from "three";

// 双主题：紫夜霓虹（默认，参照 bruno-simon.com 现行版——紫夜滤镜+电蓝亮水+暖橙灯）/ 糖果白天。
// 渲染是纯色扁平 + 无后期，"好看"全靠这里的配色，改主题 = 改这份色板。
// 夜版要点：夜不是黑，是紫；海是全场最亮的大面，岛靠剪影+灯光可读。

export interface ThemeVals {
  skyTop: THREE.Color;
  skyMid: THREE.Color;
  skyHorizon: THREE.Color;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  fillColor: THREE.Color;
  fillIntensity: number;
  seaA: THREE.Color; // 远海（深）
  seaB: THREE.Color; // 近海（中）
  seaShallow: THREE.Color; // 岛周浅滩
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  cloudTint: THREE.Color;
  starOpacity: number;
  exposure: number;
}

// 晨光主题（默认）：微缩玩具海的治愈基调 —— 顶青蓝 / 中雾白 / 地平线蜜桃，
// 海色取云上小岛（深 #2f8ba0 / 浅 #7fd4de），暖色晨阳低斜。
export const DAY: ThemeVals = {
  skyTop: new THREE.Color("#5aa6e6"),
  skyMid: new THREE.Color("#eaf3f4"),
  skyHorizon: new THREE.Color("#ffd7b0"),
  sunDir: new THREE.Vector3(0.5, 0.56, -0.5).normalize(), // 晨阳压低一点，暖光斜照
  sunColor: new THREE.Color("#ffe8c4"),
  sunIntensity: 1.75,
  hemiSky: new THREE.Color("#d4ecf6"),
  hemiGround: new THREE.Color("#6f9a82"),
  hemiIntensity: 1.1,
  fillColor: new THREE.Color("#ffdcb0"),
  fillIntensity: 0.45,
  seaA: new THREE.Color("#2f8ba0"), // 远/深（云上小岛深水）
  seaB: new THREE.Color("#57c3cf"), // 近/中
  seaShallow: new THREE.Color("#9fe6dc"), // 岛周薄荷浅滩
  fogColor: new THREE.Color("#f0e2cf"), // 蜜桃奶油雾：远岛融进晨霭
  fogNear: 260,
  fogFar: 1150,
  cloudTint: new THREE.Color("#fff6ec"),
  starOpacity: 0,
  exposure: 1.08,
};

export const NIGHT: ThemeVals = {
  skyTop: new THREE.Color("#241a44"),
  skyMid: new THREE.Color("#5b4a86"),
  skyHorizon: new THREE.Color("#c98a72"), // 暮色余温：地平线一抹暖
  sunDir: new THREE.Vector3(-0.35, 0.3, -0.85).normalize(), // 月亮方向（压低到能入镜）
  sunColor: new THREE.Color("#cabcf2"), // 淡紫月光
  sunIntensity: 1.15,
  hemiSky: new THREE.Color("#6a5ac2"),
  hemiGround: new THREE.Color("#2a1e4a"),
  hemiIntensity: 0.85,
  fillColor: new THREE.Color("#4a3a8a"),
  fillIntensity: 0.45,
  seaA: new THREE.Color("#242a9e"),
  seaB: new THREE.Color("#4a4fe0"),
  seaShallow: new THREE.Color("#7a80f8"), // 夜里浅滩泛着微光的蓝紫

  fogColor: new THREE.Color("#6a4a8a"),
  fogNear: 170,
  fogFar: 820,
  cloudTint: new THREE.Color("#4a3a72"),
  starOpacity: 0.85,
  exposure: 1.05,
};

// 黄昏：暖橙落日 + 靛蓝天顶，海面泛暖。
export const DUSK: ThemeVals = {
  skyTop: new THREE.Color("#3f4a86"),
  skyMid: new THREE.Color("#f0a074"),
  skyHorizon: new THREE.Color("#ff8a52"),
  sunDir: new THREE.Vector3(0.62, 0.16, -0.42).normalize(), // 落日压得很低
  sunColor: new THREE.Color("#ff9a52"),
  sunIntensity: 1.5,
  hemiSky: new THREE.Color("#c093b8"),
  hemiGround: new THREE.Color("#6f5a5e"),
  hemiIntensity: 0.98,
  fillColor: new THREE.Color("#ff9a66"),
  fillIntensity: 0.52,
  seaA: new THREE.Color("#2c6f92"),
  seaB: new THREE.Color("#5aa0bf"),
  seaShallow: new THREE.Color("#a7dcc6"),
  fogColor: new THREE.Color("#ffb083"),
  fogNear: 220,
  fogFar: 1050,
  cloudTint: new THREE.Color("#ffcfa0"),
  starOpacity: 0.16,
  exposure: 1.06,
};

// 黎明：柔和粉金，比白天更暖更淡。
export const DAWN: ThemeVals = {
  skyTop: new THREE.Color("#7c9ad2"),
  skyMid: new THREE.Color("#ffd9d0"),
  skyHorizon: new THREE.Color("#ffd2a2"),
  sunDir: new THREE.Vector3(0.42, 0.34, -0.55).normalize(),
  sunColor: new THREE.Color("#ffe1c2"),
  sunIntensity: 1.5,
  hemiSky: new THREE.Color("#d0d9ee"),
  hemiGround: new THREE.Color("#79997f"),
  hemiIntensity: 1.02,
  fillColor: new THREE.Color("#ffd2be"),
  fillIntensity: 0.46,
  seaA: new THREE.Color("#2f8ba0"),
  seaB: new THREE.Color("#57c3cf"),
  seaShallow: new THREE.Color("#9fe6dc"),
  fogColor: new THREE.Color("#ffdcc6"),
  fogNear: 240,
  fogFar: 1100,
  cloudTint: new THREE.Color("#ffeede"),
  starOpacity: 0.08,
  exposure: 1.06,
};

/** 把 a、b 按 k 混合写进 out（k=0 → a） */
export function blendThemes(
  a: ThemeVals,
  b: ThemeVals,
  k: number,
  out: ThemeVals,
): void {
  out.skyTop.lerpColors(a.skyTop, b.skyTop, k);
  out.skyMid.lerpColors(a.skyMid, b.skyMid, k);
  out.skyHorizon.lerpColors(a.skyHorizon, b.skyHorizon, k);
  out.sunDir.lerpVectors(a.sunDir, b.sunDir, k).normalize();
  out.sunColor.lerpColors(a.sunColor, b.sunColor, k);
  out.sunIntensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * k;
  out.hemiSky.lerpColors(a.hemiSky, b.hemiSky, k);
  out.hemiGround.lerpColors(a.hemiGround, b.hemiGround, k);
  out.hemiIntensity = a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * k;
  out.fillColor.lerpColors(a.fillColor, b.fillColor, k);
  out.fillIntensity = a.fillIntensity + (b.fillIntensity - a.fillIntensity) * k;
  out.seaA.lerpColors(a.seaA, b.seaA, k);
  out.seaB.lerpColors(a.seaB, b.seaB, k);
  out.seaShallow.lerpColors(a.seaShallow, b.seaShallow, k);
  out.fogColor.lerpColors(a.fogColor, b.fogColor, k);
  out.fogNear = a.fogNear + (b.fogNear - a.fogNear) * k;
  out.fogFar = a.fogFar + (b.fogFar - a.fogFar) * k;
  out.cloudTint.lerpColors(a.cloudTint, b.cloudTint, k);
  out.starOpacity = a.starOpacity + (b.starOpacity - a.starOpacity) * k;
  out.exposure = a.exposure + (b.exposure - a.exposure) * k;
}

export function cloneTheme(t: ThemeVals): ThemeVals {
  return {
    skyTop: t.skyTop.clone(),
    skyMid: t.skyMid.clone(),
    skyHorizon: t.skyHorizon.clone(),
    sunDir: t.sunDir.clone(),
    sunColor: t.sunColor.clone(),
    sunIntensity: t.sunIntensity,
    hemiSky: t.hemiSky.clone(),
    hemiGround: t.hemiGround.clone(),
    hemiIntensity: t.hemiIntensity,
    fillColor: t.fillColor.clone(),
    fillIntensity: t.fillIntensity,
    seaA: t.seaA.clone(),
    seaB: t.seaB.clone(),
    seaShallow: t.seaShallow.clone(),
    fogColor: t.fogColor.clone(),
    fogNear: t.fogNear,
    fogFar: t.fogFar,
    cloudTint: t.cloudTint.clone(),
    starOpacity: t.starOpacity,
    exposure: t.exposure,
  };
}
