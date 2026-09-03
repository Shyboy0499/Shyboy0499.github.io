<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { store, islandById } from "../store";
import { getWorld } from "../scene/world/island-world";
import {
  openArchipelagoProject,
  requestArchipelagoPortal,
} from "../ui-actions";
import type { IslandPhotoRef } from "../islands";
import { installDeferredDocumentClick } from "./deferred-document-click";
import { WORLD_NAMING } from "../../worlds.config";

const island = computed(() =>
  store.dockedId ? islandById(store.dockedId) : undefined,
);
const viewer = ref<HTMLDialogElement | null>(null);
const carouselIndex = ref(0);
const carouselPaused = ref(false);
const activePhotoId = ref<string | null>(null);
const carouselPhoto = computed(() => island.value?.photos[carouselIndex.value]);
const activePhoto = computed(() =>
  island.value?.photos.find((photo) => photo.id === activePhotoId.value),
);
const activePhotoIndex = computed(
  () =>
    island.value?.photos.findIndex(
      (photo) => photo.id === activePhotoId.value,
    ) ?? -1,
);
let carouselTimer: number | undefined;
let disposeDocumentClick: (() => void) | undefined;

function clearCarouselTimer() {
  if (carouselTimer !== undefined) {
    window.clearTimeout(carouselTimer);
    carouselTimer = undefined;
  }
}

function scheduleCarousel() {
  clearCarouselTimer();
  if (
    carouselPaused.value ||
    (island.value?.photos.length ?? 0) < 2 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  carouselTimer = window.setTimeout(() => {
    if (!viewer.value?.open && document.visibilityState === "visible") {
      advanceCarousel(1);
    }
    scheduleCarousel();
  }, 5000);
}

onMounted(() => {
  scheduleCarousel();
  // The panel can mount while the island-selection click is still bubbling.
  // Defer the global exit listener so that opening click cannot close it again.
  disposeDocumentClick = installDeferredDocumentClick(handleDocumentClick);
});
onBeforeUnmount(() => {
  clearCarouselTimer();
  disposeDocumentClick?.();
  disposeDocumentClick = undefined;
});

watch(
  () => island.value?.id,
  () => {
    carouselIndex.value = 0;
    closePhoto();
    scheduleCarousel();
  },
);

function open(projectId: string) {
  const project = island.value?.projects.find((item) => item.id === projectId);
  if (project) openArchipelagoProject(project.url);
}

function selectCarouselPhoto(index: number) {
  carouselIndex.value = index;
  scheduleCarousel();
}

function advanceCarousel(offset: number) {
  const photos = island.value?.photos ?? [];
  if (photos.length < 2) return;
  carouselIndex.value =
    (carouselIndex.value + offset + photos.length) % photos.length;
}

function moveCarousel(offset: number) {
  advanceCarousel(offset);
  scheduleCarousel();
}

function pauseCarousel() {
  carouselPaused.value = true;
  clearCarouselTimer();
}

function resumeCarousel() {
  carouselPaused.value = false;
  scheduleCarousel();
}

function handleGalleryFocusOut(event: FocusEvent) {
  const gallery = event.currentTarget as HTMLElement;
  if (!gallery.contains(event.relatedTarget as Node | null)) resumeCarousel();
}

function handleCarouselKey(event: KeyboardEvent) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveCarousel(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    moveCarousel(1);
  }
}

async function showPhoto(photo: IslandPhotoRef) {
  activePhotoId.value = photo.id;
  await nextTick();
  if (viewer.value && !viewer.value.open) viewer.value.showModal();
}

function closePhoto() {
  viewer.value?.close();
}

function clearActivePhoto() {
  activePhotoId.value = null;
  scheduleCarousel();
}

function movePhoto(offset: number) {
  const photos = island.value?.photos ?? [];
  if (photos.length < 2) return;
  const nextIndex =
    (activePhotoIndex.value + offset + photos.length) % photos.length;
  activePhotoId.value = photos[nextIndex].id;
}

function closeOnBackdrop(event: MouseEvent) {
  if (event.target === viewer.value) closePhoto();
}

function back() {
  closePhoto();
  getWorld()?.leave();
}

function returnToHost() {
  closePhoto();
  requestArchipelagoPortal(WORLD_NAMING.cosmic.id);
}

function handleDocumentClick(event: MouseEvent) {
  if (viewer.value?.open) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  // Dossier controls and the persistent HUD keep their own click semantics;
  // every other visible part of the focused scene acts as "return to sea".
  if (target.closest(".island-gallery, .island-details, .hud-top")) return;
  back();
}
</script>

<template>
  <aside
    v-if="island"
    class="island-panel"
    :class="{ 'is-night': store.todLabel === '夜晚' }"
    aria-label="岛屿档案"
  >
    <article class="island-dossier">
      <section
        v-if="carouselPhoto"
        class="island-gallery"
        aria-labelledby="island-photos-title"
        tabindex="0"
        @keydown="handleCarouselKey"
        @pointerenter="pauseCarousel"
        @pointerleave="resumeCarousel"
        @focusin="pauseCarousel"
        @focusout="handleGalleryFocusOut"
      >
        <div class="gallery-heading">
          <div>
            <p class="gallery-eyebrow">作品影像</p>
            <h3 id="island-photos-title">{{ island.name }} 的视觉切片</h3>
          </div>
          <span>{{ carouselIndex + 1 }} / {{ island.photos.length }}</span>
        </div>

        <button
          class="gallery-stage"
          type="button"
          :aria-label="`放大照片：${carouselPhoto.alt}`"
          @click="showPhoto(carouselPhoto)"
        >
          <img
            :key="carouselPhoto.id"
            :src="carouselPhoto.url"
            :alt="carouselPhoto.alt"
            decoding="async"
          />
          <span class="gallery-zoom" aria-hidden="true">↗</span>
        </button>

        <div class="gallery-footer">
          <p>{{ carouselPhoto.caption || carouselPhoto.alt }}</p>
          <div v-if="island.photos.length > 1" class="gallery-controls">
            <button
              type="button"
              aria-label="上一张照片"
              @click="moveCarousel(-1)"
            >
              ←
            </button>
            <div class="gallery-dots" aria-label="选择照片">
              <button
                v-for="(photo, index) in island.photos"
                :key="photo.id"
                type="button"
                :class="{ active: index === carouselIndex }"
                :aria-label="`查看第 ${index + 1} 张照片`"
                :aria-current="index === carouselIndex ? 'true' : undefined"
                @click="selectCarouselPhoto(index)"
              />
            </div>
            <button
              type="button"
              aria-label="下一张照片"
              @click="moveCarousel(1)"
            >
              →
            </button>
          </div>
        </div>
      </section>

      <section class="island-details">
        <header class="dossier-header">
          <p class="builder">{{ island.builder }} 的作品岛</p>
          <h2>{{ island.name }}</h2>
          <p v-if="island.description" class="island-description">
            {{ island.description }}
          </p>
        </header>

        <div class="dossier-content">
          <section class="works-section" aria-labelledby="island-works-title">
            <div class="section-heading">
              <h3 id="island-works-title">岛上入口</h3>
              <span>{{ island.projects.length }} 个</span>
            </div>
            <div v-if="island.projects.length" class="projects">
              <button
                v-for="(project, index) in island.projects"
                :key="project.id"
                class="project-link"
                type="button"
                @click="open(project.id)"
              >
                <span class="project-preview">
                  <img
                    v-if="project.cover"
                    :src="project.cover"
                    :alt="`${project.name}网站预览`"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ String(index + 1).padStart(2, "0") }}</span>
                </span>
                <span class="project-name">{{ project.name }}</span>
                <span class="project-open"
                  >查看作品 <span aria-hidden="true">↗</span></span
                >
              </button>
            </div>
            <p v-else class="empty-section">作品正在整理中</p>
          </section>
        </div>

        <button
          class="back"
          type="button"
          title="离开当前作品岛，返回海面"
          @click.stop="back"
        >
          <span aria-hidden="true">←</span>
          返回海面
        </button>
        <button
          class="back"
          type="button"
          title="离开群岛世界，返回 Cosmic"
          @click.stop="returnToHost"
        >
          返回 Cosmic
        </button>
      </section>
    </article>

    <dialog
      ref="viewer"
      class="photo-viewer"
      aria-labelledby="photo-viewer-caption"
      @close="clearActivePhoto"
      @click="closeOnBackdrop"
    >
      <div v-if="activePhoto" class="photo-viewer-content">
        <button
          class="viewer-close"
          type="button"
          aria-label="关闭照片"
          @click="closePhoto"
        >
          ×
        </button>
        <button
          v-if="island.photos.length > 1"
          class="viewer-nav viewer-prev"
          type="button"
          aria-label="上一张照片"
          @click="movePhoto(-1)"
        >
          ‹
        </button>
        <figure>
          <img :src="activePhoto.url" :alt="activePhoto.alt" />
          <figcaption id="photo-viewer-caption">
            {{ activePhoto.caption || activePhoto.alt }}
            <span>{{ activePhotoIndex + 1 }} / {{ island.photos.length }}</span>
          </figcaption>
        </figure>
        <button
          v-if="island.photos.length > 1"
          class="viewer-nav viewer-next"
          type="button"
          aria-label="下一张照片"
          @click="movePhoto(1)"
        >
          ›
        </button>
      </div>
    </dialog>
  </aside>
</template>
