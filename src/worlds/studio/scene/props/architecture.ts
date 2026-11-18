// Studio 建筑资产负责地板、墙面、地毯、窗户、百叶和基础装饰线。
// 窗扇只暴露动画枢轴，开合节奏仍由 StudioRoom 统一驱动。
import * as THREE from "three";
import type { StudioPropKit } from "./studio-prop-kit";

export interface StudioArchitectureParts {
  readonly windowCasements: readonly [THREE.Group, THREE.Group];
}

export function createStudioArchitecture(
  kit: StudioPropKit,
  materials: {
    readonly floor: THREE.Material;
    readonly wall: THREE.Material;
    readonly fabricTexture: THREE.Texture;
  },
): StudioArchitectureParts {
  kit.box(kit.scene, [12, 0.24, 10], [0, -0.12, 0], materials.floor);
  kit.box(kit.scene, [12, 6.2, 0.2], [0, 3.1, -5], materials.wall);
  kit.box(kit.scene, [0.2, 6.2, 10], [6, 3.1, 0], materials.wall);

  const trim = kit.material({ color: 0xf0ede4, roughness: 0.74 });
  kit.roundedBox(kit.scene, [12, 0.18, 0.12], [0, 0.09, -4.84], trim, 0.035);
  kit.roundedBox(kit.scene, [0.12, 0.18, 9.7], [5.84, 0.09, 0], trim, 0.035);

  const rug = kit.material({
    color: 0x496b64,
    map: materials.fabricTexture,
    roughness: 0.98,
  });
  kit.roundedBox(kit.scene, [6.6, 0.055, 3.7], [0.1, 0.035, -0.2], rug, 0.12);

  // No window on this build; keep two empty casement groups so the ambient
  // animation loop (which rotates them) still has handles to reference.
  const leftCasement = new THREE.Group();
  const rightCasement = new THREE.Group();
  kit.scene.add(leftCasement, rightCasement);

  // 一整面悬挂窗帘：横杆 + 左右两片布帘，盖住原本窗户所在的墙面。
  const curtainRod = kit.material({ color: 0x5b5f66, roughness: 0.32, metalness: 0.6 });
  const curtainFabric = kit.material({
    color: 0xe4e0d8,
    map: materials.fabricTexture,
    roughness: 0.95,
  });
  kit.cylinder(kit.scene, 0.05, 0.05, 5.4, [-4.2, 4.55, -4.7], curtainRod, [0, 0, Math.PI / 2]);
  // 左帘
  const leftCurtain = new THREE.Group();
  leftCurtain.position.set(-5.3, 4.55, -4.72);
  kit.scene.add(leftCurtain);
  kit.roundedBox(leftCurtain, [1.5, 4.1, 0.06], [0.75, -2.2, 0], curtainFabric, 0.18);
  // 右帘
  const rightCurtain = new THREE.Group();
  rightCurtain.position.set(-3.1, 4.55, -4.72);
  kit.scene.add(rightCurtain);
  kit.roundedBox(rightCurtain, [1.5, 4.1, 0.06], [-0.75, -2.2, 0], curtainFabric, 0.18);
  return { windowCasements: [leftCasement, rightCasement] };
}
