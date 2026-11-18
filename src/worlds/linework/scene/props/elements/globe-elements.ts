// 线稿地球仪元素定义球体、经纬线、陆地轮廓、轴、环和底座。
// Portal 命中和动画引用仍由地球仪资产与房间运行时协调。
import * as THREE from "three";
import { BLACK, GRAPHITE, PAPER, lineGeometry, type LineworkPropKit } from "../linework-prop-kit";

const RADIUS = 0.78;

function addLoop(
  parent: THREE.Object3D,
  points: readonly THREE.Vector3[],
  material: THREE.LineBasicMaterial,
): THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  const loop = new THREE.LineLoop(lineGeometry(points), material);
  loop.renderOrder = 3;
  parent.add(loop);
  return loop;
}

function spherePoint(latitude: number, longitude: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  const contourRadius = RADIUS + 0.012;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon) * contourRadius,
    Math.sin(lat) * contourRadius,
    Math.cos(lat) * Math.sin(lon) * contourRadius,
  );
}

export function createLineworkGlobeSphere(
  kit: LineworkPropKit,
  parent: THREE.Object3D,
): THREE.Group {
  return kit.outlined(parent, new THREE.SphereGeometry(RADIUS, 36, 24), { color: PAPER, threshold: 28 });
}

export function createLineworkGlobeGraticule(parent: THREE.Object3D): void {
  const graticuleInk = new THREE.LineBasicMaterial({ color: GRAPHITE, transparent: true, opacity: 0.62 });
  for (const latitude of [-60, -30, 0, 30, 60]) {
    const lat = THREE.MathUtils.degToRad(latitude);
    const parallelRadius = Math.cos(lat) * (RADIUS + 0.008);
    const y = Math.sin(lat) * (RADIUS + 0.008);
    const points = Array.from({ length: 64 }, (_, index) => {
      const angle = (index / 64) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * parallelRadius, y, Math.sin(angle) * parallelRadius);
    });
    addLoop(parent, points, graticuleInk);
  }
  for (let longitude = 0; longitude < 180; longitude += 30) {
    const lon = THREE.MathUtils.degToRad(longitude);
    const points = Array.from({ length: 64 }, (_, index) => {
      const angle = (index / 64) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * Math.cos(lon) * (RADIUS + 0.008),
        Math.sin(angle) * (RADIUS + 0.008),
        Math.cos(angle) * Math.sin(lon) * (RADIUS + 0.008),
      );
    });
    addLoop(parent, points, graticuleInk);
  }
}

export function createLineworkGlobeContinents(parent: THREE.Object3D): void {
  const landInk = new THREE.LineBasicMaterial({ color: BLACK, transparent: true, opacity: 0.94 });
  const continentContours = [
    [[65, -150], [52, -125], [28, -108], [12, -86], [-8, -78], [-28, -64], [-50, -70], [-22, -47], [4, -58], [22, -82], [48, -72], [62, -98]],
    [[58, -8], [54, 24], [66, 56], [52, 92], [38, 124], [18, 108], [8, 78], [22, 56], [4, 42], [-34, 24], [-24, 6], [8, -16], [34, 2]],
    [[-10, 114], [-18, 142], [-40, 150], [-44, 120], [-25, 110]],
  ] as const;
  continentContours.forEach((contour) => {
    addLoop(parent, contour.map(([latitude, longitude]) => spherePoint(latitude, longitude)), landInk);
  });
}

export function createLineworkGlobeAxis(kit: LineworkPropKit, parent: THREE.Object3D): void {
  kit.outlined(parent, new THREE.CylinderGeometry(0.032, 0.032, 1.86, 8), { color: PAPER, threshold: 8 });
  kit.outlined(parent, new THREE.CylinderGeometry(0.075, 0.075, 0.13, 10), {
    position: [0, 0.975, 0],
    color: PAPER,
    threshold: 8,
  });
  kit.outlined(parent, new THREE.CylinderGeometry(0.075, 0.075, 0.13, 10), {
    position: [0, -0.975, 0],
    color: PAPER,
    threshold: 8,
  });
}

export function createLineworkGlobeMeridianRing(kit: LineworkPropKit, parent: THREE.Object3D): THREE.Group {
  return kit.outlined(parent, new THREE.TorusGeometry(0.91, 0.028, 8, 64), { color: PAPER, threshold: 8 });
}

export function createLineworkGlobeStand(kit: LineworkPropKit, parent: THREE.Object3D): void {
  kit.box(parent, [0.12, 0.54, 0.12], [0, 0.48, 0]);
  kit.outlined(parent, new THREE.CylinderGeometry(0.38, 0.48, 0.12, 24), {
    position: [0, 0.22, 0],
    color: PAPER,
    threshold: 12,
  });
  kit.outlined(parent, new THREE.CylinderGeometry(0.56, 0.68, 0.14, 24), {
    position: [0, 0.12, 0],
    color: PAPER,
    threshold: 12,
  });
}
