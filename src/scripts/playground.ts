// 3D 可玩入口：拥有场景、后期泛光、角色移动、镜头与项目互动的全部运行时状态。
// 不负责页面文案、开场动画与样式（见 pages/index.astro）；WebGL 不可用时只给 #play 加 no-webgl，静态内容保持可用。
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Project } from "../content/projects";
import { createFloorMaterial, createRimMaterial, createSkyMaterial } from "./world-shaders";
import { createTrail } from "./trail";

// 地台半径与行走速度共同决定漫游手感；边界留出余量，避免角色卡在圆环边缘。
const ARENA_RADIUS = 12;
const EDGE_MARGIN = 0.8;
const WALK_SPEED = 4.2;
// 靠近基座的判定距离，同时决定项目卡片何时出现。
const NEAR_DISTANCE = 2.2;
const PEDESTAL_RADIUS = 6;

// 键位统一转成平面方向：W 为远离镜头（-z），与默认镜头朝向一致。
const MOVE_KEYS: Record<string, [number, number]> = {
  w: [0, -1],
  arrowup: [0, -1],
  s: [0, 1],
  arrowdown: [0, 1],
  a: [-1, 0],
  arrowleft: [-1, 0],
  d: [1, 0],
  arrowright: [1, 0],
};

// 发光线条需要超过 1 的亮度才能被泛光捕获，这里把颜色整体提亮。
function glowColor(hex: number, boost: number): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(boost);
}

export function mountPlayground(root: HTMLElement, projects: Project[]): void {
  const host = root.querySelector<HTMLElement>("[data-canvas]");
  const intro = root.querySelector<HTMLElement>("[data-intro]");
  const enterButton = root.querySelector<HTMLButtonElement>("[data-enter]");
  const labels = Array.from(root.querySelectorAll<HTMLElement>("[data-label]"));
  const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-card]"));
  if (!host || !intro || !enterButton) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    // 无 WebGL 的设备保留静态介绍与下方作品列表。
    root.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  // 减少动效时保留场景与可玩性，只把漂浮、旋转与镜头环绕放慢到几乎静止。
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.25 : 1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0814, 28, 60);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xc9c4ff, 0x0a0a14, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(6, 14, 8);
  scene.add(sun);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 24), createSkyMaterial());
  scene.add(sky);

  // 圆形地台顶面位于 y=0：顶面用发光网格材质，侧壁用暗色，角色活动范围由半径决定。
  const floorMaterial = createFloorMaterial(ARENA_RADIUS);
  const rimMaterial = createRimMaterial();
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS * 0.9, 1.2, 96),
    // CylinderGeometry 的分组顺序为：侧壁、顶面、底面。
    [rimMaterial, floorMaterial, rimMaterial],
  );
  ground.position.y = -0.6;
  scene.add(ground);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(ARENA_RADIUS, 0.05, 8, 160),
    new THREE.MeshBasicMaterial({ color: glowColor(0x7c5cff, 2.4) }),
  );
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);

  // 外圈的碎石与内圈的同心环，让地台有纵深而不是一张平面。
  const shardMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1d2a, flatShading: true, roughness: 0.7 });
  const shards = Array.from({ length: 11 }, (_, i) => {
    const angle = (i / 11) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 15 + Math.random() * 8;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + Math.random() * 1.3, 0), shardMaterial);
    const baseY = 2 + Math.random() * 7;
    mesh.position.set(Math.cos(angle) * dist, baseY, Math.sin(angle) * dist);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    scene.add(mesh);
    return { mesh, baseY, phase: Math.random() * Math.PI * 2 };
  });

  const starCount = 900;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    // 在上半球均匀取点，让星空只出现在地台上方。
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 60;
    const s = Math.sqrt(1 - u * u);
    starPositions.set([Math.cos(theta) * s * r, Math.abs(u) * r * 0.8 + 2, Math.sin(theta) * s * r], i * 3);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(starPositions, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.75, fog: false }),
  );
  scene.add(stars);

  // 中央悬浮的核心：双环加一颗晶体，作为整个世界的视觉锚点。
  const core = new THREE.Group();
  core.position.set(0, 3.2, 0);
  const coreRingMaterial = new THREE.MeshBasicMaterial({ color: glowColor(0x36d6c3, 3) });
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.04, 12, 120), coreRingMaterial);
  coreRing.rotation.x = Math.PI / 2.4;
  const coreRingOuter = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.02, 10, 120), coreRingMaterial);
  coreRingOuter.rotation.set(Math.PI / 2.1, 0.4, 0.2);
  const coreGem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: 0xecedf2, emissive: 0x36d6c3, emissiveIntensity: 0.6, flatShading: true }),
  );
  core.add(coreRing, coreRingOuter, coreGem);
  scene.add(core);

  const glow = createGlowTexture();
  // 每个项目一座基座：晶体带描边、光晕与一盏小灯，角色靠近后显示卡片。
  type Pedestal = { crystal: THREE.Object3D; anchor: THREE.Vector3; x: number; z: number; baseY: number; phase: number };
  const pedestals: Pedestal[] = projects.map((p, i) => {
    // 第一个项目放在正前方，便于开场就看到。
    const angle = (i / projects.length) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * PEDESTAL_RADIUS;
    const z = Math.sin(angle) * PEDESTAL_RADIUS;
    const color = new THREE.Color(p.accent);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.6 }),
    );
    base.position.set(x, 0.25, z);
    scene.add(base);

    const crystalGeometry = new THREE.OctahedronGeometry(0.6, 0);
    const crystal = new THREE.Mesh(
      crystalGeometry,
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, flatShading: true, roughness: 0.25 }),
    );
    crystal.add(new THREE.LineSegments(new THREE.EdgesGeometry(crystalGeometry), new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(2.5) })));
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.scale.setScalar(3.4);
    crystal.add(halo);
    const baseY = 2.1;
    crystal.position.set(x, baseY, z);
    scene.add(crystal);

    const lamp = new THREE.PointLight(color, 6, 7, 2);
    lamp.position.set(x, 1.4, z);
    scene.add(lamp);

    return { crystal, anchor: new THREE.Vector3(x, 3.2, z), x, z, baseY, phase: i };
  });

  // 角色：白色胶囊身体 + 青色"视窗"，朝向即移动方向。
  const player = new THREE.Group();
  player.position.set(0, 0, 2);
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.5, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xecedf2, roughness: 0.35 }),
  );
  body.position.y = 0.6;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: glowColor(0x36d6c3, 3) }));
  visor.position.set(0, 0.95, 0.28);
  player.add(body, visor);
  scene.add(player);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  scene.add(shadow);

  const trail = createTrail(scene, new THREE.Color(0x36d6c3));

  // 泛光让发光材质向外晕开；参数偏保守，避免地台网格被整体冲白。
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.5, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const keys = new Set<string>();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pointer = new THREE.Vector2();
  const pointerNdc = new THREE.Vector2();
  const clickTarget = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const cameraGoal = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let hasClickTarget = false;
  let entered = false;
  let inView = false;
  let nearIndex = -1;
  let orbit = 0;

  function readKeyboard(): { x: number; z: number } | null {
    let x = 0;
    let z = 0;
    for (const key of keys) {
      const [dx, dz] = MOVE_KEYS[key];
      x += dx;
      z += dz;
    }
    if (!x && !z) return null;
    const len = Math.hypot(x, z);
    return { x: x / len, z: z / len };
  }

  // 地台边界：超出半径时沿径向拉回，避免角色掉出圆环。
  function clampToArena(v: THREE.Vector3) {
    const len = Math.hypot(v.x, v.z);
    const max = ARENA_RADIUS - EDGE_MARGIN;
    if (len > max) {
      v.x *= max / len;
      v.z *= max / len;
    }
  }

  function updatePlayer(dt: number, t: number) {
    velocity.set(0, 0, 0);
    if (entered) {
      const dir = readKeyboard();
      if (dir) {
        // 键盘输入优先，并取消未完成的点击寻路。
        hasClickTarget = false;
        velocity.set(dir.x, 0, dir.z);
      } else if (hasClickTarget) {
        const dx = clickTarget.x - player.position.x;
        const dz = clickTarget.z - player.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.15) hasClickTarget = false;
        else velocity.set(dx / d, 0, dz / d);
      }
    }

    const moving = velocity.lengthSq() > 0;
    if (moving) {
      player.position.addScaledVector(velocity, WALK_SPEED * dt);
      clampToArena(player.position);
      // 转向取最短角度，并平滑插值，避免身体瞬间翻转。
      const desired = Math.atan2(velocity.x, velocity.z);
      const diff = Math.atan2(Math.sin(desired - player.rotation.y), Math.cos(desired - player.rotation.y));
      player.rotation.y += diff * Math.min(1, dt * 12);
    }
    body.position.y = 0.6 + (moving ? Math.abs(Math.sin(t * 14)) * 0.07 * motion : 0);
    shadow.position.x = player.position.x;
    shadow.position.z = player.position.z;
    trail.update(dt, moving && entered ? { x: player.position.x, z: player.position.z } : null);
  }

  function updateProximity() {
    let best = -1;
    let bestDist = NEAR_DISTANCE;
    pedestals.forEach((p, i) => {
      const d = Math.hypot(player.position.x - p.x, player.position.z - p.z);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (best === nearIndex) return;
    if (nearIndex >= 0) cards[nearIndex].hidden = true;
    if (best >= 0) cards[best].hidden = false;
    nearIndex = best;
  }

  function animateScene(dt: number, t: number) {
    floorMaterial.uniforms.uTime.value = t;
    floorMaterial.uniforms.uPlayer.value.set(player.position.x, player.position.z);
    sky.material.uniforms.uTime.value = t;

    core.rotation.y += dt * 0.4 * motion;
    coreGem.rotation.y += dt * 0.8 * motion;
    coreRingOuter.rotation.z += dt * 0.25 * motion;
    core.position.y = 3.2 + Math.sin(t * 1.2) * 0.2 * motion;
    for (const s of shards) {
      s.mesh.rotation.y += dt * 0.12 * motion;
      s.mesh.position.y = s.baseY + Math.sin(t * 0.6 + s.phase) * 0.4 * motion;
    }
    for (const p of pedestals) {
      p.crystal.rotation.y += dt * 0.6 * motion;
      p.crystal.position.y = p.baseY + Math.sin(t * 1.4 + p.phase) * 0.15 * motion;
    }
    stars.rotation.y = t * 0.01 * motion;
  }

  // 入场前镜头缓慢环绕全景；进入后平滑跟随角色，并随指针轻微视差。
  function updateCamera(dt: number) {
    if (!entered) {
      orbit += dt * 0.12 * motion;
      camera.position.set(Math.sin(orbit) * 18, 8, Math.cos(orbit) * 18);
      camera.lookAt(0, 1.5, 0);
      return;
    }
    cameraGoal.set(
      player.position.x + pointerNdc.x * 0.8 * motion,
      6.5 + pointerNdc.y * 0.4 * motion,
      player.position.z + 9,
    );
    camera.position.lerp(cameraGoal, 1 - Math.exp(-dt * 4));
    camera.lookAt(player.position.x, 1.2, player.position.z);
  }

  // 基座标签用 DOM 绘制（文字清晰、可点击），每帧按投影位置摆放。
  function updateLabels() {
    pedestals.forEach((p, i) => {
      const label = labels[i];
      projected.copy(p.anchor).applyMatrix4(camera.matrixWorldInverse);
      const inFront = projected.z < 0;
      label.hidden = !inFront;
      if (!inFront) return;
      projected.copy(p.anchor).project(camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -120%)`;
    });
  }

  function enter() {
    if (entered) return;
    entered = true;
    root.classList.add("is-entered");
    intro.inert = true;
  }

  function openNearby() {
    if (nearIndex < 0) return;
    window.open(projects[nearIndex].href, "_blank", "noopener,noreferrer");
  }

  let width = 1;
  let height = 1;
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    // 竖屏视野更窄，拉宽 FOV 以容纳整个圆形地台。
    camera.fov = camera.aspect < 1 ? 62 : 45;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  // 离开视口时停止渲染，省电；回到视口后时钟差值被丢弃，不会出现跳帧。
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
  }).observe(root);

  enterButton.addEventListener("click", enter);

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (!entered) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(groundPlane, clickTarget)) {
      clampToArena(clickTarget);
      hasClickTarget = true;
    }
  });

  window.addEventListener("pointermove", (e) => {
    pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  });

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "enter") {
      // 焦点在链接或按钮上时交给浏览器原生处理，避免重复打开。
      if (e.target instanceof HTMLElement && e.target.closest("a, button")) return;
      if (!entered) {
        if (inView) enter();
        return;
      }
      openNearby();
      return;
    }
    if (!(key in MOVE_KEYS) || !entered || !inView) return;
    if (key.startsWith("arrow")) e.preventDefault();
    keys.add(key);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  const timer = new THREE.Timer();
  function frame(timestamp: number) {
    requestAnimationFrame(frame);
    // 每帧都要 update，即使不可见：否则回到视口时会拿到一段很长的 dt。
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (!inView) return;
    const t = timer.getElapsed();
    animateScene(dt, t);
    updatePlayer(dt, t);
    updateProximity();
    updateCamera(dt);
    composer.render(dt);
    updateLabels();
  }
  requestAnimationFrame(frame);
}

// 光晕贴图在运行时用 canvas 绘制，避免额外的图片请求。
function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
