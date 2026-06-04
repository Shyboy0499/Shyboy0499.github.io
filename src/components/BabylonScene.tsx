'use client';

import { useEffect, useRef } from 'react';
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight,
  MeshBuilder, Vector3, Color3, StandardMaterial,
} from 'babylonjs';

export default function BabylonScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Engine(canvasRef.current, true, { preserveDrawingBuffer: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color3(0.02, 0.02, 0.02).toColor4();

    const camera = new ArcRotateCamera('camera', -Math.PI / 3, Math.PI / 3, 6, Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 10;

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    light.diffuse = new Color3(0.93, 0.76, 0.80);

    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1.5, segments: 32 }, scene);
    sphere.position.y = 0.5;

    const mat = new StandardMaterial('sphereMat', scene);
    mat.diffuseColor = new Color3(0.15, 0.12, 0.13);
    mat.specularColor = new Color3(0.93, 0.76, 0.80);
    mat.emissiveColor = new Color3(0.93, 0.76, 0.80).scale(0.1);
    sphere.material = mat;

    const ground = MeshBuilder.CreateGround('ground', { width: 8, height: 8 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.05, 0.05, 0.05);
    groundMat.specularColor = Color3.Black();
    ground.material = groundMat;

    engine.runRenderLoop(() => {
      sphere.rotation.y += 0.005;
      scene.render();
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '400px' }} />;
}
