// Studio 植物资产负责盆栽、盆沿、茎线和叶片。
// 轻微摆动由 StudioRoom 持有 plant group 后统一驱动。
import * as THREE from "three";
import type { StudioPropKit } from "./studio-prop-kit";

export function createStudioPlant(
  kit: StudioPropKit,
  plant: THREE.Group,
): void {
  const position = new THREE.Vector3(5.08, 0, -2.05);
  const pot = kit.material({ color: 0xa9543a, roughness: 0.68 });
  const rim = kit.material({ color: 0xc47351, roughness: 0.58 });
  const stemMaterial = kit.material({ color: 0x355d46, roughness: 0.8 });
  const leaf = kit.material({ color: 0x2e7257, roughness: 0.72, side: THREE.DoubleSide });
  kit.cylinder(kit.scene, 0.42, 0.3, 0.65, [position.x, 0.34, position.z], pot);
  const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.055, 16, 48), rim);
  potRim.position.set(position.x, 0.65, position.z);
  potRim.rotation.x = Math.PI / 2;
  kit.scene.add(potRim);
  kit.cylinder(
    kit.scene,
    0.34,
    0.34,
    0.055,
    [position.x, 0.65, position.z],
    kit.material({ color: 0x3a2a1f, roughness: 1 }),
  );
  plant.position.set(position.x, 0.62, position.z);
  for (let index = 0; index < 8; index += 1) {
    const direction = (index - 3.5) * 0.13;
    const height = 1.05 + (index % 3) * 0.22;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(direction * 0.45, height * 0.58, Math.sin(index) * 0.12),
      new THREE.Vector3(direction, height, Math.sin(index * 1.7) * 0.2),
    );
    const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.022, 8, false), stemMaterial);
    stem.userData.noShadow = true;
    plant.add(stem);
    const blade = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), leaf);
    blade.scale.set(0.62, 1.75, 0.28);
    blade.position.copy(curve.getPoint(1));
    blade.rotation.z = -direction * 0.35;
    plant.add(blade);
    const vein = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.52, 8),
      stemMaterial,
    );
    vein.position.copy(blade.position);
    vein.rotation.z = blade.rotation.z;
    vein.rotation.x = blade.rotation.x;
    vein.userData.noShadow = true;
    plant.add(vein);
    if (index % 2 === 0) {
      const youngLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12), leaf);
      youngLeaf.scale.set(0.52, 1.45, 0.24);
      youngLeaf.position.copy(curve.getPoint(0.72));
      youngLeaf.rotation.z = -direction * 0.5 + 0.18;
      plant.add(youngLeaf);
    }
  }
  kit.scene.add(plant);
}
