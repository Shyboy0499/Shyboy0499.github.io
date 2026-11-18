// 江湖角色配置集中管理人物坐标、sprite 目录、气泡和对话文案。
// DOM 场景只消费这些数据，不在渲染逻辑中夹带业务文案；英文页只替换文案，坐标与 sprite 共用。
import { pageLang } from "../../i18n";

export type JianghuAgentStatus = "online" | "busy" | "offline";
export type JianghuSpritePose = "doze" | "startle" | "cheer";

export interface JianghuAgentSpec {
  id: string;
  name: string;
  role: string;
  color: string;
  folder: string;
  asset: string;
  x: number;
  y: number;
  bubble: string;
  status: JianghuAgentStatus;
  dialogue: readonly string[];
}

export const JIANGHU_SCENE_SIZE = {
  width: 1920,
  height: 1040,
} as const;

export const JIANGHU_PORTAL_AGENT_ID = "product-cocreate-agent";

const JIANGHU_AGENTS_ZH: readonly JianghuAgentSpec[] = [
  { id: "ceo", name: "总控台", role: "个人叙事主线", color: "#d43f2f", folder: "caocao", asset: "caocao", x: 965, y: 202, bubble: "第三世界接管活场景，所有界面都要会动。", status: "busy", dialogue: ["欢迎来到江湖世界。这里不是展板，而是把经历变成人物，让你一个个问过去。", "每次对话都会补上一块 Shyboy 的来路：做过什么、为什么做、下一座世界会长成什么。"] },
  { id: "strategist-agent", name: "世界编排", role: "世界结构", color: "#8b5cf6", folder: "zhangliang", asset: "zhangliang", x: 725, y: 258, bubble: "先定动线，再定入口和出口。", status: "online", dialogue: ["我负责把世界接起来：世界一是入口，海岛是作品航线，这里是人物访谈。", "你看到的不是菜单，而是一套可以继续扩展的网站叙事结构。"] },
  { id: "brand-reviewer", name: "体验审校", role: "工程判断", color: "#f59e0b", folder: "baozheng", asset: "baozheng", x: 1208, y: 258, bubble: "风格可以狂，交互必须清楚。", status: "online", dialogue: ["这个项目的野心是“网站的终点”，所以每个世界都要有自己的风格和规矩。", "好看只是第一层，能让人愿意继续探索，才算站住。"] },
  { id: "geo-expert-agent", name: "地图设计", role: "探索经历", color: "#7c3aed", folder: "xuxiake", asset: "xuxiake", x: 673, y: 398, bubble: "每个网站风格，都能成为一个房间。", status: "online", dialogue: ["我代表探索经历：从一个想法走到可进入的世界，靠的是不断试错和观察。", "下一步可以把每段经历变成可拜访的房间，而不是一段简历文字。"] },
  { id: "market-insight-agent", name: "访客分流", role: "用户入口", color: "#0ea5e9", folder: "guest-boy", asset: "guest", x: 1253, y: 398, bubble: "人还没点，意图已经进场。", status: "online", dialogue: ["我代表访客视角。用户不是来读说明书的，他需要被场景邀请。", "所以这里让你先移动、靠近、对话，再慢慢拿到作品信息。"] },
  { id: "xhs-agent", name: "内容气氛", role: "内容表达", color: "#ff2442", folder: "liqingzhao", asset: "liqingzhao", x: 558, y: 515, bubble: "第一眼要像作品，不像后台。", status: "online", dialogue: ["我代表内容表达。作品需要标题、情绪和第一眼的记忆点。", "别把经历写成流水账，要让它像一幕能被截图的场景。"] },
  { id: "growth-agent", name: "动效推进", role: "行动力", color: "#00cec9", folder: "huoqubing", asset: "huoqubing", x: 738, y: 515, bubble: "角色动起来，页面才像活的。", status: "busy", dialogue: ["我代表执行力。很多东西不是想清楚才开始，而是开船以后才知道哪里卡。", "传送门、移动端控制、资产墙，都是边看边改出来的。"] },
  { id: "analyst-agent", name: "布局测量", role: "技术细节", color: "#22d3ee", folder: "zuchongzhi", asset: "zuchongzhi", x: 1213, y: 513, bubble: "坐标差了三像素，气质就塌。", status: "online", dialogue: ["我代表技术细节。一个灰色底、一处错误层级，都会破坏整个世界的可信度。", "所以对话 UI、贴图渲染、返回入口都要各归其位。"] },
  { id: "podcast-agent", name: "声场脚本", role: "表达媒介", color: "#e17055", folder: "baijuyi", asset: "baijuyi", x: 1408, y: 515, bubble: "下一版可以让世界开口说话。", status: "online", dialogue: ["我代表表达媒介。未来这里不只显示字幕，也可以加入旁白、音效和角色语气。", "网站可以像游戏，也可以像纪录片。"] },
  { id: "visual-agent", name: "视觉生成", role: "视觉作品", color: "#fd79a8", folder: "wudaozi", asset: "wudaozi", x: 512, y: 668, bubble: "背景是舞台，角色是接口。", status: "busy", dialogue: ["我代表视觉作品。背景、角色、字幕框要像同一个世界生出来的。", "现在先用已有素材搭出江湖世界，后面再逐步替换成真正匹配 Shyboy 的肖像。"] },
  { id: "email-agent", name: "任务派发", role: "协作交付", color: "#f59e0b", folder: "luobinwang", asset: "luobinwang", x: 727, y: 672, bubble: "把需求拆成可移动的小人。", status: "online", dialogue: ["我代表协作交付。每次修改都要能落到代码、构建和验证。", "这也是这个项目最重要的气质：想象力要真的跑起来。"] },
  { id: "seo-expert-agent", name: "路径索引", role: "信息架构", color: "#059669", folder: "jiangziya", asset: "jiangziya", x: 1215, y: 665, bubble: "世界很多，路径不能乱。", status: "online", dialogue: ["我代表信息架构。世界再多，也要能被找到、被理解、被回到。", "江湖世界会成为经历和作品之间的索引层。"] },
  { id: "x-twitter-agent", name: "爆点文案", role: "公开表达", color: "#1da1f2", folder: "libai", asset: "libai", x: 1413, y: 667, bubble: "网站的终点，要敢写在门口。", status: "online", dialogue: ["我代表公开表达。这个项目应该敢说：AI 已经能写出足够优秀的网站体验。", "于是网站不再只是页面，而是一座座能切换的世界。"] },
  { id: "meta-ads-agent", name: "转化实验", role: "产品实验", color: "#1877f2", folder: "lvbuwei", asset: "lvbuwei", x: 462, y: 888, bubble: "每个按钮都要知道自己为何存在。", status: "online", dialogue: ["我代表产品实验。每个世界都可以验证一种交互、一种风格、一种叙事。", "不满意就改，看到问题就立刻让它变好。"] },
  { id: "brand-audit-agent", name: "品牌巡检", role: "品牌感知", color: "#f2b84b", folder: "bole", asset: "bole", x: 955, y: 870, bubble: "这不是模板站，是风格博物馆。", status: "online", dialogue: ["我代表品牌感知。Shyboy 的作品集不是一个模板集合，而是在收集网站可能抵达的形态。", "当作品都变成场景，个人品牌会更像一个宇宙。"] },
  { id: "global-content-agent", name: "多域翻译", role: "跨域学习", color: "#10b981", folder: "xuanzang", asset: "xuanzang", x: 1315, y: 868, bubble: "SaaS、作品集、游戏、社区，都能接进来。", status: "online", dialogue: ["我代表跨域学习。技术栈可以换，世界语言也可以换。", "Vue 的海岛、原生 DOM 的人物江湖、未来 React 的世界，都能并存。"] },
  { id: "product-cocreate-agent", name: "纸门匠", role: "第四世界引路人", color: "#ec4899", folder: "cangjie", asset: "cangjie", x: 1700, y: 820, bubble: "想去白纸之境，就来与我谈。", status: "online", dialogue: ["江湖用人物讲经历，下一座世界会把颜色收起，只留下空间、光和线。", "白纸门后，就是 Shyboy 的线稿工作室吗？", "那里有会亮的电脑、构建日志墙，也有藏在房间里的项目与生活。", "请替我开门，我想亲自进去看看。", "好。沿着这道墨线往前走，纸门会在最后一句话后打开。"] },
  { id: "culture", name: "风格档案", role: "价值底色", color: "#7fd6bd", folder: "kongzi", asset: "kongzi", x: 287, y: 522, bubble: "所有网站风格，终将在这里归档。", status: "online", dialogue: ["我代表价值底色。技术很快，但真正留下来的，是你如何组织经验。", "把经历变成人物，让作品开口说话，这就是第三世界的入口。"] },
] as const;

const JIANGHU_SCENES_ZH = [
  ["x-twitter-agent", "xhs-agent", "入口文案要像宣言。"],
  ["geo-expert-agent", "market-insight-agent", "把访客送到该去的风格房间。"],
  ["analyst-agent", "visual-agent", "角色别糊，贴图先还原。"],
  ["brand-reviewer", "growth-agent", "动效可以密，层级不能乱。"],
  ["ceo", "strategist-agent", "第三世界先活起来，再长成系统。"],
] as const;

type JianghuAgentText = Pick<JianghuAgentSpec, "name" | "role" | "bubble" | "dialogue">;

const JIANGHU_AGENT_TEXT_EN: Record<string, JianghuAgentText> = {
  ceo: { name: "Control Desk", role: "Personal storyline", bubble: "The third world runs live — every interface has to move.", dialogue: ["Welcome to Jianghu World. This isn't a display board: experiences become characters you can question one by one.", "Every conversation fills in a piece of Shyboy's path: what was built, why, and what the next world will grow into."] },
  "strategist-agent": { name: "World Weaver", role: "World structure", bubble: "Set the paths first, then the doors in and out.", dialogue: ["I connect the worlds: the first is the entrance, the islands are the project route, and this is the interview hall.", "What you see isn't a menu — it's a site narrative that can keep growing."] },
  "brand-reviewer": { name: "Experience Critic", role: "Engineering judgement", bubble: "The style can be wild; the interaction must be clear.", dialogue: ["This project aims to be 'the end of websites', so every world needs its own style and rules.", "Looking good is only layer one — making people want to keep exploring is what counts."] },
  "geo-expert-agent": { name: "Map Designer", role: "Exploration", bubble: "Every website style can become a room.", dialogue: ["I stand for exploration: getting from an idea to a world you can enter takes trial, error and observation.", "Next, each experience can become a room you visit instead of a line on a résumé."] },
  "market-insight-agent": { name: "Visitor Guide", role: "Entry points", bubble: "Before anyone clicks, intent has already walked in.", dialogue: ["I represent the visitor. People don't come to read a manual — the scene has to invite them.", "So here you move, approach and talk first, and gather project details along the way."] },
  "xhs-agent": { name: "Mood Writer", role: "Expression", bubble: "First glance should feel like a work, not an admin panel.", dialogue: ["I stand for expression. Work needs a title, a feeling and a memorable first look.", "Don't write experience as a log — make it a scene worth a screenshot."] },
  "growth-agent": { name: "Motion Driver", role: "Momentum", bubble: "Once characters move, the page feels alive.", dialogue: ["I stand for execution. Many things don't start once they're figured out — you learn where it sticks after you set sail.", "Portals, mobile controls, the asset wall — all shaped by building and looking."] },
  "analyst-agent": { name: "Layout Surveyor", role: "Technical detail", bubble: "Three pixels off and the whole mood collapses.", dialogue: ["I stand for technical detail. One grey background or wrong layer breaks the whole world's credibility.", "So dialogue UI, texture rendering and the way back all need to sit exactly right."] },
  "podcast-agent": { name: "Sound Scripter", role: "Medium", bubble: "Next version, the world could speak.", dialogue: ["I stand for the medium. One day this could carry narration, sound and character voices, not just subtitles.", "A website can feel like a game — or a documentary."] },
  "visual-agent": { name: "Visual Maker", role: "Visual work", bubble: "The background is the stage; characters are the interface.", dialogue: ["I stand for visual work. Background, characters and subtitles should feel born from one world.", "For now Jianghu uses existing art; later it can be replaced with portraits that truly match Shyboy."] },
  "email-agent": { name: "Task Courier", role: "Delivery", bubble: "Break requests into little walking people.", dialogue: ["I stand for delivery. Every change has to land in code, a build and a check.", "That's this project's core spirit: imagination has to actually run."] },
  "seo-expert-agent": { name: "Path Indexer", role: "Information architecture", bubble: "Many worlds — the paths can't get tangled.", dialogue: ["I stand for information architecture. However many worlds there are, they must be findable, understandable and returnable.", "Jianghu World becomes the index between experiences and projects."] },
  "x-twitter-agent": { name: "Headline Poet", role: "Public voice", bubble: "Write 'the end of websites' right on the door.", dialogue: ["I stand for public voice. This project should dare to say AI can already build great web experiences.", "So a website stops being pages and becomes worlds you can switch between."] },
  "meta-ads-agent": { name: "Experiment Lab", role: "Product experiments", bubble: "Every button should know why it exists.", dialogue: ["I stand for product experiments. Each world tests an interaction, a style or a story.", "If it's not right, change it — see a problem, make it better right away."] },
  "brand-audit-agent": { name: "Brand Patrol", role: "Brand perception", bubble: "This isn't a template site — it's a museum of styles.", dialogue: ["I stand for brand perception. Shyboy's portfolio isn't a pile of templates; it collects the shapes a website can take.", "When every project becomes a scene, a personal brand starts to feel like a universe."] },
  "global-content-agent": { name: "Domain Translator", role: "Cross-domain learning", bubble: "SaaS, portfolios, games, communities — all can plug in.", dialogue: ["I stand for cross-domain learning. Tech stacks can change, and so can a world's language.", "Vue islands, a plain-DOM jianghu, a future React world — they can all coexist."] },
  "product-cocreate-agent": { name: "Paper Door Smith", role: "Guide to the fourth world", bubble: "Want to reach the white paper realm? Talk to me.", dialogue: ["Jianghu tells stories through people; the next world folds the colour away, leaving only space, light and line.", "Is Shyboy's linework studio behind the paper door?", "There's a glowing computer, a build log wall, and projects and life tucked into the room.", "Please open the door for me — I want to see it myself.", "All right. Follow this ink line; the paper door opens after the last word."] },
  culture: { name: "Style Archive", role: "Core values", bubble: "Every website style ends up archived here.", dialogue: ["I stand for core values. Technology moves fast; what lasts is how you organise experience.", "Turn experience into characters and let the work speak — that's the entrance to the third world."] },
};

const JIANGHU_SCENE_LINE_EN: Record<string, string> = {
  "入口文案要像宣言。": "Entry copy should read like a manifesto.",
  "把访客送到该去的风格房间。": "Send visitors to the style room they belong in.",
  "角色别糊，贴图先还原。": "Keep characters sharp — restore the textures first.",
  "动效可以密，层级不能乱。": "Motion can be dense; hierarchy can't be messy.",
  "第三世界先活起来，再长成系统。": "Bring the third world to life, then grow it into a system.",
};

const isEnglish = pageLang() === "en";

export const JIANGHU_AGENTS: readonly JianghuAgentSpec[] = isEnglish
  ? JIANGHU_AGENTS_ZH.map((agent) => ({ ...agent, ...JIANGHU_AGENT_TEXT_EN[agent.id] }))
  : JIANGHU_AGENTS_ZH;

export const JIANGHU_SCENES = isEnglish
  ? JIANGHU_SCENES_ZH.map(([from, to, line]) => [from, to, JIANGHU_SCENE_LINE_EN[line] ?? line] as const)
  : JIANGHU_SCENES_ZH;
