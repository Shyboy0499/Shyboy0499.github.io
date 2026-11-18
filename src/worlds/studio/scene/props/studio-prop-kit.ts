// Studio prop kit 定义工作室资产可使用的建模与资源能力。
// 材质、贴图、命中区和展品注册仍由 StudioRoom 统一拥有。
import type * as THREE from "three";
import type { StudioExhibitBinding } from "../../binding";
import type { StudioTargetId } from "../studio-room";

export interface StudioPropKit {
  readonly scene: THREE.Scene;
  material(parameters: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial;
  basicMaterial(parameters: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial;
  physicalMaterial(parameters: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial;
  box(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    rotation?: readonly [number, number, number],
  ): THREE.Mesh;
  roundedBox(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    radius?: number,
    rotation?: readonly [number, number, number],
  ): THREE.Mesh;
  cylinder(
    parent: THREE.Object3D,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    position: readonly [number, number, number],
    material: THREE.Material,
    rotation?: readonly [number, number, number],
  ): THREE.Mesh;
  tubeBetween(
    parent: THREE.Object3D,
    start: readonly [number, number, number],
    end: readonly [number, number, number],
    radius: number,
    material: THREE.Material,
  ): THREE.Mesh;
  imageMaterial(src: string): THREE.MeshBasicMaterial;
  imagePanel(
    parent: THREE.Object3D,
    src: string,
    size: readonly [number, number],
    position: readonly [number, number, number],
    rotation?: readonly [number, number, number],
  ): THREE.Group;
  addHitTarget(
    target: StudioTargetId,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    rotation?: readonly [number, number, number],
  ): void;
  registerExhibit(binding: StudioExhibitBinding, group: THREE.Group): void;
  trackMaterial(material: THREE.Material): void;
}
