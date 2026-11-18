// Linework World 把线稿场景、项目批注和 Portal 安装到 Runtime Scope。
// Runtime 继续独占 renderer、RAF、URL 切换和跨世界资源所有权。
import * as THREE from "three";
import type {
  ActivityLevel,
  QualityBudget,
  WorldModule,
} from "../../runtime/contracts";
import { lineworkBinding, type LineworkExhibitId } from "./binding";
import { lineworkManifest } from "./manifest";
import { LineworkPipeline } from "./scene/linework-pipeline";
import { LineworkRoom } from "./scene/linework-room";
import { createLineworkOverlay } from "./ui/linework-overlay";
import "./ui/style.css";
import { WORLD_PORTALS } from "../portals.config";

export const lineworkWorld: WorldModule = {
  manifest: lineworkManifest,
  async install(scope) {
    const renderer = scope.rendering.renderer;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0xffffff, 1);

    let activity: ActivityLevel = scope.lifecycle.activity;
    let quality: QualityBudget = scope.lifecycle.quality;
    let selected: LineworkExhibitId | null = null;
    const room = new LineworkRoom(lineworkBinding);
    const pipeline = new LineworkPipeline(renderer, room.scene, room.camera, quality);
    const portal = scope.portals.register({
      ...WORLD_PORTALS.lineworkToStudio,
      getTransitionOrigin: () => ({
        x: window.innerWidth * 0.79,
        y: window.innerHeight * 0.62,
      }),
      onStateChange: (state) => room.setPortalState(state),
    });
    portal.setProximity(activity === "active" ? 1 : 0);

    const overlay = createLineworkOverlay(
      lineworkBinding,
      (id) => {
        selected = id;
        room.select(id);
        const binding = lineworkBinding.find((item) => item.id === id);
        scope.focus.commit(
          binding
            ? binding.kind === "project"
              ? binding.portfolioId
              : binding.collectionId
            : null,
        );
      },
      () => portal.request(),
    );
    document.body.append(overlay.root);
    overlay.setActivity(activity === "active");
    const focusRegistration = scope.focus.register((focusId) => {
      if (!focusId) {
        if (selected) overlay.hide();
        return true;
      }
      const binding = lineworkBinding.find((item) =>
        item.kind === "project"
          ? item.portfolioId === focusId
          : item.collectionId === focusId,
      );
      if (!binding) return false;
      selected = binding.id;
      room.select(binding.id);
      overlay.show(binding.id);
      return true;
    });

    const handlePointerUp = (event: PointerEvent): void => {
      if (event.button !== 0 || activity !== "active") return;
      const target = room.hitTest(scope.input.pointer);
      if (target === "portal") {
        portal.request();
        return;
      }
      if (!target || room.activateControl(target)) return;
      const exhibit = lineworkBinding.find((item) => item.id === target);
      if (!exhibit) return;
      selected = exhibit.id;
      room.select(exhibit.id);
      overlay.show(exhibit.id);
    };
    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !selected) return;
      overlay.hide();
    };
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeydown);

    const activityRegistration = scope.lifecycle.onActivity((level) => {
      activity = level;
      const active = level === "active";
      overlay.setActivity(active);
      portal.setProximity(active ? 1 : 0);
      if (!active) renderer.domElement.style.cursor = "";
    });
    const qualityRegistration = scope.lifecycle.onQuality((budget) => {
      quality = budget;
      pipeline.setQuality(quality);
    });
    const frameRegistration = scope.frame.add("animation", (frame) => {
      if (activity !== "active" && activity !== "near") return;
      const hovered = room.update(
        frame.elapsed,
        scope.input.pointer,
        scope.reducedMotion.matches,
      );
      if (activity === "active") {
        renderer.domElement.style.cursor = hovered ? "pointer" : "";
      }
    });

    scope.resources.defer(() => {
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeydown);
      renderer.domElement.style.cursor = "";
      frameRegistration.dispose();
      activityRegistration.dispose();
      qualityRegistration.dispose();
      focusRegistration.dispose();
      portal.dispose();
      overlay.dispose();
      pipeline.dispose();
      room.dispose();
    });

    // 目标会话安装完成前先出一帧，Portal Journey 才能安全提交所有权。
    room.update(0, scope.input.pointer, scope.reducedMotion.matches);
    pipeline.render();
    scope.render.publish({
      scene: room.scene,
      camera: room.camera,
      render: () => pipeline.render(),
    });
    scope.loader.hide();
  },
};
