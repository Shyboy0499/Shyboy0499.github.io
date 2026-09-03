// 海岛世界主控：拥有 legacy Three.js 场景、小船航行与岛内传送演出。
// 跨 World 的提交仍交给 Host Runtime，本文件只在演出完成后发送导航意图。
import * as THREE from "three";
import { WORLD_RADIUS, SPAWN, type IslandDef } from "../../islands";
import { BABEL_TOWER_LANDMARK } from "../../landmarks";
import {
  store,
  statusOf,
  islandById,
  showToast,
  detectGrowth,
  unlockArk,
} from "../../store";
import { createSky } from "../env/sky";
import { createOcean, OCEAN_NEAR } from "../env/ocean";
import { IslandObject } from "../island/island";
import type { IslandStatus } from "../island/island-types";
import { Ship } from "../ship/ship";
import { NIGHT } from "../env/themes";
import type { ThemeVals } from "../env/themes";
import { glowTexture, labelTexture, ringTexture } from "../core/sprites";
import { mulberry32 } from "../core/rng";
import {
  createFireflies,
  createPlankton,
  createJellies,
} from "../env/nightmagic";
import { createSplash } from "../ship/shipfx";
import { damp, easeOutCubic, smoothstep, wrapAngle } from "../core/ease";
import { FRUSTUM, SHIP_SCALE } from "../core/config";
import { CreatureManager } from "../env/creatures";
import { TimeOfDay } from "../env/timeofday";
import { PostFX } from "../env/postfx";
import { WorldControls } from "./world-controls";
import { WorldNavigation } from "./world-navigation";
import { updateSailing } from "./world-sailing";
import { WorldCameraRig } from "./world-camera";
import { ArchipelagoMaelstrom } from "../landmarks/archipelago-maelstrom";
import { ArchipelagoMaelstromV2 } from "../landmarks/archipelago-maelstrom-v2";
import { BabelTower } from "../landmarks/babel-tower";
import { CharybdisWhirlpool } from "../landmarks/charybdis-whirlpool";
import { NoahsArk } from "../ship/noahs-ark";
import {
  WORLD_NAMING,
  type KnownWorldId,
} from "../../../worlds.config";

// 渲染路线（Bruno Simon / Madbox 式）：直渲无后期、Lambert 扁平材质、MSAA 抗锯齿——
// 全场景开销压到核显/老笔记本都能满帧的水平。
// 验证钩子：?ship=x,z ?heading=deg ?unlock=all ?island=id ?grow=id ?theme=dusk ?t=N ?snap ?debug

const CHARYBDIS_POSITION: [number, number] = [-155, -72];
const CHARYBDIS_SCALE = 3.2;
const CHARYBDIS_ROTATION_Y = 0.28;
const CHARYBDIS_WATERLINE_LOCAL_Y = 0.32;
// 开孔始终收在资产的不透明水坡内；不规则边缘由海面 Shader 与资产同相位计算。
const CHARYBDIS_OCEAN_CUT_LOCAL_RADIUS = 6;
// 全局涌浪最高约 0.58，略抬水线可避免浪峰重新盖住牙齿和漏斗口。
const PORTAL_WATERLINE_WORLD_Y = 0.42;
const ARCANE_WHIRLPOOL_POSITION: [number, number] = [146, -188];
// 奥术入口与江湖巨口保持近似外径；海面开孔和交互半径都从该缩放同步推导。
const ARCANE_WHIRLPOOL_SCALE = 3.6;
const ARCANE_WHIRLPOOL_CUT_LOCAL_RADIUS = 6.55;
const MAELSTROM_TARGET_WORLD_ID = WORLD_NAMING.linework.id;
const BABEL_TOWER_FOAM_RADIUS = 21;
const WORLD_LABEL_HEIGHT = 5.5;
const WORLD_LABEL_TOP_GAP = 9.5;
function createDestinationLabel(
  targetWorldId: KnownWorldId,
  worldY: number,
  parentScale = 1,
): THREE.Sprite {
  const { tex, aspect } = labelTexture(
    `通向${WORLD_NAMING[targetWorldId].chineseTitle}`,
  );
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    }),
  );
  label.position.y = worldY / parentScale;
  label.scale.set(
    (WORLD_LABEL_HEIGHT * aspect) / parentScale,
    WORLD_LABEL_HEIGHT / parentScale,
    1,
  );
  label.userData.aspect = aspect;
  label.userData.worldY = worldY;
  return label;
}

class RingFX {
  private items: { mesh: THREE.Mesh; t0: number }[] = [];
  constructor(scene: THREE.Scene) {
    const tex = ringTexture();
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({
          map: tex,
          color: "#ffd98a",
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.7;
      scene.add(mesh);
      this.items.push({ mesh, t0: -99 });
    }
  }
  spawn(x: number, z: number, sim: number, color = "#ffd98a"): void {
    const slot = this.items.find((i) => sim - i.t0 > 1.8) ?? this.items[0];
    slot.t0 = sim;
    slot.mesh.position.set(x, 0.7, z);
    (slot.mesh.material as THREE.MeshBasicMaterial).color.set(color);
  }
  update(sim: number): void {
    for (const it of this.items) {
      const k = (sim - it.t0) / 1.7;
      const m = it.mesh.material as THREE.MeshBasicMaterial;
      if (k < 0 || k > 1) {
        m.opacity = 0;
        continue;
      }
      const s = THREE.MathUtils.lerp(6, 70, easeOutCubic(k));
      it.mesh.scale.setScalar(s);
      m.opacity = 0.85 * (1 - k);
    }
  }
}

export class World {
  private islandDefs: IslandDef[];
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  private postfx!: PostFX;
  private sky = createSky();
  private ocean = createOcean();
  private oceanNearD = new Float32Array(OCEAN_NEAR); // 每帧筛“离船最近 N 座岛”的距离平方，预分配免 GC
  private islands = new Map<string, IslandObject>();
  ship = new Ship();
  private sun = new THREE.DirectionalLight(NIGHT.sunColor, NIGHT.sunIntensity);
  private fill = new THREE.DirectionalLight(
    NIGHT.fillColor,
    NIGHT.fillIntensity,
  ); // 背阳面补光：暗部有色相不死黑
  private hemi = new THREE.HemisphereLight(
    NIGHT.hemiSky,
    NIGHT.hemiGround,
    NIGHT.hemiIntensity,
  );
  private clouds: THREE.Group[] = [];
  private cloudMat!: THREE.MeshLambertMaterial;
  private creatures!: CreatureManager;
  private fireflies: ReturnType<typeof createFireflies>;
  private plankton = createPlankton();
  private jellies = createJellies();
  private splash = createSplash();
  private stars!: THREE.Points;
  private rings!: RingFX;
  private whirlpoolPortals = new WhirlpoolPortalLayer();
  private maelstrom = new ArchipelagoMaelstrom();
  private babelReward = new BabelArkReward();
  private tod!: TimeOfDay; // 全天时段系统（相位/主题/夜色/调色/缓动过渡/URL钩子）
  simTime = 0;
  paused = false;
  private growthQueue: string[] = [];
  private nextGrowAt = 2.5;
  /** 点击作品宝箱时由 World Module 注入，场景本身不负责浏览器导航。 */
  onOpenProject: ((islandId: string, projectId: string) => void) | null = null;
  onFocusChange: ((islandId: string | null) => void) | null = null;
  /** Portal 意图由场景产生，预加载和 Journey 提交仍由 Runtime Portal 执行。 */
  onPortalPreload: ((targetWorldId: KnownWorldId) => void) | null = null;
  onPortalRequest: ((targetWorldId: KnownWorldId) => void) | null = null;
  private snapMode = false; // ?snap：相机不做平滑过渡（机器截图定帧用）
  private disposed = false;
  private worldPortalRequested = false;
  private renderFrame = {
    focusK: 0,
    time: 0,
    nightK: 0,
    tint: new THREE.Color(1, 1, 1),
    tintAmt: 0,
  };
  private viewportWidth = 0;
  private viewportHeight = 0;
  private viewportDpr = 0;
  private postProcessing = true;
  private controls!: WorldControls;
  private navigation!: WorldNavigation;
  private cameraRig!: WorldCameraRig;
  fps = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    islandDefs: IslandDef[],
    shadows: boolean,
  ) {
    this.islandDefs = islandDefs;
    this.fireflies = createFireflies(islandDefs);
    this.renderer = renderer;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = NIGHT.exposure;
    // 阴影预算由 Runtime 授予；World 只配置自己的灯光，不再从 URL 推断设备能力。
    if (shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera;
      sc.left = -210;
      sc.right = 210;
      sc.top = 210;
      sc.bottom = -210;
      sc.near = 120;
      sc.far = 640;
      this.sun.shadow.bias = -0.0003;
      this.sun.shadow.normalBias = 0.5; // 太大人会吃掉树这类小物件的影子
    }
    this.scene.add(this.sun.target);

    const aspect0 = window.innerWidth / Math.max(window.innerHeight, 1);
    this.camera = new THREE.OrthographicCamera(
      -FRUSTUM * aspect0,
      FRUSTUM * aspect0,
      FRUSTUM,
      -FRUSTUM,
      60,
      1200,
    );
    this.camera.userData.frustum = FRUSTUM;
    this.scene.fog = new THREE.Fog(
      NIGHT.fogColor.clone(),
      NIGHT.fogNear,
      NIGHT.fogFar,
    );
    this.scene.background = new THREE.Color().copy(NIGHT.fogColor);

    // 后期管线（Bloom/移轴/OutputPass/调色）整体内聚到 PostFX
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);
    this.cameraRig = new WorldCameraRig(this.camera);

    this.scene.add(
      this.sky,
      this.ocean,
      this.ship.group,
      this.ship.wake,
      this.whirlpoolPortals.group,
      this.babelReward.group,
      this.sun,
      this.fill,
      this.hemi,
    );
    // 08 大漩涡对应线稿世界；跨 World 预加载和提交仍由 Host Portal 负责。
    this.maelstrom.group.name = "ArchipelagoMaelstrom";
    this.maelstrom.group.position.set(-270, 0.9, 220);
    this.maelstrom.group.scale.setScalar(3.6);
    const maelstromBounds = new THREE.Box3().setFromObject(
      this.maelstrom.group,
    );
    const maelstromLabelY =
      maelstromBounds.max.y -
      this.maelstrom.group.position.y +
      WORLD_LABEL_TOP_GAP;
    this.maelstrom.group.add(
      createDestinationLabel(MAELSTROM_TARGET_WORLD_ID, maelstromLabelY, 3.6),
    );
    // 全局海面本身不透明；孔位收在各自水坡内侧，既露出深井又不在波浪边缘留下裂缝。
    const oceanUniforms = (this.ocean.material as THREE.ShaderMaterial)
      .uniforms;
    oceanUniforms.uMaelstrom.value.set(
      this.maelstrom.group.position.x,
      this.maelstrom.group.position.z,
      6.55 * this.maelstrom.group.scale.x,
    );
    oceanUniforms.uPortalWhirlpool.value.set(
      CHARYBDIS_POSITION[0],
      CHARYBDIS_POSITION[1],
      CHARYBDIS_OCEAN_CUT_LOCAL_RADIUS * CHARYBDIS_SCALE,
      CHARYBDIS_ROTATION_Y,
    );
    oceanUniforms.uArcaneWhirlpool.value.set(
      ARCANE_WHIRLPOOL_POSITION[0],
      ARCANE_WHIRLPOOL_POSITION[1],
      ARCANE_WHIRLPOOL_CUT_LOCAL_RADIUS * ARCANE_WHIRLPOOL_SCALE,
    );
    this.scene.add(this.maelstrom.group);
    this.scene.add(
      this.fireflies.points,
      this.plankton.points,
      this.jellies.group,
    ); // 夜晚魔法
    this.scene.add(this.splash.points); // 船头溅水
    this.ship.group.scale.setScalar(SHIP_SCALE);
    this.ship.setVariant(store.shipVariant);
    this.sun.position.copy(NIGHT.sunDir).multiplyScalar(500);

    for (const def of this.islandDefs) {
      const obj = new IslandObject(def);
      obj.group.userData.islandId = def.id; // 供点击拾取识别是哪座岛
      this.islands.set(def.id, obj);
      this.scene.add(obj.group);
    }

    // 立体棉花云：几团低多边形球叠出来的胖云，绕世界缓慢漂
    this.cloudMat = new THREE.MeshLambertMaterial({
      color: "#ffffff",
      emissive: "#ffffff",
      emissiveIntensity: 0.22,
      flatShading: true,
    });
    // 低空棉花云飘在海盘上方，castShadow 让云影每十几秒缓缓扫过海面（"云影呼吸"）
    const crng = mulberry32(20260712);
    for (let i = 0; i < 4; i++) {
      const cloud = new THREE.Group();
      const nb = 3 + Math.floor(crng() * 2);
      for (let b = 0; b < nb; b++) {
        const puff = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1, 1),
          this.cloudMat,
        );
        puff.position.set(
          (crng() - 0.5) * 9,
          (crng() - 0.5) * 1.6,
          (crng() - 0.5) * 5,
        );
        puff.scale.set(3 + crng() * 3, 1.6 + crng() * 1, 2.6 + crng() * 2.4);
        puff.castShadow = true;
        cloud.add(puff);
      }
      const a = crng() * Math.PI * 2;
      const r = 24 + crng() * 66;
      cloud.position.set(Math.cos(a) * r, 44 + crng() * 20, Math.sin(a) * r);
      cloud.userData.drift = {
        a,
        r,
        speed: 0.006 + crng() * 0.006,
        y: cloud.position.y,
      };
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }

    // 海洋生物（海鸥/海豚/鲸/鱼群）整体内聚到 CreatureManager
    this.creatures = new CreatureManager(this.scene);

    // 星（黄昏淡淡可见，晨光隐去）
    {
      const n = 260;
      const pos = new Float32Array(n * 3);
      const srng = mulberry32(77);
      for (let i = 0; i < n; i++) {
        const a = srng() * Math.PI * 2;
        const y = 0.25 + srng() * 0.7;
        const rr = Math.sqrt(Math.max(1 - y * y, 0));
        pos[i * 3] = Math.cos(a) * rr * 1100;
        pos[i * 3 + 1] = y * 1100;
        pos[i * 3 + 2] = Math.sin(a) * rr * 1100;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({
        color: "#ffe9c9",
        size: 2 * Math.min(window.devicePixelRatio, 2),
        sizeAttenuation: false,
        transparent: true,
        opacity: NIGHT.starOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.stars = new THREE.Points(g, m);
      this.stars.frustumCulled = false;
      this.scene.add(this.stars);
    }

    this.rings = new RingFX(this.scene);

    const q = new URLSearchParams(location.search);
    this.updateSizes();

    // 出生点与朝向
    this.ship.pos.set(SPAWN[0], 0, SPAWN[1]);
    this.cameraRig.seedSpawn(SPAWN[0], SPAWN[1]);

    // ---- 验证钩子 ----
    if (q.has("t")) this.simTime = parseFloat(q.get("t")!) || 0;
    this.tod = new TimeOfDay(q); // 时段钩子 ?tod / ?daycycle / ?theme 都在其构造里解析
    if (q.get("unlock") === "all") {
      store.ephemeral = true;
      for (const isl of this.islandDefs)
        if (isl.projects.length > 0) store.visited.add(isl.id);
    }
    const shipQ = q.get("ship");
    if (shipQ) {
      const [x, z] = shipQ.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(z)) this.ship.pos.set(x, 0, z);
    }
    if (q.has("heading"))
      this.ship.heading =
        ((parseFloat(q.get("heading")!) || 0) * Math.PI) / 180;
    const growQ = q.get("grow");
    if (growQ && islandById(growQ)) {
      store.ephemeral = true;
      store.visited.delete(growQ);
      store.pendingGrow.add(growQ);
      this.growthQueue = [growQ];
    } else {
      this.growthQueue = detectGrowth();
      for (const id of this.growthQueue) store.pendingGrow.add(id);
    }
    if (q.has("debug")) store.debug = true;
    this.snapMode = q.has("snap");
    (window as any).__seek = (t: number) => (this.simTime = t);
    (window as any).__world = this;
    (window as any).__store = store;

    // 相机初始就位（避免第一帧从原点飞过来）
    this.cameraRig.snapToShip(this.ship.pos);

    this.controls = new WorldControls({
      canvas: this.renderer.domElement,
      camera: this.camera,
      getPaused: () => this.paused,
      land: () => this.navigation.land(),
      fastTravelTo: (id) => this.fastTravelTo(id),
      findDockedChestHit: (raycaster) => {
        if (!store.dockedId) return undefined;
        const obj = this.islands.get(store.dockedId);
        return obj
          ? raycaster.intersectObjects(obj.chests, false)[0]
          : undefined;
      },
      findWhirlpoolPortalHit: (raycaster) =>
        this.whirlpoolPortals.intersect(raycaster),
      findLandmarkHit: (raycaster) => this.babelReward.intersect(raycaster),
      findIslandHit: (raycaster) =>
        raycaster.intersectObjects(
          [...this.islands.values()].map((o) => o.group),
          true,
        )[0],
      resolveIslandId: (object) =>
        object?.userData.islandId as string | undefined,
      openProject: (projectId) => {
        if (store.dockedId) this.onOpenProject?.(store.dockedId, projectId);
      },
      requestWorldPortal: (worldId) => this.requestWorldPortal(worldId),
    });
    this.navigation = new WorldNavigation({
      getSimTime: () => this.simTime,
      clearControls: () => this.controls.clearMovement(),
      getShipState: () => this.ship,
      getIslandObject: (id) => this.islands.get(id),
      getLandmark: (id) =>
        id === BABEL_TOWER_LANDMARK.id ? BABEL_TOWER_LANDMARK : undefined,
      spawnUnlockRing: (x, z, sim, color) => this.rings.spawn(x, z, sim, color),
      enterLandmark: (id) => {
        if (id === BABEL_TOWER_LANDMARK.id) this.babelReward.enter();
      },
      leaveLandmark: (id) => {
        if (id === BABEL_TOWER_LANDMARK.id) this.babelReward.leave();
      },
    });

    const islandQ = q.get("island");
    if (islandQ) {
      const def = islandById(islandQ);
      const obj = this.islands.get(islandQ);
      if (def && obj) {
        // 把船放到岛边（朝出生点方向的一侧），走真实到达→解锁→登岛路径
        const dir = new THREE.Vector3(
          SPAWN[0] - def.position[0],
          0,
          SPAWN[1] - def.position[1],
        ).normalize();
        this.ship.pos.set(
          def.position[0] + dir.x * (obj.radius + 6),
          0,
          def.position[1] + dir.z * (obj.radius + 6),
        );
        this.ship.heading = Math.atan2(-dir.x, -dir.z);
        this.cameraRig.snapToShip(this.ship.pos);
        this.navigation.queueAutoLandAt(this.simTime + 0.6);
      }
    }

    this.controls.attach();
  }

  // ------------------------------------------------------------------
  private updateSizes = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === 0 || h === 0) return; // 隐藏标签页 0 尺寸防御
    const dpr = this.renderer.getPixelRatio();
    if (
      w === this.viewportWidth &&
      h === this.viewportHeight &&
      dpr === this.viewportDpr
    ) {
      return;
    }
    this.viewportWidth = w;
    this.viewportHeight = h;
    this.viewportDpr = dpr;
    const aspect = w / h;
    this.camera.left = -FRUSTUM * aspect;
    this.camera.right = FRUSTUM * aspect;
    this.camera.top = FRUSTUM;
    this.camera.bottom = -FRUSTUM;
    this.camera.updateProjectionMatrix();
    this.postfx.setSize(w, h, dpr);
  };

  setPaused(p: boolean): void {
    if (this.paused === p) return;
    this.paused = p;
    this.controls.clearMovement();
    if (p) return;
    // Portal 失败后 Host 会恢复来源 World；船必须回到捕获前位置，才能再次尝试。
    if (this.worldPortalRequested) {
      this.worldPortalRequested = false;
      this.whirlpoolPortals.resetCapture(this.ship);
      this.maelstrom.resetCapture(this.ship);
    }
  }

  resize(): void {
    this.updateSizes();
  }

  setQuality(shadows: boolean, postProcessing: boolean): void {
    this.renderer.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    this.postProcessing = postProcessing;
  }

  setTouchMovement(throttle: number, steer: number, sprint = false): void {
    this.controls.setTouchMovement(throttle, steer, sprint);
  }

  setShipVariant(): void {
    this.ship.setVariant(store.shipVariant);
  }

  /** Hud 点击：平滑过渡到下一个时段（委托给 TimeOfDay） */
  skipTimeOfDay(): void {
    this.tod.skip();
  }

  /** UI 返回按钮使用同一个导航出口，避免 Vue 面板直接触碰 Navigation 内部实现。 */
  leave(): void {
    this.navigation.leave();
    this.onFocusChange?.(null);
  }

  fastTravelTo(id: string): boolean {
    const island = islandById(id);
    if (!island || statusOf(island) === "foggy") return false;
    this.navigation.fastTravelTo(id);
    this.onFocusChange?.(id);
    return true;
  }

  private requestWorldPortal(targetWorldId: KnownWorldId): void {
    if (this.worldPortalRequested) return;
    this.worldPortalRequested = true;
    this.controls.clearMovement();
    this.ship.speed = 0;
    showToast(
      `传送门正在打开：前往${WORLD_NAMING[targetWorldId].chineseTitle}。`,
    );
    this.onPortalRequest?.(targetWorldId);
  }

  /** 给海豚随机安排下一次跃水的地点/朝向/弧高 */
  /** 小地图点击设目标（软引导：可指任何岛，迷雾岛给提示） */
  setManualTarget(id: string): void {
    this.navigation.setManualTarget(id);
  }

  minimapData() {
    return this.islandDefs.map((def) => {
      const obj = this.islands.get(def.id)!;
      return {
        id: def.id,
        name: def.name,
        x: def.position[0],
        z: def.position[1],
        r: obj.radius,
        theme: def.theme,
        status: statusOf(def),
      };
    });
  }

  private applyTheme(b: number): void {
    const cur = this.tod.theme;
    const skyU = (this.sky.material as THREE.ShaderMaterial).uniforms;
    skyU.uTop.value.copy(cur.skyTop);
    skyU.uMid.value.copy(cur.skyMid);
    skyU.uHorizon.value.copy(cur.skyHorizon);
    skyU.uAurora.value = THREE.MathUtils.clamp(
      (this.tod.nightK - 0.5) * 2.2,
      0,
      1,
    ); // 只在最深的夜显现
    skyU.uTime.value = this.simTime;
    const oceanU = (this.ocean.material as THREE.ShaderMaterial).uniforms;
    oceanU.uSeaA.value.copy(cur.seaA);
    oceanU.uSeaB.value.copy(cur.seaB);
    oceanU.uSeaShallow.value.copy(cur.seaShallow);
    oceanU.uSunDir.value.copy(cur.sunDir);
    oceanU.uSunColor.value.copy(cur.sunColor);
    oceanU.uFoamK.value = 1 - 0.55 * this.tod.nightK; // 夜里白泡沫收敛
    this.sun.color.copy(cur.sunColor);
    this.sun.intensity = cur.sunIntensity;
    // 阴影相机跟着船走（吸附到 4 单位网格防阴影抖动）
    const sx = Math.round(this.ship.pos.x / 4) * 4;
    const sz = Math.round(this.ship.pos.z / 4) * 4;
    this.sun.position.set(
      sx + cur.sunDir.x * 450,
      cur.sunDir.y * 450,
      sz + cur.sunDir.z * 450,
    );
    this.sun.target.position.set(sx, 0, sz);
    this.fill.color.copy(cur.fillColor);
    this.fill.intensity = cur.fillIntensity;
    this.fill.position
      .set(-cur.sunDir.x, 0.5, -cur.sunDir.z)
      .normalize()
      .multiplyScalar(500);
    this.hemi.color.copy(cur.hemiSky);
    this.hemi.groundColor.copy(cur.hemiGround);
    this.hemi.intensity = cur.hemiIntensity;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(cur.fogColor);
    // 机位远（ISO_DIST 大），fog 起点相应后移，只柔化最远处，近景保持通透
    fog.near = (cur.fogNear + 470) * (1 - 0.4 * b);
    fog.far = (cur.fogFar + 280) * (1 - 0.4 * b);
    (this.scene.background as THREE.Color).copy(cur.fogColor);
    this.cloudMat.color.copy(cur.cloudTint);
    this.cloudMat.emissiveIntensity = 0.22 - 0.18 * this.tod.nightK; // 夜里云不自发光
    (this.stars.material as THREE.PointsMaterial).opacity = cur.starOpacity;
    this.renderer.toneMappingExposure = cur.exposure;
  }

  update(dt: number): void {
    if (this.disposed || this.paused) return;
    this.updateSizes();
    dt = Math.min(dt, 0.05);
    this.fps = this.fps * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;
    if (this.paused) return;
    this.simTime += dt;
    const sim = this.simTime;

    this.tod.update(dt); // 时段推进（缓动过渡/自然流转）+ 采样主题·夜色·调色

    // 世界软边界
    const distFromCenter = Math.hypot(this.ship.pos.x, this.ship.pos.z);
    const b = smoothstep(WORLD_RADIUS - 60, WORLD_RADIUS + 40, distFromCenter);
    this.applyTheme(b);

    // ---- 操控 ----
    const { throttle, steer, sprint } = this.controls.movement(
      store.mode !== "landed",
    );
    if (store.mode === "docked" && (throttle !== 0 || steer !== 0)) {
      store.mode = "sailing";
      store.dockedId = null;
      this.navigation.markNoDockUntil(sim + 2.5);
    }

    // ---- 泊岸减速与到达 ----
    const { speedCap, nearId } = updateSailing({
      sim,
      dt,
      boundaryK: b,
      ship: this.ship,
      islandDefs: this.islandDefs,
      getIslandObject: (id) => this.islands.get(id),
      navigation: this.navigation,
    });
    const portalApproach = this.maelstrom.isCapturing
      ? {
          speedCap: Infinity,
          nearId: null,
          enterId: null,
          targetWorldId: null,
          captureActive: false,
          startedCapture: false,
        }
      : this.whirlpoolPortals.approach(this.ship, sim, dt);
    if (portalApproach.startedCapture) {
      this.controls.clearMovement();
      if (portalApproach.targetWorldId)
        this.onPortalPreload?.(portalApproach.targetWorldId);
      const targetName = portalApproach.targetWorldId
        ? WORLD_NAMING[portalApproach.targetWorldId].chineseTitle
        : "目标世界";
      showToast(`传送门锁定了航线，小船正在减速，准备前往${targetName}。`);
    }
    const maelstromApproach = this.maelstrom.approach(
      this.ship,
      sim,
      dt,
      store.mode === "sailing" && !portalApproach.captureActive,
    );
    if (maelstromApproach.startedCapture) {
      this.controls.clearMovement();
      this.onPortalPreload?.(MAELSTROM_TARGET_WORLD_ID);
      showToast("海流突然失控，小船正在被卷入通向线稿世界的大漩涡。");
    }
    const captureActive =
      portalApproach.captureActive || maelstromApproach.captureActive;
    const movementSpeedCap = Math.min(
      speedCap,
      portalApproach.speedCap,
      maelstromApproach.speedCap,
    );
    if (portalApproach.enterId && portalApproach.targetWorldId) {
      this.requestWorldPortal(portalApproach.targetWorldId);
    } else if (maelstromApproach.entered) {
      this.requestWorldPortal(MAELSTROM_TARGET_WORLD_ID);
    }

    const sailing = store.mode === "sailing" && !captureActive;
    this.ship.update(
      dt,
      sim,
      sailing ? throttle : 0,
      sailing ? steer : 0,
      sailing ? sprint : false,
      movementSpeedCap,
    );

    // ?island=id 自动登岛
    if (
      this.navigation.getAutoLandAt() >= 0 &&
      store.mode === "docked" &&
      sim >= this.navigation.getAutoLandAt()
    ) {
      this.navigation.clearAutoLand();
      this.navigation.land();
    }

    // ---- 宝箱指引 ----
    this.navigation.pickAutoTarget(this.islandDefs, this.ship.pos);
    const targetDef = store.targetId ? islandById(store.targetId) : undefined;
    const targetLandmark =
      store.targetId === BABEL_TOWER_LANDMARK.id ? BABEL_TOWER_LANDMARK : null;
    const targetPosition = targetDef
      ? new THREE.Vector3(targetDef.position[0], 0, targetDef.position[1])
      : targetLandmark
        ? new THREE.Vector3(
            targetLandmark.position[0],
            0,
            targetLandmark.position[1],
          )
        : null;
    this.ship.pointArrowAt(
      store.mode === "sailing" && !captureActive ? targetPosition : null,
      sim,
      dt,
    );

    // ---- 生长动画调度 ----
    if (this.growthQueue.length > 0 && sim >= this.nextGrowAt) {
      const anyGrowing = [...this.islands.values()].some((o) => o.growing);
      if (!anyGrowing) {
        const id = this.growthQueue.shift()!;
        const def = islandById(id)!;
        const obj = this.islands.get(id)!;
        obj.grow(sim);
        this.rings.spawn(def.position[0], def.position[1], sim, "#bfeee2");
        showToast(`「${def.name}」正在从迷雾中升起，新作品已经抵达这片海域。`);
        obj.onGrown = () => {
          store.pendingGrow.delete(id);
        };
        this.nextGrowAt = sim + 6;
      }
    }

    // ---- 场景更新（离屏门控：只逐帧更新可见/生长/登岛的岛，其余 25+ 座跳过全套装饰动画）----
    const highlightId =
      store.mode === "landed" ? null : (store.dockedId ?? nearId);
    const shipX = this.ship.pos.x;
    const shipZ = this.ship.pos.z;
    const maelstromDx = this.maelstrom.group.position.x - shipX;
    const maelstromDz = this.maelstrom.group.position.z - shipZ;
    this.maelstrom.group.visible =
      maelstromDx * maelstromDx + maelstromDz * maelstromDz < 420 * 420;
    if (this.maelstrom.group.visible) {
      this.maelstrom.update(sim, this.tod.theme, this.tod.nightK, this.ship);
    }
    const CULL2 = 300 * 300; // 超出此半径且非生长/登岛的岛，屏外看不见 → 跳过更新
    for (const def of this.islandDefs) {
      const obj = this.islands.get(def.id)!;
      const st = statusOf(def) as IslandStatus; // 每帧每岛只取一次 reactive
      obj.setHighlight(def.id === highlightId);
      const dx = def.position[0] - shipX;
      const dz = def.position[1] - shipZ;
      if (
        dx * dx + dz * dz < CULL2 ||
        store.pendingGrow.has(def.id) ||
        store.dockedId === def.id
      ) {
        // 登岛特写时隐掉这座岛的空中岛名（面板里已有，避免撞顶部 UI）
        const suppress = store.mode === "landed" && store.dockedId === def.id;
        obj.update(sim, dt, st, suppress, this.tod.nightK);
      }
    }
    const [babelX, babelZ] = BABEL_TOWER_LANDMARK.position;
    const babelD = Math.hypot(
      this.ship.pos.x - babelX,
      this.ship.pos.z - babelZ,
    );
    this.navigation.releaseSuppressedLandmark(BABEL_TOWER_LANDMARK.id, babelD);
    this.navigation.tryDockLandmark(BABEL_TOWER_LANDMARK.id, babelD, sim);
    for (const cl of this.clouds) {
      const dr = cl.userData.drift;
      dr.a += dr.speed * dt;
      cl.position.set(Math.cos(dr.a) * dr.r, dr.y, Math.sin(dr.a) * dr.r);
    }
    this.creatures.update(sim, dt, this.ship.pos.x, this.ship.pos.z);
    this.whirlpoolPortals.update(
      sim,
      dt,
      portalApproach.nearId,
      this.ship,
      this.tod.theme,
      this.tod.nightK,
    );
    this.rings.update(sim);
    // 夜晚魔法：萤火虫 / 船尾荧光拖尾 / 发光水母（都随 nightK 渐显）
    {
      const dpr = Math.min(window.devicePixelRatio, 2);
      this.fireflies.update(sim, this.tod.nightK, dpr);
      const sternX = this.ship.pos.x - this.ship.forward.x * 5;
      const sternZ = this.ship.pos.z - this.ship.forward.z * 5;
      this.plankton.update(
        dt,
        this.tod.nightK,
        dpr,
        sternX,
        sternZ,
        this.ship.speed > 2,
      );
      this.jellies.update(
        sim,
        dt,
        this.tod.nightK,
        this.ship.pos.x,
        this.ship.pos.z,
      );
      const fwd = this.ship.forward;
      this.splash.update(
        dt,
        dpr,
        this.ship.pos.x + fwd.x * 5,
        this.ship.pos.z + fwd.z * 5,
        fwd.x,
        fwd.z,
        this.ship.speed,
      );
    }
    this.babelReward.update(sim, dt);
    const oceanU = (this.ocean.material as THREE.ShaderMaterial).uniforms;
    oceanU.uTime.value = sim;
    // 贴岸泡沫/浅滩：只把离船最近的 OCEAN_NEAR 座“已浮现”的岛喂给水面
    // （远岛在正交视野外或被 fog 柔化，看不到浅滩；片元循环因此从 O(全岛数) 压到 O(N)）。
    const islandVecs = oceanU.uIslands.value as THREE.Vector3[];
    const oceanD = this.oceanNearD;
    for (let k = 0; k < OCEAN_NEAR; k++) {
      oceanD[k] = Infinity;
      islandVecs[k].set(0, 0, 0);
    }
    const sx = this.ship.pos.x,
      sz = this.ship.pos.z;
    for (let i = 0; i < this.islandDefs.length; i++) {
      const def = this.islandDefs[i];
      const r = this.islands.get(def.id)!.foamRadius;
      if (r < 0.5) continue; // 迷雾岛没有浅滩
      const dx = def.position[0] - sx,
        dz = def.position[1] - sz;
      const d = dx * dx + dz * dz;
      // 保留最近 N：找当前最远的槽，比它近就替换（定长扫描，无排序、无分配）
      let worst = 0;
      for (let k = 1; k < OCEAN_NEAR; k++)
        if (oceanD[k] > oceanD[worst]) worst = k;
      if (d < oceanD[worst]) {
        oceanD[worst] = d;
        islandVecs[worst].set(def.position[0], def.position[1], r);
      }
    }
    {
      const [x, z] = BABEL_TOWER_LANDMARK.position;
      const dx = x - sx,
        dz = z - sz;
      const d = dx * dx + dz * dz;
      let worst = 0;
      for (let k = 1; k < OCEAN_NEAR; k++)
        if (oceanD[k] > oceanD[worst]) worst = k;
      if (d < oceanD[worst]) {
        oceanD[worst] = d;
        islandVecs[worst].set(x, z, BABEL_TOWER_FOAM_RADIUS);
      }
    }
    this.ocean.position.set(this.ship.pos.x, 0, this.ship.pos.z); // 海盘几何跟着船，始终铺满视野

    const focusK = this.cameraRig.update({
      dt,
      snapMode: this.snapMode,
      ship: this.ship,
      getDockedIslandObject: () =>
        store.dockedId ? this.islands.get(store.dockedId) : undefined,
      getDockedLandmarkFocus: () =>
        store.dockedId === BABEL_TOWER_LANDMARK.id
          ? this.babelReward.focus()
          : undefined,
    });
    if (maelstromApproach.captureActive) {
      this.cameraRig.applyShake(sim, 0.08 + maelstromApproach.pullK * 0.92);
    }
    this.renderFrame.focusK = focusK;
    this.renderFrame.time = sim;
    this.renderFrame.nightK = this.tod.nightK;
    this.renderFrame.tint.copy(this.tod.tint);
    this.renderFrame.tintAmt = this.tod.tintAmt;
  }

  render(): void {
    if (this.disposed) return;
    if (this.postProcessing) {
      this.postfx.render(this.renderFrame);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    this.disposed = true;
    const debugWindow = window as typeof window & {
      __seek?: unknown;
      __world?: unknown;
      __store?: unknown;
    };
    // 调试桥归当前 World 实例所有；只清理自己的引用，避免旧 Session 误删新实例。
    if (debugWindow.__world === this) {
      delete debugWindow.__seek;
      delete debugWindow.__world;
      delete debugWindow.__store;
    }
    this.controls.detach();
    this.whirlpoolPortals.dispose();
    this.maelstrom.dispose();
    this.babelReward.dispose();
    this.postfx.dispose();
    // 阴影贴图由 LightShadow 持有，不属于场景材质遍历，需随 World Session 单独释放。
    this.sun.shadow.dispose();
    this.scene.traverse((object) => {
      const geometry = (object as THREE.Mesh).geometry;
      geometry?.dispose();
      const material = (object as THREE.Mesh).material;
      const materials = Array.isArray(material)
        ? material
        : material
          ? [material]
          : [];
      for (const ownedMaterial of materials) {
        for (const value of Object.values(ownedMaterial)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        ownedMaterial.dispose();
      }
    });
    this.scene.clear();
    if (world === this) world = null;
  }
}

class BabelArkReward {
  readonly group = new THREE.Group();
  private readonly tower = new BabelTower();
  private readonly arkPrize = new NoahsArk();
  private readonly glow: THREE.Sprite;
  private readonly ring: THREE.Mesh;
  private unlockShown = false;

  constructor() {
    this.group.name = "BabelArkReward";
    const [x, z] = BABEL_TOWER_LANDMARK.position;
    this.group.position.set(x, 0.36, z);
    this.group.scale.setScalar(BABEL_TOWER_LANDMARK.scale);

    this.tower.group.name = "BabelTowerLandmark";
    this.tower.group.rotation.y = -0.42;
    this.group.add(this.tower.group);

    // 奖励物挂在塔顶，不写进 BabelTower 资产本身，避免资产墙里的独立模型携带游戏状态。
    this.arkPrize.group.name = "BabelArkPrize";
    this.arkPrize.group.scale.set(0.13, 0.13, 0.13);
    this.arkPrize.group.position.set(0, 22.8, 0);
    this.arkPrize.group.rotation.y = Math.PI * 0.72;
    this.group.add(this.arkPrize.group);

    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#ffd98a"),
        color: "#ffcf6e",
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.glow.position.set(0, 22.8, 0);
    this.glow.scale.setScalar(6.4);
    this.group.add(this.glow);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.8, 0.08, 5, 42),
      new THREE.MeshBasicMaterial({
        color: "#ffcf6e",
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 22.1;
    this.group.add(this.ring);
    this.group.traverse((object) => {
      object.userData.landmarkId = BABEL_TOWER_LANDMARK.id;
    });
  }

  update(time: number, dt: number): void {
    this.tower.update(time);
    this.arkPrize.update(time);
    this.arkPrize.group.rotation.y += dt * 0.42;
    this.arkPrize.group.position.y = 22.8 + Math.sin(time * 1.4) * 0.28;
    this.glow.position.y = this.arkPrize.group.position.y;
    this.glow.scale.setScalar(6.4 + Math.sin(time * 2.7) * 0.75);
    (this.glow.material as THREE.SpriteMaterial).opacity = store.arkUnlocked
      ? 0.18
      : 0.58 + Math.sin(time * 3.2) * 0.1;
    this.ring.rotation.z = time * 0.42;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = store.arkUnlocked
      ? 0.2
      : 0.72;
  }

  enter(): void {
    if (unlockArk()) {
      this.unlockShown = true;
      showToast("你在巴别塔顶发现了诺亚方舟。现在可以把小船切换为方舟外观。");
      this.ring.scale.setScalar(1.18);
      this.glow.scale.setScalar(8.4);
      return;
    }
    if (!this.unlockShown) {
      this.unlockShown = true;
      showToast("你在巴别塔顶发现了诺亚方舟。现在可以把小船切换为方舟外观。");
    }
  }

  leave(): void {
    this.ring.scale.setScalar(1);
  }

  focus(): { position: THREE.Vector3; radius: number; topY: number } {
    return {
      position: this.group.position,
      radius: BABEL_TOWER_LANDMARK.radius,
      topY: 22.8 * BABEL_TOWER_LANDMARK.scale,
    };
  }

  intersect(
    raycaster: THREE.Raycaster,
  ): THREE.Intersection<THREE.Object3D> | undefined {
    return raycaster.intersectObject(this.group, true)[0];
  }

  dispose(): void {
    // 资产对象由 World 生命周期整体释放；这里保留空方法以匹配其他场景层的所有权边界。
  }
}

interface WhirlpoolPortal {
  group: THREE.Group;
  update(time: number, theme: ThemeVals, nightK: number): void;
}

interface WhirlpoolPortalEntry {
  id: string;
  portal: WhirlpoolPortal;
  targetWorldId: KnownWorldId;
  radius: number;
  baseScale: number;
  activationK: number;
  label: THREE.Sprite;
  labelAspect: number;
  labelWorldY: number;
}

interface WhirlpoolPortalCapture {
  entry: WhirlpoolPortalEntry;
  startedAt: number;
  startSpeed: number;
  startPosition: THREE.Vector3;
  startHeading: number;
  pullSpeed: number;
}

interface WhirlpoolPortalApproach {
  speedCap: number;
  nearId: string | null;
  enterId: string | null;
  targetWorldId: KnownWorldId | null;
  captureActive: boolean;
  startedCapture: boolean;
}

class WhirlpoolPortalLayer {
  readonly group = new THREE.Group();
  private readonly portals: WhirlpoolPortalEntry[] = [];
  private capture: WhirlpoolPortalCapture | null = null;

  constructor() {
    this.group.name = "WhirlpoolPortalLayer";
    this.addWhirlpoolPortals();
  }

  update(
    time: number,
    dt: number,
    nearId: string | null,
    ship: Ship,
    theme: ThemeVals,
    nightK: number,
  ): void {
    for (const entry of this.portals) {
      entry.portal.update(time, theme, nightK);
      const activeCapture =
        this.capture?.entry.id === entry.id ? this.capture : null;
      const pullK = activeCapture
        ? smoothstep(0, 2.4, time - activeCapture.startedAt - 2)
        : 0;
      const wantActive = entry.id === nearId || Boolean(activeCapture);
      entry.activationK +=
        ((wantActive ? 1 : 0) - entry.activationK) * (1 - Math.exp(-5 * dt));
      const pulse = Math.sin(time * (1.35 + pullK * 4) + entry.radius * 0.03);
      const portalScale =
        entry.baseScale *
        (1 +
          entry.activationK * 0.08 +
          pullK * 0.12 +
          pulse * entry.activationK * 0.015);
      entry.portal.group.scale.setScalar(portalScale);
      const labelK = 1 + entry.activationK * 0.08;
      // 标签保持稳定的世界尺寸，避免继承大型入口缩放后在窄屏越界。
      entry.label.position.y = entry.labelWorldY / portalScale;
      entry.label.scale.set(
        (WORLD_LABEL_HEIGHT * entry.labelAspect * labelK) / portalScale,
        (WORLD_LABEL_HEIGHT * labelK) / portalScale,
        1,
      );
    }

    if (this.capture) {
      const pullK = smoothstep(0, 2.4, time - this.capture.startedAt - 2);
      const scale = THREE.MathUtils.lerp(1, 0.16, pullK * pullK);
      ship.group.scale.setScalar(SHIP_SCALE * scale);
      ship.group.position.y +=
        pullK * Math.min(this.capture.entry.radius * 0.34, 6);
      ship.group.rotation.z += Math.sin(time * 15) * pullK * 0.08;
    }
  }

  intersect(
    raycaster: THREE.Raycaster,
  ): THREE.Intersection<THREE.Object3D> | undefined {
    return raycaster.intersectObject(this.group, true)[0];
  }

  approach(ship: Ship, sim: number, dt: number): WhirlpoolPortalApproach {
    let speedCap = Infinity;
    let nearId: string | null = null;
    let nearD = Infinity;
    let captureCandidate: WhirlpoolPortalEntry | null = null;
    if (this.capture) return this.advanceCapture(ship, sim, dt, false);
    if (store.mode !== "sailing") {
      return {
        speedCap,
        nearId,
        enterId: null,
        targetWorldId: null,
        captureActive: false,
        startedCapture: false,
      };
    }

    for (const entry of this.portals) {
      const position = entry.portal.group.position;
      const dx = ship.pos.x - position.x;
      const dz = ship.pos.z - position.z;
      const d = Math.hypot(dx, dz);
      const hardR = entry.radius * 0.74 + 2.5;
      if (d < hardR) {
        const push = (hardR - d) / Math.max(d, 0.01);
        ship.pos.x += dx * push;
        ship.pos.z += dz * push;
        ship.speed *= 0.4;
      }
      if (d < entry.radius + 30 && d < nearD) {
        nearD = d;
        nearId = entry.id;
      }
      if (d < entry.radius + 30) {
        const tox = (position.x - ship.pos.x) / Math.max(d, 0.01);
        const toz = (position.z - ship.pos.z) / Math.max(d, 0.01);
        const facingPortal = ship.forward.x * tox + ship.forward.z * toz > 0.1;
        if (facingPortal) {
          speedCap = Math.min(
            speedCap,
            Math.max(2.6, (d - (entry.radius + 5)) * 0.6),
          );
          if (d < nearD + 0.01) captureCandidate = entry;
        }
      }
    }

    if (!captureCandidate) {
      return {
        speedCap,
        nearId,
        enterId: null,
        targetWorldId: null,
        captureActive: false,
        startedCapture: false,
      };
    }

    this.capture = {
      entry: captureCandidate,
      startedAt: sim,
      startSpeed: Math.max(Math.abs(ship.speed), 6),
      startPosition: ship.pos.clone(),
      startHeading: ship.heading,
      pullSpeed: 0,
    };
    return this.advanceCapture(ship, sim, dt, true);
  }

  resetCapture(ship: Ship): void {
    if (!this.capture) return;
    ship.pos.copy(this.capture.startPosition);
    ship.heading = this.capture.startHeading;
    ship.speed = 0;
    ship.group.scale.setScalar(SHIP_SCALE);
    this.capture = null;
  }

  dispose(): void {
    // 销毁不同于 Journey 回滚：World 已终止，不再为不可见的船恢复演出前状态。
    this.capture = null;
  }

  private advanceCapture(
    ship: Ship,
    sim: number,
    dt: number,
    startedCapture: boolean,
  ): WhirlpoolPortalApproach {
    const capture = this.capture!;
    const position = capture.entry.portal.group.position;
    const dx = position.x - ship.pos.x;
    const dz = position.z - ship.pos.z;
    const d = Math.hypot(dx, dz);
    const tox = dx / Math.max(d, 0.01);
    const toz = dz / Math.max(d, 0.01);
    const elapsed = sim - capture.startedAt;
    const targetHeading = Math.atan2(tox, toz);

    // 前两秒只减速和对准门口，不施加位移吸力，让玩家能看清控制权交接。
    if (elapsed < 2) {
      const slowK = smoothstep(0, 2, elapsed);
      ship.heading +=
        wrapAngle(targetHeading - ship.heading) * damp(dt, 1.2 + slowK * 2.6);
      const holdRadius = capture.entry.radius + 5.5;
      if (d < holdRadius) {
        ship.pos.set(
          position.x - tox * holdRadius,
          0,
          position.z - toz * holdRadius,
        );
        ship.speed *= 0.35;
      }
      return {
        speedCap: Math.max(0.75, capture.startSpeed * Math.exp(-2.5 * elapsed)),
        nearId: capture.entry.id,
        enterId: null,
        targetWorldId: capture.entry.targetWorldId,
        captureActive: true,
        startedCapture,
      };
    }

    // 吸力从轻微牵引加速到强拉拽；直接推进位置，避免 Ship 自身阻力抵消演出。
    const pullK = smoothstep(0, 2.4, elapsed - 2);
    capture.pullSpeed = Math.min(
      58,
      capture.pullSpeed + (4 + 38 * pullK * pullK) * dt,
    );
    ship.heading +=
      wrapAngle(targetHeading - ship.heading) * damp(dt, 3 + pullK * 7);
    ship.speed = 0;
    const step = Math.min(d, capture.pullSpeed * dt);
    ship.pos.x += tox * step;
    ship.pos.z += toz * step;
    const coreRadius = Math.max(2.5, capture.entry.radius * 0.16);
    const entered = d <= coreRadius || elapsed >= 5.4;

    return {
      speedCap: 0,
      nearId: capture.entry.id,
      enterId: entered ? capture.entry.id : null,
      targetWorldId: capture.entry.targetWorldId,
      captureActive: true,
      startedCapture,
    };
  }

  private register(
    id: string,
    portal: WhirlpoolPortal,
    targetWorldId: KnownWorldId,
    position: [number, number, number],
    scale: number,
    rotationY: number,
  ): void {
    portal.group.name = id;
    portal.group.position.set(...position);
    portal.group.scale.setScalar(scale);
    portal.group.rotation.y = rotationY;
    portal.group.userData.whirlpoolPortalId = id;
    portal.group.userData.targetWorldId = targetWorldId;
    portal.group.traverse((object) => {
      object.userData.whirlpoolPortalId = id;
      object.userData.targetWorldId = targetWorldId;
    });
    const bounds = new THREE.Box3().setFromObject(portal.group);
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 0.5;
    const labelY = bounds.max.y - portal.group.position.y + WORLD_LABEL_TOP_GAP;
    const label = createDestinationLabel(targetWorldId, labelY, scale);
    portal.group.add(label);
    this.portals.push({
      id,
      portal,
      targetWorldId,
      radius,
      baseScale: scale,
      activationK: 0,
      label,
      labelAspect: label.userData.aspect,
      labelWorldY: label.userData.worldY,
    });
    this.group.add(portal.group);
  }

  private addWhirlpoolPortals(): void {
    // 09 奥术裂变入口回到宇宙，10 卡律布狄斯巨口入口卷入江湖。
    this.register(
      "charybdis-whirlpool-west",
      new CharybdisWhirlpool(),
      WORLD_NAMING.jianghu.id,
      [
        CHARYBDIS_POSITION[0],
        this.charybdisY(CHARYBDIS_SCALE),
        CHARYBDIS_POSITION[1],
      ],
      CHARYBDIS_SCALE,
      CHARYBDIS_ROTATION_Y,
    );
    this.register(
      "arcane-maelstrom-north",
      new ArchipelagoMaelstromV2(),
      WORLD_NAMING.cosmic.id,
      [ARCANE_WHIRLPOOL_POSITION[0], 1.1, ARCANE_WHIRLPOOL_POSITION[1]],
      ARCANE_WHIRLPOOL_SCALE,
      -0.36,
    );
  }

  private charybdisY(scale: number): number {
    // 以资产自己的水面锚点对齐世界海面，避免放大后巨口主体被海盘盖住。
    return PORTAL_WATERLINE_WORLD_Y - CHARYBDIS_WATERLINE_LOCAL_Y * scale;
  }
}

let world: World | null = null;
export function createWorld(
  renderer: THREE.WebGLRenderer,
  islands: IslandDef[],
  shadows = true,
): World {
  world = new World(renderer, islands, shadows);
  return world;
}
export function getWorld(): World | null {
  return world;
}
