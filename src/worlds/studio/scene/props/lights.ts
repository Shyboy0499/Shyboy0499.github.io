// Studio 灯光资产负责摆放工作室的环境光、太阳光、窗光、反弹光和桌灯光源。
// 灯光强度和阴影质量仍由 StudioRoom 的状态循环与 QualityBudget 驱动。
import type * as THREE from "three";
import type { StudioPropKit } from "./studio-prop-kit";

export interface StudioLightingRig {
  readonly hemisphere: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly windowFill: THREE.DirectionalLight;
  readonly roomBounce: THREE.PointLight;
  readonly deskLamp: THREE.PointLight;
}

export function createStudioLights(kit: StudioPropKit, rig: StudioLightingRig): void {
  kit.scene.add(rig.hemisphere);
  rig.sun.position.set(6, 9, 7);
  rig.sun.shadow.mapSize.set(1024, 1024);
  rig.sun.shadow.camera.left = -9;
  rig.sun.shadow.camera.right = 9;
  rig.sun.shadow.camera.top = 9;
  rig.sun.shadow.camera.bottom = -4;
  rig.sun.shadow.bias = -0.0008;
  kit.scene.add(rig.sun);
  rig.windowFill.position.set(-7, 5.5, 3.5);
  rig.windowFill.target.position.set(0.5, 1.8, -1.2);
  kit.scene.add(rig.windowFill, rig.windowFill.target);
  rig.roomBounce.position.set(2.2, 2.7, 2.8);
  kit.scene.add(rig.roomBounce);
  rig.deskLamp.position.set(0.82, 3.05, -2.72);
  kit.scene.add(rig.deskLamp);
}
