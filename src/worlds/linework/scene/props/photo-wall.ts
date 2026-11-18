// 线稿照片墙资产负责相框布局与照片平面挂载。
// 照片材质由房间注入，确保纹理加载和释放仍归 World Session 管理。
import * as THREE from "three";
import type { LineworkProfileExhibitBinding } from "../../binding";
import { createLineworkPhotoFrame, createLineworkPhotoPlane } from "./elements/photo-wall-elements";
import type { LineworkPropKit } from "./linework-prop-kit";

interface LineworkPhotoWallMedia {
  readonly id: string;
  readonly src: string;
}

export function createLineworkPhotoWall(
  kit: LineworkPropKit,
  group: THREE.Group,
  binding: LineworkProfileExhibitBinding,
  ink: THREE.LineBasicMaterial,
  media: readonly LineworkPhotoWallMedia[],
  createPhotoMaterial: (src: string) => THREE.ShaderMaterial,
): void {
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const layout = [
    { y: 4.05, z: -2.55, width: 1.12, height: 0.82, tilt: -0.025 },
    { y: 3.92, z: -1.2, width: 1.18, height: 0.88, tilt: 0.035 },
    { y: 4.0, z: 0.2, width: 1.1, height: 0.82, tilt: -0.02 },
    { y: 3.86, z: 1.52, width: 1.16, height: 0.84, tilt: 0.03 },
    { y: 2.85, z: -1.9, width: 1.2, height: 0.86, tilt: 0.02 },
    { y: 2.78, z: -0.48, width: 1.12, height: 0.84, tilt: -0.035 },
    { y: 2.84, z: 0.88, width: 1.16, height: 0.86, tilt: 0.025 },
  ] as const;

  group.position.x = -5.82;
  binding.mediaIds.forEach((mediaId, index) => {
    const item = mediaById.get(mediaId);
    const frameLayout = layout[index];
    if (!item || !frameLayout) return;
    const frame = new THREE.Group();
    frame.position.set(0, frameLayout.y, frameLayout.z);
    frame.rotation.x = frameLayout.tilt;
    group.add(frame);
    createLineworkPhotoFrame(kit, frame, frameLayout, ink);
    createLineworkPhotoPlane(frame, frameLayout, createPhotoMaterial(item.src));
  });

  kit.addHitTarget(group, binding.id, [0.5, 2.7, 5.7], [0.16, 3.4, -0.5]);
}
