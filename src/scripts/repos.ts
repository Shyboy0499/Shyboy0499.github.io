// 仓库页：在浏览器里从 GitHub API 读取公开仓库，实时计算数量、星标与语言，并提供搜索、筛选与排序。
// 数据只请求一次并缓存，仓库页与玩家卡的星标徽章共用同一份结果。
// 不负责页面结构（见 pages/index.astro）；请求失败时保留快照数字，并在状态栏说明。
import { FEATURED, GITHUB_USER, SNAPSHOT } from "../content/github";

type Repo = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  fork: boolean;
  topics?: string[];
};

export type RepoStats = {
  repos: Repo[];
  publicCount: number;
  stars: number;
  languages: string[];
};

const PAGE_SIZE = 100;
const SHOW_STEP = 12;
// 语言小圆点的颜色：按语言名稳定地选一个，同一语言永远是同一种颜色。
const DOT_COLORS = ["#7b5cff", "#5ee6b8", "#ff6b6b", "#ffd23f", "#ff9ecf", "#3b4cca"];

async function fetchRepos(): Promise<Repo[]> {
  const out: Repo[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=${PAGE_SIZE}&sort=updated&page=${page}`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const batch: Repo[] = await res.json();
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchPublicCount(): Promise<number> {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USER}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const user: { public_repos: number } = await res.json();
  return user.public_repos;
}

// 第一次调用时发起请求，之后返回同一个 Promise，页面上的所有组件共享结果。
let statsPromise: Promise<RepoStats> | null = null;

export function loadRepoStats(): Promise<RepoStats> {
  if (!statsPromise) {
    statsPromise = Promise.all([fetchRepos(), fetchPublicCount()]).then(([repos, publicCount]) => {
      const languages = [...new Set(repos.map((r) => r.language).filter((l): l is string => Boolean(l)))].sort((a, b) =>
        a.localeCompare(b),
      );
      const stars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
      return { repos, publicCount, stars, languages };
    });
    // 失败时清掉缓存，下次调用可以重新请求。
    statsPromise.catch(() => {
      statsPromise = null;
    });
  }
  return statsPromise;
}

function dotColor(language: string): string {
  let hash = 0;
  for (const ch of language) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return DOT_COLORS[hash % DOT_COLORS.length];
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export async function mountRepos(root: HTMLElement): Promise<void> {
  const grid = root.querySelector<HTMLElement>("[data-repo-grid]");
  const status = root.querySelector<HTMLElement>("[data-repo-status]");
  const search = root.querySelector<HTMLInputElement>("[data-repo-search]");
  const langSelect = root.querySelector<HTMLSelectElement>("[data-repo-lang]");
  const sortSelect = root.querySelector<HTMLSelectElement>("[data-repo-sort]");
  const forksToggle = root.querySelector<HTMLInputElement>("[data-repo-forks]");
  const more = root.querySelector<HTMLButtonElement>("[data-repo-more]");
  if (!grid || !status || !search || !langSelect || !sortSelect || !forksToggle || !more) return;

  const setStat = (key: string, value: string | number) => {
    const node = root.querySelector<HTMLElement>(`[data-stat="${key}"]`);
    if (node) node.textContent = String(value);
  };

  let repos: Repo[] = [];
  let shown = SHOW_STEP;

  function visibleRepos(): Repo[] {
    const q = search!.value.trim().toLowerCase();
    const lang = langSelect!.value;
    const includeForks = forksToggle!.checked;
    const featuredRank = (r: Repo) => {
      const i = FEATURED.indexOf(r.name);
      return i === -1 ? FEATURED.length : i;
    };
    const sortBy = sortSelect!.value;
    return repos
      .filter((r) => (includeForks || !r.fork) && (!lang || r.language === lang))
      .filter((r) => !q || [r.name, r.description ?? "", r.language ?? "", ...(r.topics ?? [])].join(" ").toLowerCase().includes(q))
      .sort((a, b) => {
        const byFeatured = featuredRank(a) - featuredRank(b);
        if (byFeatured !== 0) return byFeatured;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "updated") return b.updated_at.localeCompare(a.updated_at);
        return b.stargazers_count - a.stargazers_count;
      });
  }

  function card(r: Repo): HTMLElement {
    const li = el("li", "repo-card");
    const link = el("a", "repo-link");
    link.href = r.html_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const head = el("div", "repo-head");
    head.append(el("span", "repo-name", r.name));
    if (FEATURED.includes(r.name)) head.append(el("span", "repo-badge", "Featured"));
    if (r.fork) head.append(el("span", "repo-badge repo-badge-fork", "Fork"));

    const desc = el("p", "repo-desc", r.description ?? "No description yet.");

    const foot = el("div", "repo-foot");
    if (r.language) {
      const lang = el("span", "repo-lang");
      const dot = el("span", "repo-dot");
      dot.style.background = dotColor(r.language);
      lang.append(dot, document.createTextNode(r.language));
      foot.append(lang);
    }
    foot.append(el("span", "repo-stat", `★ ${r.stargazers_count}`));
    foot.append(el("span", "repo-stat", `⑂ ${r.forks_count}`));
    foot.append(el("span", "repo-date", new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })));

    link.append(head, desc, foot);
    if (r.topics && r.topics.length > 0) {
      const topics = el("div", "repo-topics");
      for (const t of r.topics.slice(0, 3)) topics.append(el("span", "repo-topic", t));
      link.append(topics);
    }
    li.append(link);
    return li;
  }

  function render(): void {
    const list = visibleRepos();
    grid!.replaceChildren(...list.slice(0, shown).map(card));
    more!.hidden = list.length <= shown;
    status!.textContent =
      list.length === 0
        ? "No repos match. Try another search or filter."
        : `${list.length} matching · showing ${Math.min(shown, list.length)}`;
  }

  function resetAndRender(): void {
    shown = SHOW_STEP;
    render();
  }

  search.addEventListener("input", resetAndRender);
  langSelect.addEventListener("change", resetAndRender);
  sortSelect.addEventListener("change", resetAndRender);
  forksToggle.addEventListener("change", resetAndRender);
  more.addEventListener("click", () => {
    shown += SHOW_STEP;
    render();
  });

  try {
    const stats = await loadRepoStats();
    repos = stats.repos;
    setStat("repos", stats.publicCount);
    setStat("stars", stats.stars);
    setStat("languages", stats.languages.length);

    for (const lang of stats.languages) {
      const option = el("option", undefined, lang);
      option.value = lang;
      langSelect.append(option);
    }
    status.textContent = `Live from GitHub · ${stats.publicCount} public repos`;
    render();
  } catch {
    // 请求失败时保留快照数字，并说明数据不是实时的。
    setStat("repos", SNAPSHOT.repos);
    setStat("stars", SNAPSHOT.stars);
    setStat("languages", SNAPSHOT.languages);
    status.textContent = "Couldn't reach GitHub just now, so the numbers above are a snapshot from 18 Oct 2026.";
  }
}
