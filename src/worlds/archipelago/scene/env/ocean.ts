// 海岛海面负责全局波浪、昼夜色板与下沉入口挖孔。
// 各漩涡自身的几何、动画和交互仍由对应场景资产拥有。
import * as THREE from "three";

// 浅滩/拍岸浪只对离船最近的 N 座“已浮现”的岛在片元里计算距离场：
// 远岛在正交视野外或被 fog 柔化，看不到浅滩。CPU 每帧挑最近 N 座喂进定长 uniform，
// 把片元里逐像素的 O(全岛数) 距离循环压成 O(N)，作品岛增多时不会线性拖慢片元着色。
export const OCEAN_NEAR = 6;

// 冲奖版风格化水面（零后期、单 pass，片元 snoise ≤8 次/像素）：
// 1) 顶点真实涌浪：两支长波（与 waves.ts 常数逐字同源，船的颠簸与海面同步）
// 2) 泻湖分层：远深近亮 + 岛周浅水带（薄荷色浅滩，按"到最近岛岸的距离场"渐变）
// 3) 浅滩焦散光网：两层 |snoise| 相乘的经典配方，只在浅水带内出现
// 4) 拍岸浪：泡沫沿距离场分层向岸推进（时间相位），噪声溶解出孔洞，不是死白实心带
// 5) 太阳碎金高光路：顶点法线 + 片元噪声扰动 → 面向光源的破碎闪光带（夜里=月光路）

const SNOISE = /* glsl */ `
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

// 与 waves.ts 完全同源的两支涌浪（振幅 = steepness/k；高度公式逐字不变，船的颠簸与海面仍同步）。
// 解析法一次算出波高 + 梯度，取代原来 3 次 waveH 采样的有限差分法线（每顶点省 2/3 三角函数）。
const WAVE_GLSL = /* glsl */ `
  // 返回 vec3(波高, ∂h/∂x, ∂h/∂z)
  vec3 waveHN(vec2 p) {
    vec2 d1 = vec2(0.95783, 0.28735); float f1 = 0.125664; float ph1 = dot(d1, p) * f1 - uTime * 1.10979;
    vec2 d2 = vec2(0.57346, 0.81923); float f2 = 0.224399; float ph2 = dot(d2, p) * f2 - uTime * 1.48292;
    float h  = 0.39789 * sin(ph1) + 0.17825 * sin(ph2);
    float dx = 0.39789 * f1 * d1.x * cos(ph1) + 0.17825 * f2 * d2.x * cos(ph2);
    float dz = 0.39789 * f1 * d1.y * cos(ph1) + 0.17825 * f2 * d2.y * cos(ph2);
    return vec3(h, dx, dz);
  }
`;

export function createOcean(): THREE.Mesh {
  // 开阔的海：一大张跟着船走的平面，始终铺满视野（远处靠 fog 柔成海天一色）。
  // 256×256 细分：涌浪波长 50/28，此密度采样绰绰有余，视觉几乎无差，顶点数比 480² 降约 70%
  const geo = new THREE.PlaneGeometry(1600, 1600, 256, 256);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uFoamK: { value: 1 }, // 泡沫/波纹整体强度（夜里收敛）
        uSeaR: { value: 580 }, // 海盘半径（比世界软边界略大，靠边才看见盘缘露天）
        uSeaFeather: { value: 34 }, // 盘缘羽化宽度
        uSeaA: { value: new THREE.Color("#0e7fa2") }, // 远/深
        uSeaB: { value: new THREE.Color("#25c2cc") }, // 近/中
        uSeaShallow: { value: new THREE.Color("#8ff0dc") }, // 岛周浅滩
        uSunDir: { value: new THREE.Vector3(0.45, 0.72, -0.52).normalize() },
        uSunColor: { value: new THREE.Color("#fff2cd") },
        // 巨口使用 [x, z, 挖空半径, 旋转角] 复现资产自身的不规则边缘；其余入口仍使用圆孔。
        uMaelstrom: { value: new THREE.Vector3(0, 0, 0) },
        uPortalWhirlpool: { value: new THREE.Vector4(0, 0, 0, 0) },
        uArcaneWhirlpool: { value: new THREE.Vector3(0, 0, 0) },
        // [x, z, 泡沫半径]；只装离船最近的 OCEAN_NEAR 座（world 每帧筛选写入），半径 0 = 空槽/迷雾岛
        uIslands: {
          value: Array.from(
            { length: OCEAN_NEAR },
            () => new THREE.Vector3(0, 0, 0),
          ),
        },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      ${WAVE_GLSL}
      void main() {
        vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
        vec2 p = wp.xz;
        vec3 hn = waveHN(p); // (波高, ∂h/∂x, ∂h/∂z) 一次算出
        wp.y += hn.x;
        vNormal = normalize(vec3(-hn.y, 1.0, -hn.z));
        vWorldPos = wp;
        vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uFoamK;
      uniform float uSeaR;
      uniform float uSeaFeather;
      uniform vec3 uSeaA;
      uniform vec3 uSeaB;
      uniform vec3 uSeaShallow;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uMaelstrom;
      uniform vec4 uPortalWhirlpool;
      uniform vec3 uArcaneWhirlpool;
      uniform vec3 uIslands[${OCEAN_NEAR}];
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      ${SNOISE}
      void main() {
        vec2 p = vWorldPos.xz;
        if (uMaelstrom.z > .5 && distance(p, uMaelstrom.xy) < uMaelstrom.z) discard;
        if (uPortalWhirlpool.z > .5) {
          vec2 portalDelta = p - uPortalWhirlpool.xy;
          float portalAngle = atan(portalDelta.y, portalDelta.x) + uPortalWhirlpool.w;
          float boundaryWave = sin(portalAngle * 3.0 + uTime * .11) * .052
            + sin(portalAngle * 7.0 - uTime * .075 + .8) * .031
            + sin(portalAngle * 12.0 + 2.1) * .014;
          float asymmetry = sin(portalAngle * 1.8 + uTime * .08) * .095
            + sin(portalAngle * 4.2 - uTime * .06 + 1.3) * .068
            + sin(portalAngle * 9.5 + 2.7) * .038;
          float cutRadius = uPortalWhirlpool.z * (1.0 + boundaryWave + asymmetry);
          if (length(portalDelta) < cutRadius) discard;
        }
        if (uArcaneWhirlpool.z > .5 && distance(p, uArcaneWhirlpool.xy) < uArcaneWhirlpool.z) discard;
        const vec3 FOAM = vec3(0.97, 0.995, 1.0);

        // ---- 基色：远深近亮 + 大尺度斑块 ----
        float distCam = distance(cameraPosition.xz, p);
        float nearK = 1.0 - smoothstep(140.0, 720.0, distCam);
        vec3 col = mix(uSeaA, uSeaB, nearK * 0.8);
        float blotch = snoise(p * 0.011 + vec2(uTime * 0.02, -uTime * 0.016));
        col = mix(col, uSeaB, smoothstep(0.15, 0.95, blotch) * 0.22);

        // ---- 到最近岛岸的距离场 ----
        float minD = 999.0;
        for (int i = 0; i < ${OCEAN_NEAR}; i++) {
          float r = uIslands[i].z;
          if (r < 0.5) continue;
          minD = min(minD, distance(p, uIslands[i].xy) - r);
        }

        // ---- 浅水带：薄荷色浅滩，越近岸越透亮 ----
        float shallowK = 1.0 - smoothstep(0.0, 9.0, minD);
        shallowK = shallowK * shallowK; // 靠岸集中
        col = mix(col, uSeaShallow, shallowK * 0.75);

        // ---- 浅滩焦散光网（只在浅水带内）----
        if (shallowK > 0.02) {
          vec2 pc = p * 0.3;
          float c1 = 1.0 - abs(snoise(pc + vec2(uTime * 0.10, uTime * 0.13)));
          float c2 = 1.0 - abs(snoise(pc * 1.31 + 43.7 - vec2(uTime * 0.11, -uTime * 0.08)));
          float caust = pow(max(c1 * c2, 0.0), 3.0);
          col += vec3(0.55, 0.75, 0.7) * caust * shallowK * 0.5 * uFoamK;
        }

        // ---- 细波纹线（噪声过阈值 + 阈值脉动）----
        float n1 = snoise(p * 0.11 + vec2(uTime * 0.05, uTime * 0.038));
        float th1 = 0.64 + 0.05 * sin(uTime * 1.3);
        float lines = smoothstep(th1, th1 + 0.03, n1) * (1.0 - smoothstep(th1 + 0.05, th1 + 0.08, n1));
        col = mix(col, FOAM, clamp(lines, 0.0, 1.0) * 0.15 * (0.08 + 0.92 * nearK) * uFoamK);

        // ---- 拍岸浪：泡沫分层向岸推进 + 噪声溶解孔洞 ----
        float wob = snoise(p * 0.28 + uTime * 0.2) * 1.2;
        float holes = smoothstep(0.15, 0.75, snoise(p * 0.55 + vec2(uTime * 0.3, -uTime * 0.22)) * 0.5 + 0.5);
        float dAnim = minD + wob + sin(minD * 1.05 - uTime * 1.7) * 0.55; // 浪一层层往岸上推
        float foam = (1.0 - smoothstep(0.4, 3.4, dAnim)) * (0.55 + 0.45 * holes);
        float ring = 1.0 - smoothstep(0.0, 1.3, abs(dAnim - 5.4));       // 外圈碎浪
        foam += ring * holes * 0.5;
        col = mix(col, FOAM, clamp(foam, 0.0, 0.92) * (0.55 + 0.45 * uFoamK));

        // ---- 太阳/月亮碎金高光路 ----
        vec3 N = normalize(vNormal);
        N.xz += vec2(snoise(p * 0.7 + uTime * 0.45)) * 0.14; // 微波扰动打碎高光
        N = normalize(N);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 H = normalize(V + uSunDir);
        float glitterMask = smoothstep(0.3, 0.9, snoise(p * 1.6 - vec2(uTime * 0.7, uTime * 0.5)) * 0.5 + 0.5);
        float spec = pow(max(dot(N, H), 0.0), 260.0) * 1.15;
        col += uSunColor * spec * (0.3 + 0.7 * glitterMask);

        // 海铺满整个画面（不再有圆盘边界/露天）；远处靠 fog 柔化成海天一色
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
