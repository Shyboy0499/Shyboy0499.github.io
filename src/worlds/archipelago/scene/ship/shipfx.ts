import * as THREE from "three";

// 船头溅水：快速航行时船头两侧甩出的白色水花，抛物线落回海面后消失。
export function createSplash() {
  const N = 140;
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("life", new THREE.BufferAttribute(life, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uDpr: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float life; uniform float uDpr; varying float vL;
      void main(){
        vL = life;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.5 + 6.0 * life) * uDpr;
      }`,
    fragmentShader: /* glsl */ `
      varying float vL;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float g = smoothstep(0.5, 0.0, r);
        float a = g * smoothstep(0.0, 0.25, vL);
        if (a < 0.02) discard;
        gl_FragColor = vec4(vec3(0.97, 0.995, 1.0), a * 0.9);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let head = 0;

  return {
    points,
    update(
      dt: number,
      dpr: number,
      bowX: number,
      bowZ: number,
      fwdX: number,
      fwdZ: number,
      speed: number,
    ) {
      mat.uniforms.uDpr.value = dpr;
      // 物理推进 + 重力
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt * 1.4;
        vel[i * 3 + 1] -= 26 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < 0) life[i] = 0; // 落回海面即消失
      }
      // 高速时从船头两侧甩水
      if (speed > 5) {
        const rate = Math.min(3, Math.floor((speed - 4) * 0.6));
        const rx = -fwdZ;
        const rz = fwdX; // 右舷方向
        for (let e = 0; e < rate; e++) {
          head = (head + 1) % N;
          const side = e % 2 === 0 ? 1 : -1;
          pos[head * 3] = bowX + (Math.random() - 0.5) * 1.5;
          pos[head * 3 + 1] = 1.2;
          pos[head * 3 + 2] = bowZ + (Math.random() - 0.5) * 1.5;
          const out = 3 + Math.random() * 3;
          vel[head * 3] = fwdX * speed * 0.18 + rx * side * out;
          vel[head * 3 + 1] = 7 + Math.random() * 5;
          vel[head * 3 + 2] = fwdZ * speed * 0.18 + rz * side * out;
          life[head] = 1;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.life.needsUpdate = true;
    },
  };
}
