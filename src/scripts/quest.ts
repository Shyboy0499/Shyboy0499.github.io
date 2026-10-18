// 2D 任务式入口：角色在房间里走动，与物件互动即可逐步收集个人信息。
// 负责循环、输入、对话、任务进度、过场、声音与绘制；地图见 quest-map.ts，素材见 quest-sprites.ts，
// 特效见 quest-fx.ts，声音见 quest-audio.ts，文案见 content/missions.ts。
// 进度只保存在本机 localStorage，是访客自己的便利记录；页面下方的静态作品与关于始终可读。
import { dialogs, missions } from "../content/missions";
import { projects } from "../content/projects";
import { CAT, COLS, ROWS, TILE, WINDOWS, buildStaticLayer, isSolid, objects, type MapObject } from "./quest-map";
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
  drawSecretOrb,
  drawSign,
  drawWindowClouds,
  playerFrame,
} from "./quest-sprites";
import { createFx } from "./quest-fx";
import { createAudio } from "./quest-audio";

const STORAGE_KEY = "quest-visited-v1";
// 显示缓冲区是逻辑分辨率，再整数放大到画布，保证像素边缘干净。
const SCALE = 3;
const WALK_SPEED = 62;
const RUN_SPEED = 98;
const TYPE_SPEED = 42;
const INTERACT_RANGE = 20;
// 角色脚下的碰撞盒，相对精灵左上角（精灵高 22）；只让脚部碰墙，身体可以略微越过物件的边。
const BOX = { x: 4, y: 18, w: 8, h: 4 };
const CELEBRATE_COLORS = ["#ff6b6b", "#5ee6b8", "#9b7bff", "#ffd23f", "#ff9ecf"];

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
  const toast = root.querySelector<HTMLElement>("[data-toast]");
  const cinema = root.querySelector<HTMLElement>("[data-cinema]");
  const cinemaSticker = root.querySelector<HTMLElement>("[data-cinema-sticker]");
  const cinemaTitle = root.querySelector<HTMLElement>("[data-cinema-title]");
  const cinemaSub = root.querySelector<HTMLElement>("[data-cinema-sub]");
  const cinemaGo = root.querySelector<HTMLButtonElement>("[data-cinema-go]");
  const soundButton = root.querySelector<HTMLButtonElement>("[data-sound]");
  const cgOpenButton = root.querySelector<HTMLButtonElement>("[data-cg-open]");
  const cgFinaleButton = root.querySelector<HTMLButtonElement>("[data-cg-finale]");
  const wipe = document.querySelector<HTMLElement>("[data-wipe]");
  const title = root.querySelector<HTMLElement>(".title");
  if (
    !canvas || !startButton || !dialogEl || !dialogTitle || !dialogText || !hint || !progress ||
    !resetButton || !toast || !cinema || !cinemaSticker || !cinemaTitle || !cinemaSub || !cinemaGo ||
    !soundButton || !cgOpenButton || !cgFinaleButton || !title
  ) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // 没有 canvas 2D 时保留下方的静态内容。
    root.classList.add("no-canvas");
    return;
  }

  // 减少动效时不做震动、闪光、故障与过场动画，但仍保留文字。
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const fx = createFx();
  const audio = createAudio();

  const door = objects.find((o) => o.char === "D")!;
  const secret = objects.find((o) => o.key === "secret")!;

  // 角色从房间中央偏下出生；坐标为精灵左上角，单位是缓冲区像素。
  const player = { x: 11 * TILE + 4, y: 9 * TILE - 10, facing: 1 };
  let walking = false;
  let sprinting = false;
  let animT = 0;
  let started = false;
  let inView = false;
  let pendingScroll = false;
  let lastHint = "";
  let lastShown = "";
  let toastTimer = 0;
  let cinemaTimer = 0;

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

  function completedIds(): Set<string> {
    return new Set(missions.filter((m) => m.keys.every((k) => visited.has(k))).map((m) => m.id));
  }

  // 笔记面板：未完成的任务显示进度，完成后展示收集到的信息摘要；CG 按钮随进度开放。
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
    cgFinaleButton.disabled = !allDone();
    cgFinaleButton.textContent = allDone() ? "Finale CG" : "Finale CG · locked";
  }

  function updateSoundButton(): void {
    const on = !audio.isMuted();
    soundButton.textContent = on ? "♪ Sound on" : "♪ Sound off";
    soundButton.setAttribute("aria-pressed", String(on));
  }

  function objectCenter(o: MapObject): [number, number] {
    return [o.tx * TILE + 8, o.ty * TILE + 8];
  }

  // 完成任务的庆祝：在物件上迸发彩色粒子，并弹出一条提示。
  function celebrate(o: MapObject, text: string): void {
    const [x, y] = objectCenter(o);
    fx.burst(x, y, CELEBRATE_COLORS, 26);
    showToast(text);
    audio.sfx("chime");
  }

  function showToast(text: string): void {
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.remove("show");
    // 强制回流，让同一个动画可以重新播放。
    void toast.offsetWidth;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  }

  // 全部任务完成的瞬间：门前爆出光束与震动，标题故障闪烁，随后进入过场。
  function unlockCelebration(): void {
    const [x, y] = objectCenter(door);
    fx.burst(x, y, CELEBRATE_COLORS, 40);
    audio.sfx("whoosh");
    if (!reduce) {
      fx.surge();
      title.classList.add("glitch");
    }
    window.setTimeout(() => openCinema("clear"), reduce ? 0 : 700);
  }

  // 过场卡片：开场用"Chapter 1"，通关用"Chapter clear"并带一个前往作品区的按钮。
  // 过场不抢焦点，几秒后自动收起，避免挡住房间里的操作。
  function openCinema(kind: "intro" | "clear"): void {
    if (kind === "intro") {
      cinemaSticker.textContent = "Chapter 1";
      cinemaTitle.textContent = "A quest begins";
      cinemaSub.textContent = "Find the four things I want you to know.";
      cinemaGo.hidden = true;
    } else {
      cinemaSticker.textContent = "Chapter clear";
      cinemaTitle.textContent = "Portfolio unlocked!";
      cinemaSub.textContent = "Everything I've built is one scroll away.";
      cinemaGo.hidden = false;
    }
    cinema.hidden = false;
    requestAnimationFrame(() => cinema.classList.add("show"));
    window.clearTimeout(cinemaTimer);
    cinemaTimer = window.setTimeout(closeCinema, kind === "intro" ? 2600 : 4500);
  }

  function closeCinema(): void {
    window.clearTimeout(cinemaTimer);
    cinema.classList.remove("show");
    cinema.hidden = true;
    title.classList.remove("glitch");
  }

  function nearestInteractable(): MapObject | null {
    // 以脚底中心计算距离：物件是实体，角色只能站在它前面，身体中心离得更远。
    const cx = player.x + 8;
    const cy = player.y + 20;
    let best: MapObject | null = null;
    let bestDist = INTERACT_RANGE;
    for (const o of objects) {
      if (!o.key) continue;
      // 隐藏的宝珠只在全部任务完成后才可以互动。
      if (o.key === "secret" && !allDone()) continue;
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
      audio.sfx("blip");
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
    audio.sfx("blip");
    if (target.key === "door") {
      if (allDone()) {
        audio.sfx("whoosh");
        openDialog("The gate", ["The gate swings open.", "Here is the full portfolio."], () => {
          pendingScroll = true;
        });
      } else {
        const n = remainingMissions();
        openDialog("Locked", [`Finish ${n} more mission${n === 1 ? "" : "s"} to open the gate.`]);
      }
      return;
    }
    if (target.key === "secret") {
      const [x, y] = objectCenter(target);
      fx.burst(x, y, CELEBRATE_COLORS, 30);
      openDialog(dialogs.secret.title, dialogs.secret.lines);
      return;
    }
    const d = dialogs[target.key];
    if (!d) return;

    const before = completedIds();
    visited.add(target.key);
    saveVisited();
    renderNotes();
    openDialog(d.title, d.lines);

    // 只为这一次新完成的任务庆祝，已完成的任务不会重复。
    const newly = missions.filter((m) => !before.has(m.id) && completedIds().has(m.id));
    for (const m of newly) celebrate(target, `Mission complete: ${m.title}`);
    if (newly.length > 0 && allDone()) unlockCelebration();
  }

  // 开始：这是用户的第一次操作，音频也从这里启动（浏览器要求）。
  function start(): void {
    if (started) return;
    started = true;
    root.classList.add("is-started");
    startButton.blur();
    audio.unlock();
    if (!audio.isMuted()) audio.startMusic();
    updateSoundButton();
    if (!reduce) openCinema("intro");
  }

  function toggleSound(): void {
    const nowMuted = !audio.isMuted();
    audio.setMuted(nowMuted);
    if (!nowMuted) {
      audio.unlock();
      audio.startMusic();
    }
    updateSoundButton();
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
      // 按住 Shift 跑步：速度更快，脚步动画也更快。
      const speed = (sprinting ? RUN_SPEED : WALK_SPEED) * dt;
      moveBy(vx * speed, 0);
      moveBy(0, vy * speed);
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
      case "O":
        // 宝珠在任务完成前不画出来，保持隐藏。
        if (unlocked) drawSecretOrb(bctx, o.tx, o.ty, animT);
        break;
    }
  }

  // 可互动物件上方的小箭头：上下浮动，告诉玩家"这里可以按 E"。
  function drawPointer(o: MapObject): void {
    const [cx, cy] = objectCenter(o);
    const y = cy - 14 + Math.sin(animT * 6) * 1.5;
    bctx.fillStyle = "#1d1433";
    bctx.beginPath();
    bctx.moveTo(cx - 4, y - 2);
    bctx.lineTo(cx + 4, y - 2);
    bctx.lineTo(cx, y + 3);
    bctx.closePath();
    bctx.fill();
    bctx.fillStyle = "#5ee6b8";
    bctx.beginPath();
    bctx.moveTo(cx - 3, y - 3);
    bctx.lineTo(cx + 3, y - 3);
    bctx.lineTo(cx, y + 1);
    bctx.closePath();
    bctx.fill();
  }

  function render(): void {
    bctx.drawImage(staticLayer, 0, 0);
    const unlocked = allDone();
    const near = nearestInteractable();

    // 窗外的云先画在窗口里，再叠加其它物件，避免盖住家具。
    for (const [wx, wy] of WINDOWS) drawWindowClouds(bctx, wx, wy, animT);

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

    const [doorX, doorY] = objectCenter(door);
    fx.draw(bctx, animT, doorX, doorY);

    if (near && !dialog.active) {
      drawPointer(near);
      bctx.globalAlpha = 0.5 + 0.3 * Math.sin(animT * 5);
      bctx.strokeStyle = "#ecedf2";
      bctx.strokeRect(near.tx * TILE + 0.5, near.ty * TILE + 0.5, TILE - 1, TILE - 1);
      bctx.globalAlpha = 1;
    }

    // 震动只平移整张画面，不影响碰撞与交互坐标。
    const [ox, oy] = fx.offset();
    ctx!.drawImage(buffer, ox * SCALE, oy * SCALE, canvas!.width, canvas!.height);
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
  updateSoundButton();

  startButton.addEventListener("click", start);
  actionButton?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!started) start();
    else interact();
  });
  soundButton.addEventListener("click", toggleSound);

  // 笔记里的 CG 回放：开场章节随时可看；结局需要先完成全部任务。
  cgOpenButton.addEventListener("click", () => openCinema("intro"));
  cgFinaleButton.addEventListener("click", () => {
    if (!allDone()) return;
    if (!reduce) fx.surge();
    openCinema("clear");
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
    closeCinema();
    toast.hidden = true;
    renderNotes();
  });

  // 前往作品区：先用一道墨色的"擦除"转场，再滚动过去。
  cinemaGo.addEventListener("click", () => {
    closeCinema();
    if (wipe && !reduce) {
      wipe.classList.remove("run");
      void wipe.offsetWidth;
      wipe.classList.add("run");
      window.setTimeout(() => document.getElementById("work")?.scrollIntoView({ behavior: "auto" }), 380);
    } else {
      document.getElementById("work")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }
  });

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "shift") {
      sprinting = true;
      return;
    }
    // M 键随时切换声音，即使不在房间的视口中。
    if (key === "m" && started) {
      toggleSound();
      return;
    }
    if (!inView) return;
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
  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "shift") sprinting = false;
    held.delete(key);
  });
  window.addEventListener("blur", () => {
    held.clear();
    sprinting = false;
  });

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
    // 全部完成后门前保持一层淡淡的光束，作为常驻的"已解锁"提示。
    fx.setAmbient(allDone() ? 0.35 : 0);
    fx.update(dt);
    render();
    if (pendingScroll && !dialog.active) {
      pendingScroll = false;
      document.getElementById("work")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }
  }
  requestAnimationFrame(frame);
}
