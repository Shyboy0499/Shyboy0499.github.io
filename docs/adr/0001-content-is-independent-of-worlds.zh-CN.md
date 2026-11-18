# ADR-0001：个人资料内容独立于世界

[English](0001-content-is-independent-of-worlds.md)

- 状态：已接受
- 日期：2026-08-02

## 背景

同一个项目可以表现为岛屿、空间站、房间或其他视觉形态。当前网站在 HTML、Three.js 对象和按数组下标排列的相机路径之间重复表达同一层含义。

## 决策

创建一个经过校验的 Content Kernel，承载 Portfolio 的语义。世界通过稳定 ID 和 World Binding 引用 Portfolio Entry。坐标、材质、场景顺序、相机路径和交互角色仍属于各自拥有它们的世界。

## 后果

- Portfolio 变更具有局部性：改一次，到处反映。
- 世界可以改变视觉呈现，而不改动语义内容。
- World Binding 需要构建期引用完整性校验。
- 世界不能把自己的场景数据当作 Portfolio 真相来源。

