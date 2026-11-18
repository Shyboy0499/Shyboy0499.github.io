// Jianghu Portal 交互契约：第四世界入口必须由引路人对话触发。
// 转场动画由 Runtime 测试覆盖，这里只验证场景内叙事入口。
import { describe, expect, it, vi } from "vitest";
import { JianghuScene } from "../../src/worlds/jianghu/jianghu-scene";
import {
  JIANGHU_AGENTS,
  JIANGHU_PORTAL_AGENT_ID,
} from "../../src/worlds/jianghu/jianghu-agents.config";

describe("Jianghu Portal guide", () => {
  it("opens the Linework Portal after the guide dialogue completes", () => {
    const requestPortal = vi.fn();
    const scene = new JianghuScene("/", undefined, requestPortal);
    document.body.append(scene.root);
    const guide = scene.root.querySelector<HTMLButtonElement>(
      `[data-jianghu-agent="${JIANGHU_PORTAL_AGENT_ID}"]`,
    );
    const dialogue = scene.root.querySelector<HTMLElement>(
      "[data-jianghu-dialog]",
    );
    const guideSpec = JIANGHU_AGENTS.find(
      (agent) => agent.id === JIANGHU_PORTAL_AGENT_ID,
    );

    expect(scene.root.ownerDocument.head.textContent).toContain(
      'html[data-world="jianghu"]:not([data-portal-journey]) .portal-layer',
    );
    const returnButton = scene.root.querySelector<HTMLButtonElement>(
      "[data-jianghu-return]",
    );
    expect(guide).not.toBeNull();
    expect(guideSpec).toBeDefined();
    expect(returnButton).not.toBeNull();
    returnButton?.click();
    expect(requestPortal).toHaveBeenCalledOnce();
    requestPortal.mockClear();
    guide?.click();
    expect(dialogue?.hidden).toBe(false);

    for (let index = 0; index < (guideSpec?.dialogue.length ?? 0); index += 1) {
      dialogue?.click();
    }

    expect(requestPortal).toHaveBeenCalledOnce();
    expect(dialogue?.hidden).toBe(true);
    scene.dispose();
  });
});
