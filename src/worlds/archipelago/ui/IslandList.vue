<script setup lang="ts">
import { t } from "../../../i18n";
import { ref, computed } from "vue";
import { statusOf, store } from "../store";
import { getWorld } from "../scene/world/island-world";

// 岛屿名录：按项目名或作者搜索，点一下即可快速前往对应作品岛。
const open = ref(false);
const q = ref("");

const STATUS_TXT: Record<string, string> = {
  locked: t("待发现", "Undiscovered"),
  visited: t("已到访", "Visited"),
};

const list = computed(() => {
  const kw = q.value.trim();
  // 雾岛仍留在 3D 海域中承载未来作品，但目录只记录访客此刻真正能够抵达的岛。
  return store.islands
    .filter((island) => island.projects.length > 0)
    .map((island) => ({
      id: island.id,
      name: island.name,
      status: statusOf(island) as "locked" | "visited",
    }))
    .filter(
      (island) =>
        !kw || island.name.toLocaleLowerCase().includes(kw.toLocaleLowerCase()),
    );
});

function go(id: string) {
  getWorld()?.fastTravelTo(id);
  open.value = false;
}
</script>

<template>
  <div class="island-list">
    <button
      class="finder-btn"
      @click="open = !open"
      :aria-expanded="open"
      :aria-label="t('打开岛屿目录', 'Open island index')"
    >
      <span class="finder-mark" aria-hidden="true"></span>
      <span><small>{{ t("航海图", "Chart") }}</small>{{ t("岛屿目录", "Island index") }}</span>
    </button>
    <transition name="toast">
      <div v-if="open" class="list-panel">
        <header class="list-heading">
          <div>
            <small>SHYBOY0499'S ARCHIPELAGO</small>
            <h2>{{ t("作品岛航海志", "Island Logbook") }}</h2>
          </div>
          <button
            class="list-close"
            type="button"
            :aria-label="t('关闭岛屿志', 'Close logbook')"
            @click="open = false"
          >
            ×
          </button>
        </header>
        <label class="list-search-wrap">
          <span>{{ t("索引", "Index") }}</span>
          <input v-model="q" class="list-search" :placeholder="t('输入作品名', 'Search projects')" />
        </label>
        <div class="list-scroll">
          <button
            v-for="it in list"
            :key="it.id"
            class="list-row"
            @click="go(it.id)"
          >
            <span class="list-route" aria-hidden="true"></span>
            <span class="nm">{{ it.name }}</span>
            <span class="st">{{ STATUS_TXT[it.status] }}</span>
          </button>
          <div v-if="!list.length" class="empty">{{ t("没有找到这座作品岛", "No island matches that name") }}</div>
        </div>
        <footer class="list-footer">
          <span>{{ t("沿航线选择一座岛", "Pick an island along the route") }}</span>
          <span>{{ list.length }} ISLANDS</span>
        </footer>
      </div>
    </transition>
  </div>
</template>
