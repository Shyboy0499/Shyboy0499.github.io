'use client';

import { useEffect, useRef } from 'react';
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, PointLight,
  MeshBuilder, Vector3, Color3, Color4, StandardMaterial, 
  ParticleSystem, Texture, Mesh,
} from 'babylonjs';

export default function BabylonScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Engine(canvasRef.current, true, { preserveDrawingBuffer: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.02, 0.02, 0.03, 1);

    const camera = new ArcRotateCamera('camera', -Math.PI / 2.5, Math.PI / 3.5, 8, Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 15;
    camera.wheelPrecision = 40;

    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.4;
    hemiLight.diffuse = new Color3(0.93, 0.76, 0.80);

    const pointLight = new PointLight('point', new Vector3(3, 3, 3), scene);
    pointLight.intensity = 0.6;
    pointLight.diffuse = new Color3(0.93, 0.76, 0.80);

    // Complex central geometry — icosphere with wireframe overlay
    const ico = MeshBuilder.CreateIcoSphere('ico', { radius: 1.2, subdivisions: 3 }, scene);
    ico.position.y = 0.3;

    const icoMat = new StandardMaterial('icoMat', scene);
    icoMat.diffuseColor = new Color3(0.12, 0.10, 0.12);
    icoMat.specularColor = new Color3(0.93, 0.76, 0.80);
    icoMat.emissiveColor = new Color3(0.93, 0.76, 0.80).scale(0.08);
    icoMat.alpha = 0.9;
    ico.material = icoMat;

    // Wireframe sphere overlay
    const wireframe = MeshBuilder.CreateSphere('wire', { diameter: 2.5, segments: 24 }, scene);
    wireframe.position.y = 0.3;

    const wireMat = new StandardMaterial('wireMat', scene);
    wireMat.diffuseColor = new Color3(0, 0, 0);
    wireMat.emissiveColor = new Color3(0.93, 0.76, 0.80);
    wireMat.wireframe = true;
    wireMat.alpha = 0.25;
    wireframe.material = wireMat;

    // Orbiting rings
    const rings: Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = MeshBuilder.CreateTorus('ring' + i, { diameter: 2.8 + i * 0.8, thickness: 0.03 }, scene);
      ring.position.y = 0.3;
      ring.rotation.x = Math.PI / 3 + i * 0.4;
      ring.rotation.z = i * 0.5;

      const ringMat = new StandardMaterial('ringMat' + i, scene);
      ringMat.diffuseColor = new Color3(0.93, 0.76, 0.80);
      ringMat.emissiveColor = new Color3(0.93, 0.76, 0.80).scale(0.15 - i * 0.03);
      ringMat.specularColor = Color3.Black();
      ringMat.alpha = 0.5 - i * 0.1;
      ring.material = ringMat;
      rings.push(ring);
    }

    // Orbiting small spheres
    const orbs: Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const orb = MeshBuilder.CreateSphere('orb' + i, { diameter: 0.12, segments: 8 }, scene);
      const angle = (i / 8) * Math.PI * 2;
      orb.position = new Vector3(Math.cos(angle) * 2, 0.3, Math.sin(angle) * 2);

      const orbMat = new StandardMaterial('orbMat' + i, scene);
      orbMat.diffuseColor = new Color3(0.93, 0.76, 0.80);
      orbMat.emissiveColor = new Color3(0.93, 0.76, 0.80).scale(0.3);
      orb.material = orbMat;
      orbs.push(orb);
    }

    // Particle system
    const particleSystem = new ParticleSystem('particles', 500, scene);
    particleSystem.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4T2NkYPj/n4EBCxg1YNQAPg0wMTHRAQDVwgP/3hKj5QAAAABJRU5ErkJggg==', scene);
    particleSystem.emitter = new Vector3(0, 0.3, 0);
    particleSystem.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
    particleSystem.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
    particleSystem.color1 = new Color4(0.93, 0.76, 0.80, 1);
    particleSystem.color2 = new Color4(0.72, 0.60, 0.63, 1);
    particleSystem.minSize = 0.02;
    particleSystem.maxSize = 0.08;
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1.5;
    particleSystem.emitRate = 80;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    particleSystem.start();

    // Ground grid
    const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10, subdivisions: 20 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.04, 0.04, 0.04);
    groundMat.specularColor = Color3.Black();
    groundMat.wireframe = true;
    groundMat.alpha = 0.3;
    ground.material = groundMat;
    ground.position.y = -2;

    engine.runRenderLoop(() => {
      const time = performance.now() * 0.001;

      ico.rotation.y += 0.003;
      ico.rotation.x += 0.001;
      wireframe.rotation.y += 0.002;
      wireframe.rotation.x -= 0.001;

      rings.forEach((ring, i) => {
        ring.rotation.y += 0.005 * (i + 1);
        ring.rotation.z += 0.003 * (i + 1);
      });

      orbs.forEach((orb, i) => {
        const angle = time * 0.8 + (i / 8) * Math.PI * 2;
        const radius = 2.2 + Math.sin(time * 0.5 + i) * 0.3;
        orb.position.x = Math.cos(angle) * radius;
        orb.position.z = Math.sin(angle) * radius;
        orb.position.y = 0.3 + Math.sin(time * 2 + i) * 0.4;
      });

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
