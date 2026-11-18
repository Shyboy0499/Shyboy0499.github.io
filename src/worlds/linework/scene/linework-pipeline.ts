// 线稿后期管线复用 Runtime renderer，并只拥有本 World 创建的 render target。
// 低质量档绕过后期，确保线稿世界在移动设备上仍可稳定显示。
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import type { QualityBudget } from "../../../runtime/contracts";

const PaperLineShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uWobble: { value: 0.42 },
    uGrain: { value: 0.022 },
    uInkSpread: { value: 0.46 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uWobble;
    uniform float uGrain;
    uniform float uInkSpread;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float neutralInk(vec3 sampleColor) {
      float lightness = dot(sampleColor, vec3(0.299, 0.587, 0.114));
      float chroma = max(sampleColor.r, max(sampleColor.g, sampleColor.b))
        - min(sampleColor.r, min(sampleColor.g, sampleColor.b));
      return (1.0 - smoothstep(0.16, 0.58, lightness))
        * (1.0 - smoothstep(0.06, 0.16, chroma));
    }

    void main() {
      vec2 pixel = vUv * uResolution;
      vec2 wobble = vec2(
        sin(pixel.y * 0.071) + sin(pixel.y * 0.019 + 1.7),
        sin(pixel.x * 0.067 + 0.9) + sin(pixel.x * 0.023)
      );
      vec2 offset = wobble * uWobble / uResolution;
      vec4 color = texture2D(tDiffuse, vUv + offset);
      vec2 texel = 0.82 / uResolution;
      float centerInk = neutralInk(color.rgb);
      float nearbyInk = max(
        max(neutralInk(texture2D(tDiffuse, vUv + offset + vec2(texel.x, 0.0)).rgb),
            neutralInk(texture2D(tDiffuse, vUv + offset - vec2(texel.x, 0.0)).rgb)),
        max(neutralInk(texture2D(tDiffuse, vUv + offset + vec2(0.0, texel.y)).rgb),
            neutralInk(texture2D(tDiffuse, vUv + offset - vec2(0.0, texel.y)).rgb))
      );
      float inkHalo = max(0.0, nearbyInk - centerInk) * uInkSpread;
      color.rgb = mix(color.rgb, min(color.rgb, vec3(0.28)), inkHalo);
      float fiber = hash(floor(pixel * 0.5)) - 0.5;
      color.rgb += vec3(fiber * uGrain);
      color.rgb = mix(color.rgb, vec3(0.985), 0.012);
      gl_FragColor = color;
    }
  `,
};

export class LineworkPipeline {
  private readonly composer: EffectComposer;
  private readonly paperPass: ShaderPass;
  private readonly drawingBufferSize = new THREE.Vector2();
  private width = 0;
  private height = 0;
  private pixelRatio = 0;
  private enabled = true;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    quality: QualityBudget,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.paperPass = new ShaderPass(PaperLineShader);
    this.composer.addPass(this.paperPass);
    this.composer.addPass(new OutputPass());
    this.setQuality(quality);
  }

  setQuality(quality: QualityBudget): void {
    this.enabled = quality.postProcessing !== "off";
    this.paperPass.uniforms.uWobble.value = quality.tier === "high" ? 0.38 : 0.26;
    this.paperPass.uniforms.uGrain.value = quality.tier === "high" ? 0.014 : 0.01;
    // 仅高质量档扩展深色墨线，低质量档保留材质层级但避免额外纹理采样。
    this.paperPass.uniforms.uInkSpread.value = quality.tier === "high" ? 0.46 : 0;
  }

  render(): void {
    this.renderer.getDrawingBufferSize(this.drawingBufferSize);
    const pixelRatio = this.renderer.getPixelRatio();
    const width = Math.max(1, Math.round(this.drawingBufferSize.x / pixelRatio));
    const height = Math.max(1, Math.round(this.drawingBufferSize.y / pixelRatio));
    if (width !== this.width || height !== this.height || pixelRatio !== this.pixelRatio) {
      this.width = width;
      this.height = height;
      this.pixelRatio = pixelRatio;
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
      this.paperPass.uniforms.uResolution.value.copy(this.drawingBufferSize);
    }

    if (this.enabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const pass of this.composer.passes) pass.dispose?.();
    this.composer.dispose();
  }
}
