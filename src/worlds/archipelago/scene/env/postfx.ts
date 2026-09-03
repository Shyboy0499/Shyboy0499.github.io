// Archipelago 后期管线使用 Runtime 共享 renderer，并拥有自己创建的全部 pass 与 render target。
// World 销毁时必须逐个释放 pass；EffectComposer.dispose() 只回收自身双缓冲。
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// 后期管线：RenderPass → Bloom → 移轴 H/V → OutputPass(ACES+sRGB) → 调色(极光/胶片颗粒/分时段调色)。
// 原先散在 world.ts（两个内联 shader + 构造 + resize + 每帧 uniform 推送），整体内聚到这里。

// 移轴模糊：双 pass 可变半径高斯，模糊量由屏幕 Y 距对焦带的距离驱动。（源自云上小岛）
const TiltShiftShader = (dirX: number, dirY: number) => ({
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDirection: { value: new THREE.Vector2(dirX, dirY) },
    uFocusY: { value: 0.5 }, // 对焦带中心：船落在屏幕中偏下
    uBand: { value: 0.16 }, // 全清晰半宽
    uFeather: { value: 0.34 }, // 清晰→最糊过渡
    uStrength: { value: 3.0 }, // 每 tap 步长(px)
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution, uDirection;
    uniform float uFocusY, uBand, uFeather, uStrength;
    varying vec2 vUv;
    void main(){
      float coc = smoothstep(uBand, uBand+uFeather, abs(vUv.y-uFocusY));
      vec2 stp = uDirection / uResolution * (coc * uStrength);
      vec4 c = texture2D(tDiffuse, vUv) * 0.227027;
      c += (texture2D(tDiffuse, vUv+stp*1.0)+texture2D(tDiffuse, vUv-stp*1.0)) * 0.1945946;
      c += (texture2D(tDiffuse, vUv+stp*2.0)+texture2D(tDiffuse, vUv-stp*2.0)) * 0.1216216;
      c += (texture2D(tDiffuse, vUv+stp*3.0)+texture2D(tDiffuse, vUv-stp*3.0)) * 0.054054;
      c += (texture2D(tDiffuse, vUv+stp*4.0)+texture2D(tDiffuse, vUv-stp*4.0)) * 0.016216;
      gl_FragColor = c;
    }`,
});

// 调色 pass（排在 OutputPass 之后，sRGB 域）：+12% 饱和 + 柔和暗角 + 登岛聚焦压暗 + 深夜极光 + 分时段调色 + 胶片颗粒。
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uFocus: { value: 0 },
    uTime: { value: 0 },
    uAurora: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uTintAmt: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFocus; uniform float uTime; uniform float uAurora;
    uniform vec3 uTint; uniform float uTintAmt; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722));
      c.rgb = mix(vec3(l), c.rgb, 1.12);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= mix(1.0, 0.82, smoothstep(0.44, 0.92, d));
      // 登岛聚焦：外围压暗 + 去饱和，把视线锁在中央升起的岛
      float dim = mix(1.0, 0.30, smoothstep(0.12, 0.5, d));
      float desat = mix(1.0, 0.5, smoothstep(0.12, 0.5, d));
      vec3 gray = vec3(dot(c.rgb, vec3(0.2126,0.7152,0.0722)));
      vec3 focused = mix(gray, c.rgb, desat) * dim;
      c.rgb = mix(c.rgb, focused, uFocus);
      // 深夜极光：画面上部两道绿紫波帘缓缓起伏（海面铺满全屏，极光改在后期叠于上方）
      if (uAurora > 0.001) {
        float y = vUv.y;
        float w = sin(vUv.x * 7.0 + uTime * 0.6) * 0.03 + sin(vUv.x * 3.0 - uTime * 0.3) * 0.05;
        float c1 = smoothstep(0.09, 0.0, abs(y - (0.84 + w)));
        float c2 = smoothstep(0.07, 0.0, abs(y - (0.72 + w * 0.7)));
        vec3 aur = vec3(0.3, 1.0, 0.6) * c1 + vec3(0.55, 0.4, 1.0) * c2;
        float flick = 0.7 + 0.3 * sin(uTime * 1.3 + vUv.x * 10.0);
        c.rgb += aur * smoothstep(0.5, 1.0, y) * uAurora * flick * 0.55;
      }
      // 分时段专属调色：一层色平衡（黄昏偏暖、夜偏冷、黎明偏粉）
      c.rgb *= mix(vec3(1.0), uTint, uTintAmt);
      // 胶片颗粒：极淡单帧噪声，打散 8bit 色带、加电影质感
      float g = fract(sin(dot(vUv * vec2(1280.0, 800.0) + uTime * 60.0, vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (g - 0.5) * 0.035;
      gl_FragColor = c;
    }`,
};

export interface PostFXFrame {
  focusK: number;
  time: number;
  nightK: number;
  tint: THREE.Color;
  tintAmt: number;
}

export class PostFX {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private tiltH: ShaderPass;
  private tiltV: ShaderPass;
  private grade: ShaderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    // r170 坑规避：用默认 HalfFloat RT（不挂 MSAA samples，否则真机/无头双双黑屏），
    // 抗锯齿靠 DPR≤2 + 移轴把画面大半虚化盖掉硬边。
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.addPass(new RenderPass(scene, camera));
    // Bloom：只让最亮处（碎金/灯火/宝箱/水柱/夜萤）真正发光；放在移轴前，光晕一起被虚化
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, // strength（每帧按 nightK 覆写）
      0.72, // radius
      0.82, // threshold（只咬最亮的）
    );
    this.composer.addPass(this.bloom);
    this.tiltH = new ShaderPass(TiltShiftShader(1, 0));
    this.tiltV = new ShaderPass(TiltShiftShader(0, 1));
    this.composer.addPass(this.tiltH);
    this.composer.addPass(this.tiltV);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setSize(w: number, h: number, dpr: number): void {
    this.composer.setSize(w, h);
    this.tiltH.uniforms.uResolution.value.set(w * dpr, h * dpr);
    this.tiltV.uniforms.uResolution.value.set(w * dpr, h * dpr);
  }

  render(p: PostFXFrame): void {
    const g = this.grade.uniforms;
    g.uFocus.value = p.focusK;
    g.uTime.value = p.time;
    g.uAurora.value = THREE.MathUtils.clamp((p.nightK - 0.5) * 2.2, 0, 1); // 深夜极光
    g.uTint.value.copy(p.tint);
    g.uTintAmt.value = p.tintAmt;
    // 夜里 Bloom 更旺（灯火/萤火/极光更梦幻），白天克制；峰值封到 ~0.82 免得岸边近白泡沫环发烫
    this.bloom.strength = 0.42 + 0.4 * p.nightK;
    this.composer.render();
  }

  dispose(): void {
    for (const pass of this.composer.passes) pass.dispose?.();
    this.composer.dispose();
  }
}
