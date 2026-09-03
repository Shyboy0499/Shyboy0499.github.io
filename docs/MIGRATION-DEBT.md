# 迁移债清单

更新时间：2026-08-13

这份文档记录从旧版静态页面和 `island-sea` 迁移到多世界 Portfolio
架构后，仍然暂时保留的结构性问题。

迁移债不是普通 TODO。每一项都对应一个现有的 Adapter、World Session
或 Runtime 所有权问题。偿还时必须保持当前视觉效果、Portal Journey
和 GitHub Pages 静态部署可用。

## 当前状态

已经完成：

- 旧根目录 `assets/` 已删除，生产资源统一位于 `public/assets/`。
- 未使用的 GIF、海岛占位页、旧 loading 截图和空目录已删除。
- 旧训练营数据、旧后端代理和管理登录入口已移除。
- Portfolio Content Kernel 已与 Cosmic Binding、Archipelago Binding 分离；
  Jianghu World 也已通过独立 World Module 接入 Runtime。
- 原版海岛已经通过 Archipelago Binding 读取 Portfolio Project。
- Parent / Child Message Bridge 第一版已实现：ready、project-open、
  request-return、focus-island、pause 和 resume 已有正式消息入口。
- Cosmic World 已移除 `@ts-nocheck`，并在严格 TypeScript 下通过检查。
- Cosmic、Archipelago、Jianghu、Linework 与 Studio 已声明 World Manifest，并接入 Runtime
  分配的 Quality Budget 与 Activity Level。
- Runtime Contract Tests 第一批已建立，覆盖会话回滚、资源释放、
  Journey 失败与取消、质量选择和帧暂停。
- Archipelago 的视觉资源、岛屿建模、海面 Shader、小船和航行逻辑暂时保留。
- Archipelago HUD 已从深色仪表盘改为浅色航海图册方向；岛屿目录只展示
  已有作品岛，未来雾岛仍留在 3D 海域中但不进入目录。
- Archipelago 已加入巴别塔特殊地标、诺亚方舟解锁与持久化船型切换；
  特殊地标不混入 Portfolio Project 或作品岛档案。
- Archipelago 的漩涡入口已抽成可映射多个目标 World 的场景层，并为
  Cosmic 与 Jianghu 提供可见目的地标签。
- Runtime 已在目标 World Session 成功安装后同步 `?world=`；安装失败不会
  提前污染当前 URL。
- Archipelago 已迁为原生 World Module，场景、Vue HUD、状态和资源所有权均
  位于 `src/worlds/archipelago/`。
- Archipelago 主场景、小地图和 HUD 预览不再创建私有 renderer 或浏览器 RAF；
  一次性预览使用 Runtime 共享 renderer 的离屏 render target。

本次审计确认的未偿还债务：

| 优先级 | 债务 | 当前影响 |
| --- | --- | --- |
| `P1` | 浏览器级 Runtime 验证不足 | 尚未覆盖 GPU 资源增长、context lost、真实 Journey 和视觉回归 |

## 偿还顺序

顺序按照风险、Leverage 和 Locality 排列。不要跳过第一项直接重写海岛
Three.js；那会同时改变视觉、生命周期和所有权，难以判断回归来源。

## 1. Legacy iframe Adapter

状态：`已完成 / 2026-08-13`

涉及：

- `src/worlds/archipelago/world.ts`
- `src/worlds/archipelago/scene/world/island-world.ts`
- `src/runtime/experience-runtime.ts`

已完成：

```text
Archipelago World Module
  shared renderer + Runtime FramePort + Runtime ResourceScope
```

- Archipelago 不再创建自己的 `WebGLRenderer`。
- Archipelago 不再调用自己的顶层 `requestAnimationFrame`。
- 主场景、Vue HUD、Portal 和生命周期回调由 World Session 集中回收。
- Runtime 在安装目标 Session 前重置共享 renderer 状态，失败时恢复来源状态。

仍需由浏览器级测试确认：

- 重复进入和离开 Archipelago 十次后，GPU 资源与监听器回到基线。

## 2. Parent / Child Message Bridge

状态：`消息桥已删除 / URL focus 仍待实现`

涉及：

- `src/worlds/archipelago/world.ts`
- `src/runtime/portal-director.ts`
- `src/worlds/archipelago/ui/IslandPanel.vue`
- `src/worlds/archipelago/scene/world/world-navigation.ts`

已完成：

- `host-bridge.ts` 与 `messages.ts` 已删除。
- 外链和 Portal 意图通过 `ui-actions.ts` 由 Vue 传给 World Module。
- Activity Level 与 Portal Journey 状态直接暂停或恢复场景模拟。

剩余问题：

岛屿焦点仍未投射到 URL 状态或宿主层 Portfolio Overlay。这部分归入第 9 项
Portal URL/history 债务，不再需要恢复消息协议。

## 3. Archipelago 辅助 Renderer

状态：`已完成 / 2026-08-13`

涉及：

- `src/worlds/archipelago/scene/ship/ship-card-preview.ts`
- `src/worlds/archipelago/scene/ship/mobile-boost-model.ts`
- `src/worlds/archipelago/ui/Minimap.vue`

已完成：

- 独立 loading 应用和 renderer 已删除，加载状态由宿主处理。
- 船型卡片与加速图标使用共享 renderer 的一次性离屏快照。
- 小地图订阅 Runtime FramePort，不再启动自己的 RAF。
- 快照会恢复 render target、clear color、clear alpha 和 autoClear，并在
  `finally` 中释放临时 GPU 资源。

## 4. Cosmic World 的类型债

状态：`P1 / 已完成`

涉及：

- `src/worlds/cosmic/world.ts`

已完成：

- 已为材质参数、动画对象、浮动对象、路径和 Three.js `userData`
  建立局部类型。
- 已删除 `@ts-nocheck`。
- Cosmic World 已声明 `cosmicManifest`。
- Quality Budget 控制粒子、轨道节点、隧道密度和动画更新频率。
- Activity Level 控制 active、near、distant 状态下的更新工作量。
- Cosmic World 在严格 TypeScript 下通过检查。

完成标准：

- Cosmic World 在严格 TypeScript 下通过检查。
- 修改 Content Kernel 字段时，Cosmic Binding 能获得类型错误。
- 视觉实现不再直接承载 Portfolio 语义。

## 5. World Manifest、Quality Budget 和 Activity Level

状态：`P1 / 第一版已落地`

涉及：

- `src/runtime/contracts.ts`
- `src/runtime/experience-runtime.ts`
- `src/worlds/cosmic/`
- `src/worlds/archipelago/`
- `docs/ARCHITECTURE.zh-CN.md`

已完成：

- `WorldModule` 正式声明 `WorldManifest`。
- Cosmic、Archipelago、Jianghu、Linework 与 Studio 各自拥有 Manifest、资源分组和预算声明。
- Runtime 根据 reduced motion、save-data、设备内存、CPU 核心数和移动端
  信号选择初始 Quality Budget。
- Runtime 使用真实帧间隔进行带滞回的动态降级和缓慢恢复，Portal Journey、
  后台标签页和异常长帧不参与采样，且不会超过设备初始质量上限。
- Renderer 的 pixel ratio、Portal transition mode、World 预加载深度、
  Cosmic 特效密度和动画频率由同一份预算决定。
- Activity Level 通过 Runtime Lifecycle 传给 World。
- Archipelago 根据预算决定是否启用动态阴影，并根据 Activity Level
  暂停或恢复子应用。
- World Registry 已改为 Manifest + 延迟加载，不再在首屏导入所有 World。

仍待深化：

- 构建期生成带实际字节数和哈希文件名的 Asset Manifest。
- Portal 接近目标时按意图分阶段预加载，而不是只在 High 档空闲预加载代码。

完成标准：

- 新增第三个 World 不需要修改已有 World 的生命周期代码。
- 低端设备能跳过非关键资源。
- World 切换时只同时持有当前 World 与目标 World 的必要资源。

## 6. Runtime Contract Tests

状态：`P1 / 第一批已落地`

涉及：

- `src/runtime/`
- `src/worlds/cosmic/`
- `src/worlds/archipelago/`

已覆盖：

- World 安装失败后 Scope 原子回滚。
- World 必须发布且只能发布一个 Render View。
- Scope 销毁终止且幂等，延迟登记的资源会立即释放。
- 重复创建和销毁 World Session 不遗留注册资源。
- Journey 取消信号会传入目标 World 安装，阻止延迟结果复活。
- Portal 目标失败后来源 Portal 回到可用状态。
- Portal 销毁会取消未完成的异步 Journey。
- Static transition budget 会跳过 canvas snapshot。
- Frame Scheduler 停止后不再调度更新。
- Quality Budget 选择、Activity/Quality 重复通知和五个正式 World Manifest。

测试入口：

- `npm test`
- `tests/runtime/`
- `tests/contracts/`

仍待深化：

- 浏览器级 GPU resource 计数与多次真实 World Journey 压测。
- WebGL context lost / restore 契约。
- 桌面和移动端各质量档的视觉回归截图。

完成标准：

测试通过 World Module Interface，而不是深入每个 World 的内部实现。

## 7. Copied Source Ownership

状态：`已完成 / 2026-08-13`

涉及：

- `src/worlds/archipelago/`
- `package.json`
- `docs/ARCHITECTURE.zh-CN.md`

已完成：

- `src/worlds/archipelago/` 是场景、HUD、状态与 Binding 的唯一正式实现。
- `vendor/island-sea/` 已删除，`build:archipelago` 独立构建脚本已移除。
- 删除 vendor 不会删除 Archipelago 的正式能力。

## 8. Archipelago Art Direction Ownership

状态：`P1 / 第一版已修正，待文档化`

涉及：

- `src/worlds/archipelago/ui/Hud.vue`
- `src/worlds/archipelago/ui/IslandList.vue`
- `src/worlds/archipelago/ui/style.css`

当前问题：

Archipelago 曾临时借用了 Cosmic World 的深色仪表盘视觉语法，导致 HUD
看起来像后台管理面板，而不是低多边形海岛世界的一部分。这类问题不是单个
样式 bug，而是 World Binding 的艺术方向所有权不清：同一份 Portfolio
Content 可以进入多个 World，但每个 World 必须拥有自己的 UI 语言。

已完成：

- 左上角进度和天色控制改为浅色纸张、细线和暖色墨迹方向。
- 岛屿目录改为“岛屿志 / 航海图册”方向。
- 目录只展示真实作品岛，不再列出 `未命名海域 01` 这类未来雾岛。
- 目录行去掉重复 builder 列，避免后台表格感和文字挤压。
- 已新增 `docs/ARCHIPELAGO-ART-DIRECTION.zh-CN.md`，记录移动端航行控件、
  AI 图片资产透明化实验和罗盘方案回退经验。

剩余问题：

- 需要为移动端、不同天色、已登陆岛屿状态补一组视觉回归截图。

偿还目标：

- 继续维护 `docs/ARCHIPELAGO-ART-DIRECTION.zh-CN.md`，确保 Archipelago
  的 UI 来自航海图、岛屿志、手绘边注、低多边形海岸线，而不是
  Cosmic 的深色仪表盘。
- 在正式 Archipelago UI Binding 迁移时，把这些规则作为验收标准。
- 建立至少桌面和移动端两张截图基线，避免后续 AI 或人工改动把画风带偏。

完成标准：

- Archipelago UI 修改有稳定文档可查。
- 作品内容变动不会把未来雾岛暴露成目录噪声。
- 新增 HUD 控件时先选择符合海岛世界的图册、手记、罗盘、海图语言。
- Cosmic 与 Archipelago 不共享表层视觉组件，只共享 Content Kernel
  和 Runtime Interface。

## 9. Portal URL 与浏览器历史事务

状态：`已完成 / 2026-08-17`

涉及：

- `src/entry.ts`
- `src/runtime/experience-runtime.ts`
- `src/runtime/portal-director.ts`
- `src/runtime/world-history.ts`
- `src/worlds/worlds.config.ts`

已完成：

- 入口启动时读取 `?world=`，初始 Session 成功后使用 `replaceState` 规范化 URL。
- Portal Journey 仅在目标 World Session 安装完成后使用 `pushState` 建立历史条目。
- `popstate` 通过同一个可取消 Portal Journey 恢复 World Session；连续请求由
  generation 与 AbortSignal 阻止过期结果提交。
- 历史目标安装失败时保留来源 Session，并把当前历史条目恢复为来源 World。
- URL 中未知或失效的 World id 会回退并规范化到 Cosmic。
- World Session 通过 Focus Port 注册本地语义恢复器；用户选择只在变化时建立
  历史条目，刷新与前进后退不会重复写入历史。
- Cosmic 项目与骑行照片、Archipelago 岛屿、Jianghu 角色，以及 Linework、
  Studio 展品均可通过稳定 `focus=` 参数直接打开和恢复。

偿还目标：

- 只在 Portal Journey 成功提交后写入 `?world=`，准备和回滚阶段不得污染历史。
- 浏览器前进或后退必须走同一套可取消、可回滚的 Portal Journey。
- URL 中未知或失效的 World ID 回退到 Cosmic，不破坏静态 Portfolio shell。
- 为可分享的 World 内焦点定义稳定参数，例如 `focus=<portfolio-entry-id>`。

完成标准：

- Portal 成功、失败、取消和历史导航都有契约测试。
- 当前 URL、活跃 World Session、输入焦点和 Portal 状态在提交点原子一致。
- 直接打开、刷新、复制链接和前进后退都能恢复同一语义位置。

## 10. 架构文档同步

状态：`P2 / 已完成本轮同步`

涉及：

- `docs/ARCHITECTURE.zh-CN.md`
- `docs/MIGRATION-DEBT.md`
- `CONTEXT.zh-CN.md`

本轮已完成：

- 架构现状已列出 Cosmic、Archipelago、Jianghu、Linework 和 Studio 的实现形态。
- 仓库形态已改为当前真实目录，不再展示尚未落地的规划目录。
- Portal URL、历史导航和 Archipelago renderer 所有权已区分当前能力与目标。
- 后续新增、删除或重命名 World 时仍需同步检查世界命名索引、架构图和迁移债。

完成标准：

- 架构现状明确列出 Cosmic、Archipelago、Jianghu、Linework 和 Studio 的实现形态。
- 已实现能力与未来目标分开表述，不把规划中的端口写成当前事实。
- 新增、删除或重命名 World 时，同步检查世界命名索引、架构图和迁移债。

## 不要清理的内容

- `public/assets/`：它是 Astro 的正式生产资源目录。
- `public/.nojekyll`：GitHub Pages 需要它保持静态部署行为。

## 下一步

优先为原生 Archipelago 增加十轮真实 Journey 的 GPU/监听器压测和桌面、
移动端视觉基线，并补 WebGL context lost 恢复验证。

第 1、2、3、4、7 项已经完成；第 5 和第 6 项已有可运行、可测试的第一版。
第 10 项已完成本轮同步，后续更新仍不得把尚未实现的 Runtime 能力描述成
当前事实。
