// 角色脚下的光尘拖尾：固定大小的粒子池，靠加色混合让死亡粒子自然消失。
// 不负责角色位置与移动判断，调用方每帧传入是否在移动及脚下坐标。
import * as THREE from "three";

const SPAWN_INTERVAL = 0.022;
const LIFE_DECAY = 1.5;

export function createTrail(scene: THREE.Scene, tint: THREE.Color, count = 110) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const life = new Float32Array(count);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(points);

  let cursor = 0;
  let spawnTimer = 0;

  return {
    update(dt: number, emitter: { x: number; z: number } | null) {
      spawnTimer += dt;
      if (emitter && spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        const i = cursor;
        cursor = (cursor + 1) % count;
        positions.set([emitter.x + (Math.random() - 0.5) * 0.35, 0.1, emitter.z + (Math.random() - 0.5) * 0.35], i * 3);
        velocities.set([(Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4], i * 3);
        life[i] = 1;
      }

      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) continue;
        life[i] = Math.max(0, life[i] - dt * LIFE_DECAY);
        const o = i * 3;
        positions[o] += velocities[o] * dt;
        positions[o + 1] += velocities[o + 1] * dt;
        positions[o + 2] += velocities[o + 2] * dt;
        // 加色混合下颜色趋近黑色即等于透明，无需单独的透明度属性。
        colors[o] = tint.r * life[i];
        colors[o + 1] = tint.g * life[i];
        colors[o + 2] = tint.b * life[i];
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
  };
}
