// Three.js renderer 宿主；Runtime 通过它统一 resize、像素比和质量档位。
// World 发布 scene/camera，但不直接拥有 WebGLRenderer。
import * as THREE from "three";
import type { QualityBudget, RendererHost } from "./contracts";

export class ThreeRendererHost implements RendererHost {
  readonly renderer: THREE.WebGLRenderer;
  readonly isMobile: boolean;
  private quality: QualityBudget;

  constructor(canvas: HTMLCanvasElement, quality: QualityBudget) {
    this.isMobile = window.matchMedia("(max-width: 720px)").matches;
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality.tier !== "low" && !this.isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.resize();
  }

  setQuality(budget: QualityBudget): void {
    this.quality = budget;
    this.resize();
  }

  resetWorldState(): void {
    // World 切换前恢复共享 renderer 基线，避免来源 Session 的状态污染目标世界。
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setRenderTarget(null);
    this.renderer.autoClear = true;
  }

  resize(): void {
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        this.quality.pixelRatioCap,
        window.innerWidth <= 720 ? 1.25 : 1.8,
      ),
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
