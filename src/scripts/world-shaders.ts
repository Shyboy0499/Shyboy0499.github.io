// 3D 世界的自定义材质：地台网格与涟漪、夜空极光。
// 只负责着色器与 uniform 的初始值；每帧更新的 uniform 由 playground.ts 持有。
import * as THREE from "three";

// 地台网格用屏幕空间导数抗锯齿，远处自然变淡而不是闪烁。
// 涟漪从角色脚下向外扩散，让移动本身成为视觉反馈。
export function createFloorMaterial(arenaRadius: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uPlayer: { value: new THREE.Vector2() },
      uArena: { value: arenaRadius },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uPlayer;
      uniform float uArena;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz;
        float r = length(p);

        vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
        float grid = 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);

        float d = distance(p, uPlayer);
        float ringR = mod(uTime * 2.8, 9.0);
        float ring = exp(-abs(d - ringR) * 3.5) * (1.0 - ringR / 9.0);
        float halo = exp(-d * 1.1) * 0.45;
        float glow = ring * 1.3 + halo;

        // 输出会经过 OutputPass 的 sRGB 编码，颜色值需取得比直觉更低，否则整体发灰。
        vec3 base = vec3(0.018, 0.018, 0.03);
        vec3 lineCol = mix(vec3(0.49, 0.36, 1.0), vec3(0.21, 0.84, 0.76), smoothstep(1.0, 9.0, d));
        vec3 col = base + grid * 0.06 * lineCol + glow * lineCol;

        // 边缘渐隐，让圆形地台融进夜空，而不是一块硬边的圆盘。
        float edge = 1.0 - smoothstep(uArena - 2.5, uArena, r);
        gl_FragColor = vec4(col, edge);
      }
    `,
  });
}

// 侧壁与底面用更暗的纯色，与发光的顶面形成层次。
export function createRimMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.95 });
}

// 夜空：从地平线的紫色渐变到天顶的深蓝，上方叠一条缓慢起伏的极光带。
export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 zenith = vec3(0.004, 0.004, 0.016);
        vec3 horizon = vec3(0.03, 0.014, 0.06);
        vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.75, h));

        float bandY = 0.24 + 0.05 * sin(vDir.x * 3.0 + uTime * 0.25);
        float band = exp(-pow((vDir.y - bandY) * 9.0, 2.0));
        float shimmer = 0.6 + 0.4 * sin(vDir.z * 5.0 - uTime * 0.5);
        col += band * shimmer * vec3(0.012, 0.07, 0.06);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
