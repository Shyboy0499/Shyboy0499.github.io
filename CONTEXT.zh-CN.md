# 领域上下文

[English](CONTEXT.md)

本仓库正在从一个 3D 个人作品集页面，演化为一个多世界个人作品集。同一份个人经历可以被多个视觉世界诠释，而不重复或扭曲底层内容。

## 领域语言

### Portfolio（个人资料集）

网站呈现的完整个人记录：身份信息、项目、奖项、能力、时间线条目、链接与媒体。

### Portfolio Entry（个人资料条目）

个人资料集中的稳定语义条目。项目、奖项、时间线条目或能力都属于个人资料条目。每个条目都有永久 ID，不依赖页面顺序或视觉呈现。

### Content Kernel（内容内核）

个人资料集的唯一事实来源。它包含文本、关系、链接与媒体引用；绝不包含 Three.js 坐标、相机位置、岛屿主题、房间编号，或其他世界特有的呈现信息。

### World（世界）

个人资料集的一种可独立加载的视觉和交互诠释。当前的太空体验是 Cosmic World；可航行的海洋体验将成为 Archipelago World。

### World Binding（世界映射）

个人资料条目 ID 到某个世界内角色的映射。一个项目在 Archipelago World 中可以是一座岛，在 Cosmic World 中可以是一座空间站。坐标、材质、相机路径与交互角色都放在这里。

### World Module（世界模块）

一个世界的可加载定义。它声明 World Manifest，并将自己的行为一次性安装到由 Runtime 拥有的 World Scope 中。

### World Session（世界会话）

由 Runtime 根据一次 World Module 安装生成的、已经挂载的一段世界生命期。它包含该世界的场景对象、已注册帧任务、渲染管线、可选 UI 与 Resource Scope。被销毁的会话不可复用。

### Runtime（运行时）

所有活跃 World Session 的唯一协调者。它拥有 canvas、renderer、帧调度、输入路由、转场编排、质量策略与资源所有权。

### Portal（门）

世界中的可交互地标，提供前往另一个世界的路线。Portal 只描述意图与表现，不能自行加载目标世界或改变 Runtime 所有权。

### Portal Journey（穿门旅程）

从一个世界到另一个世界的事务性转场。它准备目标世界，用恰当的视觉处理覆盖所有权交换，只在目标世界能够渲染后提交；若准备失败则回滚。

### Activity Level（活动级别）

一个区域或世界允许执行的工作量：

- `active`：可见、可交互，并按需逐帧更新。
- `near`：已准备并渲染，但以更低频率更新。
- `distant`：简化呈现，大部分逻辑停止。
- `dormant`：只保留语义数据，不存在活跃的 Three.js 对象。

### Quality Budget（质量预算）

Runtime 授予 World Session 的渲染和模拟预算。它控制像素比、阴影、后处理、特效密度、更新频率、转场模式和预加载深度。

### Asset Manifest（资源清单）

构建期生成的、某个世界所需代码和媒体资源的库存。资源按关键性和质量档位分组，并带有体积与所有权元数据。

### Resource Scope（资源作用域）

为某个 Runtime 关注点、World Session 或 Portal Journey 创建的 CPU/GPU 资源所有权记录。销毁作用域会释放其中仍归它所有的一切资源。

## 世界命名索引

世界 id、显示名、代码目录、资源目录、URL 参数值和提交 scope 必须集中管理。代码中的单一事实来源是 `src/worlds/worlds.config.ts`；本文档记录给人阅读的同一组约定。新增世界或重命名世界时，先更新这个索引，再同步 manifest、registry、Portal 目标和 legacy/vendor 桥接。

| world id | 中文名 | 英文名 | 代码目录 | 资源目录 | URL | 提交 scope |
| --- | --- | --- | --- | --- | --- | --- |
| `cosmic` | 宇宙世界 | Cosmic World | `src/worlds/cosmic` | `public/assets` | `?world=cosmic` | `cosmic` |
| `archipelago` | 群岛世界 | Archipelago World | `src/worlds/archipelago` | `public/assets` | `?world=archipelago` | `archipelago` |
| `jianghu` | 江湖世界 | Jianghu World | `src/worlds/jianghu` | `public/jianghu-world` | `?world=jianghu` | `jianghu` |
| `linework` | 线稿世界 | Linework World | `src/worlds/linework` | `public/linework-world` | `?world=linework` | `linework` |
| `studio` | 工作室世界 | Studio World | `src/worlds/studio` | `public/studio-world` | `?world=studio` | `studio` |

### 工作室穿越物索引

Studio World 在场景中提供三个穿越物，但 Runtime 同一时刻仍只注册其中一个 Portal：

| 穿越物 | 场景目标 id | 目标世界 |
| --- | --- | --- |
| 右墙星门 | `portal-cosmic` | `cosmic` |
| 后墙纸稿门 | `portal-linework` | `linework` |
| 机械世界罗盘 | `portal-archipelago` | `archipelago` |

Studio World 必须根据当前悬停或点击目标动态切换 Portal 注册，不得同时持有三个目标世界的活跃资源。

## 架构不变量

1. 个人资料的语义只在 Content Kernel 中编写一次。
2. 世界通过稳定 ID 引用 Portfolio Entry，绝不依赖数组下标。
3. Runtime 是 renderer 和浏览器帧循环的唯一所有者。
4. World Session 必须可以被完整销毁。
5. Portal Journey 必须要么完整提交，要么回到来源世界。
6. 世界接收 Quality Budget，不自行推断设备性能。
7. 同一时间，只有当前世界与一个可能的 Portal 目标可以持有昂贵的活跃资源。
8. WebGL 或 JavaScript 失败时，静态个人资料内容仍然必须可读。
9. 代码注释规范必须强制遵循：
   - 新增或修改的代码注释必须使用中文，除非是在引用外部协议、API 名称、
     错误信息或保留原有英文术语。
   - 每个非平凡源文件顶部必须有 1-2 行文件头注释，说明该文件负责什么、
     不负责什么，或其所在的所有权边界。
   - 注释优先解释“为什么”、所有权、生命周期、性能取舍和非直观不变量；
     不重复代码已经表达的“做什么”。
   - Runtime、World、Portal、Resource、外部 I/O、状态机和复杂视觉/性能取舍
     的边界处必须补充必要注释。
   - 简单局部转换、普通事件绑定、显而易见的样式和直接数据映射不写注释，
     避免把代码变成说明书。
   - 每次修改代码后，必须检查同一文件内现有注释是否仍然准确；若行为、
     所有权、生命周期、性能取舍或不变量发生变化，必须同步更新、删除或
     补充相关中文注释，避免过期注释误导后续维护。
10. 未来提交遵循 Conventional Commits，根据变更性质选择 `feat`、`fix`、
    `docs`、`refactor`、`test`、`chore` 等准确类型，并可使用
    `type(scope):` 格式标明范围。提交标题和重要变更说明同时提供中文与英文
    版本；中文先写清用户可见变化，英文随后描述同一组变更。
