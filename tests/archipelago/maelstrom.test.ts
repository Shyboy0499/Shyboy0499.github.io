// 大漩涡契约测试：锁定时段色板同步、船体捕获和 Journey 回滚行为。
// 测试不创建 WebGLRenderer，避免把 World Runtime 所有权带入视觉对象单测。
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ArchipelagoMaelstrom,
  type MaelstromShip,
} from "../../src/worlds/archipelago/scene/landmarks/archipelago-maelstrom";
import {
  DAY,
  NIGHT,
} from "../../src/worlds/archipelago/scene/env/themes";
import { SHIP_SCALE } from "../../src/worlds/archipelago/scene/core/config";

beforeEach(() => {
  const gradient = { addColorStop: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => vi.restoreAllMocks());

function createShip(): MaelstromShip {
  const group = new THREE.Group();
  group.scale.setScalar(SHIP_SCALE);
  return {
    pos: new THREE.Vector3(-220, 0, 220),
    heading: -Math.PI / 2,
    speed: 24,
    group,
  };
}

describe("ArchipelagoMaelstrom", () => {
  it("tracks the active sea palette across day and night", () => {
    const maelstrom = new ArchipelagoMaelstrom();
    const water = maelstrom.group.children.find(
      (child) =>
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.ShaderMaterial,
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

    maelstrom.update(0, DAY, 0);
    expect(water.material.uniforms.uSeaA.value.getHex()).toBe(
      DAY.seaA.getHex(),
    );

    maelstrom.update(0, NIGHT, 1);
    expect(water.material.uniforms.uSeaA.value.getHex()).toBe(
      NIGHT.seaA.getHex(),
    );
    expect(water.material.uniforms.uNightK.value).toBe(1);
  });

  it("slows for two seconds, spirals inward, and restores on rollback", () => {
    const maelstrom = new ArchipelagoMaelstrom();
    maelstrom.group.position.set(-270, 0.9, 220);
    maelstrom.group.scale.setScalar(3.6);
    const ship = createShip();
    const origin = ship.pos.clone();
    const dt = 1 / 60;

    const started = maelstrom.approach(ship, 0, dt, true);
    expect(started.startedCapture).toBe(true);
    expect(started.captureActive).toBe(true);

    let result = started;
    for (let frame = 1; frame <= 114; frame += 1) {
      result = maelstrom.approach(ship, frame * dt, dt, true);
    }
    expect(result.pullK).toBe(0);
    expect(result.speedCap).toBeLessThan(1);

    const distanceBeforePull = ship.pos.distanceTo(maelstrom.group.position);
    for (let frame = 115; frame <= 240; frame += 1) {
      const time = frame * dt;
      result = maelstrom.approach(ship, time, dt, true);
      ship.group.position.y = 0;
      maelstrom.update(time, DAY, 0, ship);
    }
    expect(result.pullK).toBeGreaterThan(0);
    expect(ship.pos.distanceTo(maelstrom.group.position)).toBeLessThan(
      distanceBeforePull,
    );
    expect(ship.group.scale.x).toBeLessThan(SHIP_SCALE);
    expect(ship.group.position.y).toBeGreaterThan(-1.2);

    for (let frame = 241; frame <= 306; frame += 1) {
      const time = frame * dt;
      result = maelstrom.approach(ship, time, dt, true);
      ship.group.position.y = 0;
      maelstrom.update(time, DAY, 0, ship);
    }
    expect(result.entered).toBe(true);

    maelstrom.resetCapture(ship);
    expect(ship.pos.toArray()).toEqual(origin.toArray());
    expect(ship.group.scale.x).toBe(SHIP_SCALE);
    expect(maelstrom.isCapturing).toBe(false);
  });
});
