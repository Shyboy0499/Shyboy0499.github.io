// 首次用户手势后的沉浸模式增强；它只请求 fullscreen，不改变具体控件行为。
// 多种事件作为一次性兜底，是为了适配浏览器对 user activation 的不同判断。
import type { Registration } from "./contracts";

interface ImmersiveEnvironment {
  document: Document;
  window: Window;
  requestFullscreen?: () => Promise<void>;
}

export function installImmersiveMode(
  environment: ImmersiveEnvironment = { document, window },
): Registration {
  const targetDocument = environment.document;
  const targetWindow = environment.window;
  const enterFullscreen =
    environment.requestFullscreen ??
    (() =>
      targetDocument.documentElement.requestFullscreen({
        navigationUI: "hide",
      }));

  const dispose = () => {
    targetWindow.removeEventListener("click", requestImmersiveMode);
    targetWindow.removeEventListener("keyup", requestImmersiveMode);
    targetWindow.removeEventListener("wheel", requestImmersiveMode);
  };

  const requestImmersiveMode = async () => {
    if (targetDocument.fullscreenElement) {
      dispose();
      return;
    }

    try {
      await enterFullscreen();
      dispose();
    } catch {
      // 某些事件类型可能不被浏览器视为用户激活，保留其余一次性兜底。
    }
  };

  // click 会先让目标控件处理，再冒泡到这里，避免全屏 resize 抢在 Portal 动画意图前发生。
  targetWindow.addEventListener("click", requestImmersiveMode, { once: true });
  targetWindow.addEventListener("keyup", requestImmersiveMode, { once: true });
  targetWindow.addEventListener("wheel", requestImmersiveMode, {
    once: true,
    passive: true,
  });

  return { dispose };
}
