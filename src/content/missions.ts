// 任务数据：每个任务由房间里的一组物件完成，完成后在"笔记"面板留下一条摘要。
// 对话文案与个人信息分开保存；改介绍只需编辑本文件，房间结构见 scripts/quest-map.ts。
// 灯、猫、植物的互动逻辑（开关、摸猫、浇水）在 scripts/quest.ts 中，这里只放它们的标题与默认对话。
import { profile, projects } from "./projects";

export type Mission = {
  id: string;
  title: string;
  // 任务需要访问的物件键，全部访问后任务完成。
  keys: string[];
  // 任务完成后保留在笔记中的摘要。
  summary: string;
};

export type Dialog = {
  title: string;
  lines: string[];
};

// 项目水晶的物件键与项目顺序一一对应：crystal:0 对应 projects[0]，依此类推。
export const crystalKeys = projects.map((_, i) => `crystal:${i}`);
// 房间里的四盆植物，浇水后会长大；不计入任务。
export const plantKeys = [0, 1, 2, 3].map((i) => `plant:${i}`);

export const missions: Mission[] = [
  { id: "hello", title: "Meet Chris", keys: ["sign"], summary: profile.blurb },
  { id: "work", title: "See the work", keys: crystalKeys, summary: projects.map((p) => p.name).join(" · ") },
  { id: "contact", title: "Get in touch", keys: ["mailbox"], summary: profile.email },
  { id: "about", title: "Know the person", keys: ["portrait"], summary: "Builds tools that check their own work." },
  {
    id: "explore",
    title: "Look around",
    keys: ["lamp", "cat", "shelf:0", "shelf:1"],
    summary: "Found the lamp, the cat, and both bookshelves.",
  },
];

// 每个物件的对话，按顺序逐条显示。大门与灯、猫、植物的动态文案由游戏根据状态决定。
export const dialogs: Record<string, Dialog> = {
  sign: {
    title: "Welcome sign",
    lines: [`Welcome to ${profile.name}'s room.`, profile.blurb],
  },
  mailbox: {
    title: "Mailbox",
    lines: [`Email: ${profile.email}`, `GitHub: ${profile.github}`],
  },
  secret: {
    title: "A hidden orb",
    lines: ["You found the secret.", `Thanks for visiting my room. Say hi: ${profile.email}`],
  },
  portrait: {
    title: "Portrait",
    lines: [
      "A photo on the wall: the studio cat.",
      "Agents, git automation, and Mac setups that feel like home.",
    ],
  },
  lamp: {
    title: "Desk lamp",
    lines: ["A warm little lamp."],
  },
  cat: {
    title: "Studio cat",
    lines: ["The cat is asleep on the rug."],
  },
  "shelf:0": {
    title: "Shelf of notes",
    lines: [
      "Three notebooks about tools that check their own work.",
      "Flip one open and it's a list of tests nobody wrote yet.",
    ],
  },
  "shelf:1": {
    title: "Shelf of tools",
    lines: [
      "Spines in every colour: git, agents, and a Mac setup guide.",
      "Someone has been labelling these by hand.",
    ],
  },
  ...Object.fromEntries(
    plantKeys.map((key) => [key, { title: "Potted plant", lines: ["A small green plant on the windowsill."] } satisfies Dialog]),
  ),
  ...Object.fromEntries(
    projects.map((p, i) => [
      `crystal:${i}`,
      { title: p.name, lines: [p.blurb, `${p.lang} · ★ ${p.stars}`] } satisfies Dialog,
    ]),
  ),
};
