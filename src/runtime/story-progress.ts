// 从 DOM 章节读取纵向故事进度；World 只消费连续快照，不直接解析页面结构。
// 这让静态内容和 3D 相机路径保持解耦。
import type {
  StoryProgressPort,
  StoryProgressSnapshot,
} from "./contracts";

export class DomStoryProgress implements StoryProgressPort {
  private chapters: HTMLElement[] = [];
  private offsets: number[] = [];

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.chapters = [
      ...document.querySelectorAll<HTMLElement>("[data-scene]"),
    ];
    this.offsets = this.chapters.map((chapter) => chapter.offsetTop);
  }

  read(): StoryProgressSnapshot {
    // 标记点靠近阅读视线边缘，将滚动位置转换成连续场景坐标。
    const marker = window.scrollY + window.innerHeight * 0.16;
    let index = this.offsets.length - 1;

    for (let cursor = 0; cursor < this.offsets.length - 1; cursor += 1) {
      if (marker < this.offsets[cursor + 1]) {
        index = cursor;
        break;
      }
    }

    if (index >= this.offsets.length - 1) {
      return {
        progress: this.offsets.length - 1,
        activeId: this.chapters.at(-1)?.id ?? "origin",
      };
    }

    const start = this.offsets[index];
    const end = this.offsets[index + 1];
    const local = Math.min(Math.max((marker - start) / (end - start), 0), 1);
    // smoothstep 用于消除章节边界处的相机速度突变。
    const smooth = local * local * (3 - 2 * local);

    return {
      progress: index + smooth,
      activeId: this.chapters[Math.round(index + smooth)]?.id ?? "origin",
    };
  }
}
