// Jianghu World 的 Runtime 适配器；它把 DOM 江湖世界接入 WorldModule 契约。
// Jianghu 的主要画面是 DOM，但仍发布空 Render View 以服从 Runtime 渲染流程。
import * as THREE from "three";
import type {
  ActivityLevel,
  PortalJourneyState,
  WorldModule,
} from "../../runtime/contracts";
import { jianghuManifest } from "./manifest";
import { JianghuScene } from "./jianghu-scene";
import { WORLD_PORTALS } from "../portals.config";

export const jianghuWorld: WorldModule = {
  manifest: jianghuManifest,
  async install(scope) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b12);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    let activity: ActivityLevel = scope.lifecycle.activity;
    let lineworkPortal: { request(): void } | null = null;
    // JianghuScene 挂到 body，但创建、暂停和销毁都绑定在 Runtime 提供的 scope 上。
    const jianghuScene = new JianghuScene(import.meta.env.BASE_URL, undefined, () => {
      lineworkPortal?.request();
    });
    document.body.append(jianghuScene.root);
    jianghuScene.setPaused(activity !== "active");
    jianghuScene.onFocusChange = (agentId) => scope.focus.commit(agentId);
    const focusRegistration = scope.focus.register((focusId) =>
      jianghuScene.focusAgent(focusId),
    );

    const activityRegistration = scope.lifecycle.onActivity((level) => {
      activity = level;
      jianghuScene.setPaused(activity !== "active");
    });
    scope.resources.defer(() => {
      activityRegistration.dispose();
      focusRegistration.dispose();
      jianghuScene.dispose();
    });

    const frameRegistration = scope.frame.add("animation", (frame) => {
      jianghuScene.update(frame.elapsed, frame.delta);
    });
    scope.resources.defer(() => frameRegistration.dispose());

    const portal = scope.portals.register({
      ...WORLD_PORTALS.jianghuToLinework,
      onStateChange(state: PortalJourneyState) {
        jianghuScene.setPortalState(state);
        const sourceCovered = state === "crossing" || state === "arriving";
        jianghuScene.setPaused(activity !== "active" || sourceCovered);
      },
    });
    lineworkPortal = portal;
    portal.setProximity(1);
    scope.resources.defer(() => portal.dispose());

    // DOM World 也发布 Render View，避免 Runtime 的最终 render phase 出现空视图。
    scope.render.publish({ scene, camera });
    scope.loader.hide();
  },
};
