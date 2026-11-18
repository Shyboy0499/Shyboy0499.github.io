import * as THREE from "three";
import type { IslandDef } from "../../islands";
import { mulberry32 } from "../core/rng";
import { glowTexture } from "../core/sprites";

// 夜晚魔法：萤火虫 / 船尾荧光浮游拖尾 / 发光水母。都由 nightK 控制强度，Bloom 让它们发光。
// 白天 nightK≈0 → 全部隐去；入夜渐显。

// ---- 萤火虫：岛屿周围明灭漂浮的暖光点 ----
export function createFireflies(islands: IslandDef[]) {
  const N = islands.length > 0 ? 300 : 0;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const rng = mulberry32(918);
  for (let i = 0; i < N; i++) {
    const isl = islands[Math.floor(rng() * islands.length)];
    const a = rng() * Math.PI * 2;
    const r = 10 + rng() * 13;
    pos[i * 3] = isl.position[0] + Math.cos(a) * r;
    pos[i * 3 + 1] = 3 + rng() * 8;
    pos[i * 3 + 2] = isl.position[1] + Math.sin(a) * r;
    seed[i] = rng() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uDpr: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float seed; uniform float uTime, uDpr; varying float vF;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.7 + seed) * 1.7;
        p.y += sin(uTime * 0.9 + seed * 1.7) * 1.0;
        p.z += cos(uTime * 0.6 + seed * 1.3) * 1.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vF = 0.5 + 0.5 * sin(uTime * 3.0 + seed * 6.28);
        gl_PointSize = (3.5 + 3.5 * vF) * uDpr;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNight; varying float vF;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float g = smoothstep(0.5, 0.0, r);
        float a = pow(g, 1.4) * vF * uNight;
        if (a < 0.01) discard;
        vec3 col = mix(vec3(0.62, 0.92, 0.42), vec3(1.0, 0.92, 0.55), vF);
        gl_FragColor = vec4(col * (1.3 + vF), a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return {
    points,
    update(sim: number, nightK: number, dpr: number) {
      mat.uniforms.uTime.value = sim;
      mat.uniforms.uNight.value = nightK;
      mat.uniforms.uDpr.value = dpr;
      points.visible = nightK > 0.02;
    },
  };
}

// ---- 船尾荧光浮游拖尾：夜里移动时溅出的青色荧光，缓缓熄灭 ----
export function createPlankton() {
  const N = 160;
  const pos = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("life", new THREE.BufferAttribute(life, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uNight: { value: 0 }, uDpr: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float life; uniform float uDpr; varying float vL;
      void main(){
        vL = life;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + 8.0 * life) * uDpr;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNight; varying float vL;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float g = smoothstep(0.5, 0.0, r);
        float a = g * vL * uNight;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.4, 0.95, 1.0) * 1.5, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let head = 0;
  return {
    points,
    update(
      dt: number,
      nightK: number,
      dpr: number,
      sternX: number,
      sternZ: number,
      moving: boolean,
    ) {
      mat.uniforms.uNight.value = nightK;
      mat.uniforms.uDpr.value = dpr;
      for (let i = 0; i < N; i++) life[i] = Math.max(0, life[i] - dt * 0.5);
      if (moving && nightK > 0.05) {
        for (let e = 0; e < 2; e++) {
          head = (head + 1) % N;
          pos[head * 3] = sternX + (Math.random() - 0.5) * 3;
          pos[head * 3 + 1] = 0.5;
          pos[head * 3 + 2] = sternZ + (Math.random() - 0.5) * 3;
          life[head] = 1;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.life.needsUpdate = true;
      points.visible = nightK > 0.02;
    },
  };
}

// ---- 发光水母：夜里在船附近缓缓漂浮、一呼一吸地脉动发光 ----
export function createJellies() {
  const group = new THREE.Group();
  const rng = mulberry32(555);
  const COLORS = ["#ff8fd0", "#8fd0ff", "#c69cff", "#8fffe0"];
  const jellies: {
    g: THREE.Group;
    bell: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    halo: THREE.Sprite;
    haloMat: THREE.SpriteMaterial;
    phase: number;
    cx: number;
    cz: number;
    a: number;
    sp: number;
  }[] = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const col = COLORS[i % COLORS.length];
    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2),
      mat,
    );
    g.add(bell);
    for (let t = 0; t < 6; t++) {
      const ta = (t / 6) * Math.PI * 2;
      const tent = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.02, 3.4, 4),
        mat,
      );
      tent.position.set(Math.cos(ta) * 0.95, -1.6, Math.sin(ta) * 0.95);
      g.add(tent);
    }
    const haloMat = new THREE.SpriteMaterial({
      map: glowTexture("#ffffff"),
      color: col,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(10);
    halo.position.y = -0.3;
    g.add(halo);
    g.scale.setScalar(1.4);
    group.add(g);
    jellies.push({
      g,
      bell,
      mat,
      halo,
      haloMat,
      phase: rng() * 6.28,
      cx: 0,
      cz: 0,
      a: rng() * 6.28,
      sp: 0.15 + rng() * 0.2,
    });
  }

  function place(j: (typeof jellies)[number], shipX: number, shipZ: number) {
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 140;
    j.cx = shipX + Math.cos(a) * r;
    j.cz = shipZ + Math.sin(a) * r;
  }

  let seeded = false;
  return {
    group,
    update(
      sim: number,
      dt: number,
      nightK: number,
      shipX: number,
      shipZ: number,
    ) {
      group.visible = nightK > 0.02;
      if (!seeded) {
        for (const j of jellies) place(j, shipX, shipZ);
        seeded = true;
      }
      for (const j of jellies) {
        j.a += j.sp * dt * 0.4;
        j.cx += Math.cos(j.a) * j.sp * 5 * dt;
        j.cz += Math.sin(j.a) * j.sp * 5 * dt;
        if (Math.hypot(j.cx - shipX, j.cz - shipZ) > 260)
          place(j, shipX, shipZ);
        const pulse = 0.5 + 0.5 * Math.sin(sim * 1.6 + j.phase);
        j.g.position.set(j.cx, 0.6 + pulse * 0.6, j.cz);
        j.g.scale.set(
          1.4 * (0.9 + pulse * 0.2),
          1.4 * (1.1 - pulse * 0.2),
          1.4 * (0.9 + pulse * 0.2),
        );
        const glow = nightK * (0.35 + 0.35 * pulse);
        j.mat.opacity = glow * 0.8;
        j.haloMat.opacity = glow * 0.7;
      }
    },
  };
}
