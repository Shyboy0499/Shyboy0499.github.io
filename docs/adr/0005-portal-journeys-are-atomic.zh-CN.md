# ADR-0005：Portal Journey 是原子事务

[English](0005-portal-journeys-are-atomic.md)

- 状态：已接受
- 日期：2026-08-02

## 背景

一个 Portal Journey 可能短暂同时持有来源世界、目标世界、临时 render target、输入路由、URL 状态和异步资源工作。未完成的转场绝不能把访客留在空白页面，或留下错误地址。

## 决策

Portal Director 将每个 Portal Journey 作为带导航 generation 与 AbortSignal 的事务处理。在目标世界安装、更新并渲染出一帧可接受画面，且转场遮罩足够覆盖来源世界之前，来源始终是活跃世界。URL 状态、输入焦点与活跃世界所有权在同一时刻提交。提交前，任意失败或更新的导航请求都会回滚到来源世界。

## 后果

- 失败的 Portal 目标不会损坏当前体验。
- 被取消旅程的延迟 Promise 无法附着资源。
- 两个昂贵世界只会在受控的转场窗口中同时存在。
- 提交后来源清理失败会被报告，但不能阻止目标世界继续。
- 契约测试必须覆盖回滚、取消和过期 generation 结果。

