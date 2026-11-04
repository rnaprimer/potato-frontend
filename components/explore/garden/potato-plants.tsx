import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { rng } from '../potato-field'
import { FRAMERS, POTATOES, SPROUT_ON, type GardenLayout, type GardenState } from './garden-state'
import { createLeafTextures } from './foliage-textures'
import { terrainHeight } from './noise'
import { POTATO_SHADOW_SLOT } from './potatoes'
import type { SharedUniforms } from './terrain'

const PLANT_SHADOW_SLOT = POTATO_SHADOW_SLOT + POTATOES.length

// A single leaflet along +y. The outline, veins and colour come from the painted leaf
// texture (alpha-cut), the geometry just gives it a real 3D form: folded along the
// midrib, gently rippled, and curling down toward the tip.
function leaflet(len: number, wid: number, tint: THREE.Color) {
  const nu = 8
  const nv = 12
  const pos: number[] = []
  const col: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= nv; j++) {
    const v = j / nv
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1
      const x = u * wid
      const fold = Math.abs(u) * wid * 0.32
      const ripple = Math.sin(v * 9 + u * 2) * wid * 0.03 * Math.abs(u)
      const curl = -v * v * len * 0.22
      pos.push(x, v * len, fold + ripple + curl)
      col.push(tint.r, tint.g, tint.b)
      uv.push(i / nu, v)
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i
      const b = a + nu + 1
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

// Leaf stalk; it samples the texture's pale midrib so it matches the veins.
function stalk(len: number, radius: number) {
  const g = new THREE.CylinderGeometry(radius * 0.6, radius, len, 5, 1, true)
  g.translate(0, len / 2, 0)
  g.deleteAttribute('normal')
  const n = g.getAttribute('position').count
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.85), 3))
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2).fill(0.5), 2))
  return g
}

// A pinnate potato leaf of unit length: paired leaflets of rising size, small leaflets
// tucked between the pairs (as on real potato leaves), and a terminal leaflet, the
// whole leaf arched downward. Built once and shared by every plant.
function compoundLeaf(seed: number) {
  const r = rng(seed)
  // tints multiply the painted texture, so they stay near white
  const tints = ['#ffffff', '#eef7e2', '#f7fff0', '#e4f0d4']
  const tint = () => new THREE.Color(tints[Math.floor(r() * tints.length)])
  const parts: THREE.BufferGeometry[] = [stalk(0.78, 0.012)]
  const pairs = 3
  for (let i = 0; i < pairs; i++) {
    const at = 0.18 + (i / pairs) * 0.5
    const len = 0.2 + i * 0.05 + r() * 0.03
    for (const side of [-1, 1]) {
      const g = leaflet(len, len * 0.5, tint())
      g.rotateY(side * 0.25)
      g.rotateZ(-side * (1.05 - i * 0.12 + r() * 0.15))
      g.translate(0, at, 0)
      parts.push(g)
      // a tiny leaflet between this pair and the next
      if (i < pairs - 1) {
        const small = leaflet(len * 0.38, len * 0.2, tint())
        small.rotateZ(-side * 1.3)
        small.translate(0, at + 0.09, 0)
        parts.push(small)
      }
    }
  }
  const tip = leaflet(0.3, 0.15, tint())
  tip.translate(0, 0.76, 0)
  parts.push(tip)
  const merged = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  // arch the whole leaf so it droops like a real one
  const p = merged.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    p.setZ(i, p.getZ(i) - y * y * 0.32)
  }
  merged.computeVertexNormals()
  return merged
}

// Three white potato blossoms with yellow centres, as one small mesh of unit size.
function blossomCluster() {
  const pos: number[] = []
  const col: number[] = []
  const white = new THREE.Color('#f7f4ec')
  const yellow = new THREE.Color('#f2c53d')
  const heads = [
    [0, 0, 0, 0.0],
    [0.32, -0.12, 0.1, 1.2],
    [-0.28, -0.08, -0.12, 2.6],
  ]
  for (const [hx, hy, hz, spin] of heads) {
    const put = (x: number, y: number, c: THREE.Color) => {
      // heads face up and slightly out
      pos.push(hx + x, hy + 0.04 + Math.abs(x) * 0.15, hz + y)
      col.push(c.r, c.g, c.b)
    }
    for (let i = 0; i < 5; i++) {
      const a0 = spin + (i / 5) * Math.PI * 2
      const a1 = a0 + 0.7
      const am = (a0 + a1) / 2
      put(0, 0, white)
      put(Math.cos(a0) * 0.22, Math.sin(a0) * 0.22, white)
      put(Math.cos(am) * 0.26, Math.sin(am) * 0.26, white)
      put(0, 0, white)
      put(Math.cos(am) * 0.26, Math.sin(am) * 0.26, white)
      put(Math.cos(a1) * 0.22, Math.sin(a1) * 0.22, white)
    }
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2
      const a1 = ((i + 1) / 6) * Math.PI * 2
      put(0, 0, yellow)
      put(Math.cos(a0) * 0.07, Math.sin(a0) * 0.07, yellow)
      put(Math.cos(a1) * 0.07, Math.sin(a1) * 0.07, yellow)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

type LeafSpec = { at: number; yaw: number; pitch: number; scale: number; template: number }
type PlantSpec = { curve: THREE.CatmullRomCurve3; leaves: LeafSpec[]; height: number }

function plantSpec(seed: number, height: number, leafCount: number, outward?: THREE.Vector2): PlantSpec {
  const r = rng(seed)
  const lean = new THREE.Vector3((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25)
  // stems in a clump splay away from its centre
  if (outward) lean.add(new THREE.Vector3(outward.x, 0, outward.y))
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean.x * 0.3, height * 0.35, lean.z * 0.3),
    new THREE.Vector3(lean.x * 0.8, height * 0.7, lean.z * 0.8),
    new THREE.Vector3(lean.x, height, lean.z),
  ])
  const leaves: LeafSpec[] = []
  const golden = 2.39996
  const yaw0 = r() * Math.PI * 2
  for (let k = 0; k < leafCount; k++) {
    const at = 0.28 + (k / Math.max(1, leafCount - 1)) * 0.72
    leaves.push({
      at,
      yaw: yaw0 + k * golden,
      pitch: 1.45 - at * 0.5 + (r() - 0.5) * 0.25,
      scale: height * (0.75 - at * 0.25) * (0.9 + r() * 0.2),
      template: Math.floor(r() * 3),
    })
  }
  return { curve, leaves, height }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Grows a plant to progress g: the stem rises, then each leaf scales up and unfurls
// from folded-upright to its resting angle, lowest leaves first.
function applyGrowth(group: THREE.Group, spec: PlantSpec, g: number, tmp: THREE.Vector3) {
  const stem = group.children[0]
  const gs = smooth(0, 0.55, g)
  stem.scale.set(0.4 + gs * 0.6, Math.max(gs, 0.001), 0.4 + gs * 0.6)
  spec.leaves.forEach((leaf, k) => {
    const node = group.children[k + 1]
    const start = 0.15 + (k / spec.leaves.length) * 0.55
    const lg = smooth(start, start + 0.35, g)
    spec.curve.getPoint(leaf.at, tmp)
    node.position.set(tmp.x * gs, tmp.y * gs, tmp.z * gs)
    node.rotation.set(0, leaf.yaw, 0)
    const inner = node.children[0]
    inner.rotation.set(leaf.pitch * lg, 0, 0)
    inner.scale.setScalar(Math.max(leaf.scale * lg, 0.0001))
  })
  // blossoms open last, at the top of the stem
  const bloom = group.children[spec.leaves.length + 1]
  if (bloom) {
    spec.curve.getPoint(1, tmp)
    bloom.position.set(tmp.x * gs, tmp.y * gs, tmp.z * gs)
    bloom.scale.setScalar(Math.max(smooth(0.78, 1, g) * spec.height * 0.32, 0.0001))
  }
}

function Plant({
  spec,
  templates,
  material,
  stemMaterial,
  blossom,
  blossomMaterial,
  setRef,
}: {
  spec: PlantSpec
  templates: THREE.BufferGeometry[]
  material: THREE.Material
  stemMaterial: THREE.Material
  blossom?: THREE.BufferGeometry
  blossomMaterial?: THREE.Material
  setRef: (g: THREE.Group | null) => void
}) {
  const stemGeo = useMemo(() => new THREE.TubeGeometry(spec.curve, 16, 0.011 * Math.max(1, spec.height), 6), [spec])
  useEffect(() => () => stemGeo.dispose(), [stemGeo])
  return (
    <group ref={setRef}>
      <mesh geometry={stemGeo} material={stemMaterial} />
      {spec.leaves.map((leaf, k) => (
        <group key={k}>
          <mesh geometry={templates[leaf.template]} material={material} />
        </group>
      ))}
      {blossom && blossomMaterial && <mesh geometry={blossom} material={blossomMaterial} />}
    </group>
  )
}

export function PotatoPlants({
  layout,
  state,
  uniforms,
  mobile,
}: {
  layout: GardenLayout
  state: GardenState
  uniforms: SharedUniforms
  mobile: boolean
}) {
  const templates = useMemo(() => [11, 23, 37].map(compoundLeaf), [])
  const blossom = useMemo(() => blossomCluster(), [])
  const leafTextures = useMemo(() => createLeafTextures(), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: leafTextures.map,
        bumpMap: leafTextures.bumpMap,
        bumpScale: 1.5,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.72,
        metalness: 0,
      }),
    [leafTextures],
  )
  const blossomMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6 }),
    [],
  )
  const stemMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#476f2a', roughness: 0.7 }), [])
  useEffect(
    () => () => {
      templates.forEach((t) => t.dispose())
      blossom.dispose()
      material.dispose()
      blossomMaterial.dispose()
      leafTextures.map.dispose()
      leafTextures.bumpMap.dispose()
      stemMaterial.dispose()
    },
    [templates, blossom, material, blossomMaterial, stemMaterial, leafTextures],
  )

  // Each potato grows a bushy clump of stems (3 on desktop, 2 on phones), all sharing
  // that potato's growth value, like a real potato plant.
  const sprouts = useMemo(() => {
    const stems = mobile ? 2 : 3
    return SPROUT_ON.flatMap((pi, k) =>
      Array.from({ length: stems }, (_, j) => {
        const a = (j / stems) * Math.PI * 2 + k
        const dir = new THREE.Vector2(Math.cos(a), Math.sin(a))
        return {
          potato: pi,
          plant: k,
          offset: dir.clone().multiplyScalar(0.06),
          spec: plantSpec(500 + k * 7 + j, (0.55 + (k % 3) * 0.12) * (j === 0 ? 1.1 : 0.85), j === 0 ? 6 : 5, dir.multiplyScalar(0.22)),
          visible: mobile ? POTATOES[pi].mobile : true,
        }
      }),
    )
  }, [mobile])
  const framers = useMemo(
    () => FRAMERS.filter((_, i) => !mobile || i < 4).map((f, i) => ({ ...f, spec: plantSpec(900 + i, 1, 9) })),
    [mobile],
  )

  const sproutRefs = useRef<(THREE.Group | null)[]>([])
  const framerRefs = useRef<(THREE.Group | null)[]>([])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    sprouts.forEach((s, i) => {
      const group = sproutRefs.current[i]
      const k = s.plant
      const slot = uniforms.uShadows.value[PLANT_SHADOW_SLOT + k]
      const g = state.plants[k]
      if (!group) return
      group.visible = s.visible && g > 0.001
      const land = layout.potatoLandings[s.potato]
      group.position.set(land.x + s.offset.x, land.y - 0.02, land.z + s.offset.y)
      // swell a little more as the garden turns lush
      group.scale.setScalar(1 + state.lush * 0.35)
      applyGrowth(group, s.spec, g, tmp)
      if (slot) slot.set(land.x, land.z, 0.45 * (0.3 + g), group.visible ? 0.35 * g : 0)
    })

    framers.forEach((f, i) => {
      const group = framerRefs.current[i]
      if (!group) return
      const g = smooth(i * 0.08, 0.6 + i * 0.08, state.frame)
      group.visible = g > 0.001
      const z = layout.zNear - f.depth
      const half = layout.halfWidth(z)
      const side = Math.sign(f.u) || 1
      const x = f.u * half + side * state.part * half * 1.3
      group.position.set(x, terrainHeight(x, z) - 0.05 - state.part * 0.3, z)
      group.rotation.set(0, f.yaw, side * state.part * 0.35)
      group.scale.setScalar(f.scale)
      applyGrowth(group, f.spec, g, tmp)
    })
  })

  return (
    <>
      {sprouts.map((s, k) => (
        <Plant
          key={`s${k}`}
          spec={s.spec}
          templates={templates}
          material={material}
          stemMaterial={stemMaterial}
          blossom={blossom}
          blossomMaterial={blossomMaterial}
          setRef={(g) => {
            sproutRefs.current[k] = g
          }}
        />
      ))}
      {framers.map((f, i) => (
        <Plant
          key={`f${i}`}
          spec={f.spec}
          templates={templates}
          material={material}
          stemMaterial={stemMaterial}
          setRef={(g) => {
            framerRefs.current[i] = g
          }}
        />
      ))}
    </>
  )
}
