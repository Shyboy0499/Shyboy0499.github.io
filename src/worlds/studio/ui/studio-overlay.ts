// Studio UI 只负责环境控制、物件提示和 Portfolio 详情面板。
// 进入门槛已移除，World 一挂载就处于可交互状态。
import {
  portfolioCollectionById,
  portfolioPersonById,
  portfolioProjectById,
} from "../../../content/portfolio";
import type { StudioExhibitBinding, StudioExhibitId } from "../binding";
import type { StudioTargetId } from "../scene/studio-room";

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
  workstation: "打开主工作台",
  "roadmap-board": "查看 DeepSeek 工具",
  "contribution-frame": "查看 Obsidian 工具",
  lamp: "开关桌灯",
  "portal-cosmic": "穿过星门，前往宇宙世界",
  "portal-linework": "推开纸稿门，返回线稿世界",
  "portal-archipelago": "转动世界罗盘，前往群岛世界",
};

export function createStudioOverlay(options: StudioOverlayOptions) {
  const root = document.createElement("div");
  root.className = "studio-ui-root";
  root.innerHTML = `
    <div class="studio-toolbar" aria-label="工作室环境控制">
      <button type="button" data-studio-lamp aria-label="开关桌灯" aria-pressed="false">
        <span class="studio-toggle-dot"></span><b>LIGHT</b>
      </button>
      <button type="button" data-studio-time aria-label="切换昼夜" aria-pressed="false">
        <span class="studio-toggle-dot"></span><b>DAY / NIGHT</b>
      </button>
    </div>
    <nav class="studio-index" data-studio-index aria-label="工作室展品"></nav>
    <p class="studio-hint" data-studio-hint aria-live="polite"></p>
    <aside class="studio-detail" data-studio-detail role="dialog" aria-modal="false" aria-labelledby="studio-detail-title" hidden inert>
      <button class="studio-close" type="button" data-studio-close aria-label="关闭详情">&#215;</button>
      <p class="studio-object" data-studio-object></p>
      <h2 id="studio-detail-title" data-studio-title></h2>
      <p class="studio-summary" data-studio-summary></p>
      <div class="studio-media" data-studio-media hidden></div>
      <p class="studio-description" data-studio-description></p>
      <div class="studio-tags" data-studio-tags></div>
      <nav class="studio-links" data-studio-links aria-label="相关链接"></nav>
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
  const indexButtons = new Map<StudioExhibitId, HTMLButtonElement>();
  let currentHint: StudioTargetId | null = null;
  let returnFocus: HTMLElement | null = null;

  options.bindings.forEach((binding, bindingIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `打开 ${binding.objectLabel}`);
    const number = document.createElement("span");
    const label = document.createElement("b");
    number.textContent = String(bindingIndex + 1).padStart(2, "0");
    label.textContent = binding.objectLabel;
    button.append(number, label);
    index.append(button);
    indexButtons.set(binding.id, button);
  });

  const contentFor = (binding: StudioExhibitBinding): DetailContent => {
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

  const show = (id: StudioExhibitId): void => {
    const binding = options.bindings.find((item) => item.id === id);
    if (!binding) return;
    const content = contentFor(binding);
    returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
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
    queueMicrotask(() => closeButton.focus());
  };

  const hide = (): void => {
    detail.hidden = true;
    detail.inert = true;
    root.classList.remove("is-detail-open");
    indexButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
    options.onSelect(null);
    const focusTarget = returnFocus;
    returnFocus = null;
    queueMicrotask(() => focusTarget?.focus());
  };

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

  return {
    root,
    enter: options.onEnter,
    show,
    hide,
    hasEntered: () => true,
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
