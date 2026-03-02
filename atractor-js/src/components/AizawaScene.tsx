"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { bakeTrajectory, makeSphereTexture, applyBandSuppression } from "../utils/aizawa";

const AizawaScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background to let main handle it
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    // ── Scene / Camera ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Position camera further back to fix the "too big" issue
    camera.position.z = 6.5;

    const group = new THREE.Group();
    scene.add(group);

    // ── Bake path ────────────────────────────────────────────────────────────
    const PATH_STEPS = 600_000;
    const DISCARD = 15_000;
    const path = bakeTrajectory(PATH_STEPS + DISCARD, DISCARD);
    const pathCount = PATH_STEPS;

    // ── Background skeleton (dim) ────────────────────────────────────────────
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute("position", new THREE.BufferAttribute(path.slice(), 3));
    const bgMat = new THREE.PointsMaterial({
      size: 0.003,
      color: new THREE.Color(0.5, 0.5, 0.55),
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Points(bgGeo, bgMat));

    // ── Microspheres ─────────────────────────────────────────────────────────
    const N_SPHERES = 8000;
    const SPHERE_SPD = 1;

    const indices = new Float64Array(N_SPHERES);
    for (let i = 0; i < N_SPHERES; i++) indices[i] = Math.floor(Math.random() * pathCount);

    const spherePos = new Float32Array(N_SPHERES * 3);
    const sphereGeo = new THREE.BufferGeometry();
    const posBuf = new THREE.BufferAttribute(spherePos, 3);
    posBuf.setUsage(THREE.DynamicDrawUsage);
    sphereGeo.setAttribute("position", posBuf);

    const spriteTex = makeSphereTexture(128);

    const BAND_N = new THREE.Vector3(0.78, 0.10, 0.62);
    const BAND_W = 0.025;
    const MAIN_SUPPRESS = 0.9;

    const matSpheres = new THREE.PointsMaterial({
      size: 0.05,
      map: spriteTex,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const matCore = new THREE.PointsMaterial({
      size: 0.008,
      color: new THREE.Color(1.0, 1.0, 1.0),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    applyBandSuppression(matSpheres, BAND_N, BAND_W * 2.2, MAIN_SUPPRESS);
    applyBandSuppression(matCore, BAND_N, BAND_W * 2.0, MAIN_SUPPRESS);

    group.add(new THREE.Points(sphereGeo, matSpheres));
    group.add(new THREE.Points(sphereGeo, matCore));

    const bandGeo = new THREE.BufferGeometry();
    const bandTmp: number[] = [];
    for (let i = 0; i < pathCount; i++) {
      const j = i * 3;
      const x = path[j], y = path[j + 1], z = path[j + 2];
      const s = x * BAND_N.x + y * BAND_N.y + z * BAND_N.z;
      if (Math.abs(s) < BAND_W) bandTmp.push(x, y, z);
    }
    bandGeo.setAttribute("position", new THREE.Float32BufferAttribute(bandTmp, 3));

    const bandMat = new THREE.PointsMaterial({
      size: 0.018,
      map: spriteTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      color: new THREE.Color(1.0, 1.0, 1.0),
    });
    group.add(new THREE.Points(bandGeo, bandMat));

    // Matches the reference photo angle better
    group.rotation.set(0.4, 0.5, -0.2);
    const RX0 = 0.4, RY0 = 0.5, RZ0 = -0.2;

    let autoRot = true, dragging = false;
    let prevX = 0, prevY = 0, clock = 0;
    let rafId = 0;

    const onDown = (x: number, y: number) => {
      dragging = true;
      autoRot = false;
      prevX = x;
      prevY = y;
    };
    const onUp = () => { dragging = false; };
    const onMove = (x: number, y: number) => {
      if (!dragging) return;
      group.rotation.y += (x - prevX) * 0.005;
      group.rotation.x += (y - prevY) * 0.005;
      prevX = x;
      prevY = y;
    };

    const handleMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchStart = (e: TouchEvent) => onDown(e.touches[0].clientX, e.touches[0].clientY);
    const handleTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX, e.touches[0].clientY);

    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(2, Math.min(15, camera.position.z + e.deltaY * 0.005));
    };
    const onDbl = () => {
      autoRot = true;
      clock = 0;
      group.rotation.set(RX0, RY0, RZ0);
    };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("dblclick", onDbl);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("resize", onResize);

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      clock += 0.002;
      if (autoRot) {
        group.rotation.y = RY0 + clock * 0.15;
        group.rotation.x = RX0 + Math.sin(clock * 0.05) * 0.1;
      }
      for (let i = 0; i < N_SPHERES; i++) {
        indices[i] = (indices[i] + SPHERE_SPD) % pathCount;
        const idx = Math.floor(indices[i]) * 3;
        spherePos[i * 3] = path[idx];
        spherePos[i * 3 + 1] = path[idx + 1];
        spherePos[i * 3 + 2] = path[idx + 2];
      }
      posBuf.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDbl);
      canvas.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      bgGeo.dispose();
      bgMat.dispose();
      bandGeo.dispose();
      bandMat.dispose();
      sphereGeo.dispose();
      matSpheres.dispose();
      matCore.dispose();
      spriteTex.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="block w-full h-full touch-none" />;
};

export default AizawaScene;
