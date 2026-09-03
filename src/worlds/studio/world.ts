// Studio World 把原创 3D 工作室、物件交互和 Portal 安装到 Runtime Scope。
// Runtime 继续独占 renderer、RAF、URL 切换与跨世界资源回收。
import * as THREE from "three";
import type {
  ActivityLevel,
  QualityBudget,
  WorldModule,
} from "../../runtime/contracts";
import { studioBinding, type StudioExhibitId } from "./binding";
import { studioManifest } from "./manifest";
import {
  isStudioPortalTarget,
  StudioRoom,
} from "./scene/studio-room";
import { createStudioOverlay } from "./ui/studio-overlay";
import "./ui/style.css";

export const studioWorld: WorldModule = {
  manifest: studioManifest,
  async install(scope) {
    const renderer = scope.rendering.renderer;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0xdedbd3, 1);

    let activity: ActivityLevel = scope.lifecycle.activity;
    let quality: QualityBudget = scope.lifecycle.quality;
    let selected: StudioExhibitId | null = null;
    let dragMoved = false;
    let pinchDistance = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    const room = new StudioRoom(studioBinding, scope.loader.manager);
    room.resize(window.innerWidth, window.innerHeight);
    let resolveAbort: (ready: boolean) => void = () => undefined;
    const aborted = new Promise<boolean>((resolve) => {
      resolveAbort = resolve;
    });
    const handleInstallAbort = (): void => resolveAbort(false);
    scope.signal.addEventListener("abort", handleInstallAbort, { once: true });
    const roomReady = await Promise.race([
      room.ready().then(() => true),
      aborted,
    ]);
    scope.signal.removeEventListener("abort", handleInstallAbort);
    if (!roomReady) {
      room.dispose();
      return;
    }

    // Portals are disabled for the room-tour-only site: Studio is the sole world.
    const overlay = createStudioOverlay({
      bindings: studioBinding,
      onEnter: () => {
        renderer.domElement.focus();
      },
      onSelect: (id) => {
        selected = id;
        room.select(id);
        const binding = studioBinding.find((item) => item.id === id);
        // All studio exhibits are projects in the room-tour-only build.
        scope.focus.commit(binding?.kind === "project" ? binding.portfolioId : null);
      },
      onLampToggle: () => room.toggleLamp(),
      onNightChange: (night) => room.setNight(night),
    });
    document.body.append(overlay.root);
    overlay.setActivity(activity === "active");
    overlay.focusEntry();
    const focusRegistration = scope.focus.register((focusId) => {
      if (!focusId) {
        if (selected) overlay.hide();
        return true;
      }
      // All studio exhibits are projects in the room-tour-only build.
      const binding = studioBinding.find(
        (item) => item.kind === "project" && item.portfolioId === focusId,
      );
      if (!binding) return false;
      overlay.enter();
      overlay.show(binding.id);
      return true;
    });

    const activateAtPointer = (): void => {
      const target = room.hitTest(scope.input.pointer);
      if (isStudioPortalTarget(target)) {
        // Portals are disabled for the room-tour-only site.
        return;
      }
      if (target === "lamp") {
        overlay.syncLamp(room.toggleLamp());
        return;
      }
      if (!target || room.activateControl(target)) return;
      const exhibit = studioBinding.find((item) => item.id === target);
      if (exhibit) overlay.show(exhibit.id);
    };

    const handlePointerDown = (event: PointerEvent): void => {
      if (!overlay.hasEntered() || activity !== "active" || event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      dragMoved = false;
      if (pointers.size === 2) {
        const [first, second] = [...pointers.values()];
        pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
      }
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const previous = pointers.get(event.pointerId);
      if (!previous || activity !== "active") return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const [first, second] = [...pointers.values()];
        const nextDistance = Math.hypot(second.x - first.x, second.y - first.y);
        if (pinchDistance > 0) room.zoom((pinchDistance - nextDistance) * 2.2);
        pinchDistance = nextDistance;
        dragMoved = true;
        return;
      }
      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 2) dragMoved = true;
      room.orbit(deltaX, deltaY);
    };

    const handlePointerUp = (event: PointerEvent): void => {
      const wasTracking = pointers.has(event.pointerId);
      const wasTap = wasTracking && pointers.size === 1 && !dragMoved;
      pointers.delete(event.pointerId);
      pinchDistance = 0;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (wasTap) activateAtPointer();
    };

    const handleWheel = (event: WheelEvent): void => {
      if (!overlay.hasEntered() || activity !== "active") return;
      event.preventDefault();
      room.zoom(event.deltaY);
    };
    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !selected) return;
      overlay.hide();
    };
    const handleResize = (): void => room.resize(window.innerWidth, window.innerHeight);

    const previousTouchAction = renderer.domElement.style.touchAction;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", handleResize);

    const applyQuality = (budget: QualityBudget): void => {
      quality = budget;
      renderer.shadowMap.enabled = quality.shadows !== "off";
      renderer.shadowMap.type = THREE.PCFShadowMap;
      room.setQuality(quality);
    };
    applyQuality(quality);

    const activityRegistration = scope.lifecycle.onActivity((level) => {
      activity = level;
      const active = level === "active";
      overlay.setActivity(active);
      if (!active) {
        pointers.clear();
        renderer.domElement.style.cursor = "";
      }
    });
    const qualityRegistration = scope.lifecycle.onQuality(applyQuality);
    const frameRegistration = scope.frame.add("animation", (frame) => {
      if (activity !== "active" && activity !== "near") return;
      const hovered = room.update(
        frame.elapsed,
        scope.input.pointer,
        scope.reducedMotion.matches,
      );
      // Portals are disabled for the room-tour-only site.
      if (activity === "active" && overlay.hasEntered()) {
        overlay.setHovered(hovered);
        renderer.domElement.style.cursor = pointers.size > 0
          ? "grabbing"
          : hovered
            ? "pointer"
            : "grab";
      }
    });

    scope.resources.defer(() => {
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.style.touchAction = previousTouchAction;
      renderer.domElement.style.cursor = "";
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("resize", handleResize);
      frameRegistration.dispose();
      activityRegistration.dispose();
      qualityRegistration.dispose();
      focusRegistration.dispose();
      overlay.dispose();
      room.dispose();
    });

    // Portal Journey 只能在目标世界已经提交首帧之后交换 Session 所有权。
    room.update(0, scope.input.pointer, scope.reducedMotion.matches);
    scope.render.publish({ scene: room.scene, camera: room.camera });
    scope.loader.hide();
  },
};
