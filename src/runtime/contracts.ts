// Runtime 与 World 之间的共享契约层；这里只定义边界，不实现任何生命周期。
// World 只能通过这些端口访问渲染、资源、Portal、输入和故事进度。
import type * as THREE from "three";

export type WorldId = string;
export type AssetId = string;
export type ActivityLevel = "active" | "near" | "distant" | "dormant";
export type QualityTier = "high" | "balanced" | "low" | "static";

export interface QualityBudget {
  tier: QualityTier;
  pixelRatioCap: number;
  shadows: "dynamic" | "reduced" | "off";
  postProcessing: "full" | "reduced" | "off";
  effectDensity: number;
  animationRate: 60 | 30 | 15;
  portalMode: "live-dual" | "snapshot" | "static";
  preloadDepth: "next-world" | "critical-only" | "none";
}

export interface WorldManifest {
  id: WorldId;
  title: string;
  entryPoster: AssetId;
  supportedActivities: readonly ActivityLevel[];
  assets: {
    critical: readonly AssetId[];
    deferred: readonly AssetId[];
    quality: Partial<Record<QualityTier, readonly AssetId[]>>;
  };
  budgets: {
    initialTransferKb: number;
    estimatedGpuMb: Partial<Record<QualityTier, number>>;
  };
  features: {
    audio: boolean;
    physics: boolean;
    postProcessing: boolean;
    livePortalBlend: boolean;
  };
}

export type FramePhase =
  | "animation"
  | "camera"
  | "effects"
  | "route"
  | "render";

export interface FrameContext {
  frame: number;
  elapsed: number;
  rawDelta: number;
  delta: number;
}

export interface Registration {
  dispose(): void;
}

export interface FramePort {
  add(
    phase: FramePhase,
    task: (frame: FrameContext) => void,
    priority?: number,
  ): Registration;
}

export interface ResourceScope {
  defer(cleanup: () => void): Registration;
  dispose(): void;
}

export interface StoryProgressSnapshot {
  progress: number;
  activeId: string;
}

export interface StoryProgressPort {
  read(): StoryProgressSnapshot;
  refresh(): void;
}

export interface InputPort {
  readonly pointer: THREE.Vector2;
}

export interface LoaderPort {
  readonly manager: THREE.LoadingManager;
  hide(): void;
}

export interface WorldFocusPort {
  read(): string | null;
  register(
    apply: (focusId: string | null) => boolean,
  ): Registration;
  commit(focusId: string | null): void;
}

export interface LifecyclePort {
  readonly activity: ActivityLevel;
  readonly quality: QualityBudget;
  onActivity(listener: (level: ActivityLevel) => void): Registration;
  onQuality(listener: (budget: QualityBudget) => void): Registration;
}

export type CollectionNavigationMode = "overview" | "detail";

export interface CollectionNavigationSnapshot {
  mode: CollectionNavigationMode;
  collectionId: string | null;
  focusId: string | null;
  itemIndex: number;
  itemCount: number;
}

export interface CollectionNavigationPort {
  read(): CollectionNavigationSnapshot;
  focus(focusId: string | null): boolean;
  subscribe(
    listener: (snapshot: CollectionNavigationSnapshot) => void,
  ): Registration;
  exit(): void;
}

export type PortalJourneyState =
  | "dormant"
  | "hinted"
  | "armed"
  | "preparing"
  | "crossing"
  | "arriving"
  | "unavailable"
  | "rollback";

export interface PortalTransitionOrigin {
  x: number;
  y: number;
}

export type PortalTransitionStyle =
  | "threshold"
  | "tidal"
  | "ink"
  | "starlight"
  | "paper"
  | "sketch"
  | "blueprint"
  | "aperture"
  | "draft"
  | "compass";

export interface PortalTransitionStatus {
  preparing: string;
  crossing: string;
  arriving: string;
}

export interface PortalDescriptor {
  id: string;
  targetWorldId: string;
  eyebrow: string;
  label: string;
  targetLabel: string;
  transitionStyle?: PortalTransitionStyle;
  transitionStatus?: PortalTransitionStatus;
  getTransitionOrigin?(): PortalTransitionOrigin;
  onStateChange?(state: PortalJourneyState): void;
}

export interface PortalRegistration extends Registration {
  setProximity(value: number): void;
  preload(): void;
  request(): void;
}

export interface PortalPort {
  register(descriptor: PortalDescriptor): PortalRegistration;
}

export interface RendererHost {
  readonly renderer: THREE.WebGLRenderer;
  readonly isMobile: boolean;
  setQuality(budget: QualityBudget): void;
  resetWorldState(): void;
  resize(): void;
  dispose(): void;
}

export interface RenderView {
  scene: THREE.Scene;
  camera: THREE.Camera;
  render?: () => void;
}

export interface RenderPort {
  publish(view: RenderView): void;
  current(): RenderView | null;
}

export interface WorldScope {
  readonly id: WorldId;
  readonly signal: AbortSignal;
  readonly manifest: WorldManifest;
  readonly frame: FramePort;
  readonly resources: ResourceScope;
  readonly lifecycle: LifecyclePort;
  readonly story: StoryProgressPort;
  readonly collections: CollectionNavigationPort;
  readonly input: InputPort;
  readonly loader: LoaderPort;
  readonly focus: WorldFocusPort;
  readonly portals: PortalPort;
  readonly rendering: RendererHost;
  readonly render: RenderPort;
  readonly reducedMotion: MediaQueryList;
}

export interface WorldModule {
  readonly manifest: WorldManifest;
  install(scope: WorldScope): Promise<void>;
}

export interface WorldRegistryEntry {
  readonly manifest: WorldManifest;
  load(): Promise<WorldModule>;
}

export type WorldRegistry = Record<WorldId, WorldRegistryEntry>;
