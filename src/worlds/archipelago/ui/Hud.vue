<!-- 海岛 HUD：展示航线进度、天色控制、船型切换和全局 toast。 -->
<!-- 它只调用 World 暴露的窄接口，不直接读写 Three.js 场景对象。 -->
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { store, foundCount, discoverableCount } from "../store";
import { getWorld } from "../scene/world/island-world";

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
        :aria-label="`已到访 ${foundCount} / ${discoverableCount} 座岛`"
      >
        <span>航线记录</span>
        <div>
          <b>{{ String(foundCount).padStart(2, "0") }}</b>
          <i>/ {{ String(discoverableCount).padStart(2, "0") }}</i>
        </div>
      </div>
      <div class="wordmark">作品群岛<span>每件作品都有自己的海岸线</span></div>
      <div class="hud-actions">
        <button
          class="timeofday-control"
          @click="skipTime"
          title="切换到下一个时段"
        >
          <span>当前天色</span>
          <strong>{{ store.todLabel }}</strong>
          <i aria-hidden="true">切换</i>
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
          ><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向键 开船 ·
          点岛屿或小地图即可快速前往</span
        >
        <span class="mobile-hint"
          >按住方向键开船 · 点岛屿或小地图即可快速前往</span
        >
      </div>
    </div>
  </div>
</template>
