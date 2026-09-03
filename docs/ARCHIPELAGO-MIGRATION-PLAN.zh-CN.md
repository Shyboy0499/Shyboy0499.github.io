# Archipelago 所有权迁移方案

更新时间：2026-08-13
执行状态：已完成（S1 `22114a0`、S2 `04cd633`、S3 `1f0b37e`、S4 `bf4456a`，资源验收补充见 2026-08-13 记录）

本文件保留为迁移过程与验收依据。当前正式实现已经位于
`src/worlds/archipelago/`；文中“现状”“待删除”等措辞描述的是执行前状态。

## 这份文档给谁

给执行迁移的 AI 或开发者。目标是把 `vendor/island-sea/` 的实现迁回
`src/worlds/archipelago/`，偿还 [MIGRATION-DEBT.md](MIGRATION-DEBT.md) 里的
`P0 Legacy iframe Adapter` 与 `P2 Copied Source Ownership`。

读之前先读 [ADR-0002](adr/0002-runtime-owns-rendering-and-lifecycle.zh-CN.md)：
Runtime 是 canvas、renderer、帧循环、输入和 World Session 的唯一所有者。
这次迁移的全部技术难点都来自这一条。

参照实现是 [jianghu](../src/worlds/jianghu/world.ts)：一个非 iframe 的
World Module 长什么样、怎么把自有场景挂到 `scope` 上，那里有完整答案。

## 终局形态

```text
src/worlds/archipelago/
├─ index.ts              # 已存在，出口不变
├─ manifest.ts           # 已存在，assets/budgets 需按实测更新
├─ binding.ts            # 已存在，Portfolio → IslandSource
├─ world.ts              # 从 iframe adapter 改写为原生 World Module
├─ islands.ts            # ← vendor/src/data/islands.ts
├─ landmarks.ts          # ← vendor/src/data/landmarks.ts
├─ store.ts              # ← vendor/src/store.ts
├─ ui/                   # ← vendor/src/components/*.vue
└─ scene/
   ├─ core/              rng ease waves sprites config
   ├─ env/               sky ocean themes timeofday nightmagic postfx creatures
   ├─ island/            island island-types island-animation island-model
   │                     island-model-common island-geometry island-overlays
   │                     island-props kame-island-scene
   ├─ ship/              ship ship-config shipfx noahs-ark mobile-boost-model
   ├─ landmarks/         archipelago-maelstrom archipelago-maelstrom-v2
   │                     babel-tower charybdis-whirlpool
   └─ world/             island-world world-camera world-controls
                         world-navigation world-sailing
```

依赖方向是 `core ← env ← island/ship ← landmarks ← world`，当前代码里没有
跨层环，按这个分层搬不会产生循环引用。

`scene/world/island-world.ts` 是原 `three/world.ts` 改名后的落点，避免和
World Module 契约层的 `world.ts` 撞名。

被删除的文件：`vendor/island-sea/` 整个目录、`src/worlds/archipelago/messages.ts`、
`public/archipelago-original/`，以及 `package.json` 里的 `build:archipelago`。

## 不可破坏的约束

这些是验收基线，任何阶段都不许破坏：

1. **视觉零回归。** 海面 shader、岛屿建模、全天时段流转、后处理、船体
   动画、漩涡演出都必须和迁移前一致。这次迁移只换所有权，不换观感。
2. **localStorage key 不变。** `island-sea:visited`、`island-sea:known-projects`、
   `island-sea:theme`、`island-sea:ark-unlocked`、`island-sea:ship-variant`
   五个 key 必须原样保留。改名等于清空所有老访客的探索进度。
3. **Portal Journey 仍然原子。** 见 [ADR-0005](adr/0005-portal-journeys-are-atomic.zh-CN.md)。
   失败要能回滚到来源 World，船要回到捕获前位置。
4. **GitHub Pages 静态部署可用。** `npm run build` 必须通过，不能引入
   需要服务端的东西。
5. **反复进出 Archipelago 不泄漏。** 所有 listener、timer、GPU 资源登记到
   `scope.resources`，进出十次后显存和监听器数量应回到基线。

## 关键接缝

迁移的难度全在这六处。先读懂再动手。

### 1. Renderer 与帧循环

现状：`vendor/src/three/world.ts` 自己 `new THREE.WebGLRenderer({ canvas })`
（约 157 行），自己 `requestAnimationFrame`（约 530 行），自己监听 resize
（约 391 行）。

改法：

- renderer 改用 `scope.rendering.renderer`，删掉 `setSize` / `setPixelRatio`
  调用，尺寸和像素比由 `RendererHost` 统一管理。
- 顶层 RAF 删掉，`loop()` 的循环体拆进 `scope.frame.add("animation", ...)`。
  相机跟随适合放 `"camera"` phase，后处理放 `"effects"`。
- resize listener 删掉，改为在帧任务里读 renderer 尺寸，或订阅
  `scope.lifecycle.onQuality`。
- `setPaused(p)`（约 412 行）不再由消息桥驱动，改为订阅
  `scope.lifecycle.onActivity`，`level !== "active"` 时暂停。

### 2. PostFX 与最终渲染

`RenderView` 有可选的 `render?: () => void`（见
[contracts.ts](../src/runtime/contracts.ts)）。这是给自带 composer 的 World
留的钩子：

```ts
scope.render.publish({ scene, camera, render: () => postfx.render() });
```

`PostFX` 构造签名是 `(renderer, scene, camera)`，传入共享 renderer 即可。
不要在帧任务里自己调 `composer.render()`，那会和 Runtime 的 render phase
重复出帧。

### 3. 阴影与画质

现状用 iframe 的 `?noshadow` query 传画质。原生化之后直接读
`scope.lifecycle.quality`：`shadows`、`postProcessing`、`effectDensity`、
`animationRate` 都有语义，按 `QualityBudget` 的字段接。`legacyQuery` 和
`assetBasePath` 两个配置项随之从 `worlds.config.ts` 移除。

### 4. Vue 的去留

`astro.config.mjs` 目前没有任何 Vue 集成。`vue` 和 `@vitejs/plugin-vue`
只服务于 `vendor/island-sea` 那套独立的 vite 构建。所以 6 个 `.vue` 组件
（约 30 KB）不能直接搬进 `src/` 就跑起来。

两条路：

- **保 Vue。** 在 `astro.config.mjs` 的 `vite.plugins` 里加
  `@vitejs/plugin-vue`，World Module 内部 `createApp(...).mount(el)`，
  卸载时 `app.unmount()` 登记到 `scope.resources`。改动小，HUD 零回归风险。
- **去 Vue。** 照 [jianghu-scene.ts](../src/worlds/jianghu/jianghu-scene.ts)
  改写成原生 DOM，宿主彻底不依赖 Vue。和现有两个 World 的实现风格一致，
  但要重写 6 个组件和 `store.ts` 的响应式部分。

**本方案选保 Vue**，理由是不要在一次迁移里同时改所有权和 UI 实现——那正是
[MIGRATION-DEBT.md](MIGRATION-DEBT.md) 提醒过的"难以判断回归来源"。去 Vue
是迁移完成之后的独立议题，届时 HUD 已经在 `src/` 里，可以单独重写和验证。

`store.ts` 用了 `reactive` / `computed`，保 Vue 就整体搬过去，只改 import
路径。它同时被 3D 世界和 HUD 读写，是两者的唯一共享状态，不要拆。

### 5. 消息桥的拆除

`vendor/src/host-bridge.ts` 和 `src/worlds/archipelago/messages.ts` 是
iframe 时代的产物，原生化之后整对删除。六条消息各自的新归宿：

| 旧消息 | 新做法 |
| --- | --- |
| `archipelago.ready` | 不需要；`install()` 的 `await` 即首帧信号 |
| `archipelago.request-return` | 直接 `portal.request()` |
| `archipelago.preload-world` | 直接 `portal.preload()` |
| `archipelago.project-open` | 直接 `window.open(href, "_blank", "noopener,noreferrer")` |
| `archipelago.focus-island` | 留在 store 里；URL 状态是 `P0` 另一项债，本次不动 |
| `archipelago.pause` / `resume` | `scope.lifecycle.onActivity` |

`App.vue` 里那套 `#loading` 遮罩兜底逻辑一并删除，失败回滚交给
World Session 安装器。

### 6. 辅助 renderer

`loading-scene.ts` 和 `ship-card-preview.ts` 各自创建 renderer 和 RAF，
对应 [MIGRATION-DEBT.md](MIGRATION-DEBT.md) 的第 3 项。

- `loading-scene.ts` / `loading-screen.ts` / `index.html`：原生化后不再需要
  子应用自己的首屏，直接删除，交给宿主 loader。
- `ship-card-preview.ts`：改用共享 renderer 渲染到离屏 target，或降级成
  预渲染图片。这一项可以留到最后单独做，不阻塞主线。

## 阶段划分

每个阶段独立可验证、独立可回滚。不要合并阶段，尤其不要把 S3 和 S4 合并。

### S0 归属决策

处理 4 个主 World 未接线文件：`ancient-jungle-portal.ts`、`flying-dutchman.ts`、
`tidepool-arena-portal.ts`、`voxel-nether-portal.ts`。
它们是做完但没接进 `world.ts` 的程序化场景类，共 51 KB，只依赖 `sprites.ts`。
这些文件不是零引用：`src/asset-gallery.ts` 和 `src/pages/3d-assets.astro`
会把它们作为 3D 资产陈列页的独立预览加载。

**执行结论：保留。** 它们归到 `scene/landmarks/`，所有权属于 Archipelago
地标资产层；当前只服务资产陈列页，不进入主 World 的航行、Portal 或碰撞逻辑。

在这之后再动手，避免给死代码搬家。

### S1 目录分层（仍在 vendor 内）

在 `vendor/island-sea/src/three/` 下建立终局形态里的 6 个子目录，只做
`git mv` 加改 import 路径。`three/world.ts` 暂不改名。

同步更新引用了这些路径的文档：`docs/ARCHIPELAGO-ART-DIRECTION.zh-CN.md`、
`docs/COMMENT-AUDIT.zh-CN.md`、`docs/MIGRATION-DEBT.md`，以及
`tests/archipelago/` 下 3 个测试的 import。

验收：`npm run test` 和 `npm run build` 通过，iframe 里画面无变化。

放在 vendor 内做而不是直接搬到 `src/`，是为了把"分层"和"跨目录搬迁"分成
两个可独立回滚的 diff。

### S2 平移到 src（保持 iframe）

把 `vendor/island-sea/src/` 下的文件整体搬到 `src/worlds/archipelago/`
（按终局形态），`three/world.ts` 改名为 `scene/world/island-world.ts`。

此时仍然是 iframe 模式：`vendor/island-sea/index.html` 和 `vite.config.ts`
留下，`build:archipelago` 改为指向新的入口路径。`host-bridge.ts` 暂时保留。

代码风格要对齐 `src/` 的现有约定：双引号、带分号。vendor 里是单引号、
无分号，搬过去要一并改，否则 `src/` 内部风格分裂。

验收：`npm run build` 通过，iframe 画面无变化，5 个 localStorage key 仍
被正确读写（进出海岛后检查 devtools）。

### S3 原生化 World Module

这是核心阶段。按"关键接缝"的 1、2、3、5 节改写：

1. `island-world.ts` 的 `World` 类构造签名从 `(canvas, islandDefs)` 改为
   接受 `scope` 与 islands，内部不再建 renderer。
2. `world.ts`（World Module）从 iframe adapter 改写为原生 install：建
   `World`、挂 Vue app、注册帧任务、注册 portal、`scope.render.publish`。
3. 删除 `host-bridge.ts`、`messages.ts`、`App.vue` 的 iframe 兜底逻辑。
4. 删除 `vendor/island-sea/`、`public/archipelago-original/`、
   `build:archipelago` 脚本、`WORLD_NAMING.archipelago.legacyQuery` 和
   `assetBasePath`。

`tests/contracts/archipelago-world.test.ts` 断言的是 iframe 行为和消息协议，
这一阶段必须重写它，改为断言原生契约：不创建自有 renderer、帧任务登记在
`scope.frame`、`scope.resources.dispose()` 后监听器清零。

验收：

- 全站运行期间只有一个 `WebGLRenderer`、一个顶层 RAF。
- 从 Cosmic 进 Archipelago 再回 Cosmic，往返十次，显存和监听器无增长。
- 漩涡进 Jianghu 的 Journey 成功；人为让它失败时船能回到捕获前位置。
- 视觉与 S2 逐帧一致。

2026-08-13 补充验收：

- 浏览器脚本通过 `__THREE_DEVTOOLS__` 观察 Runtime 共享 renderer，执行十轮
  Cosmic ↔ Archipelago 往返；Cosmic 侧从第 2 轮开始稳定在 `geometries=50`、
  `textures=2`、`programs=13`、`canvas=1`、`archipelago-ui-root=0`。
- 大漩涡成功路径：船从 `(-270, 270)`、朝向 `Math.PI` 进入捕获，最终提交到
  `world=jianghu`。
- 大漩涡失败路径：拦截 `src/worlds/jianghu/index.ts` 后仍停在 `world=archipelago`，
  船回到 `(-270, 270)`、朝向 `Math.PI`、速度 `0`，Portal 状态回到 `armed`。

### S4 收尾

- `manifest.ts` 的 `assets.critical` / `budgets` 按原生化后的实测值更新，
  `features.postProcessing` 等标志核对一遍。
- `ship-card-preview.ts` 的独立 renderer 按接缝第 6 节处理。
- `docs/MIGRATION-DEBT.md` 勾掉 `P0 Legacy iframe` 和 `P2 Copied Source
  Ownership`，`docs/ARCHITECTURE.zh-CN.md` 删掉 `vendor/island-sea/` 例外
  条款（第 132 行和第 141 行附近）。
- 补一条 ADR 记录原生化决策，或在 ADR-0002 后附执行记录。

## 验证命令

每个阶段结束都跑全套：

```bash
npm run test && npm run build
```

`npm run build` 内含 `astro check`，会做严格 TypeScript 检查。S3 之后它不再
包含 `build:archipelago`。

单独跑群岛相关测试：

```bash
npx vitest run tests/archipelago tests/contracts
```

## 执行纪律

- **不要跳过 S1、S2 直接做 S3。** 同时改所有权、路径和渲染生命周期，
  出回归时无法定位来源。
- **不要顺手改逻辑。** S1 和 S2 是纯移动，diff 里出现逻辑改动就是错的。
  发现的 bug 记下来，迁移完成后单独修。
- **不要改 localStorage key 名。**
- **不要在 S3 里同时去 Vue。** 见接缝第 4 节。
- **每阶段独立提交。** 提交信息沿用仓库的双语格式，例如
  `refactor(archipelago): 分层海岛场景模块 / layer island scene modules`。
- 遇到本文档没覆盖的取舍，先看 jianghu 和 cosmic 怎么做的，两个原生
  World 已经把大部分模式定下来了。
