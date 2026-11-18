// 线稿物件工具包定义房间内部 props 可使用的绘制能力。
// 具体状态、命中测试列表和资源释放仍由 LineworkRoom 持有。
import * as THREE from "three";

export const PAPER = 0xffffff;
export const PAPER_SHADE = 0xf4f4f1;
export const GRAPHITE = 0x343535;
export const DETAIL_INK = 0x747777;
export const GUIDE_INK = 0xa4a7a7;
export const BLACK = 0x111111;

export interface OutlinedMeshOptions {
  readonly position?: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly color?: THREE.ColorRepresentation;
  readonly ink?: THREE.LineBasicMaterial;
  readonly threshold?: number;
}

export interface LineworkPropKit {
  readonly scene: THREE.Scene;
  box(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    options?: Omit<OutlinedMeshOptions, "position">,
  ): THREE.Group;
  roundedBox(
    parent: THREE.Object3D,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    radius: number,
    options?: Omit<OutlinedMeshOptions, "position">,
  ): THREE.Group;
  outlined(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    options?: OutlinedMeshOptions,
  ): THREE.Group;
  addSegments(
    parent: THREE.Object3D,
    points: readonly THREE.Vector3[],
    material?: THREE.LineBasicMaterial,
  ): THREE.LineSegments;
  addHitTarget(
    parent: THREE.Object3D,
    target: string,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    priority?: "control" | "default",
  ): void;
}

export function lineGeometry(points: readonly THREE.Vector3[]): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints([...points]);
}
