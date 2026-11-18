// 线稿门与墙钟资产负责 Portal 门体和时间刻度表现。
// 门开合与时钟刷新由 LineworkRoom 的状态循环驱动。
import * as THREE from "three";
import {
  createLineworkClockFace,
  createLineworkClockHand,
  createLineworkClockPin,
  createLineworkClockTicks,
  createLineworkDoorInset,
  createLineworkDoorKnob,
  createLineworkDoorPanel,
} from "./elements/door-clock-elements";
import { GRAPHITE, type LineworkPropKit } from "./linework-prop-kit";

export interface LineworkDoorClockParts {
  readonly doorPivot: THREE.Group;
  readonly clockHourHand: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  readonly clockMinuteHand: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  readonly clockSecondHand: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

export function createLineworkDoorAndClock(kit: LineworkPropKit): LineworkDoorClockParts {
  const doorPivot = new THREE.Group();
  const door = new THREE.Group();
  doorPivot.position.set(-0.65, 0, -4.36);
  door.position.x = 0.75;
  doorPivot.add(door);
  kit.scene.add(doorPivot);
  createLineworkDoorPanel(kit, door);
  createLineworkDoorInset(kit, door, 2.92);
  createLineworkDoorInset(kit, door, 1.1);
  createLineworkDoorKnob(kit, door);
  kit.addHitTarget(door, "door", [1.55, 4.1, 0.42], [0, 2.02, 0.1], "control");

  const clock = new THREE.Group();
  clock.position.set(2.3, 4.42, -4.3);
  kit.scene.add(clock);
  createLineworkClockFace(kit, clock);
  const handMaterial = new THREE.LineBasicMaterial({ color: GRAPHITE });
  createLineworkClockTicks(kit, clock);
  const clockHourHand = createLineworkClockHand(0.29, 0.09, handMaterial);
  const clockMinuteHand = createLineworkClockHand(0.42, 0.1, handMaterial);
  const clockSecondHand = createLineworkClockHand(
    0.48,
    0.11,
    new THREE.LineBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.58 }),
    0.08,
  );
  clock.add(clockHourHand, clockMinuteHand, clockSecondHand);
  createLineworkClockPin(kit, clock);
  return { doorPivot, clockHourHand, clockMinuteHand, clockSecondHand };
}
