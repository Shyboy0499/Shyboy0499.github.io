// 浏览器 World 历史协调器：拥有 URL 写入与 popstate 恢复，不安装 World Session。
// Runtime 提供当前 World 和事务性导航回调，协调器只在结果确定后修正地址栏。
import {
  WORLD_NAMING,
  WORLD_FOCUS_QUERY_PARAM,
  WORLD_QUERY_PARAM,
  type KnownWorldId,
} from "../worlds/worlds.config";

type HistoryNavigator = (
  targetWorldId: KnownWorldId,
  focusId: string | null,
) => Promise<boolean>;
type FocusRestorer = (focusId: string | null) => boolean;

interface ResolvedWorldLocation {
  worldId: KnownWorldId;
  focusId: string | null;
  needsNormalization: boolean;
}

const HISTORY_WORLD_KEY = "qiunerWorld";
const HISTORY_FOCUS_KEY = "qiunerFocus";

function resolveWorldLocation(): ResolvedWorldLocation {
  const requested = new URLSearchParams(window.location.search).get(
    WORLD_QUERY_PARAM,
  );
  if (!requested) {
    return {
      worldId: WORLD_NAMING.cosmic.id,
      focusId: readFocusId(),
      needsNormalization: false,
    };
  }

  const match = Object.values(WORLD_NAMING).find(
    (world) => world.urlWorldParam === requested,
  );
  return match
    ? {
        worldId: match.id,
        focusId: readFocusId(),
        needsNormalization: false,
      }
    : {
        worldId: WORLD_NAMING.cosmic.id,
        focusId: null,
        needsNormalization: true,
      };
}

function readFocusId(): string | null {
  const focusId = new URLSearchParams(window.location.search)
    .get(WORLD_FOCUS_QUERY_PARAM)
    ?.trim();
  return focusId || null;
}

function createHistoryState(
  worldId: KnownWorldId,
  focusId: string | null,
): Record<string, unknown> {
  const current = window.history.state;
  const state = current && typeof current === "object" ? { ...current } : {};
  return {
    ...state,
    [HISTORY_WORLD_KEY]: worldId,
    [HISTORY_FOCUS_KEY]: focusId,
  };
}

function createWorldUrl(worldId: KnownWorldId, focusId: string | null): URL {
  const url = new URL(window.location.href);
  const worldConfig = WORLD_NAMING[worldId];
  if (worldId === WORLD_NAMING.cosmic.id) {
    url.searchParams.delete(WORLD_QUERY_PARAM);
  } else {
    url.searchParams.set(WORLD_QUERY_PARAM, worldConfig.urlWorldParam);
  }
  if (focusId) url.searchParams.set(WORLD_FOCUS_QUERY_PARAM, focusId);
  else url.searchParams.delete(WORLD_FOCUS_QUERY_PARAM);
  return url;
}

export class WorldHistoryDirector {
  private generation = 0;
  private disposed = false;
  private started = false;

  constructor(
    private readonly readActiveLocation: () => {
      worldId: KnownWorldId;
      focusId: string | null;
    },
    private readonly navigate: HistoryNavigator,
    private readonly restoreFocus: FocusRestorer,
  ) {}

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    window.addEventListener("popstate", this.handlePopState);
  }

  readLocation(): ResolvedWorldLocation {
    return resolveWorldLocation();
  }

  replace(worldId: KnownWorldId, focusId: string | null = null): void {
    window.history.replaceState(
      createHistoryState(worldId, focusId),
      "",
      createWorldUrl(worldId, focusId),
    );
  }

  push(worldId: KnownWorldId, focusId: string | null = null): void {
    window.history.pushState(
      createHistoryState(worldId, focusId),
      "",
      createWorldUrl(worldId, focusId),
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    if (this.started) {
      window.removeEventListener("popstate", this.handlePopState);
    }
  }

  private handlePopState = (): void => {
    void this.restoreFromLocation();
  };

  private async restoreFromLocation(): Promise<void> {
    const generation = ++this.generation;
    const target = resolveWorldLocation();
    const active = this.readActiveLocation();

    if (target.worldId === active.worldId) {
      const accepted = this.restoreFocus(target.focusId);
      if (!accepted || target.needsNormalization) {
        const restored = this.readActiveLocation();
        this.replace(restored.worldId, restored.focusId);
      }
      return;
    }

    const committed = await this.navigate(
      target.worldId,
      target.focusId,
    ).catch((error) => {
      console.error(
        `[runtime] History target failed: ${target.worldId}`,
        error,
      );
      return false;
    });
    if (this.disposed || generation !== this.generation) return;

    if (!committed) {
      // popstate 已经移动地址栏；恢复失败时必须把当前条目改回仍存活的来源 World。
      const restored = this.readActiveLocation();
      this.replace(restored.worldId, restored.focusId);
    } else {
      const restored = this.readActiveLocation();
      if (
        target.needsNormalization ||
        restored.focusId !== target.focusId
      ) {
        this.replace(restored.worldId, restored.focusId);
      }
    }
  }
}
