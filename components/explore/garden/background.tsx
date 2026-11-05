import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../potato-field'
import type { GardenLayout, GardenState } from './garden-state'
import { createFoliageTexture } from './foliage-textures'
import { NOISE_GLSL, fbm, terrainHeight } from './noise'
import type { SharedUniforms } from './terrain'

/*
 * BACKGROUND: tweak here. Two far layers sit behind the walkable terrain, each a strip
 * of land shaped by its own noise, and both slide a little as you scroll (parallax).
 *  - hills:     soft rolling ridges just past the fields, greening late in the scroll
 *  - mountains: a hazy blue range on the horizon
 * `parallax` is how far (world units) a layer rises over the whole scroll; farther
 * layers move more here, which reads as depth against the fixed foreground.
 */
const LAYERS = {
  hills: {
    zFront: -235,
    zBack: -420,
    halfX: 700,
    amp: 26,
    scale: 0.011,
    ridge: 0.25,
    base: -12,
    dry: '#9c8a6c',
    green: '#5f8c4a',
    haze: 0.0026,
    parallax: 3,
  },
  mountains: {
    zFront: -470,
    zBack: -760,
    halfX: 1100,
    amp: 70,
    scale: 0.0055,
    ridge: 0.7,
    base: -30,
    dry: '#7f8794',
    green: '#62807a',
    haze: 0.0022,
    parallax: 9,
  },
}

/*
 * TREES: round-canopied trees in groves on the middle-distance hills.
 * Counts are [desktop, phone]; sizes are world units (she is ~2.4 tall).
 */
const TREES = { count: [150, 60], size: [2.4, 4.6], zNear: -70, zFar: -240 }

const layerVertex = /* glsl */ `
${NOISE_GLSL}
uniform float uAmp;
uniform float uScale;
uniform float uRidgeMix;
uniform float uBase;
uniform float uFront;
varying vec3 vWorld;
varying vec3 vN;
float layerH(vec2 p) {
  // two broad octaves only, so the far hills read as smooth rounded shapes
  float soft = 0.7 * vnoise(p * uScale + 40.0) + 0.3 * vnoise(p * uScale * 1.9 + 57.0);
  float ridge = 1.0 - abs(2.0 * (0.75 * vnoise(p * uScale * 0.6 + 90.0) + 0.25 * vnoise(p * uScale * 1.1 + 13.0)) - 1.0);
  ridge = smoothstep(0.0, 1.0, ridge);
  // rise from the front edge so the strip never shows a cliff
  float rise = smoothstep(uFront, uFront - 60.0, p.y);
  return uBase + mix(soft, ridge * ridge, uRidgeMix) * uAmp * rise;
}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec2 p = w.xz;
  float e = 2.0;
  float hx = layerH(p + vec2(e, 0.0)) - layerH(p - vec2(e, 0.0));
  float hz = layerH(p + vec2(0.0, e)) - layerH(p - vec2(0.0, e));
  vN = normalize(vec3(-hx, 2.0 * e, -hz));
  w.y += layerH(p);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const layerFragment = /* glsl */ `
${NOISE_GLSL}
uniform float uRadius;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uHaze;
uniform vec3 uDry;
uniform vec3 uGreen;
uniform float uAir;
varying vec3 vWorld;
varying vec3 vN;
void main() {
  vec2 p = vWorld.xz;
  // the green front reaches these far layers only near the end of the scroll
  float green = smoothstep(120.0, 230.0, uRadius) * smoothstep(0.3, 0.6, fbm(p * 0.02 + 7.0) + 0.25);
  vec3 c = mix(uDry, uGreen, green) * (0.94 + vnoise(p * 0.02) * 0.12);
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-0.45, 0.75, 0.35));
  vec3 lit = c * (uSky * (0.55 + 0.25 * n.y) + uSun * max(dot(n, L), 0.0) * 0.6);
  float dist = length(vWorld - cameraPosition);
  float air = 1.0 - exp(-dist * uAir);
  // the tops fade a touch more, like real atmospheric depth
  air = clamp(air + smoothstep(0.0, 60.0, vWorld.y) * 0.1, 0.0, 0.92);
  gl_FragColor = vec4(mix(lit, uHaze, air), 1.0);
}
`

type LayerSpec = (typeof LAYERS)[keyof typeof LAYERS]

function useLayer(spec: LayerSpec, uniforms: SharedUniforms, mobile: boolean) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(spec.halfX * 2, spec.zFront - spec.zBack, mobile ? 160 : 260, mobile ? 30 : 48)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, (spec.zFront + spec.zBack) / 2)
    return g
  }, [spec, mobile])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          uAmp: { value: spec.amp },
          uScale: { value: spec.scale },
          uRidgeMix: { value: spec.ridge },
          uBase: { value: spec.base },
          uFront: { value: spec.zFront },
          uDry: { value: new THREE.Color(spec.dry) },
          uGreen: { value: new THREE.Color(spec.green) },
          uAir: { value: spec.haze },
        },
        vertexShader: layerVertex,
        fragmentShader: layerFragment,
      }),
    [spec, uniforms],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  return { geometry, material }
}

// A tree, one unit tall: a tapered trunk with a few branches, and a crown built from
// ~50 leaf-cluster cards scattered through an egg-shaped volume. Each card carries the
// crown's outward normal, so light wraps the whole canopy like real foliage.
function treeGeometry(seed: number) {
  const r = rng(seed)
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const kind: number[] = []
  const inner: number[] = []
  const idx: number[] = []
  let base = 0

  const addSolid = (g: THREE.BufferGeometry) => {
    const p = g.getAttribute('position')
    const n = g.getAttribute('normal')
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i))
      nor.push(n.getX(i), n.getY(i), n.getZ(i))
      uv.push(0.5, 0.5)
      kind.push(0)
      inner.push(0.6)
    }
    const gi = g.index!.array
    for (let i = 0; i < gi.length; i++) idx.push(gi[i] + base)
    base += p.count
    g.dispose()
  }

  const trunk = new THREE.CylinderGeometry(0.028, 0.06, 0.62, 7)
  trunk.translate(0, 0.31, 0)
  addSolid(trunk)
  for (let b = 0; b < 3; b++) {
    const br = new THREE.CylinderGeometry(0.01, 0.022, 0.26, 5)
    br.translate(0, 0.13, 0)
    br.rotateZ(0.7 + r() * 0.4)
    br.rotateY((b / 3) * Math.PI * 2 + r())
    br.translate(0, 0.42 + r() * 0.12, 0)
    addSolid(br)
  }

  const C = new THREE.Vector3(0, 0.74, 0)
  const R = new THREE.Vector3(0.34, 0.27, 0.34)
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const d = new THREE.Vector3()
  const corner = new THREE.Vector3()
  for (let k = 0; k < 52; k++) {
    d.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize()
    const t = 0.5 + 0.5 * Math.sqrt(r())
    const p = C.clone().add(d.clone().multiply(R).multiplyScalar(t))
    const n = p.clone().sub(C).divide(R).normalize()
    const sz = 0.2 + r() * 0.14
    q.setFromEuler(e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI))
    const corners = [
      [-0.5, -0.5, 0, 0],
      [0.5, -0.5, 1, 0],
      [0.5, 0.5, 1, 1],
      [-0.5, 0.5, 0, 1],
    ]
    for (const [cx, cy, u, v] of corners) {
      corner.set(cx * sz, cy * sz, 0).applyQuaternion(q).add(p)
      pos.push(corner.x, corner.y, corner.z)
      nor.push(n.x, n.y, n.z)
      uv.push(u, v)
      kind.push(1)
      inner.push(t)
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
    base += 4
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1))
  g.setAttribute('aInner', new THREE.Float32BufferAttribute(inner, 1))
  g.setIndex(idx)
  return g
}

const treeVertex = /* glsl */ `
attribute float aKind;
attribute float aInner;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vTint;
varying vec2 vUv;
varying float vKind;
varying float vInner;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vTint = instanceColor;
  vUv = uv;
  vKind = aKind;
  vInner = aInner;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const treeFragment = /* glsl */ `
uniform float uLush;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uHaze;
uniform sampler2D uFoliage;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vTint;
varying vec2 vUv;
varying float vKind;
varying float vInner;
void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-0.45, 0.75, 0.35));
  vec3 c;
  float light;
  if (vKind > 0.5) {
    vec4 leaf = texture2D(uFoliage, vUv);
    if (leaf.a < 0.5) discard;
    // olive and dusty when the land is dry, fresh green once it is lush
    vec3 dry = leaf.rgb * vec3(1.25, 1.08, 0.7);
    c = mix(dry, leaf.rgb, 0.35 + 0.65 * uLush) * vTint * 1.15;
    // wrapped light across the crown, darker deep inside it
    light = clamp(dot(n, L) * 0.55 + 0.5, 0.0, 1.0) * mix(0.5, 1.0, smoothstep(0.5, 1.0, vInner));
  } else {
    c = vec3(0.33, 0.26, 0.19);
    light = max(dot(n, L), 0.0) * 0.6 + 0.25;
  }
  vec3 lit = c * (uSky * 0.45 + uSun * light * 0.85);
  float dist = length(vWorld - cameraPosition);
  float air = clamp(1.0 - exp(-max(dist - 10.0, 0.0) * 0.0075), 0.0, 0.85);
  gl_FragColor = vec4(mix(lit, uHaze, air), 1.0);
}
`

// per-tree tints multiply the painted foliage, so they stay pale
const TREE_GREENS = ['#ffffff', '#e8f2d8', '#f3f8e6', '#d9e8c8', '#fff5df']

function DistantTrees({ uniforms, layout, mobile }: { uniforms: SharedUniforms; layout: GardenLayout; mobile: boolean }) {
  const foliage = useMemo(() => createFoliageTexture(), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uFoliage: { value: foliage } },
        vertexShader: treeVertex,
        fragmentShader: treeFragment,
        side: THREE.DoubleSide,
      }),
    [uniforms, foliage],
  )
  const max = TREES.count[mobile ? 1 : 0]
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(treeGeometry(5), material, max)
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3)
    m.frustumCulled = false
    return m
  }, [material, max])
  useEffect(
    () => () => {
      mesh.geometry.dispose()
      mesh.dispose()
      material.dispose()
      foliage.dispose()
    },
    [mesh, material, foliage],
  )

  useEffect(() => {
    const r = rng(611)
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scl = new THREE.Vector3()
    const col = new THREE.Color()
    let placed = 0
    let guard = 0
    while (placed < max && guard++ < max * 80) {
      const z = TREES.zFar + Math.pow(r(), 1.4) * (TREES.zNear - TREES.zFar)
      const x = (r() * 2 - 1) * layout.halfWidth(z) * 1.1
      // groves, not an even sprinkle; and leave the sky behind her head clear
      if (fbm(x * 0.03 + 300, z * 0.03 + 300) < 0.56) continue
      if (Math.abs(x) < 26 && z > -170) continue
      const s = TREES.size[0] + r() * (TREES.size[1] - TREES.size[0])
      pos.set(x, terrainHeight(x, z) - s * 0.03, z)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2)
      scl.set(s * (0.85 + r() * 0.35), s, s * (0.85 + r() * 0.35))
      mesh.setMatrixAt(placed, m4.compose(pos, q, scl))
      mesh.setColorAt(placed, col.set(TREE_GREENS[Math.floor(r() * TREE_GREENS.length)]))
      placed++
    }
    mesh.count = placed
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [mesh, layout, max])

  return <primitive object={mesh} />
}

// Far hills, mountains and trees. The two far layers rise a little as you scroll.
export function Backdrop({
  uniforms,
  layout,
  state,
  mobile,
}: {
  uniforms: SharedUniforms
  layout: GardenLayout
  state: GardenState
  mobile: boolean
}) {
  const hills = useLayer(LAYERS.hills, uniforms, mobile)
  const mountains = useLayer(LAYERS.mountains, uniforms, mobile)
  const hillsRef = useRef<THREE.Mesh>(null)
  const mountainsRef = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (hillsRef.current) hillsRef.current.position.y = state.scroll * LAYERS.hills.parallax
    if (mountainsRef.current) mountainsRef.current.position.y = state.scroll * LAYERS.mountains.parallax
  })
  return (
    <>
      <mesh ref={mountainsRef} geometry={mountains.geometry} material={mountains.material} renderOrder={-4} frustumCulled={false} />
      <mesh ref={hillsRef} geometry={hills.geometry} material={hills.material} renderOrder={-3} frustumCulled={false} />
      <DistantTrees uniforms={uniforms} layout={layout} mobile={mobile} />
    </>
  )
}
