// Archipelago 原生 World Module：把海岛场景和 Vue HUD 安装到 Runtime 提供的 scope。
// Runtime 仍独占 renderer、RAF、Portal Journey 和 Session 资源回收。
import { createApp } from "vue";
import type {
  ActivityLevel,
  PortalDescriptor,
  PortalJourneyState,
  PortalRegistration,
  QualityBudget,
  WorldModule,
} from "../../runtime/contracts";
import { archipelagoManifest } from "./manifest";
import { loadPortfolioIslands } from "./portfolio-islands";
import { createWorld } from "./scene/world/island-world";
import { islandById, setIslands } from "./store";
import { installArchipelagoUiActions } from "./ui-actions";
import { publishArchipelagoFrame } from "./ui-actions";
import App from "./ui/App.vue";
import "./ui/style.css";
import { renderShipCardPreview } from "./scene/ship/ship-card-preview";
import { renderMobileBoostPreview } from "./scene/ship/mobile-boost-model";
import { WORLD_PORTALS } from "../portals.config";
import {
  WORLD_NAMING,
  type KnownWorldId,
} from "../worlds.config";

const PORTAL_DESCRIPTORS = {
  [WORLD_NAMING.cosmic.id]: WORLD_PORTALS.archipelagoToCosmic,
  [WORLD_NAMING.jianghu.id]: WORLD_PORTALS.archipelagoToJianghu,
  [WORLD_NAMING.linework.id]: WORLD_PORTALS.archipelagoToLinework,
} satisfies Record<
  | typeof WORLD_NAMING.cosmic.id
  | typeof WORLD_NAMING.jianghu.id
  | typeof WORLD_NAMING.linework.id,
  PortalDescriptor
>;

function openProject(href: string): void {
  const url = new URL(href, window.location.href);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  window.open(url.href, "_blank", "noopener,noreferrer");
}

export const archipelagoWorld: WorldModule = {
  manifest: archipelagoManifest,
  async install(scope) {
    const islands = loadPortfolioIslands();
    setIslands(islands);

    const world = createWorld(
      scope.rendering.renderer,
      islands,
      scope.lifecycle.quality.shadows !== "off",
    );
    let activity: ActivityLevel = scope.lifecycle.activity;
    let quality: QualityBudget = scope.lifecycle.quality;
    let portal: PortalRegistration | null = null;
    let portalTarget: KnownWorldId | null = null;

    const setPortal = (targetWorldId: KnownWorldId): PortalRegistration | null => {
      const descriptor =
        PORTAL_DESCRIPTORS[
          targetWorldId as keyof typeof PORTAL_DESCRIPTORS
        ];
      if (!descriptor) return null;
      if (portal && portalTarget === targetWorldId) return portal;
      portal?.dispose();
      portalTarget = targetWorldId;
      portal = scope.portals.register({
        ...descriptor,
        onStateChange(state: PortalJourneyState) {
          // preparing 仍让漩涡和船只捕获继续推进；遮罩覆盖后才冻结昂贵模拟。
          const sourceCovered = state === "crossing" || state === "arriving";
          world.setPaused(activity !== "active" || sourceCovered);
        },
      });
      portal.setProximity(1);
      return portal;
    };

    world.onOpenProject = (islandId, projectId) => {
      const project = islandById(islandId)?.projects.find(
        (item) => item.id === projectId,
      );
      if (project) openProject(project.url);
    };
    world.onFocusChange = (islandId) => scope.focus.commit(islandId);
    world.onPortalPreload = (targetWorldId) => {
      setPortal(targetWorldId)?.preload();
    };
    world.onPortalRequest = (targetWorldId) => {
      setPortal(targetWorldId)?.request();
    };
    world.setQuality(
      quality.shadows !== "off",
      quality.postProcessing !== "off",
    );
    world.setPaused(activity !== "active");
    const focusRegistration = scope.focus.register((focusId) => {
      if (!focusId) {
        world.leave();
        return true;
      }
      return world.fastTravelTo(focusId);
    });

    const uiRoot = document.createElement("div");
    uiRoot.className = "archipelago-ui-root";
    document.body.append(uiRoot);
    const app = createApp(App);
    app.mount(uiRoot);

    const uninstallUiActions = installArchipelagoUiActions({
      openProject,
      requestPortal(targetWorldId) {
        setPortal(targetWorldId)?.request();
      },
      renderShipPreview(canvas, variant) {
        return renderShipCardPreview(
          scope.rendering.renderer,
          canvas,
          variant,
        );
      },
      renderBoostPreview(canvas, active) {
        return renderMobileBoostPreview(
          scope.rendering.renderer,
          canvas,
          active,
        );
      },
    });

    const activityRegistration = scope.lifecycle.onActivity((level) => {
      activity = level;
      world.setPaused(activity !== "active");
    });
    const qualityRegistration = scope.lifecycle.onQuality((budget) => {
      quality = budget;
      world.setQuality(
        quality.shadows !== "off",
        quality.postProcessing !== "off",
      );
    });
    const frameRegistration = scope.frame.add("animation", (frame) => {
      if (activity !== "active") return;
      world.update(frame.delta);
      publishArchipelagoFrame(frame.elapsed);
    });

    scope.resources.defer(() => {
      frameRegistration.dispose();
      activityRegistration.dispose();
      qualityRegistration.dispose();
      focusRegistration.dispose();
      uninstallUiActions();
      app.unmount();
      uiRoot.remove();
      portal?.dispose();
      world.dispose();
    });

    // install 返回前先完成一次模拟和实际出帧，Portal Journey 才能把目标视为可提交。
    world.update(0);
    world.render();
    scope.render.publish({
      scene: world.scene,
      camera: world.camera,
      render: () => world.render(),
    });
    scope.loader.hide();
  },
};
