<script setup lang="ts">
import { t } from "../../../i18n";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { getWorld } from "../scene/world/island-world";
import { renderArchipelagoBoostPreview } from "../ui-actions";

type Direction = "up" | "down" | "left" | "right";

const boostCanvas = ref<HTMLCanvasElement | null>(null);
const sprinting = ref(false);
let disposeBoostPreview: (() => void) | null = null;
const activeDirections = new Set<Direction>();

function commitMovement() {
  let throttle = 0;
  let steer = 0;
  if (activeDirections.has("up")) throttle += 1;
  if (activeDirections.has("down")) throttle -= 0.6;
  if (activeDirections.has("left")) steer += 1;
  if (activeDirections.has("right")) steer -= 1;
  getWorld()?.setTouchMovement(throttle, steer, sprinting.value);
}

function setDirection(direction: Direction, active: boolean) {
  if (active) activeDirections.add(direction);
  else activeDirections.delete(direction);
  commitMovement();
}

function onDirectionDown(event: PointerEvent, direction: Direction) {
  const target = event.currentTarget as HTMLElement;
  target.setPointerCapture(event.pointerId);
  setDirection(direction, true);
}

function onSprintDown(event: PointerEvent) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  sprinting.value = true;
  renderBoostPreview(true);
  commitMovement();
}

function clearSprint() {
  sprinting.value = false;
  renderBoostPreview(false);
  commitMovement();
}

function renderBoostPreview(active: boolean) {
  if (!boostCanvas.value) return;
  disposeBoostPreview?.();
  disposeBoostPreview = renderArchipelagoBoostPreview(
    boostCanvas.value,
    active,
  );
}

onMounted(() => renderBoostPreview(false));

onBeforeUnmount(() => {
  activeDirections.clear();
  getWorld()?.setTouchMovement(0, 0, false);
  disposeBoostPreview?.();
  disposeBoostPreview = null;
});
</script>

<template>
  <div class="mobile-controls" :aria-label="t('移动端航行控制', 'Sailing controls')">
    <div class="direction-wrap">
      <span class="control-label">{{ t("航向", "Heading") }}</span>
      <div class="direction-pad" role="group" :aria-label="t('方向控制', 'Direction')">
        <span aria-hidden="true"></span>
        <button
          class="direction-button"
          type="button"
          :aria-label="t('向前航行', 'Sail forward')"
          @pointerdown.prevent="onDirectionDown($event, 'up')"
          @pointerup.prevent="setDirection('up', false)"
          @pointercancel.prevent="setDirection('up', false)"
          @lostpointercapture="setDirection('up', false)"
        >
          ↑
        </button>
        <span aria-hidden="true"></span>
        <button
          class="direction-button"
          type="button"
          :aria-label="t('向左转向', 'Turn left')"
          @pointerdown.prevent="onDirectionDown($event, 'left')"
          @pointerup.prevent="setDirection('left', false)"
          @pointercancel.prevent="setDirection('left', false)"
          @lostpointercapture="setDirection('left', false)"
        >
          ←
        </button>
        <span class="direction-center" aria-hidden="true">✦</span>
        <button
          class="direction-button"
          type="button"
          :aria-label="t('向右转向', 'Turn right')"
          @pointerdown.prevent="onDirectionDown($event, 'right')"
          @pointerup.prevent="setDirection('right', false)"
          @pointercancel.prevent="setDirection('right', false)"
          @lostpointercapture="setDirection('right', false)"
        >
          →
        </button>
        <span aria-hidden="true"></span>
        <button
          class="direction-button"
          type="button"
          :aria-label="t('向后航行', 'Sail backward')"
          @pointerdown.prevent="onDirectionDown($event, 'down')"
          @pointerup.prevent="setDirection('down', false)"
          @pointercancel.prevent="setDirection('down', false)"
          @lostpointercapture="setDirection('down', false)"
        >
          ↓
        </button>
        <span aria-hidden="true"></span>
      </div>
    </div>

    <button
      class="sprint-control"
      type="button"
      :aria-label="t('按住加速航行', 'Hold to boost')"
      @pointerdown.prevent="onSprintDown"
      @pointerup.prevent="clearSprint"
      @pointercancel.prevent="clearSprint"
      @lostpointercapture="clearSprint"
    >
      <canvas ref="boostCanvas" class="boost-model" aria-hidden="true"></canvas>
    </button>
  </div>
</template>
