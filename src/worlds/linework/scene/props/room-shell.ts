// 线稿房间壳资产负责地面、墙面和基础透视线。
// 它不注册展品或控制状态，只提供世界的静态空间骨架。
import {
  createLineworkFloorGuideLines,
  createLineworkRoomEdge,
  createLineworkRoomPlane,
  createLineworkWallGuideLines,
} from "./elements/wall-elements";
import { type LineworkPropKit } from "./linework-prop-kit";

export function createLineworkRoomShell(kit: LineworkPropKit): void {
  createLineworkRoomPlane(kit, [12, 0.22, 9], [0, -0.12, 0]);
  createLineworkRoomPlane(kit, [12, 6.1, 0.16], [0, 3, -4.5]);
  createLineworkRoomPlane(kit, [0.16, 6.1, 9], [-6, 3, 0]);
  createLineworkRoomEdge(kit, [12.2, 0.18, 0.18], [0, 6.02, -4.4]);
  createLineworkRoomEdge(kit, [0.18, 0.18, 9], [-5.9, 6.02, 0]);
  createLineworkFloorGuideLines(kit);
  createLineworkWallGuideLines(kit);
}
