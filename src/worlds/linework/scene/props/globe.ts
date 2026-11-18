// 线稿地球仪资产负责球体、经纬线、陆地图形和 Portal 命中区。
// 地球自转、充能缩放和 Portal 聚焦仍由 LineworkRoom 驱动。
import * as THREE from "three";
import {
  createLineworkGlobeAxis,
  createLineworkGlobeContinents,
  createLineworkGlobeGraticule,
  createLineworkGlobeMeridianRing,
  createLineworkGlobeSphere,
  createLineworkGlobeStand,
} from "./elements/globe-elements";
import { type LineworkPropKit } from "./linework-prop-kit";

export interface LineworkGlobeParts {
  readonly globe: THREE.Group;
  readonly globeTilt: THREE.Group;
  readonly globeSurface: THREE.Group;
}

export function createLineworkGlobe(kit: LineworkPropKit): LineworkGlobeParts {
  const globe = new THREE.Group();
  const globeTilt = new THREE.Group();
  const globeSurface = new THREE.Group();
  const centerY = 1.65;

  globe.position.set(4.2, 0, 1.35);
  kit.scene.add(globe);
  globeTilt.position.y = centerY;
  globeTilt.rotation.z = -THREE.MathUtils.degToRad(23.5);
  globe.add(globeTilt);
  globeTilt.add(globeSurface);
  createLineworkGlobeSphere(kit, globeSurface);
  createLineworkGlobeGraticule(globeSurface);
  createLineworkGlobeContinents(globeSurface);
  createLineworkGlobeAxis(kit, globeTilt);
  createLineworkGlobeMeridianRing(kit, globeTilt);
  createLineworkGlobeStand(kit, globe);
  kit.addHitTarget(globe, "portal", [2, 3.1, 2], [0, 1.3, 0]);
  return { globe, globeTilt, globeSurface };
}
