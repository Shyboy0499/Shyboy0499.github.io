// Runtime 拥有的分阶段帧调度器；World 只能注册任务，不能直接创建 RAF 循环。
// 阶段顺序固定，保证动画、相机、特效、路由和最终渲染跨 World 可预测。
import type {
  FrameContext,
  FramePhase,
  FramePort,
  Registration,
} from "./contracts";

const PHASE_ORDER: Record<FramePhase, number> = {
  animation: 10,
  camera: 20,
  effects: 30,
  route: 40,
  render: 100,
};

interface FrameTask {
  phase: FramePhase;
  priority: number;
  run: (frame: FrameContext) => void;
}

export class FrameScheduler implements FramePort {
  private tasks: FrameTask[] = [];
  private frame = 0;
  private animationFrame = 0;
  private lastTime = performance.now();
  private startTime = this.lastTime;
  private started = false;
  private running = false;

  get taskCount(): number {
    return this.tasks.length;
  }

  get isRunning(): boolean {
    return this.running;
  }

  add(
    phase: FramePhase,
    task: (frame: FrameContext) => void,
    priority = 0,
  ): Registration {
    const entry = { phase, priority, run: task };
    this.tasks.push(entry);
    this.tasks.sort(
      (left, right) =>
        PHASE_ORDER[left.phase] - PHASE_ORDER[right.phase] ||
        left.priority - right.priority,
    );

    return {
      dispose: () => {
        const index = this.tasks.indexOf(entry);
        if (index >= 0) this.tasks.splice(index, 1);
      },
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    if (!this.started) {
      this.started = true;
      this.startTime = this.lastTime;
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const rawDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const frame: FrameContext = {
      frame: this.frame,
      elapsed: (now - this.startTime) / 1000,
      rawDelta,
      // 后台标签页恢复时可能产生很长 delta，截断它避免动画瞬移。
      delta: Math.min(rawDelta, 1 / 30),
    };

    for (const task of this.tasks) task.run(frame);

    this.frame += 1;
    this.animationFrame = requestAnimationFrame(this.tick);
  };
}
