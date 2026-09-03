// 单个 World Session 的语义焦点端口：接收历史恢复，并把用户选择提交给 Runtime。
// 它不解释焦点 ID；有效性与视觉聚焦仍由当前 World Binding 决定。
import type { Registration, WorldFocusPort } from "./contracts";

type FocusApply = (focusId: string | null) => boolean;
type FocusCommit = (focusId: string | null) => void;

export class RuntimeWorldFocus implements WorldFocusPort {
  private apply: FocusApply | null = null;
  private currentFocusId: string | null;

  constructor(
    initialFocusId: string | null,
    private readonly onCommit: FocusCommit,
  ) {
    this.currentFocusId = initialFocusId;
  }

  read(): string | null {
    return this.currentFocusId;
  }

  register(apply: FocusApply): Registration {
    if (this.apply) {
      throw new Error("A World Session may register only one focus handler.");
    }
    this.apply = apply;
    if (!apply(this.currentFocusId)) this.currentFocusId = null;

    return {
      dispose: () => {
        if (this.apply === apply) this.apply = null;
      },
    };
  }

  commit(focusId: string | null): void {
    if (focusId === this.currentFocusId) return;
    this.currentFocusId = focusId;
    this.onCommit(focusId);
  }

  restore(focusId: string | null): boolean {
    if (!this.apply) return focusId === null;
    const previous = this.currentFocusId;
    this.currentFocusId = focusId;
    if (this.apply(focusId)) return true;
    this.currentFocusId = previous;
    return false;
  }

  dispose(): void {
    this.apply = null;
  }
}
