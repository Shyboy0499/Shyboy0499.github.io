// Portal UI 和事务性世界切换的协调器；它负责状态与快照遮罩，不直接创建 World。
// 真正的 World Session 交换由 Runtime 在 navigate 回调中完成。
import type {
  PortalDescriptor,
  PortalJourneyState,
  PortalPort,
  PortalRegistration,
  QualityBudget,
} from "./contracts";

interface PortalElements {
  root: HTMLElement;
  trigger: HTMLButtonElement;
  eyebrow: HTMLElement;
  label: HTMLElement;
  target: HTMLElement;
  transition: HTMLElement;
  snapshot: HTMLImageElement;
  status: HTMLElement;
}

type SnapshotCapture = () => Promise<Blob | null>;
type WorldNavigator = (
  targetWorldId: string,
  focusId: string | null,
  signal: AbortSignal,
  source: "portal" | "history",
) => Promise<boolean>;
type WorldPreloader = (targetWorldId: string) => Promise<void>;
type TransitionMode = QualityBudget["portalMode"];

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export class PortalDirector implements PortalPort {
  private readonly elements: PortalElements | null;
  private readonly captureSnapshot: SnapshotCapture;
  private readonly reducedMotion: MediaQueryList;
  private readonly navigate: WorldNavigator;
  private readonly transitionMode: () => TransitionMode;
  private readonly preloadWorld: WorldPreloader;
  private descriptor: PortalDescriptor | null = null;
  private journeySourceDescriptor: PortalDescriptor | null = null;
  private state: PortalJourneyState = "dormant";
  private proximity = 0;
  private generation = 0;
  private journey: AbortController | null = null;
  private snapshotUrl: string | null = null;

  constructor(
    captureSnapshot: SnapshotCapture,
    reducedMotion: MediaQueryList,
    navigate: WorldNavigator,
    transitionMode: () => TransitionMode = () => "snapshot",
    preloadWorld: WorldPreloader = async () => undefined,
  ) {
    this.captureSnapshot = captureSnapshot;
    this.reducedMotion = reducedMotion;
    this.navigate = navigate;
    this.transitionMode = transitionMode;
    this.preloadWorld = preloadWorld;
    this.elements = this.readElements();
    this.elements?.trigger.addEventListener("click", this.handleRequest);
    document.addEventListener("keydown", this.handleKeydown);
  }

  register(descriptor: PortalDescriptor): PortalRegistration {
    const journeyActive = this.isJourneyActive();
    if (this.descriptor && !journeyActive) {
      throw new Error("Only one active Portal may be registered per World.");
    }

    this.descriptor = descriptor;
    if (journeyActive) {
      // Journey 的覆盖层属于来源 Portal；目标 Portal 只接过状态，不提前替换视觉主题。
      descriptor.onStateChange?.(this.state);
    } else {
      this.renderDescriptor(descriptor);
      this.setState("dormant");
    }

    return {
      setProximity: (value) => this.setProximity(value),
      preload: () => {
        void this.preloadWorld(descriptor.targetWorldId).catch(() => undefined);
      },
      request: () => this.requestJourney(descriptor),
      dispose: () => {
        if (this.descriptor !== descriptor) return;
        this.descriptor = null;
        this.proximity = 0;
        this.setState("dormant");
        if (this.elements) this.elements.root.hidden = true;
      },
    };
  }

  navigateFromHistory(
    targetWorldId: string,
    focusId: string | null,
  ): Promise<boolean> {
    return this.runJourney(targetWorldId, focusId, "history");
  }

  dispose(): void {
    this.cancelJourney();
    this.elements?.trigger.removeEventListener("click", this.handleRequest);
    document.removeEventListener("keydown", this.handleKeydown);
    this.releaseSnapshot();
    this.journeySourceDescriptor = null;
    document.body.classList.remove("portal-journey-active");
    delete document.documentElement.dataset.portalJourney;
    delete document.documentElement.dataset.portalMode;
  }

  private readElements(): PortalElements | null {
    const root = document.querySelector<HTMLElement>("[data-portal-layer]");
    const trigger =
      document.querySelector<HTMLButtonElement>("[data-portal-trigger]");
    const eyebrow = document.querySelector<HTMLElement>(
      "[data-portal-eyebrow]",
    );
    const label = document.querySelector<HTMLElement>("[data-portal-label]");
    const target = document.querySelector<HTMLElement>("[data-portal-target]");
    const transition = document.querySelector<HTMLElement>(
      "[data-portal-transition]",
    );
    const snapshot =
      document.querySelector<HTMLImageElement>("[data-portal-snapshot]");
    const status = document.querySelector<HTMLElement>("[data-portal-status]");

    if (
      !root ||
      !trigger ||
      !eyebrow ||
      !label ||
      !target ||
      !transition ||
      !snapshot ||
      !status
    ) {
      return null;
    }

    return {
      root,
      trigger,
      eyebrow,
      label,
      target,
      transition,
      snapshot,
      status,
    };
  }

  private setProximity(value: number): void {
    if (!this.descriptor || this.isJourneyActive()) return;
    this.proximity = clamp(value);
    this.elements?.root.style.setProperty(
      "--portal-proximity",
      this.proximity.toFixed(3),
    );

    if (this.proximity >= 0.82) this.setState("armed");
    else if (this.proximity >= 0.28) this.setState("hinted");
    else this.setState("dormant");
  }

  private setState(state: PortalJourneyState): void {
    this.state = state;
    if (this.elements) {
      this.elements.root.dataset.state = state;
      this.elements.trigger.disabled = state !== "armed";
      const transitionVisible =
        state === "crossing" ||
        state === "arriving" ||
        state === "unavailable" ||
        state === "rollback";
      this.elements.transition.setAttribute("aria-hidden", String(!transitionVisible));
    }
    this.descriptor?.onStateChange?.(state);
  }

  private isJourneyActive(): boolean {
    return (
      this.state === "preparing" ||
      this.state === "crossing" ||
      this.state === "arriving" ||
      this.state === "unavailable" ||
      this.state === "rollback"
    );
  }

  private handleRequest = (): void => {
    if (!this.descriptor || this.state !== "armed") return;
    void this.runJourney(this.descriptor.targetWorldId, null, "portal");
  };

  private requestJourney(descriptor: PortalDescriptor): void {
    if (this.descriptor !== descriptor) return;
    if (this.state !== "armed") return;
    void this.runJourney(descriptor.targetWorldId, null, "portal");
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isJourneyCancellable()) {
      this.cancelAndRollback("JOURNEY CANCELLED");
    }
  };

  private async runJourney(
    targetWorldId: string,
    focusId: string | null,
    source: "portal" | "history",
  ): Promise<boolean> {
    // 重入 Journey 仍属于最初来源；目标 Portal 的注册不能改写回滚落点和转场原点。
    const sourceDescriptor =
      this.journeySourceDescriptor ?? this.descriptor;
    // AbortController 负责终止 Runtime 安装；generation 负责忽略无法取消的快照捕获续段。
    const generation = ++this.generation;
    this.cancelJourney();
    const journey = new AbortController();
    this.journey = journey;
    this.journeySourceDescriptor = sourceDescriptor;

    document.body.classList.add("portal-journey-active");
    document.documentElement.dataset.portalJourney = "preparing";
    const transitionMode = this.transitionMode();
    document.documentElement.dataset.portalMode = transitionMode;
    this.installTransitionOrigin(sourceDescriptor);
    this.updateStatus(
      this.journeySourceDescriptor?.transitionStatus?.preparing ??
        "PREPARING THE THRESHOLD",
    );
    this.setState("preparing");

    // 先把 preparing 状态交给来源 World，让门体完成一段可见蓄力，再用快照接管画面。
    await this.wait(
      this.reducedMotion.matches || transitionMode === "static" ? 20 : 420,
      journey.signal,
    );
    if (!this.isCurrent(generation, journey.signal)) return false;

    const snapshot =
      transitionMode === "static"
        ? null
        : await this.captureSnapshot().catch(() => null);
    if (!this.isCurrent(generation, journey.signal)) return false;
    this.installSnapshot(snapshot);
    document.documentElement.dataset.portalJourney = "crossing";
    this.updateStatus(
      this.journeySourceDescriptor?.transitionStatus?.crossing ??
        "CROSSING THE THRESHOLD",
    );
    this.setState("crossing");

    await this.wait(
      this.reducedMotion.matches
        ? 40
        : transitionMode === "static"
          ? 180
          : 800,
      journey.signal,
    );
    if (!this.isCurrent(generation, journey.signal)) return false;
    const committed = await this.navigate(
      targetWorldId,
      focusId,
      journey.signal,
      source,
    ).catch((error) => {
      if (journey.signal.aborted) return false;
      console.error(`[runtime] Portal target failed: ${targetWorldId}`, error);
      return false;
    });
    if (!this.isCurrent(generation, journey.signal)) return false;

    if (!committed) {
      this.updateStatus("TARGET WORLD IS STILL BEING PREPARED");
      this.setState("unavailable");
      await this.wait(this.reducedMotion.matches ? 120 : 1050, journey.signal);
      if (!this.isCurrent(generation, journey.signal)) return false;
      await this.rollback("RETURNING TO SOURCE WORLD");
      return false;
    }

    document.documentElement.dataset.portalJourney = "arriving";
    this.updateStatus(
      this.journeySourceDescriptor?.transitionStatus?.arriving ?? "WORLD READY",
    );
    this.setState("arriving");
    await this.wait(
      this.reducedMotion.matches
        ? 20
        : transitionMode === "static"
          ? 140
          : 560,
      journey.signal,
    );
    if (!this.isCurrent(generation, journey.signal)) return false;
    this.completeJourney();
    return true;
  }

  private cancelAndRollback(status: string): void {
    const sourceDescriptor = this.journeySourceDescriptor;
    this.generation += 1;
    // 先终止目标 World 的安装事务；回滚动画使用独立信号，避免被同一次取消同步跳过。
    this.cancelJourney();
    this.journey = new AbortController();
    this.journeySourceDescriptor = sourceDescriptor;
    void this.rollback(status);
  }

  private async rollback(status: string): Promise<void> {
    const journey = this.journey;
    if (!journey || journey.signal.aborted) return;
    document.documentElement.dataset.portalJourney = "rollback";
    this.updateStatus(status);
    this.setState("rollback");
    await this.wait(this.reducedMotion.matches ? 40 : 760, journey.signal);
    if (journey.signal.aborted) return;

    this.journey = null;
    if (this.journeySourceDescriptor) {
      this.descriptor = this.journeySourceDescriptor;
      this.renderDescriptor(this.journeySourceDescriptor);
    }
    this.journeySourceDescriptor = null;
    document.body.classList.remove("portal-journey-active");
    delete document.documentElement.dataset.portalJourney;
    delete document.documentElement.dataset.portalMode;
    this.releaseSnapshot();
    this.setState(this.proximity >= 0.82 ? "armed" : "hinted");
    this.elements?.trigger.focus({ preventScroll: true });
  }

  private completeJourney(): void {
    this.journey = null;
    this.journeySourceDescriptor = null;
    document.body.classList.remove("portal-journey-active");
    delete document.documentElement.dataset.portalJourney;
    delete document.documentElement.dataset.portalMode;
    this.releaseSnapshot();
    if (this.descriptor) this.renderDescriptor(this.descriptor);
    this.setState("dormant");
  }

  private cancelJourney(): void {
    this.journey?.abort();
    this.journey = null;
  }

  private isCurrent(generation: number, signal: AbortSignal): boolean {
    return generation === this.generation && !signal.aborted;
  }

  private updateStatus(message: string): void {
    if (this.elements) this.elements.status.textContent = message;
  }

  private renderDescriptor(descriptor: PortalDescriptor): void {
    if (!this.elements) return;
    this.elements.root.hidden = false;
    this.elements.root.dataset.transition =
      descriptor.transitionStyle ?? "threshold";
    this.elements.eyebrow.textContent = descriptor.eyebrow;
    this.elements.label.textContent = descriptor.label;
    this.elements.target.textContent = descriptor.targetLabel;
    this.elements.trigger.setAttribute(
      "aria-label",
      `${descriptor.label}：${descriptor.targetLabel}`,
    );
  }

  private isJourneyCancellable(): boolean {
    return (
      this.state === "preparing" ||
      this.state === "crossing" ||
      this.state === "unavailable"
    );
  }

  private installTransitionOrigin(descriptor: PortalDescriptor | null): void {
    if (!this.elements) return;
    const origin = descriptor?.getTransitionOrigin?.();
    const x = Number.isFinite(origin?.x)
      ? Math.min(window.innerWidth, Math.max(0, origin!.x))
      : window.innerWidth / 2;
    const y = Number.isFinite(origin?.y)
      ? Math.min(window.innerHeight, Math.max(0, origin!.y))
      : window.innerHeight / 2;
    this.elements.root.style.setProperty("--portal-origin-x", `${x}px`);
    this.elements.root.style.setProperty("--portal-origin-y", `${y}px`);
  }

  private installSnapshot(snapshot: Blob | null): void {
    this.releaseSnapshot();
    if (!snapshot || !this.elements) return;
    this.snapshotUrl = URL.createObjectURL(snapshot);
    this.elements.snapshot.src = this.snapshotUrl;
  }

  private releaseSnapshot(): void {
    if (this.snapshotUrl) URL.revokeObjectURL(this.snapshotUrl);
    this.snapshotUrl = null;
    if (this.elements) this.elements.snapshot.removeAttribute("src");
  }

  private wait(duration: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(resolve, duration);
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
