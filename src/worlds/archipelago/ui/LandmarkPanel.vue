<!-- 特殊地标面板：承载巴别塔这类非作品岛的交互，不混入作品岛档案。 -->
<!-- 当前只负责诺亚方舟奖励与船型选择，退出仍走 World 的统一 leave 接口。 -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { BABEL_TOWER_LANDMARK } from "../landmarks";
import { setShipVariant, store, type ShipVariant } from "../store";
import { installDeferredDocumentClick } from "./deferred-document-click";
import { getWorld } from "../scene/world/island-world";
import { renderArchipelagoShipPreview } from "../ui-actions";

const isBabelTower = computed(() => store.dockedId === BABEL_TOWER_LANDMARK.id);
const sloopCanvas = ref<HTMLCanvasElement | null>(null);
const arkCanvas = ref<HTMLCanvasElement | null>(null);
let previews: Array<() => void> = [];
let disposeDocumentClick: (() => void) | undefined;

function disposePreviews() {
  previews.forEach((dispose) => dispose());
  previews = [];
}

async function mountPreviews() {
  await nextTick();
  disposePreviews();
  if (sloopCanvas.value)
    previews.push(renderArchipelagoShipPreview(sloopCanvas.value, "sloop"));
  if (arkCanvas.value)
    previews.push(renderArchipelagoShipPreview(arkCanvas.value, "ark"));
}

onMounted(() => {
  void mountPreviews();
  disposeDocumentClick = installDeferredDocumentClick(handleDocumentClick);
});

onBeforeUnmount(() => {
  disposePreviews();
  disposeDocumentClick?.();
  disposeDocumentClick = undefined;
});

function chooseVariant(variant: ShipVariant) {
  setShipVariant(variant);
  getWorld()?.setShipVariant();
}

function back() {
  getWorld()?.leave();
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".landmark-dossier, .hud-top")) return;
  back();
}
</script>

<template>
  <aside
    v-if="isBabelTower"
    class="landmark-panel"
    :class="{ 'is-night': store.todLabel === '夜晚' }"
    aria-label="巴别塔船型选择"
  >
    <article class="landmark-dossier">
      <button
        class="landmark-close"
        type="button"
        aria-label="返回海面"
        @click.stop="back"
      >
        ×
      </button>

      <header class="landmark-header">
        <p>巴别塔奖励</p>
        <h2>选择航行船型</h2>
      </header>

      <div class="ship-card-grid" aria-label="船型列表">
        <button
          class="ship-card"
          :class="{ active: store.shipVariant === 'sloop' }"
          type="button"
          aria-label="选择小帆船"
          @click="chooseVariant('sloop')"
        >
          <span class="ship-card-stage">
            <canvas ref="sloopCanvas" aria-hidden="true"></canvas>
          </span>
          <span class="ship-card-copy">
            <strong>小帆船</strong>
            <small>原始探险船</small>
          </span>
        </button>

        <button
          class="ship-card"
          :class="{ active: store.shipVariant === 'ark' }"
          type="button"
          aria-label="选择诺亚方舟"
          @click="chooseVariant('ark')"
        >
          <span class="ship-card-stage">
            <canvas ref="arkCanvas" aria-hidden="true"></canvas>
          </span>
          <span class="ship-card-copy">
            <strong>诺亚方舟</strong>
            <small>巴别塔顶发现</small>
          </span>
        </button>
      </div>
    </article>
  </aside>
</template>
