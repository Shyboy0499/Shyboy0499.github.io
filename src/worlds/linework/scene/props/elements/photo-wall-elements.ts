// 线稿照片墙元素定义单个相框和照片平面。
// 纹理材质仍由房间传入，避免元素层获得资源生命周期所有权。
import * as THREE from "three";
import { type LineworkPropKit } from "../linework-prop-kit";

export function createLineworkPhotoFrame(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
  size: { readonly width: number; readonly height: number },
  ink: THREE.LineBasicMaterial,
): THREE.Group {
  return kit.box(parent, [0.08, size.height + 0.16, size.width + 0.16], [0, 0, 0], { ink });
}

export function createLineworkPhotoPlane(
  parent: THREE.Object3D,
  size: { readonly width: number; readonly height: number },
  material: THREE.ShaderMaterial,
): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(size.width, size.height), material);
  photo.position.x = 0.05;
  photo.rotation.y = Math.PI / 2;
  parent.add(photo);
  return photo;
}
