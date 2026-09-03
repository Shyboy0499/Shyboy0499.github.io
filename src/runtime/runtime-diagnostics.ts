// Runtime 调试端口：仅在 debug=runtime 时提供可重复 Journey 压测和只读资源快照。
// 它不参与正常用户路径，也不拥有 renderer、World Session 或 Portal 生命周期。
import type { WebGLRenderer } from "three";
import type { KnownWorldId } from "../worlds/worlds.config";

const STRESS_ROUTE: readonly KnownWorldId[] = [
  "cosmic",
  "archipelago",
  "jianghu",
  "linework",
  "studio",
];

export interface RuntimeDiagnosticsSnapshot {
  activeWorldId: KnownWorldId;
  context: "active" | "lost";
  frameTasks: number;
  frameRunning: boolean;
  runtimeCleanups: number;
  sessionCleanups: number;
  sessionGeneration: number;
  sessionsInstalled: number;
  sessionsDisposed: number;
  gpu: {
    geometries: number;
    textures: number;
    programs: number;
  };
}

interface RuntimeDiagnosticsDependencies {
  renderer: WebGLRenderer;
  readSnapshot(): Omit<RuntimeDiagnosticsSnapshot, "gpu">;
  navigate(targetWorldId: KnownWorldId): Promise<boolean>;
  loseContext(): void;
  restoreContext(): void;
}

export interface RuntimeDiagnosticsPort {
  refresh(): void;
  dispose(): void;
}

interface StressReport {
  route: readonly KnownWorldId[];
  warmup: RuntimeDiagnosticsSnapshot;
  rounds: RuntimeDiagnosticsSnapshot[];
}

function readSnapshot(
  dependencies: RuntimeDiagnosticsDependencies,
): RuntimeDiagnosticsSnapshot {
  const info = dependencies.renderer.info;
  return {
    ...dependencies.readSnapshot(),
    gpu: {
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    },
  };
}

function waitForSettledFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function installRuntimeDiagnostics(
  dependencies: RuntimeDiagnosticsDependencies,
): RuntimeDiagnosticsPort | null {
  if (new URLSearchParams(window.location.search).get("debug") !== "runtime") {
    return null;
  }

  const root = document.createElement("aside");
  root.dataset.runtimeDebug = "";
  root.dataset.status = "idle";
  root.setAttribute("aria-label", "Runtime diagnostics");
  Object.assign(root.style, {
    position: "fixed",
    left: "12px",
    bottom: "12px",
    zIndex: "10000",
    display: "grid",
    gap: "6px",
    width: "min(360px, calc(100vw - 24px))",
    padding: "8px",
    color: "#e8edf2",
    background: "rgba(7, 10, 14, 0.94)",
    border: "1px solid rgba(255, 255, 255, 0.24)",
    borderRadius: "6px",
    font: "11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace",
  });

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "6px";
  const output = document.createElement("output");
  output.dataset.runtimeDiagnostics = "";
  output.style.whiteSpace = "pre-wrap";
  output.style.maxHeight = "180px";
  output.style.overflow = "auto";

  const createButton = (
    action: string,
    label: string,
    run: () => void,
  ): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.runtimeAction = action;
    button.textContent = label;
    Object.assign(button.style, {
      minHeight: "28px",
      padding: "4px 8px",
      color: "inherit",
      background: "#202832",
      border: "1px solid #647180",
      borderRadius: "4px",
      cursor: "pointer",
    });
    button.addEventListener("click", run);
    controls.append(button);
    return button;
  };

  let disposed = false;
  let stressRunning = false;
  let report: StressReport | null = null;
  const refresh = (): void => {
    if (disposed) return;
    const current = readSnapshot(dependencies);
    const payload = report ? { current, stress: report } : { current };
    const serialized = JSON.stringify(payload, null, 2);
    output.textContent = serialized;
    document.documentElement.dataset.runtimeDiagnostics = serialized;
  };

  const stressButton = createButton("stress", "10x", () => {
    if (stressRunning) return;
    stressRunning = true;
    stressButton.disabled = true;
    root.dataset.status = "running";
    report = null;
    refresh();

    void (async () => {
      try {
        if (dependencies.readSnapshot().activeWorldId !== "studio") {
          const prepared = await dependencies.navigate("studio");
          if (!prepared) throw new Error("Unable to prepare Studio World.");
        }

        // 首轮只负责触发纹理上传与 shader 编译，正式基线从预热后的 Studio 读取。
        for (const worldId of STRESS_ROUTE) {
          if (!(await dependencies.navigate(worldId))) {
            throw new Error(`Warmup Journey failed at ${worldId}.`);
          }
        }
        await waitForSettledFrames();
        const warmup = readSnapshot(dependencies);
        const rounds: RuntimeDiagnosticsSnapshot[] = [];
        for (let round = 0; round < 10; round += 1) {
          for (const worldId of STRESS_ROUTE) {
            if (!(await dependencies.navigate(worldId))) {
              throw new Error(`Round ${round + 1} failed at ${worldId}.`);
            }
          }
          await waitForSettledFrames();
          rounds.push(readSnapshot(dependencies));
          report = { route: STRESS_ROUTE, warmup, rounds: [...rounds] };
          refresh();
        }
        const final = rounds.at(-1)!;
        const stableRuntimeOwnership = rounds.every(
          (snapshot) =>
            snapshot.activeWorldId === "studio" &&
            snapshot.context === "active" &&
            snapshot.frameRunning &&
            snapshot.frameTasks === warmup.frameTasks &&
            snapshot.runtimeCleanups === warmup.runtimeCleanups &&
            snapshot.sessionCleanups === warmup.sessionCleanups &&
            snapshot.sessionsInstalled - snapshot.sessionsDisposed === 1,
        );
        if (!stableRuntimeOwnership) {
          throw new Error("Runtime ownership counters did not return to baseline.");
        }
        if (
          final.gpu.geometries > warmup.gpu.geometries ||
          final.gpu.textures > warmup.gpu.textures ||
          final.gpu.programs > warmup.gpu.programs
        ) {
          throw new Error(
            `GPU resources exceeded baseline: ${JSON.stringify({
              warmup: warmup.gpu,
              final: final.gpu,
            })}`,
          );
        }
        root.dataset.status = "passed";
      } catch (error) {
        root.dataset.status = "failed";
        root.dataset.error =
          error instanceof Error ? error.message : "Unknown stress failure";
      } finally {
        stressRunning = false;
        stressButton.disabled = false;
        refresh();
      }
    })();
  });
  createButton("lose-context", "LOSE", () => dependencies.loseContext());
  createButton("restore-context", "RESTORE", () =>
    dependencies.restoreContext(),
  );

  root.append(controls, output);
  document.body.append(root);
  const refreshTimer = window.setInterval(refresh, 500);
  refresh();

  return {
    refresh,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      window.clearInterval(refreshTimer);
      delete document.documentElement.dataset.runtimeDiagnostics;
      root.remove();
    },
  };
}
