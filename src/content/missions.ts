// 任务数据：每个任务由房间里的一组物件完成，完成后在"笔记"面板留下一条摘要。
// 对话文案与个人信息分开保存；改介绍只需编辑本文件，房间结构见 scripts/quest-map.ts。
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

export const missions: Mission[] = [
  { id: "hello", title: "Meet Chris", keys: ["sign"], summary: profile.blurb },
  { id: "work", title: "See the work", keys: crystalKeys, summary: projects.map((p) => p.name).join(" · ") },
  { id: "contact", title: "Get in touch", keys: ["mailbox"], summary: profile.email },
  { id: "about", title: "Know the person", keys: ["portrait"], summary: "Builds tools that check their own work." },
];

// 每个物件的对话，按顺序逐条显示。大门的文案由游戏根据任务进度决定。
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
  ...Object.fromEntries(
    projects.map((p, i) => [
      `crystal:${i}`,
      { title: p.name, lines: [p.blurb, `${p.lang} · ★ ${p.stars}`] } satisfies Dialog,
    ]),
  ),
};
