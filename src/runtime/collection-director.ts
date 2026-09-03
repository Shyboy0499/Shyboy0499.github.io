// 横向项目详情导航控制器；它拥有 DOM 状态和输入解释，World 只读取快照。
// 纵向故事进度仍由 StoryProgress 负责，二者避免互相改写 URL 或滚动结构。
import type {
  CollectionNavigationPort,
  CollectionNavigationSnapshot,
  Registration,
} from "./contracts";

type CollectionListener = (snapshot: CollectionNavigationSnapshot) => void;

const OVERVIEW: CollectionNavigationSnapshot = {
  mode: "overview",
  collectionId: null,
  focusId: null,
  itemIndex: 0,
  itemCount: 0,
};

export class CollectionDirector implements CollectionNavigationPort {
  private readonly enterButtons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-collection-enter]"),
  ];
  private readonly layer = document.querySelector<HTMLElement>(
    "[data-collection-detail]",
  );
  private readonly panels = [
    ...document.querySelectorAll<HTMLElement>("[data-collection-item]"),
  ];
  private readonly backButton = document.querySelector<HTMLButtonElement>(
    "[data-collection-exit]",
  );
  private readonly currentLabel = document.querySelector<HTMLElement>(
    "[data-collection-current]",
  );
  private readonly totalLabel = document.querySelector<HTMLElement>(
    "[data-collection-total]",
  );
  private readonly listeners = new Set<CollectionListener>();
  private readonly pageLinks = [
    ...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
  ];
  private snapshot: CollectionNavigationSnapshot = { ...OVERVIEW };
  private returnFocus: HTMLElement | null = null;
  private wheelCooldown = 0;
  private touchStartY: number | null = null;

  constructor() {
    this.enterButtons.forEach((button) =>
      button.addEventListener("click", this.handleEnter),
    );
    this.backButton?.addEventListener("click", this.handleExit);
    this.pageLinks.forEach((link) =>
      link.addEventListener("click", this.handlePageLink),
    );
    document.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("touchstart", this.handleTouchStart, {
      passive: true,
    });
    window.addEventListener("touchend", this.handleTouchEnd, {
      passive: true,
    });
    this.render();
  }

  read(): CollectionNavigationSnapshot {
    return { ...this.snapshot };
  }

  subscribe(listener: CollectionListener): Registration {
    this.listeners.add(listener);
    listener(this.read());
    return {
      dispose: () => this.listeners.delete(listener),
    };
  }

  focus(focusId: string | null): boolean {
    if (!focusId) {
      this.exit();
      return true;
    }
    const panel = this.panels.find(
      (candidate) => candidate.dataset.collectionFocus === focusId,
    );
    const collectionId = panel?.dataset.collectionItem;
    if (!panel || !collectionId) return false;
    const collectionPanels = this.panels.filter(
      (candidate) => candidate.dataset.collectionItem === collectionId,
    );
    const itemIndex = collectionPanels.indexOf(panel);
    if (itemIndex < 0) return false;

    this.snapshot = {
      mode: "detail",
      collectionId,
      focusId,
      itemIndex,
      itemCount: collectionPanels.length,
    };
    document.body.classList.add("collection-detail-active");
    document.documentElement.dataset.collectionMode = collectionId;
    this.render();
    this.emit();
    return true;
  }

  exit(): void {
    if (this.snapshot.mode === "overview") return;
    this.snapshot = { ...OVERVIEW };
    document.body.classList.remove("collection-detail-active");
    delete document.documentElement.dataset.collectionMode;
    this.render();
    this.emit();
    this.returnFocus?.focus({ preventScroll: true });
    this.returnFocus = null;
  }

  dispose(): void {
    this.exit();
    this.enterButtons.forEach((button) =>
      button.removeEventListener("click", this.handleEnter),
    );
    this.backButton?.removeEventListener("click", this.handleExit);
    this.pageLinks.forEach((link) =>
      link.removeEventListener("click", this.handlePageLink),
    );
    document.removeEventListener("keydown", this.handleKeydown);
    window.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("touchstart", this.handleTouchStart);
    window.removeEventListener("touchend", this.handleTouchEnd);
    this.listeners.clear();
  }

  private handleEnter = (event: Event): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const collectionId = button.dataset.collectionEnter;
    const itemCount = this.panels.filter(
      (panel) => panel.dataset.collectionItem === collectionId,
    ).length;
    if (!collectionId || itemCount === 0) return;

    this.returnFocus = button;
    this.snapshot = {
      mode: "detail",
      collectionId,
      focusId:
        this.panels.find(
          (panel) => panel.dataset.collectionItem === collectionId,
        )?.dataset.collectionFocus ?? null,
      itemIndex: 0,
      itemCount,
    };
    document.body.classList.add("collection-detail-active");
    document.documentElement.dataset.collectionMode = collectionId;
    this.render();
    this.emit();
    window.setTimeout(() => this.backButton?.focus({ preventScroll: true }), 450);
  };

  private handleExit = (): void => this.exit();

  private handlePageLink = (): void => {
    if (this.snapshot.mode === "detail") this.exit();
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    if (this.snapshot.mode !== "detail") return;
    if (event.key === "Escape") this.exit();
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      this.step(-1);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      this.step(1);
    }
  };

  private handleWheel = (event: WheelEvent): void => {
    if (this.snapshot.mode !== "detail") return;
    event.preventDefault();
    if (Math.abs(event.deltaY) < 18 || performance.now() < this.wheelCooldown) {
      return;
    }
    // 一次物理滚轮手势只切换一个项目，避免浏览器残余 wheel 事件连续翻页。
    this.wheelCooldown = performance.now() + 620;
    this.step(event.deltaY > 0 ? 1 : -1);
  };

  private handleTouchStart = (event: TouchEvent): void => {
    if (this.snapshot.mode !== "detail") return;
    this.touchStartY = event.changedTouches[0]?.clientY ?? null;
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    if (this.snapshot.mode !== "detail" || this.touchStartY === null) return;
    const endY = event.changedTouches[0]?.clientY;
    if (endY === undefined) return;
    const distance = endY - this.touchStartY;
    this.touchStartY = null;
    if (Math.abs(distance) < 54) return;
    this.step(distance > 0 ? -1 : 1);
  };

  private step(direction: -1 | 1): void {
    if (this.snapshot.mode !== "detail") return;
    // 从第一个项目继续反向移动时回到集合入口，保持“离开横向分支”的心智模型。
    if (direction === -1 && this.snapshot.itemIndex === 0) {
      this.exit();
      return;
    }
    const nextIndex = Math.min(
      this.snapshot.itemCount - 1,
      Math.max(0, this.snapshot.itemIndex + direction),
    );
    if (nextIndex === this.snapshot.itemIndex) return;
    const focusId = this.panels.filter(
      (panel) => panel.dataset.collectionItem === this.snapshot.collectionId,
    )[nextIndex]?.dataset.collectionFocus ?? null;
    this.snapshot = { ...this.snapshot, focusId, itemIndex: nextIndex };
    this.render();
    this.emit();
  }

  private render(): void {
    const isDetail = this.snapshot.mode === "detail";
    if (this.layer) {
      this.layer.setAttribute("aria-hidden", String(!isDetail));
      this.layer.toggleAttribute("inert", !isDetail);
    }

    let visibleIndex = 0;
    this.panels.forEach((panel) => {
      const belongs =
        panel.dataset.collectionItem === this.snapshot.collectionId;
      const active = isDetail && belongs && visibleIndex === this.snapshot.itemIndex;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", String(!active));
      if (belongs) visibleIndex += 1;
    });

    const current = this.snapshot.itemIndex + 1;
    if (this.currentLabel) {
      this.currentLabel.textContent = String(current).padStart(2, "0");
    }
    if (this.totalLabel) {
      this.totalLabel.textContent = String(this.snapshot.itemCount).padStart(2, "0");
    }
  }

  private emit(): void {
    const snapshot = this.read();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
