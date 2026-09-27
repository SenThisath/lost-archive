"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Story, WorldState, Photo } from "@/lib/types";
type Props = {
  state: WorldState;
  story: Story;
  onSelect: (id: string) => void;
  onReady: () => void;
};
export default function World({ state, story, onSelect, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null),
    stateRef = useRef(state),
    select = useRef(onSelect),
    ready = useRef(onReady),
    [error, setError] = useState(false);
  stateRef.current = state;
  select.current = onSelect;
  ready.current = onReady;
  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setError(true);
      ready.current();
      return;
    }
    const container = host.current;
    container.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive three-dimensional archive. Use the labelled buttons to explore, or select objects in the scene.",
    );
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#060c15");
    scene.fog = new THREE.FogExp2("#070e1a", 0.032);
    const camera = new THREE.PerspectiveCamera(
      49,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 2.4, 13);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.55,
      0.7,
      0.8,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const group = new THREE.Group();
    scene.add(group);
    const ambient = new THREE.HemisphereLight("#9abfe9", "#171019", 1.15);
    scene.add(ambient);
    const key = new THREE.PointLight("#668ed3", 70, 35, 2);
    key.position.set(0, 6, 4);
    scene.add(key);
    const warm = new THREE.PointLight("#f4b779", 0, 35, 2);
    warm.position.set(0, 4, 1);
    scene.add(warm);
    let interactive: THREE.Object3D[] = [];
    let floating: THREE.Object3D[] = [];
    let mirrorMat: THREE.MeshBasicMaterial | null = null;
    let videoTexture: THREE.VideoTexture | null = null;
    let videoSource: HTMLVideoElement | null = null;
    let flame: THREE.Object3D | null = null;
    const textureCache = new Map<string, THREE.Texture>();
    const materials = new Set<THREE.Material>();
    const geometries = new Set<THREE.BufferGeometry>();
    function material(color: string, metalness = 0.25, roughness = 0.6) {
      const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      materials.add(m);
      return m;
    }
    const stone = material("#172132", 0.6, 0.35),
      dark = material("#060c13", 0.25, 0.6),
      gold = material("#b39669", 0.7, 0.3);
    function glow(color: string, intensity = 1) {
      const m = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: intensity,
        roughness: 0.5,
      });
      materials.add(m);
      return m;
    }
    const blue = glow("#6ca2c7", 1.8),
      amber = glow("#e8b477", 2.3),
      dim = glow("#203a54", 0.5);
    function mesh(
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      parent: THREE.Object3D = group,
    ) {
      geometries.add(geo);
      const o = new THREE.Mesh(geo, mat);
      parent.add(o);
      return o;
    }
    function box(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: THREE.Material,
      parent: THREE.Object3D = group,
    ) {
      const o = mesh(new THREE.BoxGeometry(w, h, d), mat, parent);
      o.position.set(x, y, z);
      return o;
    }
    function ring(
      radius: number,
      y: number,
      color: THREE.Material,
      parent = group,
    ) {
      const o = mesh(
        new THREE.TorusGeometry(radius, 0.015, 8, 100),
        color,
        parent,
      );
      o.rotation.x = Math.PI / 2;
      o.position.y = y;
      return o;
    }
    function target(o: THREE.Object3D, id: string) {
      o.userData.action = id;
      interactive.push(o);
    }
    function float(o: THREE.Object3D) {
      o.userData.baseY = o.position.y;
      o.userData.phase = floating.length * 1.8;
      floating.push(o);
    }
    function labelTexture(text: string, sub = "") {
      const cacheKey = text + "|" + sub;
      if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 320;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 1024, 320);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ded9cf";
      ctx.font = "72px Georgia";
      ctx.fillText(text, 512, 150);
      ctx.fillStyle = "#9baabb";
      ctx.font = "24px monospace";
      ctx.fillText(sub.toUpperCase(), 512, 220);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(cacheKey, t);
      return t;
    }
    function textPlane(
      text: string,
      sub: string,
      x: number,
      y: number,
      z: number,
      w = 3.8,
    ) {
      const m = new THREE.MeshBasicMaterial({
        map: labelTexture(text, sub),
        transparent: true,
        depthWrite: false,
      });
      materials.add(m);
      const p = mesh(new THREE.PlaneGeometry(w, w * 0.3125), m);
      p.position.set(x, y, z);
      return p;
    }
    function photoTexture(photo: Photo) {
      if (textureCache.has(photo.id)) return textureCache.get(photo.id)!;
      const c = document.createElement("canvas");
      c.width = 600;
      c.height = 760;
      const ctx = c.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 600, 760);
      g.addColorStop(0, "#263e51");
      g.addColorStop(0.55, "#101d2a");
      g.addColorStop(1, "#58483d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 600, 760);
      ctx.strokeStyle = "#7b8c9860";
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 30, 540, 700);
      ctx.textAlign = "center";
      ctx.fillStyle = "#c9bd9e";
      ctx.font = "90px Georgia";
      ctx.fillText(photo.year, 300, 350);
      ctx.font = "18px monospace";
      ctx.fillText("UNFILED MEMORY", 300, 405);
      ctx.font = "24px Georgia";
      const words = photo.label.split(" ");
      let line = "",
        lines: string[] = [];
      for (const word of words) {
        if (ctx.measureText(line + word).width > 470) {
          lines.push(line);
          line = "";
        }
        line += word + " ";
      }
      lines.push(line);
      lines.forEach((l, i) => ctx.fillText(l.trim(), 300, 500 + i * 34));
      const t: THREE.Texture = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(photo.id, t);
      if (photo.src)
        new THREE.TextureLoader().load(
          photo.src,
          (loaded) => {
            loaded.colorSpace = THREE.SRGBColorSpace;
            const image = loaded.image as HTMLImageElement;
            const r = image.width / image.height;
            const desired = 600 / 760;
            if (r > desired) {
              loaded.repeat.x = desired / r;
              loaded.offset.x = (1 - loaded.repeat.x) / 2;
            } else {
              loaded.repeat.y = r / desired;
              loaded.offset.y = (1 - loaded.repeat.y) / 2;
            }
            t.image = loaded.image;
            t.repeat.copy(loaded.repeat);
            t.offset.copy(loaded.offset);
            t.needsUpdate = true;
            loaded.dispose();
          },
          undefined,
          () => {},
        );
      return t;
    }
    function frame(photo: Photo, x: number, y: number, z: number, id?: string) {
      const f = new THREE.Group();
      group.add(f);
      f.position.set(x, y, z);
      box(1.65, 2.15, 0.1, 0, 0, 0, gold, f);
      const m = new THREE.MeshBasicMaterial({
        map: photoTexture(photo),
        color: "#ffffff",
      });
      materials.add(m);
      box(1.53, 2.03, 0.025, 0, 0, 0.07, m, f);
      if (id) target(f, id);
      float(f);
      return f;
    }
    function portal(x: number, z: number, angle: number, index: number) {
      const p = new THREE.Group();
      group.add(p);
      p.position.set(x, 0, z);
      p.rotation.y = angle;
      const active = index <= stateRef.current.completed;
      const color =
        index < stateRef.current.completed ? amber : active ? blue : dim;
      box(2.42, 3.55, 0.3, 0, 1.78, -0.2, dark, p);
      box(0.13, 3.35, 0.3, -1.25, 1.7, 0, stone, p);
      box(0.13, 3.35, 0.3, 1.25, 1.7, 0, stone, p);
      const arch = mesh(
        new THREE.TorusGeometry(1.25, 0.075, 10, 56, Math.PI),
        stone,
        p,
      );
      arch.position.y = 3.35;
      const inner = mesh(
        new THREE.TorusGeometry(1.13, 0.014, 8, 56, Math.PI),
        color,
        p,
      );
      inner.position.set(0, 3.35, 0.18);
      box(0.022, 3.35, 0.02, -1.13, 1.675, 0.18, color, p);
      box(0.022, 3.35, 0.02, 1.13, 1.675, 0.18, color, p);
      box(2.5, 0.09, 1.15, 0, 0.07, 0.2, stone, p);
      box(2.28, 0.016, 0.025, 0, 0.13, 0.77, color, p);
      const orb = mesh(new THREE.IcosahedronGeometry(0.22, 0), color, p);
      orb.position.set(0, 2, 0.5);
      float(orb);
      const l = new THREE.PointLight(
        active ? "#7aabd9" : "#234161",
        active ? 9 : 1.5,
        5,
        2,
      );
      l.position.set(0, 2, 0.8);
      p.add(l);
      const tx = new THREE.MeshBasicMaterial({
        map: labelTexture(
          `0${index + 1}`,
          index < stateRef.current.completed
            ? "RESTORED"
            : active
              ? "AWAITING RECOVERY"
              : "SEALED",
        ),
        transparent: true,
      });
      materials.add(tx);
      const plate = mesh(new THREE.PlaneGeometry(1.75, 0.55), tx, p);
      plate.position.set(0, 0.7, 0.25);
      const hit = mesh(
        new THREE.PlaneGeometry(2.7, 4.7),
        new THREE.MeshBasicMaterial({ visible: false }),
        p,
      );
      hit.position.set(0, 2.1, 0.6);
      materials.add(hit.material);
      if (active) target(hit, "memory-" + index);
    }
    function orb(x: number, y: number, z: number, id: string, kind = 0) {
      const o = new THREE.Group();
      group.add(o);
      o.position.set(x, y, z);
      const core = mesh(
        kind % 2 === 0
          ? new THREE.IcosahedronGeometry(0.22, 0)
          : new THREE.OctahedronGeometry(0.25, 0),
        amber,
        o,
      );
      core.rotation.z = 0.4;
      const circle = mesh(new THREE.TorusGeometry(0.44, 0.014, 8, 64), blue, o);
      circle.rotation.x = 0.4;
      target(o, id);
      float(o);
      return o;
    }
    const particleGeo = new THREE.BufferGeometry();
    geometries.add(particleGeo);
    const points = new Float32Array(750 * 3);
    for (let i = 0; i < points.length; i += 3) {
      points[i] = (Math.random() - 0.5) * 36;
      points[i + 1] = Math.random() * 13;
      points[i + 2] = (Math.random() - 0.5) * 32;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(points, 3));
    const particleMat = new THREE.PointsMaterial({
      color: "#abc7df",
      size: 0.022,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    materials.add(particleMat);
    const dust = new THREE.Points(particleGeo, particleMat);
    scene.add(dust);
    let currentScene = "",
      previousStage = -1;
    const tweens: gsap.core.Tween[] = [];
    function build() {
      tweens.splice(0).forEach((t) => t.kill());
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          geometries.delete(o.geometry);
        }
      });
      group.clear();
      interactive = [];
      floating = [];
      mirrorMat = null;
      flame = null;
      videoSource = null;
      const s = stateRef.current;
      const isFinal = s.scene === "final";
      scene.background = new THREE.Color(isFinal ? "#14151e" : "#060c15");
      scene.fog = new THREE.FogExp2(
        isFinal ? "#302631" : "#070e1a",
        isFinal ? 0.018 : 0.032,
      );
      ambient.intensity = isFinal ? 1.8 : 1.15;
      warm.intensity = s.scene === "date" ? 40 : isFinal ? 90 : 0;
      key.intensity = isFinal ? 35 : 70;
      const floor = mesh(
        new THREE.CircleGeometry(26, 100),
        material(isFinal ? "#363039" : "#111c2c", 0.65, 0.32),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.05;
      [2.5, 5.7, 9, 14, 20].forEach((r) =>
        ring(r, 0.015, isFinal ? gold : dim),
      );
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12;
        box(
          0.07,
          0.02,
          22,
          Math.sin(a) * 11,
          0,
          Math.cos(a) * 11,
          stone,
        ).rotation.y = a;
      }
      if (!isFinal) {
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          const pillar = mesh(
            new THREE.CylinderGeometry(0.16, 0.24, 11, 8),
            stone,
          );
          pillar.position.set(Math.sin(a) * 15, 5.5, Math.cos(a) * 15);
        }
        const ceiling = mesh(new THREE.TorusGeometry(13, 0.1, 8, 100), dim);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 8;
      }
      if (s.scene === "hub") {
        portal(-6.3, -2, 0.6, 0);
        portal(-3.45, -5, 0.28, 1);
        portal(0, -6.2, 0, 2);
        portal(3.45, -5, -0.28, 3);
        portal(6.3, -2, -0.6, 4);
        const platform = mesh(
          new THREE.CylinderGeometry(1.7, 1.95, 0.2, 64),
          stone,
        );
        platform.position.y = 0.1;
        ring(1.55, 0.22, blue);
        const artifact = mesh(
          new THREE.IcosahedronGeometry(0.43, 0),
          s.completed === 5 ? amber : blue,
        );
        artifact.position.set(0, 1.6, 0);
        float(artifact);
        if (s.completed === 5) target(artifact, "anomaly");
        [0, 1, 2].forEach((i) => {
          const r = mesh(
            new THREE.TorusGeometry(0.78 + i * 0.13, 0.012, 8, 90),
            i === 1 ? gold : dim,
          );
          r.position.y = 1.6;
          r.rotation.set(i * 0.8, 0.7 + i * 0.4, 0);
        });
      }
      if (s.scene === "childhood") {
        const projector = new THREE.Group();
        group.add(projector);
        projector.position.set(0, 0.75, 1);
        box(0.9, 0.55, 0.65, 0, 0.25, 0, stone, projector);
        const lens = mesh(
          new THREE.CylinderGeometry(0.18, 0.23, 0.25, 32),
          blue,
          projector,
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 0.3, 0.45);
        [0, 1].forEach((i) => {
          const reel = mesh(
            new THREE.TorusGeometry(0.3, 0.045, 8, 32),
            gold,
            projector,
          );
          reel.position.set(i * 0.7 - 0.35, 0.7, 0);
        });
        target(projector, "projector");
        box(0.1, 0.75, 0.1, 0, -0.35, 0, stone, projector);
        [2, 0, 3, 1].forEach((n, i) => {
          const f = frame(
            story.childhood[n],
            (i - 1.5) * 2.35,
            2.8,
            -3,
            "photo-" + n,
          );
          f.visible = s.projector;
          f.userData.photo = n;
        });
        const empty = new THREE.Group();
        group.add(empty);
        empty.position.set(5.9, 2.8, -4);
        box(0.035, 2.1, 0.02, -0.8, 0, 0, gold, empty);
        box(0.035, 2.1, 0.02, 0.8, 0, 0, gold, empty);
        box(1.6, 0.035, 0.02, 0, 1.05, 0, gold, empty);
        box(1.6, 0.035, 0.02, 0, -1.05, 0, gold, empty);
      }
      if (s.scene === "date") {
        textPlane(
          "?? / ?? / ????",
          "A DAY THE ARCHIVE COULD NOT FORGET",
          0,
          3.2,
          -4,
          7,
        );
        [-3, 0, 3].forEach((x, i) => orb(x, 1.7, -1, "clue-" + i, i));
        for (let i = 0; i < 18; i++) {
          const a = i * 2.4;
          const r = 4 + (i % 3);
          const sheet = box(
            0.4,
            0.55,
            0.012,
            Math.sin(a) * r,
            2 + (i % 5) * 0.7,
            Math.cos(a) * r - 3,
            gold,
          );
          sheet.rotation.set(0.15, a, 0.2);
          float(sheet);
        }
      }
      if (s.scene === "darkroom") {
        const light = new THREE.PointLight("#c75043", 30, 16, 2);
        light.position.set(0, 4, 0);
        group.add(light);
        const f = frame(story.sharedPhotos[0], 0, 3, -3);
        f.scale.setScalar(1.5);
        f.userData.developing = true;
        [-4, -1.4, 1.4, 4].forEach((x, i) =>
          orb(x, 1.05, 0.6, "object-" + i, i),
        );
        const wire = mesh(
          new THREE.CylinderGeometry(0.009, 0.009, 14, 6),
          stone,
        );
        wire.rotation.z = Math.PI / 2;
        wire.position.set(0, 5, -3);
      }
      if (s.scene === "mirror") {
        box(3.7, 5.1, 0.12, 0, 2.85, -3, gold);
        mirrorMat = new THREE.MeshBasicMaterial({ color: "#0b1722" });
        materials.add(mirrorMat);
        const mirror = box(3.5, 4.9, 0.05, 0, 2.85, -2.9, mirrorMat);
        mirror.scale.x = -1;
        for (let i = 0; i < 5; i++) {
          const x = i % 2 === 0 ? -3.3 : 3.3;
          orb(x, 1.4 + Math.floor(i / 2) * 1.4, -1, "quality-" + i, i);
        }
      }
      if (s.scene === "transmission") {
        const capsule = orb(0, 2.5, -1, "transmit");
        capsule.scale.setScalar(2.3);
        for (let i = 0; i < 5; i++) {
          const r = mesh(
            new THREE.TorusGeometry(1.1 + i * 0.32, 0.007, 6, 100),
            dim,
          );
          r.position.set(0, 2.5, -1);
          r.rotation.set(0.3 + i * 0.28, i * 0.3, 0);
        }
      }
      if (isFinal) {
        const all = [...story.childhood, ...story.sharedPhotos];
        all.forEach((p, i) => {
          const a = (i / all.length) * Math.PI * 2;
          const r = 6;
          const f = frame(
            p,
            Math.sin(a) * r,
            2.4 + (i % 3) * 0.45,
            Math.cos(a) * r - 1,
          );
          f.rotation.y = a;
          f.userData.orbitIndex = i;
          f.userData.orbitCount = all.length + 3;
          f.userData.radius = 12;
          tweens.push(
            gsap.to(f.userData, {
              radius: 5.5,
              duration: s.reducedMotion ? 0 : 8,
              ease: "power2.inOut",
            }),
          );
        });
        const dateArtifact = textPlane(
          story.relationshipDisplay,
          "THE DAY THERE BECAME AN US",
          0,
          4.6,
          -9,
          4.5,
        );
        float(dateArtifact);
        dateArtifact.userData.orbitIndex = all.length;
        dateArtifact.userData.orbitCount = all.length + 3;
        dateArtifact.userData.radius = 12;
        tweens.push(
          gsap.to(dateArtifact.userData, {
            radius: 5.5,
            duration: s.reducedMotion ? 0 : 8,
            ease: "power2.inOut",
          }),
        );
        const finalMirror = new THREE.Group();
        group.add(finalMirror);
        finalMirror.position.set(-7, 2.4, -3);
        box(2, 2.8, 0.08, 0, 0, 0, gold, finalMirror);
        mirrorMat = new THREE.MeshBasicMaterial({ color: "#13222a" });
        materials.add(mirrorMat);
        const m = box(1.85, 2.65, 0.03, 0, 0, 0.08, mirrorMat, finalMirror);
        m.scale.x = -1;
        float(finalMirror);
        finalMirror.userData.orbitIndex = all.length + 1;
        finalMirror.userData.orbitCount = all.length + 3;
        finalMirror.userData.radius = 12;
        tweens.push(
          gsap.to(finalMirror.userData, {
            radius: 5.5,
            duration: s.reducedMotion ? 0 : 8,
            ease: "power2.inOut",
          }),
        );
        const response = orb(4, 2.5, 2, "keepsake", 1);
        response.userData.response = true;
        response.userData.orbitIndex = all.length + 2;
        response.userData.orbitCount = all.length + 3;
        response.userData.radius = 12;
        tweens.push(
          gsap.to(response.userData, {
            radius: 5.5,
            duration: s.reducedMotion ? 0 : 8,
            ease: "power2.inOut",
          }),
        );
        const pedestal = mesh(
          new THREE.CylinderGeometry(0.65, 0.85, 0.3, 48),
          gold,
        );
        pedestal.position.set(0, 0.15, 0);
        const candle = mesh(
          new THREE.CylinderGeometry(0.13, 0.15, 0.7, 32),
          material("#ece1cc", 0.05, 0.6),
        );
        candle.position.set(0, 0.65, 0);
        target(candle, "candle");
        const hit = mesh(
          new THREE.SphereGeometry(0.65, 12, 12),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        materials.add(hit.material);
        hit.position.set(0, 1, 0);
        target(hit, "candle");
        flame = mesh(new THREE.SphereGeometry(0.1, 16, 16), glow("#ffe4a3", 5));
        flame.scale.set(0.75, 1.8, 0.75);
        flame.position.set(0, 1.14, 0);
        flame.visible = s.lit;
        for (let i = 0; i < 45; i++) {
          const a = i * 2.399,
            r = 12 + Math.random() * 8;
          const point = new THREE.PointLight("#efbc7a", 0.7, 4, 2);
          point.position.set(
            Math.sin(a) * r,
            1 + Math.random() * 6,
            Math.cos(a) * r,
          );
          group.add(point);
          const star = mesh(new THREE.SphereGeometry(0.035, 6, 6), amber);
          star.position.copy(point.position);
        }
      }
      const destination =
        s.scene === "hub"
          ? { x: 0, y: 2.5, z: 13 }
          : isFinal
            ? { x: 0, y: 3.3, z: 12 }
            : { x: 0, y: 2.8, z: 10 };
      camera.position.set(destination.x, destination.y, destination.z + 2);
      tweens.push(
        gsap.to(camera.position, {
          ...destination,
          duration: s.reducedMotion ? 0 : 2.2,
          ease: "power2.out",
        }),
      );
      currentScene = s.scene;
      previousStage = -1;
    }
    build();
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2(),
      look = new THREE.Vector2(),
      targetLook = new THREE.Vector3(0, 2, -2),
      keys = new Set<string>();
    let down = { x: 0, y: 0 },
      drag = false,
      lastX = 0,
      yaw = 0;
    function hover(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      look.set(pointer.x, pointer.y);
      if (drag) {
        yaw += (e.clientX - lastX) * 0.002;
        lastX = e.clientX;
      }
      ray.setFromCamera(pointer, camera);
      renderer.domElement.style.cursor = ray.intersectObjects(interactive, true)
        .length
        ? "pointer"
        : drag
          ? "grabbing"
          : "grab";
    }
    function click(e: PointerEvent) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
      hover(e);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(interactive, true)[0];
      if (hit) {
        let o: THREE.Object3D | null = hit.object;
        while (o && !o.userData.action) o = o.parent;
        if (o) select.current(o.userData.action);
      }
    }
    const pd = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
      lastX = e.clientX;
      drag = true;
    };
    const pu = (e: PointerEvent) => {
      drag = false;
      click(e);
    };
    const kd = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        /INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)
      )
        return;
      keys.add(e.key.toLowerCase());
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    renderer.domElement.addEventListener("pointermove", hover);
    renderer.domElement.addEventListener("pointerdown", pd);
    renderer.domElement.addEventListener("pointerup", pu);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", resize);
    const contextLost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const clock = new THREE.Clock();
    let request = 0,
      disposed = false;
    let visibility = true;
    const visibilityChange = () => {
      visibility = !document.hidden;
      keys.clear();
    };
    document.addEventListener("visibilitychange", visibilityChange);
    function animate() {
      if (disposed) return;
      request = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05),
        time = clock.elapsedTime,
        s = stateRef.current;
      if (!visibility) return;
      if (s.scene !== currentScene) {
        yaw = 0;
        build();
      }
      if (s.progress !== previousStage) {
        warm.intensity =
          s.scene === "childhood"
            ? s.progress * 12
            : s.scene === "final"
              ? s.lit
                ? 150
                : 70
              : s.scene === "date"
                ? 40
                : 0;
        previousStage = s.progress;
      }
      if (s.scene === "childhood")
        floating.forEach((o) => {
          if (o.userData.photo !== undefined) {
            o.visible = s.projector;
            const idx = o.userData.photo as number;
            if (s.selected.includes(idx)) {
              o.position.x = THREE.MathUtils.lerp(
                o.position.x,
                (idx - 1.5) * 2.35,
                0.04,
              );
              o.userData.baseY = THREE.MathUtils.lerp(
                o.userData.baseY,
                4.5,
                0.04,
              );
              o.scale.setScalar(0.72);
            }
          }
        });
      if (s.scene === "darkroom")
        floating.forEach((o) => {
          if (o.userData.developing) {
            const image = (o.children[1] as THREE.Mesh)
              .material as THREE.MeshBasicMaterial;
            image.color.setScalar(0.06 + s.progress * 0.235);
          }
        });
      if (s.scene === "date" && s.progress === 3) {
        const existing = group.getObjectByName("restored-date");
        if (!existing) {
          const p = textPlane(
            story.relationshipDisplay,
            "THIS DATE HAS UNUSUALLY HIGH MEMORY SIGNIFICANCE",
            0,
            4.3,
            -3.7,
            7,
          );
          p.name = "restored-date";
        }
      }
      if (mirrorMat && s.video !== videoSource) {
        videoTexture?.dispose();
        videoTexture = s.video ? new THREE.VideoTexture(s.video) : null;
        videoSource = s.video;
        if (videoTexture) videoTexture.colorSpace = THREE.SRGBColorSpace;
        mirrorMat.map = videoTexture;
        mirrorMat.needsUpdate = true;
      }
      if (mirrorMat)
        mirrorMat.color.setScalar(
          s.scene === "final" ? 1 : 0.13 + s.progress * 0.174,
        );
      if (flame) {
        flame.visible = s.lit;
        if (s.lit) {
          warm.intensity = 150;
          flame.scale.y = 1.8 + Math.sin(time * 7) * 0.15;
        }
      }
      if (!s.reducedMotion) {
        dust.rotation.y = time * 0.011;
        floating.forEach((o) => {
          o.position.y =
            o.userData.baseY + Math.sin(time * 0.7 + o.userData.phase) * 0.075;
          if (o.userData.orbitIndex !== undefined) {
            const a =
              (o.userData.orbitIndex / o.userData.orbitCount) * Math.PI * 2 +
              time * 0.045;
            const radius = o.userData.radius ?? 5.5;
            o.position.x = Math.sin(a) * radius;
            o.position.z = Math.cos(a) * radius - 1;
            o.rotation.y = a;
          }
        });
      }
      const speed = dt * 2.6;
      if (keys.has("w") || keys.has("arrowup"))
        camera.position.z = Math.max(4, camera.position.z - speed);
      if (keys.has("s") || keys.has("arrowdown"))
        camera.position.z = Math.min(17, camera.position.z + speed);
      if (keys.has("a") || keys.has("arrowleft"))
        camera.position.x = Math.max(-7, camera.position.x - speed);
      if (keys.has("d") || keys.has("arrowright"))
        camera.position.x = Math.min(7, camera.position.x + speed);
      targetLook.set(
        Math.sin(yaw) * 8 + (s.reducedMotion ? 0 : look.x * 0.2),
        2 + (s.reducedMotion ? 0 : look.y * 0.13),
        -3,
      );
      camera.lookAt(targetLook);
      composer.render();
    }
    animate();
    ready.current();
    return () => {
      disposed = true;
      cancelAnimationFrame(request);
      tweens.forEach((t) => t.kill());
      document.removeEventListener("visibilitychange", visibilityChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      renderer.domElement.removeEventListener("pointermove", hover);
      renderer.domElement.removeEventListener("pointerdown", pd);
      renderer.domElement.removeEventListener("pointerup", pu);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textureCache.forEach((t) => t.dispose());
      videoTexture?.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [story]);
  return (
    <div className="world" ref={host}>
      {error && (
        <div className="webgl-error">
          <p>Your browser couldn’t open the 3D world.</p>
          <p>
            Turn on hardware acceleration and reload in Chrome, Edge, or Safari.
          </p>
          <button onClick={() => location.reload()}>TRY AGAIN</button>
        </div>
      )}
    </div>
  );
}
