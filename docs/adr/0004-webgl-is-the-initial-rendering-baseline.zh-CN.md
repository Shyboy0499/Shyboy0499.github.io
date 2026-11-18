# ADR-0004：WebGL 是初始渲染基线

[English](0004-webgl-is-the-initial-rendering-baseline.md)

- 状态：已接受
- 日期：2026-08-02

## 背景

Archipelago 使用自定义 GLSL 和 WebGL 后处理管线。若立即采用 WebGPU 和 TSL，会把 renderer 迁移与生命周期、内容、性能和 Portal 工作同时混在一起。

## 决策

第一个多世界 Runtime 使用固定版本的 Three.js 和 `WebGLRenderer`。将 WebGPU 视为未来某个世界的实验，而不是架构的前置要求。

## 后果

- 两个现有世界都可以渐进迁移。
- Portal 工作可以从稳定的共用 renderer 开始。
- WebGPU 专用 Compute 特效被延后。
- 在存在有用语义类型的地方，World 接口避免使用 WebGL 特定类型，为将来的 renderer 决策保留空间。

