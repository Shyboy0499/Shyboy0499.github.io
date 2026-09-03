<!-- Archipelago Vue 外壳只负责 HUD 和面板；Three.js 场景与 Runtime 生命周期由 World Module 管理。 -->
<!-- UI 通过显式动作接缝表达外链和 Portal 意图，不直接持有 renderer 或 PortalRegistration。 -->
<script setup lang="ts">
import { computed } from "vue";
import { WORLD_NAMING } from "../../worlds.config";
import { requestArchipelagoPortal } from "../ui-actions";
import Hud from "./Hud.vue";
import MobileControls from "./MobileControls.vue";
import Minimap from "./Minimap.vue";
import IslandList from "./IslandList.vue";
import IslandPanel from "./IslandPanel.vue";
import LandmarkPanel from "./LandmarkPanel.vue";
import { BABEL_TOWER_LANDMARK } from "../landmarks";
import { store } from "../store";

const empty = computed(() => store.islands.length === 0);

function enterCosmicGate() {
  requestArchipelagoPortal(WORLD_NAMING.cosmic.id);
}
</script>

<template>
  <div class="archipelago-ui stage">
    <Hud />
    <IslandList v-if="store.mode !== 'landed'" />
    <Minimap v-if="store.mode !== 'landed'" />
    <MobileControls v-if="store.mode !== 'landed'" />
    <button
      v-if="store.mode !== 'landed'"
      class="tidal-gate"
      type="button"
      aria-label="返回 Cosmic 世界"
      @click="enterCosmicGate"
    >
      <span aria-hidden="true"></span>
      <small>WORLD GATE</small>
      <strong>返回 Cosmic</strong>
    </button>
    <IslandPanel
      v-if="
        store.mode === 'landed' && store.dockedId !== BABEL_TOWER_LANDMARK.id
      "
    />
    <LandmarkPanel
      v-if="
        store.mode === 'landed' && store.dockedId === BABEL_TOWER_LANDMARK.id
      "
    />
    <div v-if="empty" class="empty-world">海面正在等待第一座岛</div>
  </div>
</template>
