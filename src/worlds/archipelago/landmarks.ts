// 海岛世界特殊地标配置：集中记录非作品岛、非传送门的固定世界坐标。
// 这里不保存运行时解锁状态，状态仍由 store 和对应场景层负责。

export const BABEL_TOWER_LANDMARK = {
  id: "babel-tower",
  name: "巴别塔",
  position: [78, 236] as const,
  scale: 2.7,
  radius: 34,
};
