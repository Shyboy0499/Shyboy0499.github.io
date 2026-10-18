// 卡片的数据：书架的阅读清单，以及猫与植物的插画。插画位于 public/art/cards/，由 scripts/gen-cards.mjs 生成。
// 书名与推荐语都是原创的虚构内容，可以换成你自己的书单。游戏只发出 quest:card 事件，卡片的样子在 index.astro 里决定。

export type Book = {
  title: string;
  note: string;
  cover: string;
};

export type ShelfCard = {
  title: string;
  books: Book[];
};

export const shelves: Record<string, ShelfCard> = {
  "shelf:0": {
    title: "Shelf of notes",
    books: [
      {
        title: "The Tests Nobody Wrote",
        note: "Flip one open and every page is an empty check mark.",
        cover: "/art/cards/book-notes-1.svg",
      },
      {
        title: "Tools That Self-Check",
        note: "A short guide to scripts that notice when they are wrong.",
        cover: "/art/cards/book-notes-2.svg",
      },
      {
        title: "Small Scripts, Big Habits",
        note: "Little routines that quietly keep things running.",
        cover: "/art/cards/book-notes-3.svg",
      },
    ],
  },
  "shelf:1": {
    title: "Shelf of tools",
    books: [
      {
        title: "Git, Slowly",
        note: "Commit small, and never be afraid of the history.",
        cover: "/art/cards/book-tools-1.svg",
      },
      {
        title: "Agents on Desks",
        note: "How tiny helper programs earn their keep.",
        cover: "/art/cards/book-tools-2.svg",
      },
      {
        title: "The Mac Setup Diary",
        note: "Notes on dotfiles, shortcuts, and one perfect wallpaper.",
        cover: "/art/cards/book-tools-3.svg",
      },
    ],
  },
};

export const CAT_CARD = "/art/cards/cat-happy.svg";
export const PLANT_CARD = "/art/cards/plant-watered.svg";

// 游戏发给页面的卡片事件：书架的阅读清单、猫的插画（第三次摸猫时带提示），或植物浇水后的插画。
export type CardEvent =
  | { kind: "shelf"; key: string }
  | { kind: "cat"; pets: number; line: string }
  | { kind: "plant" };
