import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { rng } from '../potato-field'
import type { GardenLayout } from './garden-state'
import { NOISE_GLSL, fbm, terrainHeight } from './noise'
import type { SharedUniforms } from './terrain'

/*
 * ROCKS: tweak here. Three sizes share one material:
 *  - boulders sit on the mound's flanks around her (fixed spots, like the reference)
 *  - stones gather in small clusters over the fields
 *  - pebbles are sprinkled everywhere
 * Counts are [desktop, phone]. `sink` is how much of each rock is buried.
 */
export const ROCKS = {
  boulders: [
    // x, z, size: kept off the plane her photo stands on (|z| < 0.7 near the centre)
    // her seat: a broad, flat stone just behind her photo, with stones snug around
    // her hips and feet so she reads as sitting on the ground, not hovering over it
    { x: -0.05, z: -1.05, size: 0.62, h: 0.55 },
    { x: -0.78, z: -0.35, size: 0.2, h: 0.8 },
    { x: 0.82, z: -0.45, size: 0.22, h: 0.75 },
    { x: -0.55, z: 0.26, size: 0.1 },
    { x: 0.62, z: 0.24, size: 0.12 },
    { x: 0.32, z: 0.38, size: 0.06 },
    { x: -0.28, z: 0.42, size: 0.05 },
    { x: 1.05, z: 0.05, size: 0.09 },
    { x: -1.08, z: 0.0, size: 0.08 },
    // boulders on the mound's flanks
    { x: -1.2, z: -1.3, size: 0.75 },
    { x: 1.4, z: -1.0, size: 0.62 },
    { x: -1.75, z: 0.4, size: 0.42 },
    { x: 1.8, z: 0.8, size: 0.5 },
    { x: 0.6, z: -1.7, size: 0.5 },
    { x: -2.7, z: -1.5, size: 0.36 },
    { x: 2.8, z: -0.4, size: 0.4 },
  ],
  stones: { count: [90, 40], size: [0.04, 0.12] },
  pebbles: { count: [1100, 420], size: [0.012, 0.04] },
  sink: 0.12,
}

// granite greys and warm sandstones
const STONE_COLORS = ['#a59c8f', '#8f877c', '#b8ab96', '#9a8670', '#7f7a72', '#b2a38c']

// A weathered rock: an icosphere pushed in and out by smooth waves, then cut by a few
// random fracture planes so it has flat broken faces and edges like real stone, and
// flattened with a flat-ish underside. Displacement depends only on position, so
// shared vertices move together and seams never split.
function rockGeometry(detail: number, seed: number) {
  const r = rng(seed)
  const ph = Array.from({ length: 6 }, () => r() * 6.28)
  const cuts = Array.from({ length: 5 }, () => ({
    n: new THREE.Vector3(r() * 2 - 1, r() * 1.4 - 0.2, r() * 2 - 1).normalize(),
    d: 0.68 + r() * 0.22,
  }))
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail)
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  g = mergeVertices(g)
  const p = g.getAttribute('position') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize()
    const bump =
      1 +
      0.2 * Math.sin(3.1 * v.x + ph[0]) * Math.cos(2.3 * v.z + ph[1]) +
      0.1 * Math.sin(6.7 * v.y + 5.1 * v.x + ph[2]) +
      0.05 * Math.sin(13 * v.z + 11 * v.y + ph[3])
    v.multiplyScalar(bump)
    // fracture planes: anything beyond a plane is pressed flat onto it
    for (const c of cuts) {
      const over = v.dot(c.n) - c.d
      if (over > 0) v.addScaledVector(c.n, -over * 0.92)
    }
    v.y *= 0.62
    if (v.y < -0.3) v.y = -0.3 + (v.y + 0.3) * 0.25
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

const vertex = /* glsl */ `
${NOISE_GLSL}
varying vec3 vWorld;
varying vec3 vN;
varying float vLocalY;
varying vec3 vTint;
void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vLocalY = position.y;
  vTint = instanceColor;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragment = /* glsl */ `
${NOISE_GLSL}
uniform float uRadius;
uniform float uLush;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uHaze;
varying vec3 vWorld;
varying vec3 vN;
varying float vLocalY;
varying vec3 vTint;

// Triplanar sampling: read the 2D noise on all three axis planes and blend by the
// surface normal, so detail wraps the stone instead of streaking down its sides.
float tri(vec3 p, vec3 w) {
  return vnoise(p.yz) * w.x + vnoise(p.xz + 31.0) * w.y + vnoise(p.xy + 77.0) * w.z;
}
float triFbm(vec3 p, vec3 w) {
  return tri(p, w) * 0.5 + tri(p * 2.07 + 5.0, w) * 0.3 + tri(p * 4.3 + 11.0, w) * 0.2;
}
vec3 bumpNormal(vec3 pos, vec3 n, float h, float strength) {
  vec3 dpx = dFdx(pos);
  vec3 dpy = dFdy(pos);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - strength * grad);
}

void main() {
  vec3 n0 = normalize(vN);
  vec3 w = pow(abs(n0), vec3(4.0));
  w /= (w.x + w.y + w.z);
  vec3 q = vWorld * 9.0;

  float big = triFbm(vWorld * 2.2, w);
  float grain = tri(q * 3.0, w);
  float pits = tri(q * 1.3 + 3.0, w);
  // faint sedimentary banding, warped so it isn't ruler-straight
  float strata = sin(vWorld.y * 38.0 + big * 6.0) * 0.5 + 0.5;

  vec3 c = vTint * (0.78 + big * 0.35);
  c *= 0.92 + strata * 0.1;
  c *= 0.86 + grain * 0.24;
  // darker crevices and pitting
  float crevice = smoothstep(0.42, 0.25, big);
  c *= 1.0 - crevice * 0.35 - smoothstep(0.75, 0.9, pits) * 0.18;
  // pale grey-green lichen spots on the top faces
  float lichen = smoothstep(0.74, 0.8, tri(q * 1.4 + 50.0, w)) * smoothstep(0.2, 0.7, n0.y);
  c = mix(c, vec3(0.68, 0.69, 0.58), lichen * 0.28);

  // moss creeps over the upward faces once the green front has passed
  vec2 p = vWorld.xz;
  float green = smoothstep(uRadius, uRadius - 2.0, growthDistance(p));
  float moss = smoothstep(0.25, 0.85, n0.y) * green * (0.35 + 0.6 * uLush) * smoothstep(0.35, 0.65, fbm(p * 7.0 + 5.0));
  c = mix(c, vec3(0.33, 0.47, 0.17) * (0.8 + grain * 0.3), clamp(moss, 0.0, 0.9));

  float hgt = big * 0.6 + grain * 0.25 - crevice * 0.4 - smoothstep(0.75, 0.9, pits) * 0.2;
  vec3 n = bumpNormal(vWorld, n0, hgt * 0.035, 1.0);

  vec3 L = normalize(vec3(-0.45, 0.75, 0.35));
  float diff = max(dot(n, L), 0.0);
  // darker where the rock meets the soil
  float ao = mix(0.55, 1.0, smoothstep(-0.3, 0.25, vLocalY)) * (1.0 - crevice * 0.25);
  vec3 lit = c * (uSky * (0.55 + 0.3 * n.y) + uSun * diff * 1.0) * ao;
  // a little sheen on sunlit faces
  lit += uSun * pow(max(dot(reflect(-L, n), normalize(cameraPosition - vWorld)), 0.0), 12.0) * 0.06;

  float dist = length(vWorld - cameraPosition);
  float air = 1.0 - exp(-max(dist - 8.0, 0.0) * 0.0075);
  gl_FragColor = vec4(mix(lit, uHaze, air * 0.8), 1.0);
}
`

type Placement = { x: number; z: number; size: number; h?: number }

// True when (x, z) is under a boulder, so grass and flowers leave its top bare.
export function underBoulder(x: number, z: number) {
  return ROCKS.boulders.some((b) => Math.hypot(x - b.x, z - b.z) < b.size * 0.95)
}

// Rest each rock on the terrain, partly buried, at a random yaw and slight tilt.
function fill(mesh: THREE.InstancedMesh, items: Placement[], seed: number) {
  const r = rng(seed)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()
  const col = new THREE.Color()
  items.forEach((it, i) => {
    e.set((r() - 0.5) * 0.35, r() * Math.PI * 2, (r() - 0.5) * 0.35)
    q.setFromEuler(e)
    scl.set(it.size * (0.85 + r() * 0.35), it.size * (0.85 + r() * 0.45) * (it.h ?? 1), it.size * (0.85 + r() * 0.35))
    pos.set(it.x, terrainHeight(it.x, it.z) - scl.y * ROCKS.sink, it.z)
    mesh.setMatrixAt(i, m.compose(pos, q, scl))
    col.set(STONE_COLORS[Math.floor(r() * STONE_COLORS.length)])
    mesh.setColorAt(i, col)
  })
  mesh.count = items.length
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

// Scatter over the part of the ground the camera sees; stones cluster, pebbles drift.
function scatter(layout: GardenLayout, count: number, [lo, hi]: number[], seed: number, clustered: boolean) {
  const r = rng(seed)
  const zNear = layout.zNear + 0.2
  const zFar = -14
  const out: Placement[] = []
  let guard = 0
  while (out.length < count && guard++ < count * 60) {
    const z = zFar + Math.pow(r(), 0.7) * (zNear - zFar)
    const x = (r() * 2 - 1) * (layout.halfWidth(z) + 0.6)
    // keep her lap and the ground right under her clear
    if (Math.abs(x) < 1.0 && z > -1.6 && z < 0.9) continue
    const patch = fbm(x * 0.5 + 120, z * 0.5 + 120)
    if (clustered && patch < 0.55) continue
    if (!clustered && patch < 0.35 + r() * 0.2) continue
    out.push({ x, z, size: lo + Math.pow(r(), 2) * (hi - lo) })
  }
  return out
}

function useRockMesh(detail: number, seed: number, max: number, material: THREE.ShaderMaterial) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(rockGeometry(detail, seed), material, max)
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3)
    m.frustumCulled = false
    return m
  }, [detail, seed, max, material])
  useEffect(
    () => () => {
      mesh.geometry.dispose()
      mesh.dispose()
    },
    [mesh],
  )
  return mesh
}

export function Rocks({ uniforms, layout, mobile }: { uniforms: SharedUniforms; layout: GardenLayout; mobile: boolean }) {
  const material = useMemo(
    () => new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment }),
    [uniforms],
  )
  useEffect(() => () => material.dispose(), [material])

  const k = mobile ? 1 : 0
  const boulders = useRockMesh(mobile ? 4 : 5, 41, ROCKS.boulders.length, material)
  const stones = useRockMesh(2, 57, ROCKS.stones.count[k], material)
  const pebbles = useRockMesh(1, 83, ROCKS.pebbles.count[k], material)

  useEffect(() => {
    fill(boulders, ROCKS.boulders, 7)
    fill(stones, scatter(layout, ROCKS.stones.count[k], ROCKS.stones.size, 11, true), 13)
    fill(pebbles, scatter(layout, ROCKS.pebbles.count[k], ROCKS.pebbles.size, 17, false), 19)
  }, [layout, k, boulders, stones, pebbles])

  return (
    <>
      <primitive object={boulders} />
      <primitive object={stones} />
      <primitive object={pebbles} />
    </>
  )
}
