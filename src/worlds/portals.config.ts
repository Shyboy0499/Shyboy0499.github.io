// Portal 配置集中声明跨世界路线的 id、目标和 UI 文案。
// WorldModule 仍负责何时注册和如何计算 proximity。
import { WORLD_NAMING } from "./worlds.config";
import type { PortalDescriptor } from "../runtime/contracts";

export const WORLD_PORTALS = {
  cosmicToArchipelago: {
    id: "cosmic-tidal-gate",
    targetWorldId: WORLD_NAMING.archipelago.id,
    eyebrow: "WORLD GATE / TIDAL SIGNAL",
    label: "ENTER THE TIDAL GATE",
    targetLabel: "ARCHIPELAGO",
    transitionStyle: "tidal",
    transitionStatus: {
      preparing: "GATHERING THE TIDE",
      crossing: "RIDING THE CURRENT",
      arriving: "SHORELINE FOUND",
    },
  },
  archipelagoToJianghu: {
    id: "archipelago-jianghu-gate",
    targetWorldId: WORLD_NAMING.jianghu.id,
    eyebrow: "WORLD GATE",
    label: "ENTER JIANGHU",
    targetLabel: "JIANGHU",
    transitionStyle: "ink",
    transitionStatus: {
      preparing: "WETTING THE BRUSH",
      crossing: "CROSSING THE INK",
      arriving: "SCROLL UNFOLDED",
    },
  },
  archipelagoToCosmic: {
    id: "archipelago-cosmic-gate",
    targetWorldId: WORLD_NAMING.cosmic.id,
    eyebrow: "WORLD GATE / ARCANE CURRENT",
    label: "RETURN TO COSMIC",
    targetLabel: "COSMIC",
    transitionStyle: "starlight",
    transitionStatus: {
      preparing: "ALIGNING ORBIT",
      crossing: "ENTERING LIGHTSPEED",
      arriving: "ORBIT STABLE",
    },
  },
  archipelagoToLinework: {
    id: "archipelago-linework-gate",
    targetWorldId: WORLD_NAMING.linework.id,
    eyebrow: "WORLD GATE / INKLINE CURRENT",
    label: "ENTER THE LINEWORK MAELSTROM",
    targetLabel: "LINEWORK",
    transitionStyle: "sketch",
    transitionStatus: {
      preparing: "CUTTING THE PAPER SEA",
      crossing: "FOLLOWING THE INKLINE",
      arriving: "WHITE ROOM FOUND",
    },
  },
  jianghuToLinework: {
    id: "jianghu-linework-gate",
    targetWorldId: WORLD_NAMING.linework.id,
    eyebrow: "WORLD GATE / 推门见白",
    label: "ENTER THE LINEWORK STUDIO",
    targetLabel: "LINEWORK",
    transitionStyle: "paper",
    transitionStatus: {
      preparing: "TURNING THE PAGE",
      crossing: "BETWEEN THE LINES",
      arriving: "PAGE READY",
    },
  },
  lineworkToStudio: {
    id: "linework-studio-gate",
    targetWorldId: WORLD_NAMING.studio.id,
    eyebrow: "WORLD GATE / FROM SKETCH TO SPACE",
    label: "ENTER THE STUDIO",
    targetLabel: "STUDIO",
    transitionStyle: "blueprint",
    transitionStatus: {
      preparing: "READING THE DRAWING",
      crossing: "BUILDING THE ROOM",
      arriving: "STUDIO ASSEMBLED",
    },
  },
  studioToCosmic: {
    id: "studio-cosmic-gate",
    targetWorldId: WORLD_NAMING.cosmic.id,
    eyebrow: "WORLD GATE / ORBITAL DOOR",
    label: "OPEN THE COSMIC DOOR",
    targetLabel: "COSMIC",
    transitionStyle: "aperture",
    transitionStatus: {
      preparing: "OPENING THE APERTURE",
      crossing: "CHASING STARLIGHT",
      arriving: "ORBIT ACQUIRED",
    },
  },
  studioToLinework: {
    id: "studio-linework-draft-door",
    targetWorldId: WORLD_NAMING.linework.id,
    eyebrow: "WORLD GATE / RETURN TO DRAWING",
    label: "OPEN THE DRAFT DOOR",
    targetLabel: "LINEWORK",
    transitionStyle: "draft",
    transitionStatus: {
      preparing: "LIFTING THE TRACING PAPER",
      crossing: "FOLLOWING THE PENCIL LINE",
      arriving: "DRAWING RESTORED",
    },
  },
  studioToArchipelago: {
    id: "studio-archipelago-world-compass",
    targetWorldId: WORLD_NAMING.archipelago.id,
    eyebrow: "WORLD GATE / TIDAL COMPASS",
    label: "TURN THE WORLD COMPASS",
    targetLabel: "ARCHIPELAGO",
    transitionStyle: "compass",
    transitionStatus: {
      preparing: "CALIBRATING THE CURRENT",
      crossing: "FOLLOWING THE NEEDLE",
      arriving: "ISLANDS IN SIGHT",
    },
  },
} as const satisfies Record<string, PortalDescriptor>;
