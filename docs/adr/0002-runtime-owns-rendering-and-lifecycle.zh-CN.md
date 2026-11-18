# ADR-0002：Runtime 拥有渲染和生命周期

[English](0002-runtime-owns-rendering-and-lifecycle.md)

- 状态：已接受
- 日期：2026-08-02

## 背景

当前 Cosmic 体验和 Archipelago 实现都会创建 renderer、浏览器帧循环、事件监听器与长期存在的 GPU 资源。把它们同时加载会产生冲突的所有权和不可靠的清理行为。

## 决策

Runtime 独占 canvas、renderer、浏览器帧循环、输入路由、世界激活和顶层 Resource Scope。每个 World Module 都将自己的行为安装到由 Runtime 拥有的 World Scope 中，并且只在 Runtime 调用时运行。

## 后果

- 跨世界转场有一个统一位置协调所有权。
- 帧顺序、暂停行为和质量采样获得局部性。
- 现有世界必须经过 Adapter 改造，不能原样嵌入。
- 世界特有渲染管线可使用共享 renderer，但不能调整尺寸、替换、启动循环或销毁它。

## 执行记录

2026-08-13，Archipelago 已从 iframe Legacy Adapter 迁为原生 World Module：

- 场景使用 Runtime 提供的共享 renderer，并通过 `RenderView.render` 接入后处理；
- 主模拟和小地图刷新使用 Runtime FramePort，不再启动浏览器 RAF；
- Vue 只负责 HUD，外链、Portal 与预览动作由 World Module 注入；
- 船型卡片和移动端加速图标使用共享 renderer 的一次性离屏快照；
- Session 销毁统一卸载 Vue、注销帧任务与生命周期回调，并释放 World 资源。
