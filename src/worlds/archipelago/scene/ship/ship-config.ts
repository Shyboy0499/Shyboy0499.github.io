export const SHIP_MOTION = {
  cruiseSpeed: 80,
  sprintSpeed: 100,
  // 稳态速度近似等于 accel / drag。靠岸减速由 world-sailing 的 speedCap 单独控制，
  // 所以这里把开阔海面的动力提到足够接近 80 / 100 的上限。
  accelCruise: 44,
  accelSprint: 55,
  drag: 0.55,
  reverseSpeed: -4,
} as const;
