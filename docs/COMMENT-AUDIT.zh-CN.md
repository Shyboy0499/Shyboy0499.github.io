# 注释补充审计

状态：草案
日期：2026-08-11

## 目标

根据 `CONTEXT.zh-CN.md` 的强制注释规范，识别当前项目中最需要补充注释的位置。本文档只记录补充范围和理由，不直接决定具体文案。

注释补充优先解释：

- 文件负责什么、不负责什么，以及所有权边界；
- Runtime、World、Portal、Resource、外部 I/O、状态机和复杂视觉/性能取舍；
- 无法从代码本身看出的“为什么”。

避免注释：

- 简单局部转换；
- 普通事件绑定；
- 显而易见的样式；
- 直接数据映射。

## P0：必须先补的文件头注释

这些文件属于非平凡源文件，目前文件顶部缺少 1-2 行职责说明。优先补文件头，帮助人和 AI 快速判断边界。

| 文件 | 建议说明重点 |
| --- | --- |
| `src/entry.ts` | 浏览器入口；安装沉浸模式、注册 SW、按 URL 选择初始 World；不拥有具体 World 行为。 |
| `src/runtime/contracts.ts` | Runtime 与 World 之间的共享契约；类型定义不实现生命周期。 |
| `src/runtime/experience-runtime.ts` | 顶层运行时编排；唯一拥有 renderer、RAF、输入、World Session 切换。 |
| `src/runtime/world-session.ts` | 安装单个 World Session；校验 manifest、创建 scope、集中回收资源。 |
| `src/runtime/portal-director.ts` | Portal UI 与事务性世界切换编排；实际 session swap 仍由 Runtime 完成。 |
| `src/runtime/resource-scope.ts` | 资源清理注册表；保证销毁后的 late registration 不泄漏。 |
| `src/runtime/renderer-host.ts` | Three.js renderer 宿主；统一 resize、像素比和质量档位。 |
| `src/runtime/quality-budget.ts` | 从浏览器信号推导初始质量预算；World 不自行判断设备能力。 |
| `src/runtime/lifecycle.ts` | Activity 与 Quality 的发布订阅状态；session 生命周期内有效。 |
| `src/runtime/frame-scheduler.ts` | 分阶段 RAF 调度；保证跨 World 更新顺序稳定。 |
| `src/runtime/story-progress.ts` | 从 DOM 章节读取滚动叙事进度；World 只读快照。 |
| `src/runtime/collection-director.ts` | 横向项目详情导航；虽然已有局部说明，仍应补文件头。 |
| `src/runtime/world-manifest.ts` | World manifest 定义与校验入口；防止重复资源和非法预算进入 registry。 |
| `src/worlds/worlds.config.ts` | 世界命名索引；集中管理 world id、显示名、目录、URL 参数和提交 scope。 |
| `src/worlds/registry.ts` | World 注册表；集中声明可加载世界和 lazy import 边界。 |
| `src/worlds/cosmic/world.ts` | 已有文件头，保留作为参考模板。 |
| `src/worlds/archipelago/world.ts` | 原生 Three.js + Vue HUD Adapter；说明共享 renderer、帧任务、Portal 与 Session 回收的所有权。 |
| `src/worlds/jianghu/world.ts` | Jianghu World 的 Runtime 适配器；DOM 场景挂载到 body，但生命周期由 Runtime 回收。 |
| `src/worlds/jianghu/jianghu-scene.ts` | Jianghu DOM 场景；负责江湖世界 UI、对话状态、sprite 路径，不拥有 Runtime。 |
| `src/asset-gallery.ts` | 3D 资产页预览运行时；每个 canvas 独立 renderer，需要手动延迟初始化和释放。 |
| `src/content/portfolio.ts` | 已有内容内核说明但不在文件顶部；建议移动/扩展为文件头。 |
| `src/content/types.ts` | Portfolio 内容结构类型；不包含世界坐标或视觉角色。 |
| `src/styles.css` | 站点壳层样式；覆盖静态 fallback、导航、故事章节和 runtime overlay。 |

## P1：边界和取舍处需要补“为什么”

这些位置不一定需要大量注释，但应该在对应代码块前补 1-2 句，说明所有权、生命周期或非直观取舍。

| 位置 | 建议说明重点 |
| --- | --- |
| `src/runtime/experience-runtime.ts` 中 `PortalDirector` 创建处 | 快照覆盖转场为什么由 Runtime 创建，而目标 World 只通过 registry 加载。 |
| `src/runtime/experience-runtime.ts` 中 `installWorld` | 为什么先安装 next session、再替换 activeSession、最后 dispose previousSession。 |
| `src/runtime/world-session.ts` 中 abort handling | 为什么 install 前后都检查 abort，避免半安装 World 泄漏资源。 |
| `src/runtime/world-session.ts` 中 `RuntimeRenderPort.publish` | 为什么一个 World Session 只能发布一个 Render View。 |
| `src/runtime/resource-scope.ts` 中 late registration | 为什么 disposed 后立即执行 cleanup，避免异步加载完成后留下资源。 |
| `src/runtime/portal-director.ts` 中 journey state flow | 解释 hinted/armed/preparing/crossing/rollback 的事务边界。 |
| `src/runtime/quality-budget.ts` 中档位选择 | 说明 reduced motion、mobile、deviceMemory 对视觉预算的影响。 |
| `src/worlds/archipelago/world.ts` 中共享 renderer 与 Vue 挂载 | 说明 Runtime 独占渲染生命周期，Vue 只通过动作接缝表达 UI 意图。 |
| `src/worlds/jianghu/world.ts` 中空 Three scene + DOM scene | 说明 Jianghu 主要是 DOM world，但仍发布 Render View 以满足 Runtime 契约。 |
| `src/worlds/jianghu/jianghu-scene.ts` 中对话层点击推进 | 说明为什么取消底部按钮，用整层点击推进并保留右上角低调关闭。 |
| `src/worlds/jianghu/jianghu-scene.ts` 中字幕遮罩渐变 | 说明为什么不用 `backdrop-filter`，避免矩形模糊边缘形成硬接缝。 |
| `src/asset-gallery.ts` 中 lazy preview 初始化 | 说明为什么只初始化靠近可视范围的 canvas，控制 GPU/renderer 数量。 |

## P2：低优先级或可不补

这些文件多为声明、转发或直接映射。可以补文件头，但不建议在内部添加细碎注释。

| 文件 | 处理建议 |
| --- | --- |
| `src/worlds/*/index.ts` | 可只写一句“barrel export”，也可保持无内部注释。 |
| `src/worlds/*/manifest.ts` | 补文件头即可；manifest 字段本身不需要逐项注释。 |
| `src/worlds/*/binding.ts` | 补文件头说明这是 World Binding；具体数组项不用逐条注释。 |
| `src/pages/index.astro` | 已有 DOM 区块注释；可补 Astro frontmatter 的文件头说明。 |
| `src/pages/3d-assets.astro` | 可补文件头说明资产墙页面职责；资产列表不需要逐条注释。 |

## 建议落地顺序

1. 先补 `src/runtime/*` 文件头和 P1 边界注释。
2. 再补 `src/worlds/jianghu/*` 和 `src/worlds/archipelago/world.ts`，因为两者代表 DOM World 与原生 Three.js World 的不同 Adapter。
3. 然后补 `src/content/*`、`src/worlds/*/binding.ts`、`src/worlds/*/manifest.ts`。
4. 最后处理页面和样式文件，避免在 CSS 中添加过多显而易见注释。

## 后续检查标准

每次补注释时，按以下问题自检：

- 这条注释是否说明了文件职责、所有权、生命周期、性能取舍或非直观不变量？
- 如果删除这条注释，AI 或人类接手时是否更容易误改？
- 它是否只是在复述代码已经表达的“做什么”？
- 它是否超过 1-2 行，暗示应该改成更清楚的代码或更高层文档？
