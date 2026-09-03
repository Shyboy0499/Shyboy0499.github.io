import { describe, expect, it, vi } from "vitest";
import { installImmersiveMode } from "../../src/runtime/immersive-mode";

describe("installImmersiveMode", () => {
  it("lets the clicked control run before requesting fullscreen", async () => {
    const order: string[] = [];
    const button = document.createElement("button");
    document.body.append(button);
    button.addEventListener("click", () => order.push("control"));
    const requestFullscreen = vi.fn(async () => {
      order.push("fullscreen");
    });
    const registration = installImmersiveMode({
      document,
      window,
      requestFullscreen,
    });

    button.click();
    await Promise.resolve();

    expect(order).toEqual(["control", "fullscreen"]);
    expect(requestFullscreen).toHaveBeenCalledOnce();
    registration.dispose();
    button.remove();
  });

  it("keeps click fallback available when wheel activation is rejected", async () => {
    const requestFullscreen = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new DOMException("Not allowed", "NotAllowedError"))
      .mockResolvedValueOnce();
    const registration = installImmersiveMode({
      document,
      window,
      requestFullscreen,
    });

    window.dispatchEvent(new WheelEvent("wheel"));
    await Promise.resolve();
    window.dispatchEvent(new MouseEvent("click"));
    await Promise.resolve();

    expect(requestFullscreen).toHaveBeenCalledTimes(2);
    registration.dispose();
  });
});
