// 作品与个人信息的唯一来源：页面列表与房间里的水晶都从这里读取。
// 数量必须与 scripts/quest-map.ts 中的水晶（C）个数一致，目前为 3 个；每个项目按数组顺序对应一颗水晶。
export type Project = {
  name: string;
  blurb: string;
  href: string;
  lang: string;
  stars: string;
  // 水晶、卡片与标签的强调色。
  accent: string;
};

export const profile = {
  name: "Chris Yu",
  handle: "@Shyboy0499",
  blurb:
    "I build small, sharp tools for developers and agents — systems that check themselves instead of guessing.",
  github: "https://github.com/Shyboy0499",
  email: "krisyu0911@gmail.com",
};

export const projects: Project[] = [
  {
    name: "antibody",
    blurb: "Resilient, self-correcting systems — software that detects and repairs its own faults.",
    href: "https://github.com/Shyboy0499/antibody",
    lang: "TypeScript",
    stars: "263",
    accent: "#7c5cff",
  },
  {
    name: "precondition-library",
    blurb:
      "An agent that compiles git chores into reusable programs, then replays them by running checks — not by guessing a task looks familiar.",
    href: "https://github.com/Shyboy0499/precondition-library",
    lang: "Python",
    stars: "142",
    accent: "#36d6c3",
  },
  {
    name: "MacOS-Config",
    blurb: "My own configuration for my own Mac — dotfiles, window tweaks, and a setup that just feels right.",
    href: "https://github.com/Shyboy0499/MacOS-Config",
    lang: "Swift",
    stars: "24",
    accent: "#ff7a59",
  },
];
