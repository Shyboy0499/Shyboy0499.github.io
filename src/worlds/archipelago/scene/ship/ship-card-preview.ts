// 船型卡片使用 Runtime 共享 renderer 生成一次性快照，不创建额外 WebGL context 或 RAF。
// 临时场景、render target 和模型资源在像素写回 2D canvas 后立即释放。
import * as THREE from "three";
import { Ship } from "./ship";
import { NoahsArk } from "./noahs-ark";
import type { ShipVariant } from "../../store";

interface PreviewModel {
  group: THREE.Group;
  dispose(): void;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    const materials = Array.isArray(material)
      ? material
      : material
        ? [material]
        : [];
    materials.forEach((ownedMaterial) => {
      for (const value of Object.values(ownedMaterial)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      ownedMaterial.dispose();
    });
  });
}

function createModel(variant: ShipVariant): PreviewModel {
  if (variant === "ark") {
    const ark = new NoahsArk();
    ark.group.scale.setScalar(0.56);
    ark.group.position.y = -0.8;
    ark.update(0.8);
    return {
      group: ark.group,
      dispose: () => disposeObject(ark.group),
    };
  }

  const ship = new Ship();
  ship.group.scale.setScalar(0.2);
  ship.group.rotation.y = Math.PI + 0.16;
  ship.group.position.y = -1;
  return {
    group: ship.group,
    dispose: () => {
      disposeObject(ship.group);
      disposeObject(ship.wake);
    },
  };
}

function copyRenderTarget(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  canvas: HTMLCanvasElement,
): void {
  const width = target.width;
  const height = target.height;
  const pixels = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  const image = new ImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const source = (height - 1 - y) * width * 4;
    image.data.set(pixels.subarray(source, source + width * 4), y * width * 4);
  }
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.putImageData(image, 0, 0);
}

export function renderShipCardPreview(
  renderer: THREE.WebGLRenderer,
  canvas: HTMLCanvasElement,
  variant: ShipVariant,
): () => void {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio, 1.5);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: true,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    32,
    width / Math.max(height, 1),
    0.1,
    100,
  );
  camera.position.set(0, 4.2, 13);
  camera.lookAt(0, 1.55, 0);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x263b55, 2.6));
  const key = new THREE.DirectionalLight(0xfff0d6, 3.4);
  key.position.set(4, 7, 6);
  scene.add(key);

  const model = createModel(variant);
  scene.add(model.group);
  const previousTarget = renderer.getRenderTarget();
  const previousAutoClear = renderer.autoClear;
  const previousClearColor = renderer.getClearColor(new THREE.Color());
  const previousClearAlpha = renderer.getClearAlpha();
  try {
    renderer.autoClear = true;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.render(scene, camera);
    copyRenderTarget(renderer, target, canvas);
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousClearColor, previousClearAlpha);
    renderer.autoClear = previousAutoClear;
    target.dispose();
    model.dispose();
    scene.clear();
  }
  return () => {
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };
}
