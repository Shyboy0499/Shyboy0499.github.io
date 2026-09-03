// Cosmic World 把太空场景安装到共享 Runtime 中。
// 它不创建自己的 renderer、RAF、resize listener 或全局生命周期。
import * as THREE from "three";
import type {
  FrameContext,
  PortalDescriptor,
  PortalJourneyState,
  PortalRegistration,
  QualityBudget,
  WorldModule,
} from "../../runtime/contracts";
import { portfolio, portfolioProjectById } from "../../content/portfolio";
import { cosmicManifest } from "./manifest";
import { WORLD_NAMING, type KnownWorldId } from "../worlds.config";
import { WORLD_PORTALS } from "../portals.config";

type Vector3Tuple = readonly [number, number, number];

interface MaterialOptions {
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
}

interface FloatingObject {
  object: THREE.Object3D;
  baseY: number;
  phase: number;
  amplitude: number;
}

interface MediaPanelOptions {
  path: string;
  width: number;
  height: number;
  accent: THREE.ColorRepresentation;
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
}

interface OpacityUserData {
  baseOpacity: number;
}

type OpacityMaterial = THREE.Material & {
  userData: THREE.Material["userData"] & Partial<OpacityUserData>;
};

type MaterialObject = THREE.Object3D & {
  material?: THREE.Material | readonly THREE.Material[];
};

type GeometryObject = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
};

interface SatelliteSpec {
  geometry: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  position: Vector3Tuple;
}

interface CameraPath {
  positions: readonly THREE.Vector3[];
  targets: readonly THREE.Vector3[];
}

const githubStarTotal = portfolio.person.githubStarSources.reduce(
  (total, source) => total + source.stars,
  0,
);
const metricValue = (
  projectId: Parameters<typeof portfolioProjectById>[0],
  label: string,
  fallback: string,
): string =>
  portfolioProjectById(projectId).metrics.find((metric) => metric.label === label)
    ?.value ?? fallback;

const materialsOf = (object: THREE.Object3D): OpacityMaterial[] => {
  const material = (object as MaterialObject).material;
  if (!material) return [];
  return (Array.isArray(material) ? material : [material]) as OpacityMaterial[];
};

export const cosmicWorld: WorldModule = {
  manifest: cosmicManifest,
  async install(scope) {
    const routeLinks = [
      ...document.querySelectorAll<HTMLElement>("[data-route]"),
    ];
    const worldChoiceButtons = [
      ...document.querySelectorAll<HTMLButtonElement>("[data-world-choice]"),
    ];
    const reducedMotion = scope.reducedMotion;
    const isMobile = scope.rendering.isMobile;
    const renderer = scope.rendering.renderer;
    const pointer = scope.input.pointer;
    let quality: QualityBudget = scope.lifecycle.quality;

    const scaledEffectCount = (count: number): number =>
      Math.max(0, Math.round(count * quality.effectDensity));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.FogExp2(0x05070a, isMobile ? 0.022 : 0.017);

    const camera = new THREE.PerspectiveCamera(
      isMobile ? 54 : 46,
      window.innerWidth / window.innerHeight,
      0.1,
      180,
    );
    camera.position.set(0, 0, 11);

    const world = new THREE.Group();
    scene.add(world);

    scene.add(new THREE.HemisphereLight(0xbdd5ff, 0x090b12, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 6, 8);
    scene.add(keyLight);

    const blueLight = new THREE.PointLight(0x3976ff, 45, 26, 1.7);
    blueLight.position.set(-5, 1, -20);
    scene.add(blueLight);

    const acidLight = new THREE.PointLight(0xc8ff36, 38, 22, 1.7);
    acidLight.position.set(5, -1, -43);
    scene.add(acidLight);

    const coralLight = new THREE.PointLight(0xff654b, 52, 34, 1.6);
    coralLight.position.set(24, 2, 4);
    scene.add(coralLight);

    const manager = scope.loader.manager;
    const textureLoader = new THREE.TextureLoader(manager);
    const animatedObjects: THREE.Object3D[] = [];
    const floatingObjects: FloatingObject[] = [];

    // 复用视觉基元，让下面的站点搭建保持接近声明式。
    const material = (
      color: THREE.ColorRepresentation,
      options: MaterialOptions = {},
    ): THREE.MeshStandardMaterial =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.38,
        metalness: options.metalness ?? 0.68,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
        side: options.side ?? THREE.FrontSide,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0,
      });

    const addEdges = (
      mesh: THREE.Mesh,
      color: THREE.ColorRepresentation = 0xffffff,
      opacity = 0.35,
    ): THREE.LineSegments => {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity,
        }),
      );
      mesh.add(edges);
      return edges;
    };

    const addOrbitalNodes = (
      group: THREE.Group,
      color: THREE.ColorRepresentation,
      radius = 3.2,
      count = 9,
    ): void => {
      const nodeCount = scaledEffectCount(count);
      for (let index = 0; index < nodeCount; index += 1) {
        const angle = (index / nodeCount) * Math.PI * 2;
        const size = index % 3 === 0 ? 0.12 : 0.07;
        const node = new THREE.Mesh(
          new THREE.IcosahedronGeometry(size, 1),
          new THREE.MeshBasicMaterial({ color }),
        );
        node.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.42,
          Math.sin(angle * 2) * 0.4,
        );
        group.add(node);
        floatingObjects.push({
          object: node,
          baseY: node.position.y,
          phase: index * 0.7,
          amplitude: 0.08,
        });
      }
    };

    const createTextSprite = (
      text: string,
      color: string = "#c8ff36",
      scale = 1,
    ): THREE.Sprite => {
      const textCanvas = document.createElement("canvas");
      textCanvas.width = 1024;
      textCanvas.height = 256;
      const context = textCanvas.getContext("2d");
      if (!context) throw new Error("Cosmic text canvas is unavailable.");
      context.clearRect(0, 0, textCanvas.width, textCanvas.height);
      context.font = "900 128px Segoe UI, Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      context.fillText(text, 512, 130);

      const texture = new THREE.CanvasTexture(textCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
        }),
      );
      sprite.scale.set(4 * scale, 1 * scale, 1);
      return sprite;
    };

    const createMediaPanel = ({
      path,
      width,
      height,
      accent,
      position,
      rotation = [0, 0, 0],
    }: MediaPanelOptions): THREE.Group => {
      const group = new THREE.Group();
      group.position.set(...position);
      group.rotation.set(...rotation);

      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.34, height + 0.34, 0.18),
        material(0x10151c, { roughness: 0.28, metalness: 0.82 }),
      );
      addEdges(shell, accent, 0.82);
      group.add(shell);

      const texture = textureLoader.load(path);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(
        8,
        renderer.capabilities.getMaxAnisotropy(),
      );

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      );
      screen.position.z = 0.102;
      group.add(screen);

      const accentBar = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.34, 0.045, 0.05),
        new THREE.MeshBasicMaterial({ color: accent }),
      );
      accentBar.position.set(-width * 0.31, -height * 0.5 - 0.22, 0.12);
      group.add(accentBar);

      addOrbitalNodes(group, accent, Math.max(width, height) * 0.75, 7);
      floatingObjects.push({
        object: group,
        baseY: group.position.y,
        phase: Math.abs(position[2]) * 0.2,
        amplitude: 0.12,
      });
      return group;
    };

    const createOrbit = (
      radius: number,
      color: THREE.ColorRepresentation,
      opacity = 0.55,
      tube = 0.012,
    ): THREE.Mesh => {
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 160),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
        }),
      );
      animatedObjects.push(orbit);
      return orbit;
    };

    // 主线站点 01：个人起点。
    const origin = new THREE.Group();
    origin.position.set(isMobile ? 1.15 : 3.05, 0.25, 0);
    world.add(origin);

    const cosmicAsset = (path: string): string => `${WORLD_NAMING.cosmic.assetBasePath}/${path}`;
    const cyclingAsset = (path: string): string => cosmicAsset(`cycling/${path}`);

    const avatarTexture = textureLoader.load(cosmicAsset("avatar.webp"));
    avatarTexture.colorSpace = THREE.SRGBColorSpace;
    const portrait = new THREE.Mesh(
      new THREE.CircleGeometry(1.48, 96),
      new THREE.MeshBasicMaterial({
        map: avatarTexture,
        transparent: true,
        toneMapped: false,
      }),
    );
    portrait.position.z = 0.05;
    origin.add(portrait);

    const portraitBack = new THREE.Mesh(
      new THREE.CylinderGeometry(1.58, 1.58, 0.18, 96),
      material(0x151a20, { roughness: 0.26, metalness: 0.9 }),
    );
    portraitBack.rotation.x = Math.PI / 2;
    portraitBack.position.z = -0.08;
    origin.add(portraitBack);

    const originOrbitA = createOrbit(2.02, 0xc8ff36, 0.82, 0.016);
    originOrbitA.rotation.x = 0.35;
    originOrbitA.rotation.y = -0.18;
    origin.add(originOrbitA);

    const originOrbitB = createOrbit(2.5, 0x3976ff, 0.42, 0.01);
    originOrbitB.rotation.x = 1.05;
    originOrbitB.rotation.y = 0.5;
    origin.add(originOrbitB);
    addOrbitalNodes(origin, 0xc8ff36, 2.5, 11);

    const originLabel = createTextSprite(
      `${githubStarTotal}+ STARS`,
      "#c8ff36",
      0.62,
    );
    originLabel.position.set(0, -2.3, 0.4);
    origin.add(originLabel);

    // 主线站点 02：开源作品集合总览。
    const openSourceHub = new THREE.Group();
    openSourceHub.position.set(isMobile ? 0.9 : 2.8, 0.15, -18);
    world.add(openSourceHub);

    openSourceHub.add(
      createMediaPanel({
        path: cosmicAsset("isometric-preview.webp"),
        width: 3.55,
        height: 2.28,
        accent: 0xc8ff36,
        position: [-0.1, 0.05, 0],
        rotation: [-0.04, -0.16, 0.025],
      }),
    );

    openSourceHub.add(
      createMediaPanel({
        path: cosmicAsset("roadmap-cover.webp"),
        width: 1.72,
        height: 1.02,
        accent: 0x59e6ff,
        position: [2.05, -1.3, -0.55],
        rotation: [0.08, -0.34, -0.06],
      }),
    );

    const openSourceWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.92, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x3976ff,
        wireframe: true,
        transparent: true,
        opacity: 0.78,
        emissive: 0x183d9c,
        emissiveIntensity: 1.2,
      }),
    );
    openSourceWire.position.set(-2.25, 1.45, -0.55);
    openSourceHub.add(openSourceWire);
    animatedObjects.push(openSourceWire);

    const openSourceKnot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.56, 0.15, 112, 16),
      material(0xff654b, {
        roughness: 0.22,
        metalness: 0.62,
        emissive: 0x481108,
        emissiveIntensity: 0.78,
      }),
    );
    openSourceKnot.position.set(2.05, 1.38, -0.65);
    openSourceHub.add(openSourceKnot);
    animatedObjects.push(openSourceKnot);

    const openSourceOrbit = createOrbit(2.95, 0xc8ff36, 0.48, 0.014);
    openSourceOrbit.rotation.set(0.72, -0.34, 0.18);
    openSourceHub.add(openSourceOrbit);
    addOrbitalNodes(openSourceHub, 0xc8ff36, 3.15, 12);

    const openSourceSatellites: SatelliteSpec[] = [
      {
        geometry: new THREE.BoxGeometry(0.42, 0.42, 0.42),
        color: 0xc8ff36,
        position: [-2.5, -1.25, 0.2],
      },
      {
        geometry: new THREE.OctahedronGeometry(0.34, 0),
        color: 0x59e6ff,
        position: [3.15, 0.45, -0.2],
      },
      {
        geometry: new THREE.TorusGeometry(0.34, 0.08, 10, 40),
        color: 0xff654b,
        position: [-2.9, 0.15, 0.1],
      },
      {
        geometry: new THREE.DodecahedronGeometry(0.32, 0),
        color: 0xffffff,
        position: [0.25, 2.1, 0],
      },
    ];
    openSourceSatellites.forEach(({ geometry, color, position }) => {
      const satellite = new THREE.Mesh(
        geometry,
        material(color, {
          roughness: 0.24,
          metalness: 0.76,
          emissive: color,
          emissiveIntensity: 0.18,
        }),
      );
      satellite.position.set(...position);
      openSourceHub.add(satellite);
      animatedObjects.push(satellite);
    });

    const openSourceLabel = createTextSprite(
      "03 OPEN SYSTEMS",
      "#c8ff36",
      0.54,
    );
    openSourceLabel.position.set(-0.15, -2.55, 0.4);
    openSourceLabel.visible = false;
    openSourceHub.add(openSourceLabel);

    // 横向分支：每个开源项目对应一个站点。
    const nexus = new THREE.Group();
    nexus.position.set(15, 0, -18);
    world.add(nexus);

    nexus.add(
      createMediaPanel({
        path: cosmicAsset("claude-nexus-cover.webp"),
        width: 4.2,
        height: 2.7,
        accent: 0xff654b,
        position: [-2.65, 0.25, 0],
        rotation: [-0.05, 0.28, -0.03],
      }),
    );

    const nexusKnot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.74, 0.2, 120, 18),
      material(0xff654b, {
        roughness: 0.22,
        metalness: 0.58,
        emissive: 0x481108,
        emissiveIntensity: 0.8,
      }),
    );
    nexusKnot.position.set(2.4, 1.8, -0.7);
    nexus.add(nexusKnot);
    animatedObjects.push(nexusKnot);

    const nexusLabel = createTextSprite("CLAUDE NEXUS", "#ff654b", 0.52);
    nexusLabel.position.set(1.8, -2.05, 0.3);
    nexus.add(nexusLabel);

    const roadmap = new THREE.Group();
    roadmap.position.set(30, 0, -18);
    world.add(roadmap);

    roadmap.add(
      createMediaPanel({
        path: cosmicAsset("roadmap-cover.webp"),
        width: 5.6,
        height: 3.25,
        accent: 0x59e6ff,
        position: [2.25, 0.2, 0],
        rotation: [0.04, -0.3, 0.025],
      }),
    );

    const roadmapCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x3976ff,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
        emissive: 0x183d9c,
        emissiveIntensity: 1.4,
      }),
    );
    roadmapCore.position.set(-2.5, 1.5, -0.4);
    roadmap.add(roadmapCore);
    animatedObjects.push(roadmapCore);
    addOrbitalNodes(roadmap, 0x59e6ff, 4, 13);

    const roadmapLabel = createTextSprite(
      `${metricValue("ai-application-roadmap", "STARS", "278")} STARS / ${metricValue("ai-application-roadmap", "LANGUAGES", "02")} LANG`,
      "#59e6ff",
      0.48,
    );
    roadmapLabel.position.set(-1.7, -2.2, 0.2);
    roadmap.add(roadmapLabel);

    nexusLabel.visible = false;
    roadmapLabel.visible = false;

    const lab = new THREE.Group();
    lab.position.set(45, 0, -18);
    world.add(lab);

    lab.add(
      createMediaPanel({
        path: cosmicAsset("isometric-preview.webp"),
        width: 4.15,
        height: 2.55,
        accent: 0xc8ff36,
        position: [-2.55, 0.75, 0.1],
        rotation: [-0.03, 0.28, -0.035],
      }),
    );

    const labIconTexture = textureLoader.load(cosmicAsset("claude-nexus-icon.webp"));
    labIconTexture.colorSpace = THREE.SRGBColorSpace;
    const labIcon = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.55, 1.55), [
      ...Array(4).fill(
        material(0x121821, { roughness: 0.32, metalness: 0.72 }),
      ),
      new THREE.MeshBasicMaterial({ map: labIconTexture, toneMapped: false }),
      new THREE.MeshBasicMaterial({ map: labIconTexture, toneMapped: false }),
    ]);
    labIcon.position.set(-2.1, -1.45, 0);
    labIcon.rotation.set(0.28, -0.55, 0.1);
    addEdges(labIcon, 0x3976ff, 0.8);
    lab.add(labIcon);
    animatedObjects.push(labIcon);

    const labRing = createOrbit(2.2, 0x3976ff, 0.75, 0.02);
    labRing.position.set(-2.1, -1.45, 0);
    labRing.rotation.x = 0.9;
    lab.add(labRing);

    const rideLog = new THREE.Group();
    rideLog.position.set(15, 0, -66);
    world.add(rideLog);

    const rideLogPanels = [
      {
        path: cyclingAsset("ride-01-flat-tire-tools.webp"),
        width: 1.78,
        height: 1.34,
        accent: 0xff654b,
        position: [-2.45, 1.16, 0.05],
        rotation: [-0.04, 0.24, -0.04],
      },
      {
        path: cyclingAsset("ride-02-flat-tire-repair.webp"),
        width: 1.48,
        height: 1.12,
        accent: 0xc8ff36,
        position: [-1.28, -1.48, -0.2],
        rotation: [0.04, 0.18, 0.05],
      },
      {
        path: cyclingAsset("ride-03-tankou-camp.webp"),
        width: 1.64,
        height: 1.23,
        accent: 0x59e6ff,
        position: [0.15, 1.58, -0.35],
        rotation: [-0.02, -0.08, 0.02],
      },
      {
        path: cyclingAsset("ride-04-shuikou-bike.webp"),
        width: 2.05,
        height: 1.16,
        accent: 0xc8ff36,
        position: [1.72, 0.25, 0],
        rotation: [-0.025, -0.26, 0.035],
      },
      {
        path: cyclingAsset("ride-05-shuikou-town.webp"),
        width: 1.36,
        height: 1.02,
        accent: 0xffffff,
        position: [2.9, -1.36, -0.36],
        rotation: [0.04, -0.32, -0.03],
      },
      {
        path: cyclingAsset("ride-06-nanping-hotel.webp"),
        width: 1.34,
        height: 1.0,
        accent: 0x3976ff,
        position: [-3.05, -0.68, -0.45],
        rotation: [0.03, 0.3, 0.025],
      },
      {
        path: cyclingAsset("ride-07-minjiang-rainbow.webp"),
        width: 1.58,
        height: 1.18,
        accent: 0xff654b,
        position: [0.95, -1.86, 0.1],
        rotation: [0.035, -0.16, -0.045],
      },
    ] satisfies readonly MediaPanelOptions[];

    rideLogPanels.forEach((panel) => {
      rideLog.add(createMediaPanel(panel));
    });

    // 详情层展示完整路线网；概览层只保留更密的入口编排，避免一下子把信息展开完。
    const rideRoutePoints = rideLogPanels.map(
      ({ position }) => new THREE.Vector3(position[0], position[1], 0.26),
    );
    const rideRoute = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(rideRoutePoints),
      new THREE.LineBasicMaterial({
        color: 0xc8ff36,
        transparent: true,
        opacity: 0.82,
      }),
    );
    rideLog.add(rideRoute);

    rideRoutePoints.forEach((point, index) => {
      const marker = new THREE.Mesh(
        new THREE.IcosahedronGeometry(index === 0 || index === rideRoutePoints.length - 1 ? 0.18 : 0.12, 1),
        new THREE.MeshBasicMaterial({
          color: index === rideRoutePoints.length - 1 ? 0xff654b : 0xc8ff36,
        }),
      );
      marker.position.copy(point);
      rideLog.add(marker);
      floatingObjects.push({
        object: marker,
        baseY: marker.position.y,
        phase: index * 0.65,
        amplitude: 0.08,
      });
    });

    const rideLogOrbit = createOrbit(3.75, 0xff654b, 0.38, 0.016);
    rideLogOrbit.rotation.set(0.55, -0.42, 0.35);
    rideLog.add(rideLogOrbit);

    // 主线站点 03-05 在开源分支之后继续。
    const internship = new THREE.Group();
    internship.position.set(isMobile ? -0.6 : -2.3, 0.25, -42);
    world.add(internship);

    internship.add(
      createMediaPanel({
        path: cosmicAsset("avatar.webp"),
        width: 2.75,
        height: 2.75,
        accent: 0x59e6ff,
        position: [-1.35, 0.1, -0.15],
        rotation: [0.02, 0.24, -0.035],
      }),
    );

    for (let index = 0; index < 5; index += 1) {
      const height = 0.8 + index * 0.48;
      const column = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, height, 0.38),
        material(index === 4 ? 0xc8ff36 : 0x3976ff, {
          roughness: 0.28,
          metalness: 0.76,
          emissive: index === 4 ? 0x456b00 : 0x102d77,
          emissiveIntensity: 0.46,
        }),
      );
      column.position.set(-1.0 + index * 0.48, height * 0.5 - 1.2, 0.08);
      internship.add(column);
      addEdges(column, index === 4 ? 0xc8ff36 : 0x59e6ff, 0.62);
    }
    const internshipOrbit = createOrbit(3.05, 0x59e6ff, 0.38, 0.012);
    internshipOrbit.rotation.set(0.86, 0.28, 0.14);
    internship.add(internshipOrbit);
    addOrbitalNodes(internship, 0xc8ff36, 3.2, 10);
    const internshipLabel = createTextSprite("TEAM / OUTCOME", "#c8ff36", 0.42);
    internshipLabel.position.set(0.4, -2.5, 0.2);
    internshipLabel.visible = false;
    internship.add(internshipLabel);

    const createCollaborationStation = (
      title: string,
      accent: number,
      positionX: number,
      columnCount: number,
    ): THREE.Group => {
      const station = new THREE.Group();
      station.position.set(positionX, 0.2, -42);
      world.add(station);
      const label = createTextSprite(title, `#${accent.toString(16).padStart(6, "0")}`, 0.46);
      label.position.set(-1.45, 1.7, 0.1);
      station.add(label);
      for (let index = 0; index < columnCount; index += 1) {
        const height = 0.72 + (index % 5) * 0.3;
        const column = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, height, 0.32),
          material(index % 3 === 0 ? accent : 0x3976ff, {
            roughness: 0.28,
            metalness: 0.74,
            emissive: index % 3 === 0 ? accent : 0x102d77,
            emissiveIntensity: index % 3 === 0 ? 0.32 : 0.44,
          }),
        );
        column.position.set(
          -1.52 + (index % 6) * 0.56,
          height * 0.5 - 1.15 + Math.floor(index / 6) * 0.52,
          ((index % 2) - 0.5) * 0.28,
        );
        station.add(column);
        addEdges(column, index % 3 === 0 ? accent : 0x59e6ff, 0.58);
      }
      const orbit = createOrbit(2.72, accent, 0.42, 0.013);
      orbit.rotation.set(0.82, 0.2 + positionX * 0.01, 0.16);
      station.add(orbit);
      addOrbitalNodes(station, accent, 2.9, 8);
      return station;
    };

    const desktopCollab = createCollaborationStation(
      `DSH DESKTOP / ${metricValue("dsh-desktop-contribution", "MERGED PRS", "40")} PRS`,
      0xc8ff36,
      -17,
      12,
    );
    const tuiCollab = createCollaborationStation(
      `DSH TUI / ${metricValue("dsh-tui-contribution", "MERGED PRS", "30")} PRS`,
      0x59e6ff,
      0,
      10,
    );
    const webCollab = createCollaborationStation(
      `DSH WEB UI / ${metricValue("dsh-web-ui-contribution", "MERGED PRS", "09")} PRS`,
      0xff654b,
      17,
      7,
    );

    const life = new THREE.Group();
    life.position.set(isMobile ? 0.8 : 2.5, 0.2, -66);
    world.add(life);

    // 概览层把骑行经历压成一张主图和几张节点图，先给右侧留出“可展开”的入口感。
    const rideOverviewPanels = [
      {
        path: cyclingAsset("ride-04-shuikou-bike.webp"),
        width: 4.45,
        height: 2.54,
        accent: 0xc8ff36,
        position: [1.45, 0.25, 0],
        rotation: [-0.04, -0.18, 0.025],
      },
      {
        path: cyclingAsset("ride-03-tankou-camp.webp"),
        width: 1.5,
        height: 1.12,
        accent: 0x59e6ff,
        position: [-2.05, 1.38, -0.42],
        rotation: [-0.02, 0.28, -0.035],
      },
      {
        path: cyclingAsset("ride-02-flat-tire-repair.webp"),
        width: 1.42,
        height: 1.08,
        accent: 0xffffff,
        position: [-1.85, -1.42, -0.6],
        rotation: [0.045, 0.16, 0.04],
      },
      {
        path: cyclingAsset("ride-01-flat-tire-tools.webp"),
        width: 1.34,
        height: 1.02,
        accent: 0x3976ff,
        position: [0.12, 1.88, -0.44],
        rotation: [-0.03, -0.04, 0.025],
      },
      {
        path: cyclingAsset("ride-07-minjiang-rainbow.webp"),
        width: 1.8,
        height: 1.34,
        accent: 0xff654b,
        position: [2.85, -1.52, -0.7],
        rotation: [0.05, -0.34, -0.045],
      },
      {
        path: cyclingAsset("ride-05-shuikou-town.webp"),
        width: 1.36,
        height: 1.02,
        accent: 0xc8ff36,
        position: [3.05, 0.48, -0.34],
        rotation: [0.02, -0.2, 0.03],
      },
    ] satisfies readonly MediaPanelOptions[];

    rideOverviewPanels.forEach((panel) => {
      life.add(createMediaPanel(panel));
    });

    const rideOverviewPairs: Array<
      readonly [Vector3Tuple, Vector3Tuple]
    > = [
      [rideOverviewPanels[0].position, rideOverviewPanels[1].position],
      [rideOverviewPanels[0].position, rideOverviewPanels[2].position],
      [rideOverviewPanels[0].position, rideOverviewPanels[3].position],
      [rideOverviewPanels[0].position, rideOverviewPanels[4].position],
      [rideOverviewPanels[0].position, rideOverviewPanels[5].position],
      [rideOverviewPanels[1].position, rideOverviewPanels[3].position],
      [rideOverviewPanels[2].position, rideOverviewPanels[4].position],
      [rideOverviewPanels[3].position, rideOverviewPanels[5].position],
    ];
    const rideOverviewGeometry = new THREE.BufferGeometry();
    rideOverviewGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        rideOverviewPairs.flatMap(([from, to]) => [...from, ...to]),
        3,
      ),
    );
    const rideOverviewLinks = new THREE.LineSegments(
      rideOverviewGeometry,
      new THREE.LineBasicMaterial({
        color: 0xd9e36c,
        transparent: true,
        opacity: 0.68,
      }),
    );
    life.add(rideOverviewLinks);

    const rideCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.8, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x3976ff,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
        emissive: 0x183d9c,
        emissiveIntensity: 1.2,
      }),
    );
    rideCore.position.set(-0.08, 1.72, -0.62);
    life.add(rideCore);
    animatedObjects.push(rideCore);

    const repairMarker = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.1, 12, 44),
      material(0xff654b, {
        roughness: 0.24,
        metalness: 0.64,
        emissive: 0x481108,
        emissiveIntensity: 0.7,
      }),
    );
    repairMarker.position.set(-2.4, -1.35, 0.05);
    life.add(repairMarker);
    animatedObjects.push(repairMarker);

    const lifeOrbit = createOrbit(3.55, 0xff654b, 0.46, 0.018);
    lifeOrbit.rotation.set(0.55, -0.42, 0.35);
    life.add(lifeOrbit);
    addOrbitalNodes(life, 0xffffff, 3.75, 10);
    const lifeLabel = createTextSprite("MINHOU → SHAOSHAN", "#ff654b", 0.44);
    lifeLabel.position.set(0, -2.65, 0.2);
    lifeLabel.visible = false;
    life.add(lifeLabel);

    const finalWorld = new THREE.Group();
    finalWorld.position.set(isMobile ? -0.5 : -2.1, 0.2, -90);
    finalWorld.visible = false;
    world.add(finalWorld);

    finalWorld.add(
      createMediaPanel({
        path: cosmicAsset("isometric-preview.webp"),
        width: 4.1,
        height: 2.52,
        accent: 0xc8ff36,
        position: [-1.45, 0.05, -0.05],
        rotation: [-0.035, 0.24, -0.025],
      }),
    );

    const portalOuter = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.18, 20, 160),
      material(0xc8ff36, {
        roughness: 0.18,
        metalness: 0.76,
        emissive: 0x456b00,
        emissiveIntensity: 1.6,
      }),
    );
    portalOuter.position.set(0.15, 1.55, -0.5);
    finalWorld.add(portalOuter);
    animatedObjects.push(portalOuter);

    const portalInner = new THREE.Mesh(
      new THREE.TorusGeometry(1.58, 0.045, 10, 140),
      new THREE.MeshBasicMaterial({
        color: 0x3976ff,
        transparent: true,
        opacity: 0.88,
      }),
    );
    portalInner.position.copy(portalOuter.position);
    portalInner.rotation.x = 0.28;
    portalInner.rotation.y = 0.2;
    finalWorld.add(portalInner);
    animatedObjects.push(portalInner);

    const tidalUniforms = {
      uTime: { value: 0 },
      uProximity: { value: 0 },
    };
    const portalSurface = new THREE.Mesh(
      new THREE.CircleGeometry(1.48, 96),
      new THREE.ShaderMaterial({
        uniforms: tidalUniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        uniform float uTime;
        uniform float uProximity;
        varying vec2 vUv;

        void main() {
          vec2 centered = vUv - 0.5;
          float radius = length(centered);
          float ripple = sin(vUv.y * 46.0 + uTime * 1.7);
          ripple += sin(vUv.x * 24.0 - uTime * 1.1) * 0.5;
          float horizon = smoothstep(0.56, 0.38, abs(vUv.y - 0.48));
          vec3 deep = vec3(0.01, 0.035, 0.08);
          vec3 water = vec3(0.035, 0.36, 0.52);
          vec3 foam = vec3(0.35, 0.9, 1.0);
          vec3 color = mix(deep, water, vUv.y + ripple * 0.025);
          color = mix(color, foam, max(0.0, ripple) * 0.12 * horizon);
          float edge = smoothstep(0.5, 0.43, radius);
          float pulse = 0.68 + sin(uTime * 1.4) * 0.08;
          gl_FragColor = vec4(color, edge * pulse * (0.24 + uProximity * 0.72));
        }
      `,
      }),
    );
    portalSurface.position.set(0.15, 1.55, -0.62);
    finalWorld.add(portalSurface);

    const qCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85, 1),
      material(0xffffff, {
        roughness: 0.18,
        metalness: 0.9,
        emissive: 0x3976ff,
        emissiveIntensity: 0.55,
      }),
    );
    qCore.position.copy(portalOuter.position);
    finalWorld.add(qCore);
    animatedObjects.push(qCore);

    const finalLabel = createTextSprite("BUILD USEFUL THINGS", "#c8ff36", 0.5);
    finalLabel.position.set(-0.5, -2.65, 0);
    finalLabel.visible = false;
    finalWorld.add(finalLabel);

    if (isMobile) {
      internshipLabel.visible = false;
      lifeLabel.visible = false;
      finalLabel.visible = false;
    }

    // 这两组列表定义两条导航轴，避免场景直接耦合按钮或 DOM 面板。
    const overviewStations = [
      origin,
      openSourceHub,
      internship,
      life,
      finalWorld,
    ];
    const detailStationSpecs = [
      { collectionId: "open-source", itemIndex: 0, station: nexus },
      { collectionId: "open-source", itemIndex: 1, station: roadmap },
      { collectionId: "open-source", itemIndex: 2, station: lab },
      { collectionId: "internship", itemIndex: 0, station: desktopCollab },
      { collectionId: "internship", itemIndex: 1, station: tuiCollab },
      { collectionId: "internship", itemIndex: 2, station: webCollab },
      { collectionId: "life", itemIndex: 0, station: rideLog },
    ] as const;
    const detailStations = detailStationSpecs.map(({ station }) => station);

    if (isMobile) {
      openSourceHub.position.y = 1.75;
      nexus.position.y = 1.85;
      roadmap.position.y = 1.9;
      lab.position.y = 1.9;
      rideLog.position.y = 1.9;
      internship.position.y = 1.65;
      desktopCollab.position.y = 1.75;
      tuiCollab.position.y = 1.75;
      webCollab.position.y = 1.75;
      life.position.y = 1.7;
      finalWorld.position.y = 1.9;
    }

    // 保存作者设定的不透明度，让转场淡入淡出可以无损恢复。
    [...overviewStations, ...detailStations].forEach((station) => {
      station.traverse((child) => {
        materialsOf(child).forEach((childMaterial) => {
          childMaterial.userData.baseOpacity = childMaterial.opacity;
          childMaterial.transparent = true;
        });
      });
    });

    const tunnel = new THREE.Group();
    world.add(tunnel);
    const tunnelRingCount = scaledEffectCount(20);
    for (let index = 0; index < tunnelRingCount; index += 1) {
      const ring = createOrbit(6.5 + (index % 3) * 0.35, 0x3976ff, 0.09, 0.008);
      ring.position.z = 5 - index * 5.2;
      ring.rotation.z = index * 0.22;
      tunnel.add(ring);
    }

    const branchTunnel = new THREE.Group();
    world.add(branchTunnel);
    const branchRingCount = scaledEffectCount(12);
    for (let index = 0; index < branchRingCount; index += 1) {
      const ring = createOrbit(6.2 + (index % 3) * 0.28, 0xff654b, 0.07, 0.008);
      ring.position.x = 6 + index * 5.2;
      ring.position.z = -18;
      ring.rotation.y = Math.PI / 2;
      ring.rotation.z = index * 0.19;
      branchTunnel.add(ring);
    }
    branchTunnel.traverse((child) => {
      materialsOf(child).forEach((childMaterial) => {
        childMaterial.userData.baseOpacity = childMaterial.opacity;
        childMaterial.transparent = true;
      });
    });

    const particleCapacity = isMobile ? 520 : 1300;
    const particlePositions = new Float32Array(particleCapacity * 3);
    const particleColors = new Float32Array(particleCapacity * 3);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x3976ff),
      new THREE.Color(0xc8ff36),
      new THREE.Color(0xff654b),
    ];

    for (let index = 0; index < particleCapacity; index += 1) {
      const offset = index * 3;
      const onBranch = index % 3 === 0;
      particlePositions[offset] = onBranch
        ? Math.random() * 72
        : (Math.random() - 0.5) * 22;
      particlePositions[offset + 1] = (Math.random() - 0.5) * 12;
      particlePositions[offset + 2] = onBranch
        ? -18 + (Math.random() - 0.5) * 12
        : 12 - Math.random() * 124;
      const color = palette[index % palette.length];
      particleColors[offset] = color.r;
      particleColors[offset + 1] = color.g;
      particleColors[offset + 2] = color.b;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    particlesGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3),
    );

    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        size: isMobile ? 0.035 : 0.045,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.68,
        vertexColors: true,
        depthWrite: false,
      }),
    );
    scene.add(particles);

    // 相机路径作为数据维护：总览沿 Z 轴推进，详情分别进入开源、协作与生活支线。
    const overviewPath: CameraPath = {
      positions: [
        new THREE.Vector3(0, 0.2, 10.5),
        new THREE.Vector3(0.9, 0.2, -7),
        new THREE.Vector3(1.1, 0.2, -31),
        new THREE.Vector3(-1.2, 0.2, -55),
        new THREE.Vector3(-0.8, 0.3, -79),
      ],
      targets: [
        new THREE.Vector3(0.45, 0.15, 0),
        new THREE.Vector3(0.7, 0.15, -18),
        new THREE.Vector3(-0.8, 0.15, -42),
        new THREE.Vector3(0.8, 0.1, -66),
        new THREE.Vector3(-0.75, 0.2, -90),
      ],
    };

    const openSourceDetailPath: CameraPath = {
      positions: [
        new THREE.Vector3(15, 0.15, -8.5),
        new THREE.Vector3(30, 0.15, -8.5),
        new THREE.Vector3(45, 0.15, -8.5),
      ],
      targets: [
        new THREE.Vector3(14.3, 0.1, -18),
        new THREE.Vector3(30.8, 0.1, -18),
        new THREE.Vector3(45.7, 0.1, -18),
      ],
    };
    const collaborationDetailPath: CameraPath = {
      positions: [
        new THREE.Vector3(-17, 0.15, -32.5),
        new THREE.Vector3(0, 0.15, -32.5),
        new THREE.Vector3(17, 0.15, -32.5),
      ],
      targets: [
        new THREE.Vector3(-16.6, 0.12, -42),
        new THREE.Vector3(0.4, 0.12, -42),
        new THREE.Vector3(17.4, 0.12, -42),
      ],
    };
    const lifeDetailPath: CameraPath = {
      positions: [new THREE.Vector3(15, 0.15, -56.5)],
      targets: [new THREE.Vector3(14.3, 0.1, -66)],
    };
    const currentPosition = overviewPath.positions[0].clone();
    const currentTarget = overviewPath.targets[0].clone();
    const desiredPosition = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();
    let sceneProgress = 0;
    let activeScene = -1;
    let portalJourneyState: PortalJourneyState = "dormant";
    let portalPreloadStarted = false;
    let detailBlend = 0;
    const portalWorldPosition = new THREE.Vector3();
    const portalApproachPosition = new THREE.Vector3();

    const createWorldChoiceDescriptor = (
      targetWorldId: KnownWorldId,
    ): PortalDescriptor => {
      const base =
        targetWorldId === "jianghu"
          ? WORLD_PORTALS.archipelagoToJianghu
          : targetWorldId === "linework"
            ? WORLD_PORTALS.archipelagoToLinework
            : targetWorldId === "studio"
              ? WORLD_PORTALS.lineworkToStudio
              : WORLD_PORTALS.cosmicToArchipelago;
      const label =
        targetWorldId === WORLD_NAMING.archipelago.id
          ? "CHOOSE A WORLD"
          : `ENTER ${WORLD_NAMING[targetWorldId].chineseTitle}`;
      return {
        ...base,
        id: `cosmic-world-select-${targetWorldId}`,
        targetWorldId,
        eyebrow: `WORLD SELECT / ${WORLD_NAMING[targetWorldId].englishTitle.toUpperCase()}`,
        label,
        targetLabel: WORLD_NAMING[targetWorldId].englishTitle.toUpperCase(),
        getTransitionOrigin: () => {
          portalOuter.getWorldPosition(portalWorldPosition);
          portalWorldPosition.project(camera);
          return {
            x: (portalWorldPosition.x * 0.5 + 0.5) * window.innerWidth,
            y: (-portalWorldPosition.y * 0.5 + 0.5) * window.innerHeight,
          };
        },
        onStateChange: (state) => {
          portalJourneyState = state;
        },
      };
    };

    let activePortalTarget: KnownWorldId = WORLD_NAMING.archipelago.id;
    let portalRegistration: PortalRegistration = scope.portals.register(
      createWorldChoiceDescriptor(activePortalTarget),
    );

    const activateWorldPortal = (targetWorldId: KnownWorldId): void => {
      if (targetWorldId === WORLD_NAMING.cosmic.id) {
        document.querySelector("#origin")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      if (activePortalTarget !== targetWorldId) {
        portalRegistration.dispose();
        activePortalTarget = targetWorldId;
        portalRegistration = scope.portals.register(
          createWorldChoiceDescriptor(targetWorldId),
        );
      }
      portalRegistration.setProximity(1);
      portalRegistration.preload();
      portalRegistration.request();
    };

    worldChoiceButtons.forEach((button) => {
      const targetWorldId = button.dataset.worldChoice as KnownWorldId | undefined;
      if (!targetWorldId || !(targetWorldId in WORLD_NAMING)) return;
      const handleClick = () => activateWorldPortal(targetWorldId);
      const handlePreload = () => {
        if (targetWorldId !== WORLD_NAMING.cosmic.id) {
          if (activePortalTarget !== targetWorldId) {
            portalRegistration.dispose();
            activePortalTarget = targetWorldId;
            portalRegistration = scope.portals.register(
              createWorldChoiceDescriptor(targetWorldId),
            );
          }
          portalRegistration.setProximity(1);
          portalRegistration.preload();
        }
      };
      button.addEventListener("click", handleClick);
      button.addEventListener("pointerenter", handlePreload);
      button.addEventListener("focus", handlePreload);
      scope.resources.defer(() => {
        button.removeEventListener("click", handleClick);
        button.removeEventListener("pointerenter", handlePreload);
        button.removeEventListener("focus", handlePreload);
      });
    });

    scope.resources.defer(() => portalRegistration.dispose());
    const focusRegistration = scope.focus.register((focusId) =>
      scope.collections.focus(focusId),
    );
    const collectionRegistration = scope.collections.subscribe((navigation) => {
      scope.focus.commit(navigation.focusId);
    });
    scope.resources.defer(() => focusRegistration.dispose());
    scope.resources.defer(() => collectionRegistration.dispose());
    scope.resources.defer(() => scope.collections.exit());

    const readSceneProgress = (): number => scope.story.read().progress;

    const updateRoute = (index: number): void => {
      if (index === activeScene) return;
      activeScene = index;
      routeLinks.forEach((link, routeIndex) => {
        link.classList.toggle("is-active", routeIndex === activeScene);
      });
    };

    const setPathPoint = (progress: number): void => {
      const startIndex = Math.min(
        Math.floor(progress),
        overviewPath.positions.length - 1,
      );
      const endIndex = Math.min(
        startIndex + 1,
        overviewPath.positions.length - 1,
      );
      const local = progress - startIndex;
      desiredPosition.lerpVectors(
        overviewPath.positions[startIndex],
        overviewPath.positions[endIndex],
        local,
      );
      desiredTarget.lerpVectors(
        overviewPath.targets[startIndex],
        overviewPath.targets[endIndex],
        local,
      );
    };

    const applyQuality = (budget: QualityBudget): void => {
      quality = budget;
      const visibleParticleCount = Math.round(
        particleCapacity * budget.effectDensity,
      );
      particlesGeometry.setDrawRange(0, visibleParticleCount);
      particles.visible = visibleParticleCount > 0;
    };

    const render = ({ elapsed, delta }: FrameContext): void => {
      const animationDelta = Math.min(delta, 0.1);

      sceneProgress = readSceneProgress();
      const navigation = scope.collections.read();
      const isDetail = navigation.mode === "detail";
      const frameScale = animationDelta * 60;
      const dampingScale = Math.max(frameScale, 1);
      // 进入或离开项目集合时在路径间混合，避免相机瞬移。
      detailBlend = THREE.MathUtils.lerp(
        detailBlend,
        isDetail ? 1 : 0,
        reducedMotion.matches ? 1 : 1 - Math.pow(1 - 0.075, dampingScale),
      );

      if (isDetail) {
        const detailPath =
          navigation.collectionId === "life"
            ? lifeDetailPath
            : navigation.collectionId === "internship"
              ? collaborationDetailPath
              : openSourceDetailPath;
        const itemIndex = Math.min(
          navigation.itemIndex,
          detailPath.positions.length - 1,
        );
        desiredPosition.copy(detailPath.positions[itemIndex]);
        desiredTarget.copy(detailPath.targets[itemIndex]);
      } else {
        setPathPoint(sceneProgress);
      }

      const crossing =
        portalJourneyState === "preparing" || portalJourneyState === "crossing";
      if (crossing && !reducedMotion.matches) {
        portalOuter.getWorldPosition(portalWorldPosition);
        portalApproachPosition.copy(portalWorldPosition);
        portalApproachPosition.z += 5.4;
        desiredPosition.lerp(portalApproachPosition, 0.2);
        desiredTarget.lerp(portalWorldPosition, 0.28);
      }

      const damping = reducedMotion.matches
        ? 1
        : 1 - Math.pow(1 - 0.065, dampingScale);
      currentPosition.lerp(desiredPosition, damping);
      currentTarget.lerp(desiredTarget, damping);

      const pointerStrength = reducedMotion.matches || isMobile ? 0 : 0.18;
      camera.position.copy(currentPosition);
      camera.position.x += pointer.x * pointerStrength;
      camera.position.y -= pointer.y * pointerStrength;
      camera.lookAt(currentTarget);

      const portalProximity = isDetail
        ? 0
        : THREE.MathUtils.smoothstep(
            sceneProgress,
            overviewPath.positions.length - 1.58,
            overviewPath.positions.length - 1.02,
          );
      portalRegistration.setProximity(portalProximity);
      if (!portalPreloadStarted && portalProximity >= 0.28) {
        portalPreloadStarted = true;
        portalRegistration.preload();
      }
      tidalUniforms.uTime.value = elapsed;
      tidalUniforms.uProximity.value = Math.max(
        portalProximity,
        crossing ? 1 : 0,
      );
      portalOuter.scale.setScalar(crossing ? 1.16 : 1);
      (portalOuter.material as THREE.MeshStandardMaterial).emissiveIntensity =
        crossing ? 4.2 : 1.6;
      if (crossing && !reducedMotion.matches) {
        portalInner.rotation.z += 0.055 * frameScale;
      }
      qCore.scale.setScalar(
        THREE.MathUtils.lerp(1, crossing ? 0.08 : 0.42, portalProximity),
      );
      qCore.material.opacity = 1 - portalProximity * 0.68;

      if (!reducedMotion.matches && quality.effectDensity > 0) {
        animatedObjects.forEach((object, index) => {
          object.rotation.y += (0.0016 + (index % 4) * 0.00025) * frameScale;
          object.rotation.z +=
            (index % 2 === 0 ? 0.0007 : -0.00045) * frameScale;
        });

        floatingObjects.forEach(({ object, baseY, phase, amplitude }) => {
          object.position.y =
            baseY + Math.sin(elapsed * 0.8 + phase) * amplitude;
        });

        particles.rotation.z = elapsed * 0.006;
        particles.position.y = Math.sin(elapsed * 0.12) * 0.12;
      }

      // 只显示附近站点：既是视觉转场，也能降低低性能设备的 fill-rate 压力。
      overviewStations.forEach((station, index) => {
        const distance = Math.abs(sceneProgress - index);
        const visibility =
          THREE.MathUtils.clamp(1 - Math.max(0, distance - 0.4) / 0.35, 0, 1) *
          (1 - detailBlend);
        station.visible = visibility > 0.01;
        const mobileScale = isMobile && index > 0 ? 0.6 : 1;
        station.scale.setScalar((0.82 + visibility * 0.18) * mobileScale);
        station.traverse((child) => {
          materialsOf(child).forEach((childMaterial) => {
            childMaterial.opacity =
              (childMaterial.userData.baseOpacity ?? 1) * visibility;
          });
        });
      });

      detailStationSpecs.forEach(({ collectionId, itemIndex, station }) => {
        const belongs = navigation.collectionId === collectionId;
        const distance = belongs
          ? Math.abs(navigation.itemIndex - itemIndex)
          : Number.POSITIVE_INFINITY;
        const visibility =
          detailBlend *
          THREE.MathUtils.clamp(1 - Math.max(0, distance - 0.18) / 0.52, 0, 1);
        station.visible = visibility > 0.01;
        const mobileScale = isMobile ? 0.62 : 1;
        station.scale.setScalar((0.88 + visibility * 0.12) * mobileScale);
        station.traverse((child) => {
          materialsOf(child).forEach((childMaterial) => {
            childMaterial.opacity =
              (childMaterial.userData.baseOpacity ?? 1) * visibility;
          });
        });
      });

      const branchVisibility =
        navigation.collectionId === "open-source" ? detailBlend : 0;
      branchTunnel.visible = branchVisibility > 0.01;
      branchTunnel.traverse((child) => {
        materialsOf(child).forEach((childMaterial) => {
          childMaterial.opacity =
            (childMaterial.userData.baseOpacity ?? 1) * branchVisibility;
        });
      });

      if (!isDetail) {
        updateRoute(Math.min(Math.round(sceneProgress), routeLinks.length - 1));
      }
    };

    // Runtime 拥有最终 render phase；Cosmic 只贡献场景状态更新。
    scope.render.publish({ scene, camera });
    const frameRegistration = scope.frame.add("animation", render);
    scope.resources.defer(() => frameRegistration.dispose());
    const qualityRegistration = scope.lifecycle.onQuality(applyQuality);
    scope.resources.defer(() => qualityRegistration.dispose());

    // World 被替换或体验结束时释放 GPU 分配，避免跨 Session 残留。
    scope.resources.defer(() => {
      const textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        (object as GeometryObject).geometry?.dispose();
        materialsOf(object).forEach((objectMaterial) => {
          for (const value of Object.values(objectMaterial)) {
            if (value instanceof THREE.Texture) textures.add(value);
          }
          objectMaterial.dispose();
        });
      });
      textures.forEach((texture) => texture.dispose());
      scene.clear();
    });
  },
};
