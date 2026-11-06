import * as THREE from 'three'
import { rng } from '../potato-field'

// One 256x256 value-noise table drives the terrain on the GPU (as a texture)
// and in JS (bilinear lookups), so potatoes and plants sit exactly on the surface.
const N = 256
const DATA = (() => {
  const r = rng(2024)
  const d = new Uint8Array(N * N)
  for (let i = 0; i < d.length; i++) d[i] = Math.floor(r() * 256)
  return d
})()

export function createNoiseTexture() {
  const tex = new THREE.DataTexture(DATA, N, N, THREE.RedFormat, THREE.UnsignedByteType)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

const mod = (a: number) => ((a % N) + N) % N
const at = (x: number, y: number) => DATA[mod(y) * N + mod(x)] / 255

function noise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx
  const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx
  return a + (b - a) * fy
}

export function fbm(x: number, y: number) {
  return (
    (0.5 * noise(x, y) +
      0.25 * noise(x * 2.03 + 17, y * 2.03 + 17) +
      0.125 * noise(x * 4.01 + 31, y * 4.01 + 31) +
      0.0625 * noise(x * 8.1 + 7, y * 8.1 + 7)) /
    0.9375
  )
}

// Two broad octaves only: gentle, rounded landforms with no small bumps.
function fbmSmooth(x: number, y: number) {
  return (0.7 * noise(x, y) + 0.3 * noise(x * 1.9 + 17, y * 1.9 + 17))
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/*
 * TERRAIN SHAPE: tweak here. One config feeds both the GPU height function and the
 * JS twin used to rest potatoes and plants on the surface, so they always agree.
 * World units: the seated woman is ~2.4 tall, sits at x=0, z=0 facing +z (the camera).
 */
export const TERRAIN = {
  // The raised mound she sits on. Elliptical, centred a little behind her.
  mound: {
    x: 0,
    z: -0.5,
    radiusX: 1.25, // stretch across the screen
    radiusZ: 1.0, // stretch in depth
    height: 1.25, // how far the top rises above the surrounding land
    plateau: 1.3, // flat top (in scaled radii) so she sits level
    foot: 5.0, // where the slope meets the land
    lumps: 0.35, // soft bumps on its flanks
  },
  // A soft swell of earth right under her seat, so the ground visibly meets her
  // hips (her photo stands at z=0; her seat looks onto ground ~1 unit behind it).
  seat: { x: 0, z: -1.0, radiusX: 0.85, radiusZ: 0.5, height: 0.26 },
  // Small undulations near her (they fade out by `detailFade` so the distance stays smooth).
  detail: 0.22,
  detailFade: [10, 24],
  // Rolling fields in the middle distance.
  rolling: { amount: 4.0, scale: 0.07, from: 9, to: 35 },
  // Land rising on both sides, like a valley she sits in.
  sides: { amount: 2.6, from: 10, to: 60 },
  // The cliff: the land ends a few steps behind her and drops away, so she sits on the
  // edge with open sky beyond. `z` is where the rim is directly behind her; `curve`
  // bends the rim forward at the sides into a promontory; `drop` is how far it falls.
  cliff: { z: -5.2, curve: 0.025, wobble: 0.35, depth: 2.5, drop: 45 },
  // Ranges on the horizon (hidden below the cliff).
  ridges: { amount: 16, scale: 0.02, from: 70, to: 170 },
}

const T = TERRAIN

// Ground height at world (x, z).
export function terrainHeight(x: number, z: number) {
  const m = T.mound
  const r = Math.hypot((x - m.x) / m.radiusX, (z - m.z) / m.radiusZ)
  const flank = smoothstep(1.0, 2.2, r)
  let h = m.height * (1 - smoothstep(m.plateau, m.foot, r))
  const d = Math.hypot(x, z)
  const near = 1 - smoothstep(T.detailFade[0], T.detailFade[1], d)
  h += (fbm(x * 0.8, z * 0.8) - 0.5) * m.lumps * flank * near
  h += ((fbm(x * 0.9, z * 0.9) - 0.5) * T.detail + (noise(x * 4, z * 4) - 0.5) * 0.03) * smoothstep(0.9, 2.0, r) * near
  const sx = (x - T.seat.x) / T.seat.radiusX
  const sz = (z - T.seat.z) / T.seat.radiusZ
  h += T.seat.height * Math.exp(-(sx * sx + sz * sz) * 2)
  // distant land is mirrored left/right (a softened |x|, so there's no crease behind her)
  const mx = Math.sqrt(x * x + 4)
  h += (fbmSmooth(mx * T.rolling.scale + 50, z * T.rolling.scale + 50) - 0.45) * T.rolling.amount * smoothstep(T.rolling.from, T.rolling.to, d)
  h += Math.pow(smoothstep(T.sides.from, T.sides.to, Math.abs(x)), 1.5) * T.sides.amount
  h += smoothstep(T.ridges.from, T.ridges.to, -z) * (fbmSmooth(mx * T.ridges.scale + 9, z * T.ridges.scale + 9) * T.ridges.amount - 4)
  const c = T.cliff
  const rim = c.z + c.curve * x * x + (noise(x * 0.6 + 5, 3) - 0.5) * 2 * c.wobble
  h -= Math.pow(smoothstep(rim, rim - c.depth, z), 1.6) * c.drop
  return h
}

const n = (v: number) => v.toFixed(4)

// GLSL twins of the functions above, plus the growth front shared by ground and grass.
export const NOISE_GLSL = /* glsl */ `
uniform sampler2D uNoise;
float vnoise(vec2 p) { return texture2D(uNoise, (p + 0.5) / 256.0).r; }
float fbm(vec2 p) {
  return (0.5 * vnoise(p) + 0.25 * vnoise(p * 2.03 + 17.0) + 0.125 * vnoise(p * 4.01 + 31.0)
    + 0.0625 * vnoise(p * 8.1 + 7.0)) / 0.9375;
}
float fbmSmooth(vec2 p) { return 0.7 * vnoise(p) + 0.3 * vnoise(p * 1.9 + 17.0); }
float terrainHeight(vec2 p) {
  float r = length((p - vec2(${n(T.mound.x)}, ${n(T.mound.z)})) / vec2(${n(T.mound.radiusX)}, ${n(T.mound.radiusZ)}));
  float flank = smoothstep(1.0, 2.2, r);
  float h = ${n(T.mound.height)} * (1.0 - smoothstep(${n(T.mound.plateau)}, ${n(T.mound.foot)}, r));
  float d = length(p);
  float near = 1.0 - smoothstep(${n(T.detailFade[0])}, ${n(T.detailFade[1])}, d);
  h += (fbm(p * 0.8) - 0.5) * ${n(T.mound.lumps)} * flank * near;
  h += ((fbm(p * 0.9) - 0.5) * ${n(T.detail)} + (vnoise(p * 4.0) - 0.5) * 0.03) * smoothstep(0.9, 2.0, r) * near;
  vec2 sp = (p - vec2(${n(T.seat.x)}, ${n(T.seat.z)})) / vec2(${n(T.seat.radiusX)}, ${n(T.seat.radiusZ)});
  h += ${n(T.seat.height)} * exp(-dot(sp, sp) * 2.0);
  vec2 mp = vec2(sqrt(p.x * p.x + 4.0), p.y);
  h += (fbmSmooth(mp * ${n(T.rolling.scale)} + 50.0) - 0.45) * ${n(T.rolling.amount)} * smoothstep(${n(T.rolling.from)}, ${n(T.rolling.to)}, d);
  h += pow(smoothstep(${n(T.sides.from)}, ${n(T.sides.to)}, abs(p.x)), 1.5) * ${n(T.sides.amount)};
  h += smoothstep(${n(T.ridges.from)}, ${n(T.ridges.to)}, -p.y) * (fbmSmooth(mp * ${n(T.ridges.scale)} + 9.0) * ${n(T.ridges.amount)} - 4.0);
  float rim = ${n(T.cliff.z)} + ${n(T.cliff.curve)} * p.x * p.x + (vnoise(vec2(p.x * 0.6 + 5.0, 3.0)) - 0.5) * 2.0 * ${n(T.cliff.wobble)};
  h -= pow(smoothstep(rim, rim - ${n(T.cliff.depth)}, p.y), 1.6) * ${n(T.cliff.drop)};
  return h;
}
// Distance from the woman, warped so the green front spreads in organic lobes.
float growthDistance(vec2 p) {
  return length(p * vec2(1.0, 1.15)) + (fbm(p * 0.42 + 3.0) - 0.5) * 3.2 + (vnoise(p * 2.2) - 0.5) * 0.6;
}
`
