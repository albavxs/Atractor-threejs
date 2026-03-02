import * as THREE from "three";

export const AIZAWA_PARAMS = {
  a: 0.95,
  b: 0.7,
  c: 0.6,
  d: 3.5,
  e: 0.25,
  f: 0.1,
  dt: 0.003,
  scale: 1.15,
};

export type Point = [number, number, number];

export function getAizawaDerivatives(x: number, y: number, z: number): Point {
  const { a, b, c, d, e, f } = AIZAWA_PARAMS;
  const r2 = x * x + y * y;
  const dx = (z - b) * x - d * y;
  const dy = d * x + (z - b) * y;
  const dz = c + a * z - (z * z * z) / 3 - r2 * (1 + e * z) + f * z * x * x * x;
  return [dx, dy, dz];
}

export function rk4Step(x: number, y: number, z: number): Point {
  const { dt } = AIZAWA_PARAMS;
  const [k1x, k1y, k1z] = getAizawaDerivatives(x, y, z);
  const [k2x, k2y, k2z] = getAizawaDerivatives(x + (dt * k1x) / 2, y + (dt * k1y) / 2, z + (dt * k1z) / 2);
  const [k3x, k3y, k3z] = getAizawaDerivatives(x + (dt * k2x) / 2, y + (dt * k2y) / 2, z + (dt * k2z) / 2);
  const [k4x, k4y, k4z] = getAizawaDerivatives(x + dt * k3x, y + dt * k3y, z + dt * k3z);
  
  return [
    x + (dt * (k1x + 2 * k2x + 2 * k3x + k4x)) / 6,
    y + (dt * (k1y + 2 * k2y + 2 * k3y + k4y)) / 6,
    z + (dt * (k1z + 2 * k2z + 2 * k3z + k4z)) / 6,
  ];
}

export function bakeTrajectory(total: number, discard: number): Float32Array {
  const { scale } = AIZAWA_PARAMS;
  const count = total - discard;
  const path = new Float32Array(count * 3);
  let x = 0.1, y = 0.0, z = 0.0;

  for (let i = 0; i < total; i++) {
    [x, y, z] = rk4Step(x, y, z);
    if (i >= discard) {
      const j = (i - discard) * 3;
      path[j] = x * scale;
      path[j + 1] = y * scale;
      path[j + 2] = z * scale;
    }
  }
  return path;
}

export function makeSphereTexture(size = 128): THREE.CanvasTexture {
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

export function applyBandSuppression(
  mat: THREE.PointsMaterial,
  bandN: THREE.Vector3,
  bandW: number,
  suppress: number
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBandN = { value: bandN.clone().normalize() };
    shader.uniforms.uBandW = { value: bandW };
    shader.uniforms.uBandSuppress = { value: suppress };

    shader.vertexShader = `
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

    shader.fragmentShader = `
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
