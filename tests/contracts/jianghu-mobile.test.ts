// Jianghu 移动端契约测试：确保触控移动与最近人物对话入口保持可访问。
// 场景美术和人物位置不在此测试中模拟。
import { describe, expect, it } from "vitest";
import { JianghuScene } from "../../src/worlds/jianghu/jianghu-scene";

describe("Jianghu mobile controls", () => {
  it("provides four directional controls and one dialogue control", () => {
    const scene = new JianghuScene("/");
    document.body.append(scene.root);

    const directions = scene.root.querySelectorAll("[data-jianghu-move]");
    const talk = scene.root.querySelector<HTMLButtonElement>(
      "[data-jianghu-talk]",
    );

    expect(directions).toHaveLength(4);
    expect(
      [...directions].map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Move up", "Move left", "Move down", "Move right"]);
    expect(talk?.getAttribute("aria-label")).toBe("Talk to the nearest character");

    scene.dispose();
    expect(document.querySelector(".jianghu-world-root")).toBeNull();
  });
});
