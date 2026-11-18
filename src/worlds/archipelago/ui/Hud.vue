<!-- 海岛 HUD：展示航线进度、天色控制、船型切换和全局 toast。 -->
<!-- 它只调用 World 暴露的窄接口，不直接读写 Three.js 场景对象。 -->
<script setup lang="ts">
import { t } from "../../../i18n";
import { onBeforeUnmount, ref, watch } from "vue";
import { store, foundCount, discoverableCount } from "../store";
import { getWorld } from "../scene/world/island-world";

// 时段标签在 store 中保持中文（逻辑比较依赖它），只在展示时翻译。
const TOD_EN: Record<string, string> = { 白天: "Day", 黄昏: "Dusk", 夜晚: "Night", 黎明: "Dawn" };

const toastVisible = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => store.toastKey,
  () => {
    toastVisible.value = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastVisible.value = false), 4200);
  },
);

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
});

function skipTime() {
  getWorld()?.skipTimeOfDay();
}
</script>

<template>
  <div class="hud">
    <!-- 顶部 -->
    <div class="hud-top">
      <div
        class="voyage-status"
        :aria-label="t(`已到访 ${foundCount} / ${discoverableCount} 座岛`, `Visited ${foundCount} / ${discoverableCount} islands`)"
      >
        <span>{{ t("航线记录", "Voyage log") }}</span>
        <div>
          <b>{{ String(foundCount).padStart(2, "0") }}</b>
          <i>/ {{ String(discoverableCount).padStart(2, "0") }}</i>
        </div>
      </div>
      <div class="wordmark">{{ t("作品群岛", "Archipelago") }}<span>{{ t("每件作品都有自己的海岸线", "Every project has its own shoreline") }}</span></div>
      <div class="hud-actions">
        <button
          class="timeofday-control"
          @click="skipTime"
          :title="t('切换到下一个时段', 'Skip to the next time of day')"
        >
          <span>{{ t("当前天色", "Sky") }}</span>
          <strong>{{ t(store.todLabel, TOD_EN[store.todLabel] ?? store.todLabel) }}</strong>
          <i aria-hidden="true">{{ t("切换", "Next") }}</i>
        </button>
      </div>
    </div>

    <!-- toast -->
    <transition name="toast">
      <div v-if="toastVisible" class="toast" :key="store.toastKey">
        {{ store.toast }}
      </div>
    </transition>

    <!-- 底部航行提示 -->
    <div class="hud-bottom">
      <div v-if="store.mode === 'sailing'" class="chip hint">
        <span class="desktop-hint"
          ><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> {{ t("/ 方向键 开船 · 点岛屿或小地图即可快速前往", "/ arrow keys to sail · click an island or the minimap to travel") }}</span
        >
        <span class="mobile-hint"
          >{{ t("按住方向键开船 · 点岛屿或小地图即可快速前往", "Hold the arrows to sail · tap an island or the minimap to travel") }}</span
        >
      </div>
    </div>
  </div>
</template>
