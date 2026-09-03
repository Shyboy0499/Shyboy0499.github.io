// 体素下界 Portal 的独立视觉资产；当前未接入 Archipelago World，仅供资产预览和后续路线使用。
// 它不负责目标 World、触发条件或 Portal Journey。
import * as THREE from "three";
import { glowTexture } from "../core/sprites";

function pixelTexture(
  kind: "obsidian" | "grass" | "dirt",
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const base =
    kind === "obsidian" ? "#0b0713" : kind === "grass" ? "#4f8d3a" : "#69482f";
  const accent =
    kind === "obsidian" ? "#2b1744" : kind === "grass" ? "#7aad45" : "#8b6240";
  const shadow =
    kind === "obsidian" ? "#050308" : kind === "grass" ? "#315c29" : "#432f26";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 54; i++) {
    const x = (i * 17 + kind.length * 7) % 32;
    const y = (i * 11 + kind.length * 13) % 32;
    ctx.fillStyle = i % 4 === 0 ? shadow : accent;
    ctx.fillRect(x, y, 1 + (i % 3), 1 + ((i * 2) % 3));
  }
  if (kind === "obsidian") {
    ctx.fillStyle = "#49266e";
    for (let i = 0; i < 7; i++)
      ctx.fillRect((i * 9 + 3) % 29, (i * 13 + 4) % 29, 3, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

interface PortalParticle {
  mesh: THREE.Mesh;
  baseX: number;
  speed: number;
  phase: number;
}

export class VoxelNetherPortal {
  group = new THREE.Group();
  private portalMaterial: THREE.ShaderMaterial;
  private particles: PortalParticle[] = [];
  private frameBlocks: THREE.Mesh[] = [];
  private glowSprites: THREE.Sprite[] = [];

  constructor() {
    const obsidianTexture = pixelTexture("obsidian");
    const obsidian = new THREE.MeshLambertMaterial({
      map: obsidianTexture,
      color: "#76648c",
      emissive: "#160925",
      emissiveIntensity: 0.22,
    });
    const obsidianEdge = new THREE.MeshBasicMaterial({
      color: "#71419a",
      transparent: true,
      opacity: 0.42,
    });
    const blockSize = 0.72;
    const columnX = 1.8;
    const bottomY = -2.36;
    const topY = 2.68;

    const addFrameBlock = (x: number, y: number, index: number) => {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(blockSize * 0.94, blockSize * 0.94, 0.82),
        obsidian,
      );
      block.position.set(x, y, 0);
      this.frameBlocks.push(block);
      this.group.add(block);
      if (index % 3 === 0) {
        const glint = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.035, 0.012),
          obsidianEdge,
        );
        glint.position.set(x + (index % 2 ? -0.12 : 0.1), y + 0.08, 0.417);
        glint.rotation.z = index % 2 ? -0.22 : 0.16;
        this.group.add(glint);
      }
    };

    for (let row = 0; row < 8; row++) {
      addFrameBlock(-columnX, bottomY + row * blockSize, row);
      addFrameBlock(columnX, bottomY + row * blockSize, row + 8);
    }
    for (let column = 0; column < 4; column++) {
      const x = -1.08 + column * blockSize;
      addFrameBlock(x, bottomY, column + 16);
      addFrameBlock(x, topY, column + 20);
    }

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(2.86, 4.3),
      new THREE.MeshBasicMaterial({ color: "#13051f" }),
    );
    back.position.set(0, 0.16, -0.05);
    this.group.add(back);

    this.portalMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        void main() {
          vec2 pixel = floor(vUv * vec2(42.0, 64.0));
          vec2 uv = pixel / vec2(42.0, 64.0);
          float bandA = sin(uv.y * 29.0 + uTime * 1.9 + sin(uv.x * 8.0) * 1.5);
          float bandB = sin(uv.y * 13.0 - uTime * 1.15 + uv.x * 17.0);
          float grain = hash(pixel + floor(uTime * 5.0));
          float spark = step(.965, grain) * (.5 + .5 * sin(uTime * 7.0));
          vec3 deep = vec3(.075, .015, .14);
          vec3 purple = vec3(.43, .08, .68);
          vec3 pink = vec3(.82, .23, .96);
          vec3 color = mix(deep, purple, bandA * .22 + .46);
          color = mix(color, pink, max(0.0, bandB) * .18 + spark * .65);
          float sideShade = .72 + sin(uv.x * 18.0 + uTime * .55) * .08;
          gl_FragColor = vec4(color * sideShade, .88);
        }
      `,
    });
    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(2.84, 4.28, 1, 1),
      this.portalMaterial,
    );
    portal.position.set(0, 0.16, 0.43);
    this.group.add(portal);

    const glowTextureMap = glowTexture("#ba5cff");
    for (let i = 0; i < 3; i++) {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTextureMap,
          color: i === 1 ? "#e45eff" : "#793cff",
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      glow.position.set((i - 1) * 0.65, 0.16 + (i - 1) * 0.8, 0.55);
      glow.scale.set(3.6, 3.8, 1);
      this.glowSprites.push(glow);
      this.group.add(glow);
    }

    const particleMaterials = [
      new THREE.MeshBasicMaterial({
        color: "#d77aff",
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#844cff",
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      new THREE.MeshBasicMaterial({
        color: "#ff94f4",
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ];
    for (let i = 0; i < 34; i++) {
      const size = 0.045 + (i % 4) * 0.018;
      const particle = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        particleMaterials[i % particleMaterials.length],
      );
      const baseX = -2.25 + ((i * 37) % 100) / 22.5;
      const phase = (i * 1.73) % 6.28;
      particle.position.set(
        baseX,
        -2.0 + ((i * 23) % 100) / 18,
        0.56 + (i % 5) * 0.08,
      );
      particle.rotation.z = phase;
      this.particles.push({
        mesh: particle,
        baseX,
        speed: 0.16 + (i % 6) * 0.035,
        phase,
      });
      this.group.add(particle);
    }

    const grassTop = new THREE.MeshLambertMaterial({
      map: pixelTexture("grass"),
      color: "#8cc66b",
    });
    const dirtSide = new THREE.MeshLambertMaterial({
      map: pixelTexture("dirt"),
      color: "#b18b69",
    });
    const groundMaterials = [
      dirtSide,
      dirtSide,
      grassTop,
      dirtSide,
      dirtSide,
      dirtSide,
    ];
    for (let x = -3; x <= 3; x++) {
      for (let z = -1; z <= 1; z++) {
        if (Math.abs(x) === 3 && z === -1) continue;
        const ground = new THREE.Mesh(
          new THREE.BoxGeometry(0.78, 0.62, 0.78),
          groundMaterials,
        );
        ground.position.set(
          x * 0.78,
          -3.08 - ((x + z + 8) % 3) * 0.035,
          z * 0.78,
        );
        this.group.add(ground);
      }
    }

    const purpleLight = new THREE.PointLight("#9f48ff", 4.2, 8, 1.6);
    purpleLight.position.set(0, 0.15, 2.2);
    this.group.add(purpleLight);

    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  update(time: number): void {
    this.portalMaterial.uniforms.uTime.value = time;
    this.particles.forEach((particle, index) => {
      const range = 5.15;
      particle.mesh.position.y =
        -2.15 + ((time * particle.speed + particle.phase) % range);
      particle.mesh.position.x =
        particle.baseX + Math.sin(time * 0.7 + particle.phase) * 0.12;
      const pulse = 0.72 + Math.sin(time * 3.2 + index) * 0.28;
      particle.mesh.scale.setScalar(pulse);
      particle.mesh.rotation.z =
        time * (index % 2 ? -0.7 : 0.55) + particle.phase;
    });
    this.glowSprites.forEach((glow, index) => {
      const material = glow.material as THREE.SpriteMaterial;
      material.opacity = 0.1 + Math.sin(time * 1.45 + index * 1.8) * 0.035;
    });
    const frameMaterial = this.frameBlocks[0]?.material as
      THREE.MeshLambertMaterial | undefined;
    if (frameMaterial)
      frameMaterial.emissiveIntensity = 0.18 + Math.sin(time * 1.2) * 0.07;
  }
}
