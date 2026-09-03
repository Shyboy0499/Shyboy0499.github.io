import * as THREE from "three";

// 天空：屏幕空间三段竖直渐变（顶青蓝 → 中雾白 → 地平线蜜桃）。
// 为什么不是渐变穹顶：正交相机下所有视线平行，穹顶会渲染成一整片纯色，
// 渐变全丢——必须改成贴屏幕的渐变（云上小岛同理）。
// 自定义 vertex 直接吐 NDC 铺满全屏，忽略相机变换；末尾补管线（与 ocean 同源）。

export function createSky(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color("#5aa6e6") }, // 顶：青蓝
      uMid: { value: new THREE.Color("#eaf3f4") }, // 中：雾白
      uHorizon: { value: new THREE.Color("#ffd7b0") }, // 地平线：蜜桃
      uAurora: { value: 0 }, // 深夜极光强度
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 1.0, 1.0); // 铺满 NDC，压到远平面
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform float uAurora;
      uniform float uTime;
      void main() {
        float y = vUv.y;
        // 蜜桃(底) → 雾白(中) → 青蓝(顶)，中段留足奶油雾白带
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.52, y));
        col = mix(col, uTop, smoothstep(0.46, 1.0, y));
        // 深夜极光：天顶两道绿紫波帘，缓缓起伏、明灭
        if (uAurora > 0.001) {
          float w = sin(vUv.x * 8.0 + uTime * 0.6) * 0.04 + sin(vUv.x * 3.0 - uTime * 0.3) * 0.06;
          float c1 = smoothstep(0.10, 0.0, abs(y - (0.74 + w)));
          float c2 = smoothstep(0.08, 0.0, abs(y - (0.60 + w * 0.7 + 0.03 * sin(uTime * 0.4))));
          vec3 aur = vec3(0.3, 1.0, 0.6) * c1 + vec3(0.55, 0.4, 1.0) * c2;
          float flick = 0.7 + 0.3 * sin(uTime * 1.3 + vUv.x * 10.0);
          col += aur * smoothstep(0.45, 1.0, y) * uAurora * flick * 0.85;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -999;
  return mesh;
}
