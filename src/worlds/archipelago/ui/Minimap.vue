<!-- 海岛小地图：用 2D canvas 显示作品岛、特殊地标和玩家船位。 -->
<!-- 它只读取 World 快照与静态地标配置，不参与 3D 场景生命周期。 -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { getWorld } from "../scene/world/island-world";
import { store } from "../store";
import { WORLD_RADIUS } from "../islands";
import { BABEL_TOWER_LANDMARK } from "../landmarks";
import { subscribeArchipelagoFrame } from "../ui-actions";

const cv = ref<HTMLCanvasElement | null>(null);
const SIZE = 230;
const MAP_R = 100;
const SCALE = MAP_R / (WORLD_RADIUS + 40);
let unsubscribeFrame: (() => void) | null = null;

const THEME_DOT: Record<string, string> = {
  forest: "#5db874",
  volcano: "#ef7a4a",
  snow: "#cfeaff",
};

function drawBabelTowerMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  now: number,
  night: boolean,
): void {
  const pulse = 0.65 + 0.35 * Math.sin(now * 2.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = night ? "rgba(255,220,150,0.9)" : "rgba(255,238,180,0.9)";
  ctx.shadowBlur = 9 + pulse * 5;
  ctx.fillStyle = `rgba(244, 197, 97, ${0.34 + pulse * 0.18})`;
  ctx.beginPath();
  ctx.arc(0, 0, 11 + pulse * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#322417";
  ctx.strokeStyle = "#fff1bd";
  ctx.lineWidth = 1.4;
  for (let level = 0; level < 4; level++) {
    const width = 13 - level * 2.4;
    const yy = 5 - level * 4;
    ctx.beginPath();
    ctx.roundRect(-width * 0.5, yy - 3, width, 3.4, 1.2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#ffcf6e";
  ctx.beginPath();
  ctx.arc(0, -11, 2.3 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw(elapsed = performance.now() / 1000) {
  const canvas = cv.value;
  const world = getWorld();
  if (!canvas || !world) return;
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio, 2);
  if (canvas.width !== SIZE * dpr) {
    canvas.width = canvas.height = SIZE * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, SIZE, SIZE);
  const c = SIZE / 2;
  const now = elapsed;
  const night = store.todLabel === "夜晚";

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, MAP_R, 0, Math.PI * 2);
  ctx.clip();

  // 海图底色（浅一档让岛点跳出来）
  const bg = ctx.createRadialGradient(c, c - 12, 8, c, c, MAP_R);
  if (night) {
    bg.addColorStop(0, "rgba(58, 66, 128, 0.95)");
    bg.addColorStop(1, "rgba(24, 24, 62, 0.95)");
  } else {
    bg.addColorStop(0, "rgba(126, 206, 210, 0.96)");
    bg.addColorStop(1, "rgba(52, 138, 158, 0.96)");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 罗盘：十字准线 + 24 格刻度
  const rose = night ? "rgba(210,220,255,0.16)" : "rgba(255,250,240,0.2)";
  ctx.strokeStyle = rose;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(c - MAP_R, c);
  ctx.lineTo(c + MAP_R, c);
  ctx.moveTo(c, c - MAP_R);
  ctx.lineTo(c, c + MAP_R);
  ctx.stroke();
  const tick = night ? "rgba(210,220,255,0.32)" : "rgba(255,250,240,0.42)";
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const long = i % 6 === 0;
    const r0 = MAP_R - (long ? 10 : 5);
    ctx.strokeStyle = tick;
    ctx.lineWidth = long ? 1.6 : 0.8;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(ang) * r0, c + Math.sin(ang) * r0);
    ctx.lineTo(
      c + Math.cos(ang) * (MAP_R - 1.5),
      c + Math.sin(ang) * (MAP_R - 1.5),
    );
    ctx.stroke();
  }

  // 世界软边界
  ctx.strokeStyle = night ? "rgba(255,220,150,0.3)" : "rgba(255,246,225,0.4)";
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(c, c, WORLD_RADIUS * SCALE, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 岛
  for (const isl of world.minimapData()) {
    const px = c + isl.x * SCALE;
    const py = c + isl.z * SCALE;
    const pr = Math.max(isl.r * SCALE, 3);
    if (isl.status === "foggy") {
      ctx.fillStyle = night
        ? "rgba(150,160,190,0.4)"
        : "rgba(240,245,250,0.42)";
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    } else if (isl.status === "locked") {
      const pulse = 0.55 + 0.35 * Math.sin(now * 2.4 + isl.x);
      ctx.fillStyle = `rgba(244, 197, 97, ${0.4 * pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, pr + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f6c85f";
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(px, py, pr + 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = THEME_DOT[isl.theme] ?? "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    if (store.targetId === isl.id) {
      ctx.strokeStyle = "#ffe0a0";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.lineDashOffset = -now * 12;
      ctx.beginPath();
      ctx.arc(px, py, pr + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  const [babelX, babelZ] = BABEL_TOWER_LANDMARK.position;
  drawBabelTowerMarker(ctx, c + babelX * SCALE, c + babelZ * SCALE, now, night);

  // 船：小帆船 glyph + 朝向 + 暖光
  const s = world.ship;
  const sx = c + s.pos.x * SCALE;
  const sy = c + s.pos.z * SCALE;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(Math.PI - s.heading); // 世界 forward=(sin h,cos h)，glyph 默认朝上
  ctx.shadowColor = "rgba(255,238,205,0.95)";
  ctx.shadowBlur = 7;
  ctx.fillStyle = "#fff6e6";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(4.6, 4);
  ctx.quadraticCurveTo(0, 6.6, -4.6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ec7f4c";
  ctx.beginPath();
  ctx.moveTo(0, -6.5);
  ctx.lineTo(0, 1.5);
  ctx.lineTo(3.2, -1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore(); // 解除圆形裁剪

  // 罗盘外框：奶油 + 金双环 + N 标
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,250,242,0.95)";
  ctx.beginPath();
  ctx.arc(c, c, MAP_R + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(185,119,42,0.55)";
  ctx.beginPath();
  ctx.arc(c, c, MAP_R + 4.5, 0, Math.PI * 2);
  ctx.stroke();
  // N 标
  ctx.fillStyle = "#b9772a";
  ctx.font = 'bold 12px "PingFang SC", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", c, c - MAP_R + 10);
}

function onClick(e: MouseEvent) {
  const world = getWorld();
  const canvas = cv.value;
  if (!world || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (SIZE / rect.width);
  const my = (e.clientY - rect.top) * (SIZE / rect.height);
  const c = SIZE / 2;
  let best: string | null = null;
  let bestD = 16;
  for (const isl of world.minimapData()) {
    const d = Math.hypot(mx - (c + isl.x * SCALE), my - (c + isl.z * SCALE));
    if (d < bestD) {
      bestD = d;
      best = isl.id;
    }
  }
  const [babelX, babelZ] = BABEL_TOWER_LANDMARK.position;
  const landmarkD = Math.hypot(
    mx - (c + babelX * SCALE),
    my - (c + babelZ * SCALE),
  );
  if (landmarkD < bestD) {
    best = BABEL_TOWER_LANDMARK.id;
  }
  if (best) world.fastTravelTo(best); // 点小地图上的岛 → 快速跳转过去
}

onMounted(() => {
  draw();
  unsubscribeFrame = subscribeArchipelagoFrame(draw);
});
onUnmounted(() => {
  unsubscribeFrame?.();
  unsubscribeFrame = null;
});
</script>

<template>
  <div class="minimap">
    <canvas
      ref="cv"
      :style="{ width: SIZE + 'px', height: SIZE + 'px' }"
      @click="onClick"
    ></canvas>
  </div>
</template>
