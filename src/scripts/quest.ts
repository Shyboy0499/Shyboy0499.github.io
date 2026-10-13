// 2D 任务式入口：角色在房间里走动，与物件互动即可逐步收集个人信息。
// 负责循环、输入、对话、任务进度与绘制；地图见 quest-map.ts，素材见 quest-sprites.ts，文案见 content/missions.ts。
// 进度只保存在本机 localStorage，是访客自己的便利记录；页面下方的静态作品与关于始终可读。
import { dialogs, missions } from "../content/missions";
import { projects } from "../content/projects";
import { CAT, COLS, ROWS, TILE, buildStaticLayer, isSolid, objects, type MapObject } from "./quest-map";
import {
  drawBookshelf,
  drawCat,
  drawCrystal,
  drawDoor,
  drawLamp,
  drawMailbox,
  drawPlant,
  drawPortrait,
  drawRows,
  drawSign,
  playerFrame,
} from "./quest-sprites";

const STORAGE_KEY = "quest-visited-v1";
// 显示缓冲区是逻辑分辨率，再整数放大到画布，保证像素边缘干净。
const SCALE = 3;
const WALK_SPEED = 62;
const TYPE_SPEED = 42;
const INTERACT_RANGE = 20;
// 角色脚下的碰撞盒，相对精灵左上角（精灵高 22）；只让脚部碰墙，身体可以略微越过物件的边。
const BOX = { x: 4, y: 18, w: 8, h: 4 };

const KEY_DIRS: Record<string, [number, number]> = {
  arrowup: [0, -1],
  w: [0, -1],
  arrowdown: [0, 1],
  s: [0, 1],
  arrowleft: [-1, 0],
  a: [-1, 0],
  arrowright: [1, 0],
  d: [1, 0],
};
const TOUCH_DIRS: Record<string, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export function mountQuest(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-canvas]");
  const startButton = root.querySelector<HTMLButtonElement>("[data-start]");
  const dialogEl = root.querySelector<HTMLElement>("[data-dialog]");
  const dialogTitle = root.querySelector<HTMLElement>("[data-dialog-title]");
  const dialogText = root.querySelector<HTMLElement>("[data-dialog-text]");
  const hint = root.querySelector<HTMLElement>("[data-hint]");
  const progress = root.querySelector<HTMLElement>("[data-progress]");
  const resetButton = root.querySelector<HTMLButtonElement>("[data-reset]");
  const actionButton = root.querySelector<HTMLButtonElement>("[data-action]");
  if (!canvas || !startButton || !dialogEl || !dialogTitle || !dialogText || !hint || !progress || !resetButton) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // 没有 canvas 2D 时保留下方的静态内容。
    root.classList.add("no-canvas");
    return;
  }

  // 低分辨率缓冲区：所有绘制在 COLS×TILE 的像素空间进行，最后整体放大。
  const buffer = document.createElement("canvas");
  buffer.width = COLS * TILE;
  buffer.height = ROWS * TILE;
  const bctx = buffer.getContext("2d")!;
  bctx.imageSmoothingEnabled = false;
  canvas.width = buffer.width * SCALE;
  canvas.height = buffer.height * SCALE;
  ctx.imageSmoothingEnabled = false;

  const staticLayer = buildStaticLayer();
  const photo = new Image();
  photo.src = "/art/studio-cat.jpg";

  // 角色从房间中央偏下出生；坐标为精灵左上角，单位是缓冲区像素。
  const player = { x: 11 * TILE + 4, y: 9 * TILE - 10, facing: 1 };
  let walking = false;
  let animT = 0;
  let started = false;
  let inView = false;
  let pendingScroll = false;
  let lastHint = "";
  let lastShown = "";

  const held = new Set<string>();
  const touchHeld = new Set<string>();
  const visited = loadVisited();

  const dialog = {
    active: false,
    title: "",
    lines: [] as string[],
    index: 0,
    typed: 0,
    onClose: null as null | (() => void),
  };

  const missionItems = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>("[data-mission]").forEach((el) => {
    missionItems.set(el.dataset.mission!, el);
  });

  function allDone(): boolean {
    return missions.every((m) => m.keys.every((k) => visited.has(k)));
  }

  function remainingMissions(): number {
    return missions.filter((m) => !m.keys.every((k) => visited.has(k))).length;
  }

  // 笔记面板：未完成的任务显示进度，完成后展示收集到的信息摘要。
  function renderNotes(): void {
    let done = 0;
    for (const m of missions) {
      const count = m.keys.filter((k) => visited.has(k)).length;
      const complete = count === m.keys.length;
      if (complete) done++;
      const item = missionItems.get(m.id);
      if (!item) continue;
      item.classList.toggle("done", complete);
      const countEl = item.querySelector<HTMLElement>("[data-count]");
      const summaryEl = item.querySelector<HTMLElement>("[data-summary]");
      if (countEl) countEl.textContent = complete ? "Complete" : `${count} / ${m.keys.length}`;
      if (summaryEl) {
        summaryEl.textContent = m.summary;
        summaryEl.hidden = !complete;
      }
    }
    progress.textContent = `${done} / ${missions.length}`;
  }

  function nearestInteractable(): MapObject | null {
    // 以脚底中心计算距离：物件是实体，角色只能站在它前面，身体中心离得更远。
    const cx = player.x + 8;
    const cy = player.y + 20;
    let best: MapObject | null = null;
    let bestDist = INTERACT_RANGE;
    for (const o of objects) {
      if (!o.key) continue;
      const d = Math.hypot(o.tx * TILE + 8 - cx, o.ty * TILE + 8 - cy);
      if (d < bestDist) {
        bestDist = d;
        best = o;
      }
    }
    return best;
  }

  function openDialog(title: string, lines: string[], onClose?: () => void): void {
    Object.assign(dialog, { active: true, title, lines, index: 0, typed: 0, onClose: onClose ?? null });
    dialogTitle.textContent = title;
    dialogText.textContent = "";
    lastShown = "";
    dialogEl.hidden = false;
  }

  function closeDialog(): void {
    dialog.active = false;
    dialogEl.hidden = true;
    const cb = dialog.onClose;
    dialog.onClose = null;
    cb?.();
  }

  // 第一次按键让当前行直接显示完整，再按一次才进入下一行。
  function advanceDialog(): void {
    const full = dialog.lines[dialog.index] ?? "";
    if (dialog.typed < full.length) {
      dialog.typed = full.length;
      return;
    }
    if (dialog.index < dialog.lines.length - 1) {
      dialog.index++;
      dialog.typed = 0;
      return;
    }
    closeDialog();
  }

  function interact(): void {
    if (dialog.active) {
      advanceDialog();
      return;
    }
    const target = nearestInteractable();
    if (!target || !target.key) return;
    if (target.key === "door") {
      if (allDone()) {
        openDialog("The gate", ["The gate swings open.", "Here is the full portfolio."], () => {
          pendingScroll = true;
        });
      } else {
        const n = remainingMissions();
        openDialog("Locked", [`Finish ${n} more mission${n === 1 ? "" : "s"} to open the gate.`]);
      }
      return;
    }
    const d = dialogs[target.key];
    if (!d) return;
    visited.add(target.key);
    saveVisited();
    renderNotes();
    openDialog(d.title, d.lines);
  }

  function start(): void {
    if (started) return;
    started = true;
    root.classList.add("is-started");
    startButton.blur();
  }

  // 移动按轴分开处理，撞墙时仍能沿另一个方向滑动。
  function blocked(x: number, y: number): boolean {
    const left = x + BOX.x;
    const right = x + BOX.x + BOX.w - 0.01;
    const top = y + BOX.y;
    const bottom = y + BOX.y + BOX.h - 0.01;
    return (
      isSolid(Math.floor(left / TILE), Math.floor(top / TILE)) ||
      isSolid(Math.floor(right / TILE), Math.floor(top / TILE)) ||
      isSolid(Math.floor(left / TILE), Math.floor(bottom / TILE)) ||
      isSolid(Math.floor(right / TILE), Math.floor(bottom / TILE))
    );
  }

  function moveBy(dx: number, dy: number): void {
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!blocked(nx, ny)) {
      player.x = nx;
      player.y = ny;
    }
  }

  function step(dt: number): void {
    if (dialog.active) {
      const full = dialog.lines[dialog.index] ?? "";
      dialog.typed = Math.min(full.length, dialog.typed + TYPE_SPEED * dt);
      walking = false;
      return;
    }
    let vx = 0;
    let vy = 0;
    for (const k of held) {
      const [dx, dy] = KEY_DIRS[k];
      vx += dx;
      vy += dy;
    }
    for (const d of touchHeld) {
      const [dx, dy] = TOUCH_DIRS[d];
      vx += dx;
      vy += dy;
    }
    walking = vx !== 0 || vy !== 0;
    if (walking) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      if (vx !== 0) player.facing = vx < 0 ? -1 : 1;
      moveBy(vx * WALK_SPEED * dt, 0);
      moveBy(0, vy * WALK_SPEED * dt);
    }
    animT += dt;
  }

  function drawObject(o: MapObject, unlocked: boolean): void {
    switch (o.char) {
      case "S":
        drawSign(bctx, o.tx, o.ty);
        break;
      case "C": {
        const index = Number(o.key!.split(":")[1]);
        drawCrystal(bctx, o.tx, o.ty, projects[index].accent, visited.has(o.key!), animT);
        break;
      }
      case "M":
        drawMailbox(bctx, o.tx, o.ty);
        break;
      case "P":
        drawPortrait(bctx, o.tx, o.ty, photo);
        break;
      case "D":
        drawDoor(bctx, o.tx, o.ty, unlocked, animT);
        break;
      case "T":
        drawPlant(bctx, o.tx, o.ty);
        break;
      case "B":
        drawBookshelf(bctx, o.tx, o.ty);
        break;
      case "L":
        drawLamp(bctx, o.tx, o.ty, animT);
        break;
    }
  }

  function render(): void {
    bctx.drawImage(staticLayer, 0, 0);
    const unlocked = allDone();
    const near = nearestInteractable();

    // 按脚下的 y 坐标排序，让角色能正确地走到物件前后。
    const items: { y: number; draw: () => void }[] = objects.map((o) => ({
      y: o.ty * TILE + TILE,
      draw: () => drawObject(o, unlocked),
    }));
    items.push({
      y: player.y + 22,
      draw: () => drawRows(bctx, playerFrame(walking, animT), Math.round(player.x), Math.round(player.y), player.facing < 0),
    });
    items.push({ y: CAT.ty * TILE + TILE, draw: () => drawCat(bctx, CAT.tx, CAT.ty, animT) });
    items.sort((a, b) => a.y - b.y).forEach((item) => item.draw());

    // 空气中的浮尘：缓慢地飘过房间，让画面有一点生气。
    bctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    const H = buffer.height;
    for (let i = 0; i < 16; i++) {
      const mx = (i * 47 + animT * (4 + (i % 4))) % buffer.width;
      const my = (i * 29 + Math.sin(animT + i) * 6 + H) % H;
      bctx.fillRect(Math.floor(mx), Math.floor(my), 1, 1);
    }

    if (near && !dialog.active) {
      bctx.globalAlpha = 0.5 + 0.3 * Math.sin(animT * 5);
      bctx.strokeStyle = "#ecedf2";
      bctx.strokeRect(near.tx * TILE + 0.5, near.ty * TILE + 0.5, TILE - 1, TILE - 1);
      bctx.globalAlpha = 1;
    }

    ctx!.drawImage(buffer, 0, 0, canvas!.width, canvas!.height);
    updateText(near, unlocked);
  }

  // 文字放在 DOM 中，清晰且可被读屏；只在内容变化时更新，避免每帧写入。
  function updateText(near: MapObject | null, unlocked: boolean): void {
    let nextHint = "";
    if (dialog.active) {
      nextHint = "E / tap to continue";
    } else if (near) {
      const label =
        near.key === "door" ? (unlocked ? "The gate" : "Locked gate") : dialogs[near.key!]?.title ?? "";
      nextHint = `E / tap · ${label}`;
    }
    if (nextHint !== lastHint) {
      hint.textContent = nextHint;
      lastHint = nextHint;
    }
    if (dialog.active) {
      const shown = (dialog.lines[dialog.index] ?? "").slice(0, Math.floor(dialog.typed));
      if (shown !== lastShown) {
        dialogText.textContent = shown;
        lastShown = shown;
      }
    }
  }

  function loadVisited(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: unknown = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : []);
    } catch {
      // 隐私模式或禁用存储时，进度只保留在本次访问中。
      return new Set();
    }
  }

  function saveVisited(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
    } catch {
      // 存储不可用时忽略，游戏仍可进行。
    }
  }

  renderNotes();

  startButton.addEventListener("click", start);
  actionButton?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!started) start();
    else interact();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-dir]").forEach((btn) => {
    const dir = btn.dataset.dir!;
    const release = () => touchHeld.delete(dir);
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (started) touchHeld.add(dir);
    });
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
  });

  resetButton.addEventListener("click", () => {
    visited.clear();
    saveVisited();
    dialog.active = false;
    dialog.onClose = null;
    dialogEl.hidden = true;
    renderNotes();
  });

  window.addEventListener("keydown", (e) => {
    if (!inView) return;
    const key = e.key.toLowerCase();
    if (key in KEY_DIRS) {
      if (key.startsWith("arrow")) e.preventDefault();
      if (started) held.add(key);
      return;
    }
    if (key === "e" || key === "enter" || key === " ") {
      // 焦点在按钮或链接上时交给浏览器原生处理，避免重复触发。
      if (e.target instanceof HTMLElement && e.target.closest("a, button")) return;
      e.preventDefault();
      if (!started) start();
      else interact();
    }
  });
  window.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => held.clear());

  // 离开视口时停止更新与绘制，省电；回到视口后时间差会被截断，不会跳帧。
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
  }).observe(root);

  let last = performance.now();
  function frame(now: number): void {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!inView) return;
    if (started) step(dt);
    else animT += dt;
    render();
    if (pendingScroll && !dialog.active) {
      pendingScroll = false;
      document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
    }
  }
  requestAnimationFrame(frame);
}
