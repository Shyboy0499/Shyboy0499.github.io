// Portal 转场契约测试：每条跨世界路线必须声明独立视觉主题。
// 动画像素表现由浏览器验证，这里只锁定集中配置不会退回共用默认效果。
import { describe, expect, it } from "vitest";
import { WORLD_PORTALS } from "../../src/worlds/portals.config";

describe("Portal transition contract", () => {
  it("assigns an explicit and distinct transition style to every route", () => {
    const routes = Object.values(WORLD_PORTALS);
    const styles = routes.map((route) =>
      "transitionStyle" in route ? route.transitionStyle : undefined,
    );

    expect(styles).not.toContain(undefined);
    expect(new Set(styles).size).toBe(routes.length);
  });
});
