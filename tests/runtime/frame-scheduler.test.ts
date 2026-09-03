import { describe, expect, it, vi } from "vitest";
import { FrameScheduler } from "../../src/runtime/frame-scheduler";

describe("FrameScheduler", () => {
  it("stops scheduling work while suspended", () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = ++nextId;
      callbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      callbacks.delete(id);
    });

    const task = vi.fn();
    const scheduler = new FrameScheduler();
    const registration = scheduler.add("animation", task);
    expect(scheduler.taskCount).toBe(1);
    scheduler.start();
    expect(scheduler.isRunning).toBe(true);

    const first = callbacks.values().next().value;
    expect(first).toBeTypeOf("function");
    callbacks.clear();
    first?.(performance.now() + 16);
    expect(task).toHaveBeenCalledOnce();
    expect(callbacks.size).toBe(1);

    scheduler.stop();
    expect(callbacks.size).toBe(0);
    expect(scheduler.isRunning).toBe(false);
    registration.dispose();
    expect(scheduler.taskCount).toBe(0);
  });
});
