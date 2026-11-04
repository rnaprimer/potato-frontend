import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { rng } from '../potato-field'
import type { GardenLayout } from './garden-state'
import { NOISE_GLSL, fbm } from './noise'
import { underBoulder } from './rocks'
import type { SharedUniforms } from './terrain'

const SEGMENTS = 5

// One curved, tapered blade: x in [-0.5, 0.5] across, y = 0..1 along its length.
function bladeGeometry() {
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i < SEGMENTS; i++) {
    const t = i / SEGMENTS
    pos.push(-0.5, t, 0, 0.5, t, 0)
  }
  pos.push(0, 1, 0)
  for (let i = 0; i < SEGMENTS - 1; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const last = (SEGMENTS - 1) * 2
  idx.push(last, last + 1, last + 2)
  return { pos, idx }
}

const vertex = /* glsl */ `
${NOISE_GLSL}
attribute vec2 aRoot;
attribute vec4 aShape; // height, width, yaw, lean
attribute vec4 aVar;   // hue shift, brightness, wind phase, flexibility
uniform float uRadius;
uniform float uLush;
uniform float uTime;
uniform float uWind;
uniform vec2 uFade;
varying float vT;
varying vec3 vColor;
varying vec3 vN;
varying float vHaze;

void main() {
  float t = position.y;
  // blades rise just behind the green front, so the turf leads and grass follows
  float g = clamp((uRadius - 0.4 - growthDistance(aRoot)) / 3.0, 0.0, 1.0);
  g = g * g * (3.0 - 2.0 * g);
  // a few hardy dry tufts stand on the bare earth from the start, then green up
  float tuft = step(0.9, aVar.x);
  float alive = g;
  g = max(g, tuft * 0.38);

  vec3 root = vec3(aRoot.x, terrainHeight(aRoot), aRoot.y);
  float camDist = length(root - cameraPosition);
  float far = 1.0 - smoothstep(uFade.x - 2.0, uFade.y - 3.0, camDist);
  // meadow patches: taller tussocks, shorter worn spots, drier tints
  float patchN = fbm(aRoot * 0.45 + 11.0);
  float dry = smoothstep(0.55, 0.8, fbm(aRoot * 0.3 + 5.0));
  float h = aShape.x * g * (0.65 + 0.4 * uLush) * far * (0.5 + patchN * 1.0);
  float w = aShape.y * (0.55 + 0.45 * g) * (1.0 - t * 0.9);

  vec3 local = vec3(position.x * w, t * h, aShape.w * t * t * h);
  float c = cos(aShape.z);
  float s = sin(aShape.z);
  vec3 p = vec3(local.x * c + local.z * s, local.y, -local.x * s + local.z * c);

  float gust = sin(uTime * 1.3 + aVar.z + aRoot.x * 0.35 + aRoot.y * 0.22) * 0.65
    + sin(uTime * 2.7 + aVar.z * 1.7 + aRoot.x * 0.9) * 0.25;
  float bend = gust * uWind * t * t * h * 0.5 * aVar.w;
  p.x += bend;
  p.z += bend * 0.3;
  p.y -= abs(bend) * 0.35 * t;

  vN = normalize(vec3(s, 0.3, c));
  vT = t;

  vec3 base = vec3(0.12, 0.25, 0.07);
  vec3 mid = vec3(0.29, 0.49, 0.15);
  vec3 tip = vec3(0.64, 0.72, 0.33);
  vec3 col = mix(base, mid, smoothstep(0.0, 0.5, t));
  col = mix(col, tip, smoothstep(0.55, 1.0, t) * 0.65);
  col *= aVar.y;
  col.r *= 1.0 + aVar.x * 0.3;
  col.b *= 1.0 - aVar.x * 0.25;
  col *= 0.85 + patchN * 0.3;
  col = mix(col, col * vec3(1.18, 1.06, 0.72), dry * 0.55 * (1.0 - uLush));
  col = mix(col, col * vec3(0.78, 0.96, 0.72), uLush * 0.55);
  vec3 straw = mix(vec3(0.36, 0.27, 0.16), vec3(0.62, 0.52, 0.33), t);
  col = mix(straw * aVar.y, col, alive);
  vColor = col;
  vHaze = smoothstep(uFade.x - 6.0, uFade.y, camDist);

  gl_Position = projectionMatrix * viewMatrix * vec4(root + p, 1.0);
}
`

const fragment = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uHaze;
varying float vT;
varying vec3 vColor;
varying vec3 vN;
varying float vHaze;

void main() {
  vec3 L = normalize(vec3(-0.45, 0.75, 0.35));
  float diff = abs(dot(normalize(vN), L));
  float ao = mix(0.42, 1.0, smoothstep(0.0, 0.65, vT));
  vec3 lit = vColor * (uSky * 0.55 + uSun * (0.32 + diff * 0.45)) * ao;
  lit += uSun * vColor * pow(vT, 3.0) * 0.3; // light glancing through the tips
  gl_FragColor = vec4(mix(lit, uHaze, vHaze), 1.0);
}
`

// Instanced blades scattered in clumps across the part of the ground the camera sees.
function scatter(layout: GardenLayout, count: number) {
  const r = rng(77)
  const zNear = layout.zNear + 0.25
  const zFar = -9
  const maxHalf = layout.halfWidth(zFar) + 0.6
  const root = new Float32Array(count * 2)
  const shape = new Float32Array(count * 4)
  const vari = new Float32Array(count * 4)
  let cx = 0
  let cz = 0
  for (let i = 0; i < count; i++) {
    let x: number
    let z: number
    if (i % 9 === 0 || r() < 0.3) {
      // new clump centre (or a stray blade) anywhere in view
      do {
        z = zFar + r() * (zNear - zFar)
        x = (r() * 2 - 1) * maxHalf
      } while (Math.abs(x) > layout.halfWidth(z) + 0.6)
      cx = x
      cz = z
    } else {
      const a = r() * Math.PI * 2
      const rad = Math.sqrt(r()) * 0.16
      x = cx + Math.cos(a) * rad
      z = cz + Math.sin(a) * rad
    }
    if (underBoulder(x, z)) {
      i--
      continue
    }
    let height = 0.12 + Math.pow(r(), 1.3) * 0.42 + (r() < 0.09 ? 0.3 * r() + 0.15 : 0)
    // keep the blades in front of her feet low enough to overlap, not hide
    if (z > -0.2 && z < 0.9 && Math.abs(x) < 0.8) height *= 0.42
    root[i * 2] = x
    root[i * 2 + 1] = z
    shape.set([height, 0.02 + r() * 0.022, r() * Math.PI * 2, -0.2 + r() * 0.95], i * 4)
    vari.set([r() * 2 - 1, 0.78 + r() * 0.42, r() * 6.28, 0.6 + r() * 0.8], i * 4)
  }
  return { root, shape, vari }
}

export function GrassField({ uniforms, layout, mobile }: { uniforms: SharedUniforms; layout: GardenLayout; mobile: boolean }) {
  const geometry = useMemo(() => {
    // GRASS DENSITY: blade count on phones / desktops
    const count = mobile ? 22000 : 64000
    const { pos, idx } = bladeGeometry()
    const g = new THREE.InstancedBufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    const { root, shape, vari } = scatter(layout, count)
    g.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 2))
    g.setAttribute('aShape', new THREE.InstancedBufferAttribute(shape, 4))
    g.setAttribute('aVar', new THREE.InstancedBufferAttribute(vari, 4))
    g.instanceCount = count
    return g
  }, [layout, mobile])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.DoubleSide,
      }),
    [uniforms],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}

/*
 * WILDFLOWERS: small five-petal heads on stalks, scattered in patches through the grass.
 * They open once the land turns lush. Tweak FLOWER_COLORS and the counts below.
 */
const FLOWER_COLORS = ['#e889b5', '#d45c9a', '#f5f1e8', '#c6a8e0', '#f3cf55', '#f5f1e8']

// Flower template: petals and centre in a unit disc (kind 0 petal, 1 centre), plus a stalk (kind 2).
function flowerGeometry() {
  const pos: number[] = []
  const kind: number[] = []
  const tri = (a: number[], b: number[], c: number[], k: number) => {
    pos.push(...a, ...b, ...c)
    kind.push(k, k, k)
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const cx = Math.cos(a) * 0.27
    const cy = Math.sin(a) * 0.27
    const steps = 6
    for (let j = 0; j < steps; j++) {
      const p0 = (j / steps) * Math.PI * 2
      const p1 = ((j + 1) / steps) * Math.PI * 2
      const pt = (p: number) => {
        const ex = Math.cos(p) * 0.25
        const ey = Math.sin(p) * 0.13
        return [cx + ex * Math.cos(a) - ey * Math.sin(a), cy + ex * Math.sin(a) + ey * Math.cos(a), 0]
      }
      tri([cx, cy, 0], pt(p0), pt(p1), 0)
    }
  }
  for (let j = 0; j < 8; j++) {
    const p0 = (j / 8) * Math.PI * 2
    const p1 = ((j + 1) / 8) * Math.PI * 2
    tri([0, 0, 0.01], [Math.cos(p0) * 0.12, Math.sin(p0) * 0.12, 0.01], [Math.cos(p1) * 0.12, Math.sin(p1) * 0.12, 0.01], 1)
  }
  tri([-0.5, 0, 0], [0.5, 0, 0], [0.5, 1, 0], 2)
  tri([-0.5, 0, 0], [0.5, 1, 0], [-0.5, 1, 0], 2)
  const g = new THREE.InstancedBufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1))
  return g
}

const flowerVertex = /* glsl */ `
${NOISE_GLSL}
attribute float aKind;
attribute vec2 aRoot;
attribute vec4 aShape; // stalk height, head size, head tilt, lushness at which it opens
attribute vec4 aColor; // rgb, wind phase
uniform float uRadius;
uniform float uLush;
uniform float uTime;
uniform float uWind;
uniform vec2 uFade;
varying vec3 vColor;
varying float vHaze;
varying float vKind;

void main() {
  float g = clamp((uRadius - 1.5 - growthDistance(aRoot)) / 3.0, 0.0, 1.0);
  float open = smoothstep(aShape.w, aShape.w + 0.18, uLush) * g;
  vec3 root = vec3(aRoot.x, terrainHeight(aRoot), aRoot.y);
  float camDist = length(root - cameraPosition);
  open *= 1.0 - smoothstep(uFade.x - 2.0, uFade.y - 3.0, camDist);

  vec3 local;
  if (aKind > 1.5) {
    local = vec3(position.x * 0.007, position.y * aShape.x * open, 0.0);
  } else {
    vec2 head = position.xy * aShape.y * open;
    // tip the face up toward the sky
    local = vec3(head.x, aShape.x * open + head.y * cos(aShape.z), position.z - head.y * sin(aShape.z));
  }
  local.x += sin(uTime * 1.4 + aColor.a) * 0.03 * uWind * local.y;

  vec3 toCam = cameraPosition - root;
  float yaw = atan(toCam.x, toCam.z);
  float c = cos(yaw);
  float s = sin(yaw);
  vec3 p = vec3(local.x * c + local.z * s, local.y, -local.x * s + local.z * c);

  vKind = aKind;
  vColor = aKind > 1.5 ? vec3(0.27, 0.45, 0.16) : aKind > 0.5 ? vec3(0.95, 0.78, 0.25) : aColor.rgb;
  vHaze = smoothstep(uFade.x - 6.0, uFade.y, camDist);
  gl_Position = projectionMatrix * viewMatrix * vec4(root + p, 1.0);
}
`

const flowerFragment = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uHaze;
varying vec3 vColor;
varying float vHaze;
varying float vKind;
void main() {
  vec3 lit = vColor * (uSky * 0.5 + uSun * 0.62);
  gl_FragColor = vec4(mix(lit, uHaze, vHaze), 1.0);
}
`

function scatterFlowers(layout: GardenLayout, count: number) {
  const r = rng(303)
  const zNear = layout.zNear + 0.3
  const zFar = -12
  const maxHalf = layout.halfWidth(zFar) + 0.5
  const root = new Float32Array(count * 2)
  const shape = new Float32Array(count * 4)
  const color = new Float32Array(count * 4)
  const c = new THREE.Color()
  let placed = 0
  let guard = 0
  while (placed < count && guard++ < count * 40) {
    const z = zFar + Math.pow(r(), 0.8) * (zNear - zFar)
    const x = (r() * 2 - 1) * maxHalf
    if (Math.abs(x) > layout.halfWidth(z) + 0.5) continue
    // flowers gather in drifts rather than sprinkling evenly
    if (fbm(x * 0.35 + 70, z * 0.35 + 70) < 0.5 + r() * 0.12) continue
    // keep clear of her lap and feet
    if (Math.abs(x) < 0.9 && z > -1.5 && z < 0.8) continue
    if (underBoulder(x, z)) continue
    root[placed * 2] = x
    root[placed * 2 + 1] = z
    shape.set([0.16 + r() * 0.28, 0.08 + r() * 0.07, 0.5 + r() * 0.6, 0.25 + r() * 0.5], placed * 4)
    c.set(FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)])
    color.set([c.r, c.g, c.b, r() * 6.28], placed * 4)
    placed++
  }
  return { root, shape, color, placed }
}

export function WildFlowers({ uniforms, layout, mobile }: { uniforms: SharedUniforms; layout: GardenLayout; mobile: boolean }) {
  const geometry = useMemo(() => {
    const g = flowerGeometry()
    // FLOWER DENSITY: instances on phones / desktops
    const { root, shape, color, placed } = scatterFlowers(layout, mobile ? 1200 : 3600)
    g.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 2))
    g.setAttribute('aShape', new THREE.InstancedBufferAttribute(shape, 4))
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 4))
    g.instanceCount = placed
    return g
  }, [layout, mobile])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: flowerVertex,
        fragmentShader: flowerFragment,
        side: THREE.DoubleSide,
      }),
    [uniforms],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
