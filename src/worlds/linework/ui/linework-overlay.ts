// Linework UI 提供可访问的陈设索引与项目详情，视觉上保持制图批注语言。
// 3D 命中测试由 World 负责，本模块不接管相机、Portal 或 Runtime 状态。
import {
  portfolioCollectionById,
  portfolioPersonById,
  portfolioProjectById,
} from "../../../content/portfolio";
import type {
  LineworkExhibitBinding,
  LineworkExhibitId,
} from "../binding";

export interface LineworkOverlay {
  readonly root: HTMLElement;
  show(id: LineworkExhibitId): void;
  hide(): void;
  setActivity(active: boolean): void;
  dispose(): void;
}

export function createLineworkOverlay(
  bindings: readonly LineworkExhibitBinding[],
  onSelect: (id: LineworkExhibitId | null) => void,
  onPortal: () => void,
): LineworkOverlay {
  const root = document.createElement("section");
  root.className = "linework-ui-root";
  root.setAttribute("aria-label", "线稿世界作品与个人陈设");
  root.innerHTML = `
    <button class="linework-portal" type="button" data-linework-portal aria-label="前往工作室世界">
      <span aria-hidden="true">◎</span><b>STUDIO</b>
    </button>
    <nav class="linework-index" aria-label="作品陈设"></nav>
    <aside class="linework-detail" data-linework-detail hidden inert>
      <button class="linework-close" type="button" data-linework-close aria-label="关闭项目详情">×</button>
      <p class="linework-object" data-linework-object></p>
      <h2 data-linework-title></h2>
      <p class="linework-summary" data-linework-summary></p>
      <p class="linework-description" data-linework-description></p>
      <div class="linework-profile-media" data-linework-profile-media hidden></div>
      <dl data-linework-metrics></dl>
      <div class="linework-tags" data-linework-tags></div>
      <div class="linework-links" data-linework-links></div>
    </aside>
  `;

  const index = root.querySelector<HTMLElement>(".linework-index")!;
  const detail = root.querySelector<HTMLElement>("[data-linework-detail]")!;
  const object = root.querySelector<HTMLElement>("[data-linework-object]")!;
  const title = root.querySelector<HTMLElement>("[data-linework-title]")!;
  const summary = root.querySelector<HTMLElement>("[data-linework-summary]")!;
  const description = root.querySelector<HTMLElement>("[data-linework-description]")!;
  const profileMedia = root.querySelector<HTMLElement>("[data-linework-profile-media]")!;
  const metrics = root.querySelector<HTMLElement>("[data-linework-metrics]")!;
  const tags = root.querySelector<HTMLElement>("[data-linework-tags]")!;
  const links = root.querySelector<HTMLElement>("[data-linework-links]")!;
  const buttons = new Map<LineworkExhibitId, HTMLButtonElement>();

  for (const binding of bindings) {
    const title = binding.kind === "project"
      ? portfolioProjectById(binding.portfolioId).title
      : portfolioPersonById(binding.personId).name;
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span>${binding.number}</span><b>${title}</b><small>${binding.objectLabel}</small>`;
    button.addEventListener("click", () => {
      show(binding.id);
    });
    index.append(button);
    buttons.set(binding.id, button);
  }

  const show = (id: LineworkExhibitId): void => {
    const binding = bindings.find((item) => item.id === id);
    if (!binding) return;
    object.textContent = `${binding.number} / ${binding.objectLabel}`;
    profileMedia.hidden = true;
    profileMedia.replaceChildren();

    const content = binding.kind === "project"
      ? (() => {
          const project = portfolioProjectById(binding.portfolioId);
          return {
            title: project.title,
            summary: project.summary,
            description: project.description,
            metrics: project.metrics,
            tags: project.tags,
            links: project.links,
          };
        })()
      : (() => {
          const person = portfolioPersonById(binding.personId);
          const collection = portfolioCollectionById(binding.collectionId);
          const mediaById = new Map(collection.media.map((media) => [media.id, media]));
          const featuredMedia = [
            person.portrait,
            mediaById.get(binding.mediaIds[3]),
            mediaById.get(binding.mediaIds[6]),
          ].filter((media) => media !== undefined);
          profileMedia.replaceChildren(
            ...featuredMedia.map((media) => {
              const image = document.createElement("img");
              image.src = media.src;
              image.alt = media.alt;
              image.loading = "lazy";
              return image;
            }),
          );
          profileMedia.hidden = false;
          return {
            title: person.name,
            summary: person.summary,
            description: `${person.description}\n\n${collection.summary}${collection.description}`,
            metrics: [
              { label: "LOCATION", value: person.location },
              { label: "PHOTO LOG", value: String(collection.media.length).padStart(2, "0") },
              { label: "JOURNEY", value: collection.title },
            ],
            tags: person.interests,
            links: person.links,
          };
        })();

    title.textContent = content.title;
    summary.textContent = content.summary;
    description.textContent = content.description;
    metrics.replaceChildren(
      ...content.metrics.map((metric) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const value = document.createElement("dd");
        term.textContent = metric.label;
        value.textContent = metric.value;
        row.append(term, value);
        return row;
      }),
    );
    tags.replaceChildren(
      ...content.tags.map((tag) => {
        const item = document.createElement("span");
        item.textContent = tag;
        return item;
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
    buttons.forEach((button, buttonId) => {
      button.classList.toggle("is-active", buttonId === id);
    });
    detail.hidden = false;
    detail.inert = false;
    root.classList.add("is-detail-open");
    onSelect(id);
  };

  const hide = (): void => {
    detail.hidden = true;
    detail.inert = true;
    root.classList.remove("is-detail-open");
    buttons.forEach((button) => button.classList.remove("is-active"));
    onSelect(null);
  };

  root.querySelector<HTMLButtonElement>("[data-linework-close]")!.addEventListener("click", hide);
  root.querySelector<HTMLButtonElement>("[data-linework-portal]")!.addEventListener("click", onPortal);

  return {
    root,
    show,
    hide,
    setActivity(active) {
      root.hidden = !active;
    },
    dispose() {
      root.remove();
    },
  };
}
