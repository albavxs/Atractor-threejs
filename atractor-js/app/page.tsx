"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Aizawa system ────────────────────────────────────────────────────────────
// dx = (z-b)x - dy
// dy = dx + (z-b)y
// dz = c + az - z³/3 - (x²+y²)(1+ez) + fzx³
// Canonical params: a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1

const _a = 0.95,
  _b = 0.7,
  _c = 0.6,
  _d = 3.5,
  _e = 0.25,
  _f = 0.1;

const DT = 0.003;
const SCALE = 1.15;

function derivatives(x: number, y: number, z: number): [number, number, number] {
  const r2 = x * x + y * y;
  return [
    (z - _b) * x - _d * y,
    _d * x + (z - _b) * y,
    _c + _a * z - (z * z * z) / 3 - r2 * (1 + _e * z) + _f * z * x * x * x,
  ];
}

function rk4(x: number, y: number, z: number): [number, number, number] {
  const [k1x, k1y, k1z] = derivatives(x, y, z);
  const [k2x, k2y, k2z] = derivatives(x + (DT * k1x) / 2, y + (DT * k1y) / 2, z + (DT * k1z) / 2);
  const [k3x, k3y, k3z] = derivatives(x + (DT * k2x) / 2, y + (DT * k2y) / 2, z + (DT * k2z) / 2);
  const [k4x, k4y, k4z] = derivatives(x + DT * k3x, y + DT * k3y, z + DT * k3z);
  return [
    x + (DT * (k1x + 2 * k2x + 2 * k3x + k4x)) / 6,
    y + (DT * (k1y + 2 * k2y + 2 * k3y + k4y)) / 6,
    z + (DT * (k1z + 2 * k2z + 2 * k3z + k4z)) / 6,
  ];
}

function bakeTrajectory(total: number, discard: number): Float32Array {
  const count = total - discard;
  const path = new Float32Array(count * 3);
  let x = 0.1,
    y = 0.0,
    z = 0.0;

  for (let i = 0; i < total; i++) {
    [x, y, z] = rk4(x, y, z);
    if (i >= discard) {
      const j = (i - discard) * 3;
      path[j] = x * SCALE;
      path[j + 1] = y * SCALE;
      path[j + 2] = z * SCALE;
    }
  }
  return path;
}

// ─── Sprite texture ───────────────────────────────────────────────────────────
function makeSphereTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;

  const glow = ctx.createRadialGradient(r, r, 0, r, r, r);
  glow.addColorStop(0.0, "rgba(255,255,255,1.0)");
  glow.addColorStop(0.30, "rgba(235,240,255,0.85)");
  glow.addColorStop(0.60, "rgba(200,210,255,0.35)");
  glow.addColorStop(1.0, "rgba(0,0,0,0.0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const spec = ctx.createRadialGradient(r * 0.58, r * 0.42, 0, r * 0.58, r * 0.42, r * 0.28);
  spec.addColorStop(0.0, "rgba(255,255,255,0.95)");
  spec.addColorStop(1.0, "rgba(255,255,255,0.00)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(r, r, r * 0.92, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ─── Band mask injection: makes the center seam THIN by dimming main layers near the seam plane ──
function applyBandSuppression(
  mat: THREE.PointsMaterial,
  bandN: THREE.Vector3,
  bandW: number,
  suppress: number
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBandN = { value: bandN.clone().normalize() };
    shader.uniforms.uBandW = { value: bandW };
    shader.uniforms.uBandSuppress = { value: suppress };

    shader.vertexShader =
      `
uniform vec3 uBandN;
varying float vBandD;
` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
#include <begin_vertex>
vec4 wpos = modelMatrix * vec4(position, 1.0);
vBandD = abs(dot(wpos.xyz, uBandN));
`
    );

    shader.fragmentShader =
      `
uniform float uBandW;
uniform float uBandSuppress;
varying float vBandD;
` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
      `
float m = smoothstep(0.0, uBandW, vBandD);          // 0 at seam center, 1 away from seam
float k = mix(1.0 - uBandSuppress, 1.0, m);          // dim near seam on MAIN layers
gl_FragColor = vec4(outgoingLight, diffuseColor.a * k);
`
    );
  };

  mat.needsUpdate = true;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x060608);

    // Keep additive under control (closer to the reference photo)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;

    // ── Scene / Camera ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.001, 500);
    camera.position.z = 4.9;

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
      size: 0.0036,
      color: new THREE.Color(0.55, 0.58, 0.62),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Points(bgGeo, bgMat));

    // ── Microspheres ─────────────────────────────────────────────────────────
    // Reduce “center fatness” by lowering overlap + point size a bit
    const N_SPHERES = 7000; // was 9000
    const SPHERE_SPD = 1;

    const indices = new Float64Array(N_SPHERES);
    for (let i = 0; i < N_SPHERES; i++) indices[i] = Math.floor(Math.random() * pathCount);

    const spherePos = new Float32Array(N_SPHERES * 3);
    for (let i = 0; i < N_SPHERES; i++) {
      const idx = Math.floor(indices[i]) * 3;
      spherePos[i * 3] = path[idx];
      spherePos[i * 3 + 1] = path[idx + 1];
      spherePos[i * 3 + 2] = path[idx + 2];
    }

    const sphereGeo = new THREE.BufferGeometry();
    const posBuf = new THREE.BufferAttribute(spherePos, 3);
    posBuf.setUsage(THREE.DynamicDrawUsage);
    sphereGeo.setAttribute("position", posBuf);

    const spriteTex = makeSphereTexture(128);

    // ── Band definition (used both to BRIGHTEN seam and to DIM main layers near seam) ──
    // Tweak only these if you want to rotate seam direction / thickness:
    const BAND_N = new THREE.Vector3(0.78, 0.10, 0.62); // plane normal
    const BAND_W = 0.028; // seam thickness (smaller = thinner)
    const MAIN_SUPPRESS = 0.88; // 0..1 (higher = more dim at seam on main layers)

    // ── Main layers ──────────────────────────────────────────────────────────
    const matSpheres = new THREE.PointsMaterial({
      size: 0.055, // was 0.07
      map: spriteTex,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const matCore = new THREE.PointsMaterial({
      size: 0.009, // was 0.010
      color: new THREE.Color(1.0, 1.0, 1.0),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    // This is the KEY: dims MAIN layers at the seam so the center doesn't become a fat band
    applyBandSuppression(matSpheres, BAND_N, BAND_W * 2.2, MAIN_SUPPRESS);
    applyBandSuppression(matCore, BAND_N, BAND_W * 2.0, MAIN_SUPPRESS);

    group.add(new THREE.Points(sphereGeo, matSpheres));
    group.add(new THREE.Points(sphereGeo, matCore));

    // ── Bright seam layer (separate geometry = always thin) ───────────────────
    const bandGeo = new THREE.BufferGeometry();
    const bandTmp: number[] = [];
    for (let i = 0; i < pathCount; i++) {
      const j = i * 3;
      const x = path[j],
        y = path[j + 1],
        z = path[j + 2];
      const s = x * BAND_N.x + y * BAND_N.y + z * BAND_N.z;
      if (Math.abs(s) < BAND_W) bandTmp.push(x, y, z);
    }
    bandGeo.setAttribute("position", new THREE.Float32BufferAttribute(bandTmp, 3));

    const bandMat = new THREE.PointsMaterial({
      size: 0.020,
      map: spriteTex,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      color: new THREE.Color(1.0, 1.0, 1.0),
    });
    group.add(new THREE.Points(bandGeo, bandMat));

    // ── Orientation — matches the photo view ──────────────────────────────────
    group.rotation.set(0.3, 0.4, -0.2);
    const RX0 = 0.3,
      RY0 = 0.4,
      RZ0 = -0.2;

    // ── Controls ─────────────────────────────────────────────────────────────
    let autoRot = true,
      dragging = false;
    let prevX = 0,
      prevY = 0,
      clock = 0;
    let rafId = 0;

    const onDown = (e: MouseEvent) => {
      dragging = true;
      autoRot = false;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      group.rotation.y += (e.clientX - prevX) * 0.004;
      group.rotation.x += (e.clientY - prevY) * 0.004;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(1.5, Math.min(20, camera.position.z + e.deltaY * 0.007));
    };
    const onDbl = () => {
      autoRot = true;
      clock = 0;
      group.rotation.set(RX0, RY0, RZ0);
    };

    const onTDown = (e: TouchEvent) => {
      dragging = true;
      autoRot = false;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    };
    const onTUp = () => {
      dragging = false;
    };
    const onTMove = (e: TouchEvent) => {
      if (!dragging) return;
      group.rotation.y += (e.touches[0].clientX - prevX) * 0.004;
      group.rotation.x += (e.touches[0].clientY - prevY) * 0.004;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("dblclick", onDbl);

    canvas.addEventListener("touchstart", onTDown, { passive: true });
    window.addEventListener("touchend", onTUp);
    window.addEventListener("touchmove", onTMove, { passive: true });

    window.addEventListener("resize", onResize);

    // ── Render loop ───────────────────────────────────────────────────────────
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      clock += 0.003;

      if (autoRot) {
        group.rotation.y = RY0 + clock * 0.14;
        group.rotation.x = RX0 + Math.sin(clock * 0.06) * 0.08;
        group.rotation.z = RZ0 + Math.cos(clock * 0.04) * 0.03;
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

      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDbl);

      canvas.removeEventListener("touchstart", onTDown);
      window.removeEventListener("touchend", onTUp);
      window.removeEventListener("touchmove", onTMove);

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

  return (
    <main
      className="relative w-screen h-screen overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, #0b0b0f 0%, #060608 55%, #010102 100%)",
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* HUD — force on top of canvas (z-20) */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none select-none">
        <p className="text-white/80 text-[22px] font-light tracking-[3px] mb-3">AIZAWA</p>
        <p className="text-white/45 font-mono text-[10px] leading-[2.1] italic">
          dx = (z−b)x − dy
          <br />
          dy = dx + (z−b)y
          <br />
          dz = c + az − z³/3 − (x²+y²)(1+ez) + fzx³
        </p>
      </div>
    </main>
  );
}