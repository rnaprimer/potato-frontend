import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { POTATOES, type GardenLayout, type GardenState } from './garden-state'
import { WOMAN_CONTACTS, type SharedUniforms } from './terrain'

export const POTATO_SHADOW_SLOT = WOMAN_CONTACTS.length

const SPRITES = [
  { url: '/explore/potato-sprite.webp', aspect: 251 / 260 },
  { url: '/explore/potato-sprite-small.webp', aspect: 141 / 140 },
]

const FALL = 0.62
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

// Where a potato is at progress t: an accelerating drop from its wing, then two
// shrinking hops with a squash on each impact. Pure function of t, so it scrubs both ways.
function pose(t: number, start: THREE.Vector3, land: THREE.Vector3, size: number, out: THREE.Vector3) {
  const tf = clamp01(t / FALL)
  const glide = 1 - (1 - tf) * (1 - tf)
  out.x = start.x + (land.x - start.x) * glide
  out.z = start.z + (land.z - start.z) * glide
  let lift = (start.y - land.y) * (1 - tf * tf)
  let squash = 0
  if (t > FALL) {
    const b = (t - FALL) / (1 - FALL)
    if (b < 0.55) {
      const u = b / 0.55
      lift = 4 * size * 0.9 * u * (1 - u)
    } else {
      const u = (b - 0.55) / 0.45
      lift = 4 * size * 0.28 * u * (1 - u)
    }
    // short squash pulses as it meets the ground
    const impact = (x: number) => Math.max(0, 1 - Math.abs(b - x) / 0.06)
    squash = Math.max(impact(0), impact(0.55) * 0.6, impact(1) * 0.3)
  }
  out.y = land.y + lift
  return squash
}

export function FallingPotatoes3D({
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
  const camera = useThree((s) => s.camera)
  const [textures, setTextures] = useState<THREE.Texture[] | null>(null)
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const spin = useMemo(() => new THREE.Quaternion(), [])
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])

  useEffect(() => {
    let alive = true
    const loader = new THREE.TextureLoader()
    const loaded: THREE.Texture[] = []
    Promise.all(SPRITES.map((s) => loader.loadAsync(s.url))).then((ts) => {
      ts.forEach((t) => {
        t.colorSpace = THREE.SRGBColorSpace
        loaded.push(t)
      })
      if (alive) setTextures(ts)
    })
    return () => {
      alive = false
      loaded.forEach((t) => t.dispose())
    }
  }, [])

  const materials = useMemo(
    () => textures?.map((map) => new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, toneMapped: false })) ?? [],
    [textures],
  )
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  useEffect(() => () => plane.dispose(), [plane])

  useFrame(() => {
    const dusk = state.dusk
    materials.forEach((m) => m.color.setRGB(1 - dusk * 0.15, 1 - dusk * 0.25, 1 - dusk * 0.3))
    POTATOES.forEach((spec, i) => {
      const mesh = meshes.current[i]
      const slot = uniforms.uShadows.value[POTATO_SHADOW_SLOT + i]
      const { t, sink } = state.potatoes[i]
      const shown = mesh && (mobile ? spec.mobile : true) && t > 0.001
      if (!mesh || !shown) {
        if (mesh) mesh.visible = false
        slot.w = 0
        return
      }
      const land = layout.potatoLandings[i]
      const squash = pose(t, layout.potatoStarts[i], land, spec.size, tmp)
      const aspect = SPRITES[spec.sprite].aspect
      const h = spec.size * aspect
      // rests with its centre just above the ground, then settles into the soil
      tmp.y += h * 0.42 - sink * spec.sink * h
      mesh.position.copy(tmp)
      mesh.scale.set(spec.size * (1 + squash * 0.18), h * (1 - squash * 0.24), 1)
      const tf = clamp01(t / FALL)
      const angle = spec.spin * (1 - (1 - tf) * (1 - tf)) + Math.sin(t * 9) * 0.04 * (t > FALL ? 1 : 0)
      mesh.quaternion.copy(camera.quaternion).multiply(spin.setFromAxisAngle(zAxis, angle))
      mesh.visible = true

      // shadow tightens and darkens as it nears the ground
      const height = Math.max(0, tmp.y - land.y - h * 0.42)
      const near = 1 - clamp01(height / 2.2)
      slot.set(land.x, land.z, spec.size * (0.55 + (1 - near) * 0.8), 0.55 * near * near)
    })
  })

  if (!textures) return null
  return (
    <>
      {POTATOES.map((spec, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m
          }}
          geometry={plane}
          material={materials[spec.sprite]}
          visible={false}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
