// 群岛世界的相机跟随与临时震动控制；所有扰动都基于当帧基准机位计算。
// 本文件不拥有帧循环，也不决定何时触发具体演出。
import * as THREE from "three";
import { store } from "../../store";
import { ISO_DIR, ISO_DIST, FRUSTUM } from "../core/config";
import type { IslandObject } from "../island/island";

interface CameraUpdateContext {
  dt: number;
  snapMode: boolean;
  ship: { pos: THREE.Vector3; forward: THREE.Vector3 };
  getDockedIslandObject: () => IslandObject | undefined;
  getDockedLandmarkFocus?: () =>
    { position: THREE.Vector3; radius: number; topY: number } | undefined;
}

export class WorldCameraRig {
  private readonly camera: THREE.OrthographicCamera;
  private readonly camPos = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();
  private readonly shakeOffset = new THREE.Vector3();
  private readonly shakeLook = new THREE.Vector3();
  private camZoom = 1;
  private focusK = 0;

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  seedSpawn(x: number, z: number): void {
    this.camPos.set(x, 8, z + 16);
    this.camLook.set(x, 2, z - 10);
  }

  snapToShip(shipPos: THREE.Vector3): void {
    this.camLook.copy(shipPos).setY(1.0);
    this.camZoom = 1;
    this.camPos.copy(this.camLook).addScaledVector(ISO_DIR, ISO_DIST);
    this.camera.position.copy(this.camPos);
    this.camera.zoom = this.camZoom;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.camLook);
  }

  update(ctx: CameraUpdateContext): number {
    const look = new THREE.Vector3();
    let zoom = 1;
    if (store.mode === "landed" && store.dockedId) {
      const obj = ctx.getDockedIslandObject();
      if (obj) {
        const c = obj.group.position;
        look.set(c.x, c.y + obj.topY * 0.34 + 2, c.z);
        zoom = THREE.MathUtils.clamp(
          (FRUSTUM * 0.62) / (obj.radius + 6),
          1.5,
          4.5,
        );
      } else {
        const landmark = ctx.getDockedLandmarkFocus?.();
        if (landmark) {
          look.set(
            landmark.position.x,
            landmark.position.y + landmark.topY * 0.34 + 2,
            landmark.position.z,
          );
          zoom = THREE.MathUtils.clamp(
            (FRUSTUM * 0.62) / (landmark.radius + 6),
            1.5,
            4.5,
          );
        }
      }
    } else {
      const fwd = ctx.ship.forward;
      look.set(ctx.ship.pos.x + fwd.x * 10, 1.0, ctx.ship.pos.z + fwd.z * 10);
    }
    const camDamp = ctx.snapMode ? 1 : 1 - Math.exp(-3.0 * ctx.dt);
    this.camLook.lerp(look, camDamp);
    this.camZoom += (zoom - this.camZoom) * camDamp;
    this.camPos.copy(this.camLook).addScaledVector(ISO_DIR, ISO_DIST);
    this.camera.position.copy(this.camPos);
    this.camera.zoom = this.camZoom;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.camLook);

    this.focusK +=
      ((store.mode === "landed" ? 1 : 0) - this.focusK) *
      (ctx.snapMode ? 1 : 1 - Math.exp(-3.0 * ctx.dt));
    return this.focusK;
  }

  applyShake(time: number, strength: number): void {
    const shakeK = THREE.MathUtils.clamp(strength, 0, 1);
    if (shakeK <= 0) return;
    const amplitude = 0.28 * shakeK;
    this.shakeOffset.set(
      (Math.sin(time * 37) + Math.sin(time * 61) * 0.35) * amplitude,
      Math.sin(time * 47 + 0.8) * amplitude * 0.42,
      (Math.cos(time * 41) + Math.sin(time * 53) * 0.3) * amplitude * 0.72,
    );
    this.camera.position.add(this.shakeOffset);
    this.shakeLook.copy(this.camLook).addScaledVector(this.shakeOffset, 0.35);
    this.camera.lookAt(this.shakeLook);
  }
}
