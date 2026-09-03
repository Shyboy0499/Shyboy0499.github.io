<script setup lang="ts">
import { ref, computed } from "vue";
import { statusOf, store } from "../store";
import { getWorld } from "../scene/world/island-world";

// 岛屿名录：按项目名或作者搜索，点一下即可快速前往对应作品岛。
const open = ref(false);
const q = ref("");

const STATUS_TXT: Record<string, string> = {
  locked: "待发现",
  visited: "已到访",
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
      aria-label="打开岛屿目录"
    >
      <span class="finder-mark" aria-hidden="true"></span>
      <span><small>航海图</small>岛屿目录</span>
    </button>
    <transition name="toast">
      <div v-if="open" class="list-panel">
        <header class="list-heading">
          <div>
            <small>SHYBOY0499'S ARCHIPELAGO</small>
            <h2>作品岛航海志</h2>
          </div>
          <button
            class="list-close"
            type="button"
            aria-label="关闭岛屿志"
            @click="open = false"
          >
            ×
          </button>
        </header>
        <label class="list-search-wrap">
          <span>索引</span>
          <input v-model="q" class="list-search" placeholder="输入作品名" />
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
          <div v-if="!list.length" class="empty">没有找到这座作品岛</div>
        </div>
        <footer class="list-footer">
          <span>沿航线选择一座岛</span>
          <span>{{ list.length }} ISLANDS</span>
        </footer>
      </div>
    </transition>
  </div>
</template>
