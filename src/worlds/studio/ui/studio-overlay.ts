// Studio UI 只负责环境控制、物件提示、Portfolio 详情面板和导览。
// 进入门槛已移除，World 一挂载就处于可交互状态；导览只复用 show/hide，不直接控制镜头。
import {
  portfolioCollectionById,
  portfolioHobbyById,
  portfolioPersonById,
  portfolioProjectById,
} from "../../../content/portfolio";
import type { StudioExhibitBinding, StudioExhibitId } from "../binding";
import type { StudioTargetId } from "../scene/studio-room";
import { t } from "../../../i18n";

interface StudioOverlayOptions {
  readonly bindings: readonly StudioExhibitBinding[];
  readonly onEnter: () => void;
  readonly onSelect: (id: StudioExhibitId | null) => void;
  readonly onLampToggle: () => boolean;
  readonly onNightChange: (night: boolean) => void;
}

interface DetailContent {
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly links: readonly { label: string; href: string }[];
  readonly images: readonly { src: string; alt: string }[];
}

const TARGET_LABELS: Record<StudioTargetId, string> = {
  workstation: t("打开主工作台", "Open the main workstation"),
  "roadmap-board": t("查看 DeepSeek 工具", "View the DeepSeek tools"),
  "contribution-frame": t("查看 Obsidian 工具", "View the Obsidian tool"),
  "research-poster": t("查看研究项目 precondition-library", "View the precondition-library research"),
  "latte-art": t("看看我的咖啡拉花", "See my latte art"),
  fishing: t("代码之外：钓鱼", "Beyond code: fishing"),
  gym: t("代码之外：健身", "Beyond code: the gym"),
  lamp: t("开关桌灯", "Toggle the desk lamp"),
  "portal-cosmic": t("穿过星门，前往宇宙世界", "Step through the star gate to Cosmic World"),
  "portal-linework": t("推开纸稿门，返回线稿世界", "Open the paper door back to Linework World"),
  "portal-archipelago": t("转动世界罗盘，前往群岛世界", "Spin the world compass to Archipelago World"),
};

export function createStudioOverlay(options: StudioOverlayOptions) {
  const root = document.createElement("div");
  root.className = "studio-ui-root";
  root.innerHTML = `
    <div class="studio-toolbar" aria-label="${t("工作室环境控制", "Studio controls")}">
      <button type="button" class="studio-tour-start" data-studio-tour-start>
        <span aria-hidden="true">&#9654;</span><b>${t("开始导览", "TAKE THE TOUR")}</b>
      </button>
      <button type="button" data-studio-lamp aria-label="${t("开关桌灯", "Toggle the desk lamp")}" aria-pressed="false">
        <span class="studio-toggle-dot"></span><b>LIGHT</b>
      </button>
      <button type="button" data-studio-time aria-label="${t("切换昼夜", "Toggle day and night")}" aria-pressed="false">
        <span class="studio-toggle-dot"></span><b>DAY / NIGHT</b>
      </button>
    </div>
    <nav class="studio-index" data-studio-index aria-label="${t("工作室展品", "Studio exhibits")}"></nav>
    <p class="studio-hint" data-studio-hint aria-live="polite"></p>
    <section class="studio-tour" data-studio-tour aria-label="${t("导览", "Guided tour")}" hidden>
      <p class="studio-tour-step" aria-live="polite">
        <span data-studio-tour-chapter></span><b data-studio-tour-count></b>
      </p>
      <div class="studio-tour-progress"><i data-studio-tour-bar></i></div>
      <div class="studio-tour-controls">
        <button type="button" data-studio-tour-prev>&#8249; ${t("上一站", "BACK")}</button>
        <button type="button" data-studio-tour-pause aria-pressed="false">${t("暂停", "PAUSE")}</button>
        <button type="button" data-studio-tour-next>${t("下一站", "NEXT")} &#8250;</button>
        <button type="button" data-studio-tour-end>${t("结束", "END TOUR")}</button>
      </div>
    </section>
    <aside class="studio-detail" data-studio-detail role="dialog" aria-modal="false" aria-labelledby="studio-detail-title" hidden inert>
      <button class="studio-close" type="button" data-studio-close aria-label="${t("关闭详情", "Close details")}">&#215;</button>
      <p class="studio-object" data-studio-object></p>
      <h2 id="studio-detail-title" data-studio-title></h2>
      <p class="studio-summary" data-studio-summary></p>
      <div class="studio-media" data-studio-media hidden></div>
      <p class="studio-description" data-studio-description></p>
      <div class="studio-tags" data-studio-tags></div>
      <nav class="studio-links" data-studio-links aria-label="${t("相关链接", "Related links")}"></nav>
    </aside>
  `;

  const index = root.querySelector<HTMLElement>("[data-studio-index]")!;
  const detail = root.querySelector<HTMLElement>("[data-studio-detail]")!;
  const closeButton = root.querySelector<HTMLButtonElement>("[data-studio-close]")!;
  const objectLabel = root.querySelector<HTMLElement>("[data-studio-object]")!;
  const title = root.querySelector<HTMLElement>("[data-studio-title]")!;
  const summary = root.querySelector<HTMLElement>("[data-studio-summary]")!;
  const description = root.querySelector<HTMLElement>("[data-studio-description]")!;
  const media = root.querySelector<HTMLElement>("[data-studio-media]")!;
  const tags = root.querySelector<HTMLElement>("[data-studio-tags]")!;
  const links = root.querySelector<HTMLElement>("[data-studio-links]")!;
  const hint = root.querySelector<HTMLElement>("[data-studio-hint]")!;
  const lampButton = root.querySelector<HTMLButtonElement>("[data-studio-lamp]")!;
  const timeButton = root.querySelector<HTMLButtonElement>("[data-studio-time]")!;
  const tourStart = root.querySelector<HTMLButtonElement>("[data-studio-tour-start]")!;
  const tour = root.querySelector<HTMLElement>("[data-studio-tour]")!;
  const tourChapter = root.querySelector<HTMLElement>("[data-studio-tour-chapter]")!;
  const tourCount = root.querySelector<HTMLElement>("[data-studio-tour-count]")!;
  const tourBar = root.querySelector<HTMLElement>("[data-studio-tour-bar]")!;
  const tourPause = root.querySelector<HTMLButtonElement>("[data-studio-tour-pause]")!;
  const indexButtons = new Map<StudioExhibitId, HTMLButtonElement>();
  let currentHint: StudioTargetId | null = null;
  let returnFocus: HTMLElement | null = null;
  // 导览当前站点；null 表示未在导览。站点顺序就是 binding 顺序：先作品，后代码之外。
  let tourIndex: number | null = null;

  options.bindings.forEach((binding, bindingIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", t(`打开 ${binding.objectLabel}`, `Open ${binding.objectLabel}`));
    const number = document.createElement("span");
    const label = document.createElement("b");
    number.textContent = String(bindingIndex + 1).padStart(2, "0");
    label.textContent = binding.objectLabel;
    button.append(number, label);
    index.append(button);
    indexButtons.set(binding.id, button);
  });

  const contentFor = (binding: StudioExhibitBinding): DetailContent => {
    if (binding.kind === "hobby") {
      const hobby = portfolioHobbyById(binding.hobbyId);
      return {
        title: hobby.title,
        summary: hobby.summary,
        description: hobby.description,
        tags: hobby.tags,
        links: [],
        images: hobby.media,
      };
    }
    if (binding.kind === "project") {
      const project = portfolioProjectById(binding.portfolioId);
      return {
        title: project.title,
        summary: project.summary,
        description: project.description,
        tags: project.tags,
        links: project.links,
        images: project.media,
      };
    }

    const person = portfolioPersonById(binding.personId);
    const collection = portfolioCollectionById(binding.collectionId);
    const mediaById = new Map(collection.media.map((item) => [item.id, item]));
    return {
      title: person.name,
      summary: `${person.summary} ${collection.summary}`,
      description: `${person.description}\n\n${collection.description}`,
      tags: person.interests,
      links: person.links,
      images: binding.mediaIds
        .map((id) => mediaById.get(id))
        .filter((item) => item !== undefined),
    };
  };

  const showDetail = (id: StudioExhibitId): void => {
    const binding = options.bindings.find((item) => item.id === id);
    if (!binding) return;
    const content = contentFor(binding);
    // 导览中逐站切换不覆盖返回焦点，结束后回到「开始导览」按钮。
    if (tourIndex === null) {
      returnFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
    objectLabel.textContent = binding.objectLabel;
    title.textContent = content.title;
    summary.textContent = content.summary;
    description.textContent = content.description;
    media.replaceChildren(
      ...content.images.slice(0, 3).map((image) => {
        const element = document.createElement("img");
        element.src = image.src;
        element.alt = image.alt;
        element.loading = "lazy";
        return element;
      }),
    );
    media.hidden = content.images.length === 0;
    tags.replaceChildren(
      ...content.tags.map((tag) => {
        const element = document.createElement("span");
        element.textContent = tag;
        return element;
      }),
    );
    links.replaceChildren(
      ...content.links.map((link) => {
        const anchor = document.createElement("a");
        anchor.href = link.href;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.textContent = `${link.label} ↗`;
        return anchor;
      }),
    );
    detail.hidden = false;
    detail.inert = false;
    root.classList.add("is-detail-open");
    indexButtons.forEach((button, buttonId) => {
      button.setAttribute("aria-pressed", String(buttonId === id));
    });
    options.onSelect(id);
    if (tourIndex === null) queueMicrotask(() => closeButton.focus());
  };

  const endTour = (): void => {
    if (tourIndex === null) return;
    tourIndex = null;
    tour.hidden = true;
    tourBar.classList.remove("is-running");
    root.classList.remove("is-touring", "is-tour-paused");
  };

  const hide = (): void => {
    endTour();
    detail.hidden = true;
    detail.inert = true;
    root.classList.remove("is-detail-open");
    indexButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
    options.onSelect(null);
    const focusTarget = returnFocus;
    returnFocus = null;
    queueMicrotask(() => focusTarget?.focus());
  };

  // 进度条的 CSS 动画就是每站计时器：动画结束即前往下一站，暂停只需暂停动画。
  const goToStop = (index: number): void => {
    if (index < 0) index = 0;
    if (index >= options.bindings.length) {
      hide();
      return;
    }
    tourIndex = index;
    const binding = options.bindings[index];
    tourChapter.textContent = binding.kind === "hobby"
      ? t("代码之外", "BEYOND CODE")
      : t("我做的东西", "WHAT I BUILD");
    tourCount.textContent = `${String(index + 1).padStart(2, "0")} / ${String(options.bindings.length).padStart(2, "0")}`;
    tourBar.classList.remove("is-running");
    void tourBar.offsetWidth;
    tourBar.classList.add("is-running");
    showDetail(binding.id);
  };

  const setTourPaused = (paused: boolean): void => {
    root.classList.toggle("is-tour-paused", paused);
    tourPause.setAttribute("aria-pressed", String(paused));
    tourPause.textContent = paused ? t("继续", "PLAY") : t("暂停", "PAUSE");
  };

  tourStart.addEventListener("click", () => {
    returnFocus = tourStart;
    tour.hidden = false;
    root.classList.add("is-touring");
    // 偏好减少动态的访客不自动翻页，由自己点「下一站」。
    setTourPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    goToStop(0);
    root.querySelector<HTMLButtonElement>("[data-studio-tour-next]")!.focus();
  });
  tourBar.addEventListener("animationend", () => {
    if (tourIndex !== null) goToStop(tourIndex + 1);
  });
  root.querySelector("[data-studio-tour-prev]")!.addEventListener("click", () => {
    if (tourIndex !== null) goToStop(tourIndex - 1);
  });
  root.querySelector("[data-studio-tour-next]")!.addEventListener("click", () => {
    if (tourIndex !== null) goToStop(tourIndex + 1);
  });
  tourPause.addEventListener("click", () => {
    setTourPaused(!root.classList.contains("is-tour-paused"));
  });
  root.querySelector("[data-studio-tour-end]")!.addEventListener("click", hide);

  closeButton.addEventListener("click", hide);
  lampButton.addEventListener("click", () => {
    lampButton.setAttribute("aria-pressed", String(options.onLampToggle()));
  });
  timeButton.addEventListener("click", () => {
    const night = timeButton.getAttribute("aria-pressed") !== "true";
    timeButton.setAttribute("aria-pressed", String(night));
    options.onNightChange(night);
  });
  options.bindings.forEach((binding) => {
    indexButtons.get(binding.id)!.addEventListener("click", () => show(binding.id));
  });

  // 外部打开展品（点击 3D 物件、索引或浏览器历史恢复）视为访客接管，导览随之结束。
  const show = (id: StudioExhibitId): void => {
    endTour();
    showDetail(id);
  };

  return {
    root,
    enter: options.onEnter,
    show,
    hide,
    hasEntered: () => true,
    isTouring: () => tourIndex !== null,
    setHovered(target: StudioTargetId | null) {
      if (target === currentHint) return;
      currentHint = target;
      hint.textContent = target ? TARGET_LABELS[target] : "";
      hint.classList.toggle("is-visible", Boolean(target));
    },
    syncLamp(on: boolean) {
      lampButton.setAttribute("aria-pressed", String(on));
    },
    setActivity(active: boolean) {
      root.hidden = !active;
    },
    focusEntry() {
      options.onEnter();
      indexButtons.values().next().value?.focus();
    },
    dispose() {
      root.remove();
    },
  };
}
