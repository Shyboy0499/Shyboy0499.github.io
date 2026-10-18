// 任务房间的特效层：粒子迸发、屏幕震动、闪光与门前的光束。
// 只维护自身状态并绘制到缓冲区；何时触发由 quest.ts 决定，减少动效时调用方不应调用震动与闪光。
const GRAVITY = 60;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};

export function createFx() {
  const particles: Particle[] = [];
  let shake = 0;
  let flash = 0;
  let rays = 0;
  let raysTarget = 0;

  return {
    // 在 (x, y) 迸发一团彩色粒子，用于完成任务时的庆祝。
    burst(x: number, y: number, colors: string[], count: number): void {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 60;
        const max = 0.6 + Math.random() * 0.6;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          life: max,
          max,
          color: colors[i % colors.length],
          size: Math.random() < 0.3 ? 2 : 1,
        });
      }
    },
    shake(amount: number): void {
      shake = Math.max(shake, amount);
    },
    flash(amount: number): void {
      flash = Math.max(flash, amount);
    },
    // 门开的瞬间：光束猛然亮起，之后回落到 setAmbient 设定的稳态。
    surge(): void {
      rays = 1;
      flash = Math.max(flash, 0.8);
      shake = Math.max(shake, 5);
    },
    setAmbient(target: number): void {
      raysTarget = target;
    },
    update(dt: number): void {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      shake *= Math.exp(-dt * 9);
      flash *= Math.exp(-dt * 5);
      rays += (raysTarget - rays) * Math.min(1, dt * 1.5);
    },
    // 本帧的震动偏移（缓冲区像素）；震动结束后返回 0，避免画面抖动残留。
    offset(): [number, number] {
      if (shake < 0.05) return [0, 0];
      return [(Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake];
    },
    // 绘制顺序：光束 → 粒子 → 闪光，闪光盖在最上层。
    draw(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number): void {
      if (rays > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 8; i++) {
          const a = t * 0.25 + (i * Math.PI) / 4;
          ctx.fillStyle = `rgba(94, 230, 184, ${0.13 * rays})`;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a - 0.09) * 170, cy + Math.sin(a - 0.09) * 170);
          ctx.lineTo(cx + Math.cos(a + 0.09) * 170, cy + Math.sin(a + 0.09) * 170);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.6})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    },
  };
}

export type Fx = ReturnType<typeof createFx>;
