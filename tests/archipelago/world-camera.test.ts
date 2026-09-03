// 群岛相机回归测试：锁定震动只影响当帧渲染机位，不污染后续跟随基准。
// 测试不创建 renderer，只验证 OrthographicCamera 的确定性变换。
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { WorldCameraRig } from "../../src/worlds/archipelago/scene/world/world-camera";

describe("WorldCameraRig", () => {
  it("applies transient shake without accumulating camera drift", () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1600);
    const rig = new WorldCameraRig(camera);
    const ship = {
      pos: new THREE.Vector3(10, 0, 20),
      forward: new THREE.Vector3(0, 0, -1),
    };
    rig.snapToShip(ship.pos);
    rig.update({
      dt: 1 / 60,
      snapMode: true,
      ship,
      getDockedIslandObject: () => undefined,
    });
    const baseline = camera.position.clone();

    rig.applyShake(1.25, 1);
    expect(camera.position.distanceTo(baseline)).toBeGreaterThan(0.05);

    rig.update({
      dt: 1 / 60,
      snapMode: true,
      ship,
      getDockedIslandObject: () => undefined,
    });
    expect(camera.position.toArray()).toEqual(baseline.toArray());
  });
});
