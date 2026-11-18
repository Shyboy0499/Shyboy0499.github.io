// Runtime 的资源清理栈；World 和运行时服务把释放动作注册到这里统一销毁。
// 已销毁 scope 中的 late registration 会立即执行，避免异步加载完成后留下资源。
import type { Registration, ResourceScope } from "./contracts";

export class RuntimeResourceScope implements ResourceScope {
  private cleanups: Array<() => void> = [];
  private disposed = false;

  get pendingCleanupCount(): number {
    return this.cleanups.length;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  defer(cleanup: () => void): Registration {
    if (this.disposed) {
      cleanup();
      return { dispose: () => undefined };
    }

    let active = true;
    const runCleanup = () => {
      if (!active) return;
      active = false;
      cleanup();
    };
    this.cleanups.push(runCleanup);

    return {
      dispose: () => {
        const index = this.cleanups.indexOf(runCleanup);
        if (index >= 0) this.cleanups.splice(index, 1);
        runCleanup();
      },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // 按注册逆序回收，匹配嵌套资源通常“后创建先释放”的依赖关系。
    for (const cleanup of this.cleanups.splice(0).reverse()) {
      try {
        cleanup();
      } catch (error) {
        console.error("[runtime] Resource cleanup failed:", error);
      }
    }
  }
}
