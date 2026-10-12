// 双语契约测试：语言只由 <html lang> 决定，英文内容必须与中文源保持相同的稳定 ID 与链接。
// 不检查译文质量，只防止英文覆盖破坏 World Binding 依赖的结构。
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { pageLang, t } from "../../src/i18n";
import { portfolioFor } from "../../src/content/portfolio";

describe("site i18n", () => {
  afterEach(() => {
    document.documentElement.lang = "";
  });

  it("reads the page language from <html lang>", () => {
    document.documentElement.lang = "en";
    expect(pageLang()).toBe("en");
    expect(t("中文", "English")).toBe("English");

    document.documentElement.lang = "zh-CN";
    expect(pageLang()).toBe("zh");
    expect(t("中文", "English")).toBe("中文");
  });

  it("keeps English portfolio structure identical to the Chinese source", () => {
    const zh = portfolioFor("zh");
    const en = portfolioFor("en");

    expect(en.projects.map((project) => project.id)).toEqual(zh.projects.map((project) => project.id));
    expect(en.collections.map((collection) => collection.id)).toEqual(
      zh.collections.map((collection) => collection.id),
    );
    en.projects.forEach((project, index) => {
      expect(project.links).toEqual(zh.projects[index].links);
      expect(project.media.map((media) => media.src)).toEqual(zh.projects[index].media.map((media) => media.src));
      expect(project.description).not.toMatch(/\p{Script=Han}/u);
    });
    expect(en.person.summary).not.toMatch(/\p{Script=Han}/u);
  });
});
