// 移动端加速图标提供纯场景模型，并可用 Runtime 共享 renderer 生成静态快照。
// 模型不拥有 renderer；调用方负责选择 World 快照或资产墙预览的渲染生命周期。
import * as THREE from "three";

export interface MobileBoostModel {
  group: THREE.Group;
  setActive(active: boolean): void;
  dispose(): void;
}

export function createMobileBoostModel(): MobileBoostModel {
  const group = new THREE.Group();
  const cream = new THREE.MeshLambertMaterial({
    color: "#fff1ce",
    emissive: "#c9a66c",
    emissiveIntensity: 0.08,
    flatShading: true,
  });
  const gold = new THREE.MeshLambertMaterial({
    color: "#d39a45",
    emissive: "#8d5623",
    emissiveIntensity: 0.12,
    flatShading: true,
  });
  const wood = new THREE.MeshLambertMaterial({
    color: "#8b5a32",
    flatShading: true,
  });
  const coral = new THREE.MeshLambertMaterial({
    color: "#ef7956",
    emissive: "#9b3423",
    emissiveIntensity: 0.12,
    flatShading: true,
  });
  const windMaterial = new THREE.MeshBasicMaterial({
    color: "#fff6df",
    transparent: true,
    opacity: 0.68,
  });

  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.78, 0.16, 12),
    cream,
  );
  badge.rotation.x = Math.PI / 2;
  badge.position.z = -0.16;
  group.add(badge);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 6, 20), gold);
  rim.position.z = -0.03;
  group.add(rim);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 1.3, 6),
    wood,
  );
  mast.position.set(-0.24, 0.03, 0.04);
  group.add(mast);

  const sailShape = new THREE.Shape();
  sailShape.moveTo(-0.18, -0.48);
  sailShape.lineTo(-0.18, 0.62);
  sailShape.quadraticCurveTo(0.55, 0.47, 0.64, -0.26);
  sailShape.quadraticCurveTo(0.2, -0.48, -0.18, -0.48);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape, 5), cream);
  sail.position.set(-0.03, 0.04, 0.08);
  group.add(sail);

  const stripeShape = new THREE.Shape();
  stripeShape.moveTo(-0.14, -0.08);
  stripeShape.lineTo(-0.14, 0.08);
  stripeShape.quadraticCurveTo(0.42, 0.02, 0.55, -0.18);
  stripeShape.lineTo(0.52, -0.29);
  stripeShape.quadraticCurveTo(0.2, -0.13, -0.14, -0.08);
  const stripe = new THREE.Mesh(new THREE.ShapeGeometry(stripeShape, 4), coral);
  stripe.position.set(-0.03, 0.04, 0.095);
  group.add(stripe);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.78, 6),
    wood,
  );
  boom.rotation.z = Math.PI / 2;
  boom.position.set(0.08, -0.48, 0.12);
  group.add(boom);

  const windSpecs = [
    [0.47, 0.43, 0.84, 0.27],
    [0.5, 0.08, 0.92, -0.04],
    [0.38, -0.3, 0.76, -0.43],
  ] as const;
  for (const [x0, y0, x1, y1] of windSpecs) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x0, y0, 0.12),
      new THREE.Vector3(x1 - 0.16, y0 + 0.08, 0.15),
      new THREE.Vector3(x1, y1, 0.12),
    );
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 10, 0.018, 4, false),
        windMaterial,
      ),
    );
  }

  const setActive = (active: boolean): void => {
    group.rotation.set(-0.08, -0.14, active ? 0.025 : -0.08);
    group.scale.setScalar(active ? 1.08 : 1);
    sail.scale.x = active ? 1.12 : 1;
    windMaterial.opacity = active ? 1 : 0.68;
  };
  setActive(false);

  return {
    group,
    setActive,
    dispose() {
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        const materials = Array.isArray(material)
          ? material
          : material
            ? [material]
            : [];
        materials.forEach((ownedMaterial) => ownedMaterial.dispose());
      });
    },
  };
}

export function renderMobileBoostPreview(
  renderer: THREE.WebGLRenderer,
  canvas: HTMLCanvasElement,
  active: boolean,
): () => void {
  const size = 96;
  const target = new THREE.WebGLRenderTarget(size, size, {
    depthBuffer: true,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -1.15,
    1.15,
    1.15,
    -1.15,
    0.1,
    10,
  );
  camera.position.set(0, 0, 4);
  scene.add(new THREE.HemisphereLight(0xfff3d6, 0x315d68, 2.2));
  const key = new THREE.DirectionalLight(0xffe0a8, 2.8);
  key.position.set(-2, 3, 4);
  scene.add(key);

  const model = createMobileBoostModel();
  model.setActive(active);
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
    const pixels = new Uint8Array(size * size * 4);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    const image = new ImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      const source = (size - 1 - y) * size * 4;
      image.data.set(
        pixels.subarray(source, source + size * 4),
        y * size * 4,
      );
    }
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d")?.putImageData(image, 0, 0);
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousClearColor, previousClearAlpha);
    renderer.autoClear = previousAutoClear;
    model.dispose();
    scene.clear();
    target.dispose();
  }
  return () => {
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };
}
