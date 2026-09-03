// Archipelago UI 的浏览器动作接缝；Vue 只表达用户意图，不持有 Runtime Portal。
// World Module 在 Session 安装期间注入实现，销毁后立即撤销。
import type { KnownWorldId } from "../worlds.config";
import type { ShipVariant } from "./store";

interface ArchipelagoUiActions {
  openProject(href: string): void;
  requestPortal(targetWorldId: KnownWorldId): void;
  renderShipPreview(canvas: HTMLCanvasElement, variant: ShipVariant): () => void;
  renderBoostPreview(canvas: HTMLCanvasElement, active: boolean): () => void;
}

let actions: ArchipelagoUiActions | null = null;
const frameListeners = new Set<(elapsed: number) => void>();

export function installArchipelagoUiActions(
  next: ArchipelagoUiActions,
): () => void {
  actions = next;
  return () => {
    if (actions === next) actions = null;
  };
}

export function openArchipelagoProject(href: string): void {
  actions?.openProject(href);
}

export function requestArchipelagoPortal(targetWorldId: KnownWorldId): void {
  actions?.requestPortal(targetWorldId);
}

export function renderArchipelagoShipPreview(
  canvas: HTMLCanvasElement,
  variant: ShipVariant,
): () => void {
  return actions?.renderShipPreview(canvas, variant) ?? (() => undefined);
}

export function renderArchipelagoBoostPreview(
  canvas: HTMLCanvasElement,
  active: boolean,
): () => void {
  return actions?.renderBoostPreview(canvas, active) ?? (() => undefined);
}

export function subscribeArchipelagoFrame(
  listener: (elapsed: number) => void,
): () => void {
  frameListeners.add(listener);
  return () => frameListeners.delete(listener);
}

export function publishArchipelagoFrame(elapsed: number): void {
  for (const listener of frameListeners) listener(elapsed);
}
