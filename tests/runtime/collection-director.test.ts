// Collection 导航回归测试：验证稳定 focus ID 能恢复对应详情和退出概览。
// 测试使用最小 DOM 壳层，不涉及 Cosmic 的 Three.js 相机。
import { beforeEach, describe, expect, it } from "vitest";
import { CollectionDirector } from "../../src/runtime/collection-director";

beforeEach(() => {
  document.body.innerHTML = `
    <button data-collection-enter="open-source">OPEN</button>
    <section data-collection-detail>
      <article data-collection-item="open-source" data-collection-focus="first"></article>
      <article data-collection-item="open-source" data-collection-focus="second"></article>
    </section>
    <button data-collection-exit>BACK</button>
    <button data-collection-previous>PREVIOUS</button>
    <button data-collection-next>NEXT</button>
    <span data-collection-current></span>
    <span data-collection-total></span>
    <span data-collection-status></span>
  `;
});

describe("CollectionDirector", () => {
  it("restores a detail panel by stable focus id", () => {
    const director = new CollectionDirector();

    expect(director.focus("second")).toBe(true);
    expect(director.read()).toMatchObject({
      mode: "detail",
      collectionId: "open-source",
      focusId: "second",
      itemIndex: 1,
    });

    expect(director.focus(null)).toBe(true);
    expect(director.read().mode).toBe("overview");
    director.dispose();
  });

  it("rejects an unknown focus without changing navigation", () => {
    const director = new CollectionDirector();

    expect(director.focus("missing")).toBe(false);
    expect(director.read().mode).toBe("overview");
    director.dispose();
  });
});
