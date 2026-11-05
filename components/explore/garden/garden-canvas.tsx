'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLASSES, computeLayout, type GardenLayout, type GardenState } from './garden-state'
import { createNoiseTexture } from './noise'
import { Terrain, createSharedUniforms, type SharedUniforms } from './terrain'
import { GrassField, WildFlowers } from './grass-field'
import { Rocks } from './rocks'
import { FallingPotatoes3D } from './potatoes'
import { PotatoPlants } from './potato-plants'

type Props = {
  state: GardenState
  root: HTMLElement
  mobile: boolean
  // render a single still frame (reduced motion)
  still?: boolean
  onReady: () => void
}

const DAY = { sun: new THREE.Color('#fff4e0'), sky: new THREE.Color('#dcecf7'), haze: new THREE.Color('#c9d8dc') }
const DUSK = { sun: new THREE.Color('#ff9f5a'), sky: new THREE.Color('#7d6f9e'), haze: new THREE.Color('#e9b9a0') }

// Her two portraits on the plane she sits on: the beams portrait from the hero art,
// and the sunglasses portrait that takes over as the sacks finish fading (state.swap).
function Woman({ layout, state, onLoaded }: { layout: GardenLayout; state: GardenState; onLoaded: () => void }) {
  const [textures, setTextures] = useState<THREE.Texture[] | null>(null)
  const beams = useRef<THREE.MeshBasicMaterial>(null)
  const glasses = useRef<THREE.MeshBasicMaterial>(null)
  useEffect(() => {
    let alive = true
    const loaded: THREE.Texture[] = []
    const loader = new THREE.TextureLoader()
    Promise.all(['/explore/hero-woman.webp', '/explore/hero-woman-glasses.webp'].map((u) => loader.loadAsync(u))).then(
      (ts) => {
        ts.forEach((t) => {
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 4
          loaded.push(t)
        })
        if (!alive) return
        setTextures(ts)
        onLoaded()
      },
    )
    return () => {
      alive = false
      loaded.forEach((t) => t.dispose())
    }
  }, [onLoaded])
  useFrame(() => {
    // the photos pick up a little of the time-lapse light
    const r = 1 - state.dusk * 0.12
    const g = 1 - state.dusk * 0.2
    const b = 1 - state.dusk * 0.22
    // Smooth hand-over: the sunglasses portrait fades in underneath first, then the
    // beams portrait dissolves away on top of it, so there's never a see-through dip.
    const swap = THREE.MathUtils.clamp(state.swap, 0, 1)
    if (beams.current) {
      beams.current.color.setRGB(r, g, b)
      beams.current.opacity = 1 - THREE.MathUtils.smootherstep(swap, 0.35, 1)
    }
    if (glasses.current) {
      glasses.current.color.setRGB(r, g, b)
      glasses.current.opacity = THREE.MathUtils.smootherstep(swap, 0, 0.65)
    }
  })
  if (!textures) return null
  const { x, bottom, top, width } = layout.woman
  const height = top - bottom
  const gh = height * GLASSES.heightScale
  return (
    <>
      <mesh position={[x + GLASSES.offsetX * width, bottom + gh / 2, -0.003]} scale={[gh * GLASSES.aspect, gh, 1]} renderOrder={1}>
        <planeGeometry />
        <meshBasicMaterial ref={glasses} map={textures[1]} transparent opacity={0} alphaTest={0.004} toneMapped={false} />
      </mesh>
      <mesh position={[x, (top + bottom) / 2, 0]} scale={[width, height, 1]} renderOrder={2}>
        <planeGeometry />
        <meshBasicMaterial ref={beams} map={textures[0]} transparent alphaTest={0.004} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

function Scene({ state, root, mobile, still, onReady }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const [layout, setLayout] = useState<GardenLayout | null>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const loaded = useRef(false)
  const announced = useRef(false)
  const onWomanLoaded = useMemo(
    () => () => {
      loaded.current = true
      invalidate()
    },
    [invalidate],
  )

  const noise = useMemo(() => createNoiseTexture(), [])
  const uniforms = useMemo<SharedUniforms>(() => createSharedUniforms(noise), [noise])
  useEffect(() => () => noise.dispose(), [noise])

  useEffect(() => {
    const canvasEl = root.querySelector('canvas')
    const woman = root.querySelector('.js-woman')
    const box = root.querySelector('.js-hero-box')
    if (!canvasEl || !woman || !box) return
    setLayout(
      computeLayout(camera, canvasEl.getBoundingClientRect(), woman.getBoundingClientRect(), box.getBoundingClientRect()),
    )
    invalidate()
  }, [camera, size.width, size.height, root, invalidate])

  useFrame((_, delta) => {
    if (!layout) return
    const u = uniforms
    u.uTime.value += still ? 0 : Math.min(delta, 0.05)
    // GREEN FRONT: radius around her in world units. The first term spreads it over the
    // near fields; the second rolls it across the far hills at the end of the scroll.
    u.uRadius.value = -1.0 + Math.pow(state.grow, 1.35) * 30 + THREE.MathUtils.smoothstep(state.grow, 0.45, 0.9) * 210
    u.uLush.value = state.lush
    u.uWind.value = still ? 0 : state.wind
    u.uSun.value.copy(DAY.sun).lerp(DUSK.sun, state.dusk)
    u.uSky.value.copy(DAY.sky).lerp(DUSK.sky, state.dusk)
    u.uHaze.value.copy(DAY.haze).lerp(DUSK.haze, state.dusk * 0.7)
    hemi.current?.color.copy(u.uSky.value)
    sun.current?.color.copy(u.uSun.value)
    const D = layout.camPos.z
    u.uFade.value.set(D + 9, D + 22)

    // slow drift into the garden once the wings have left
    const push = state.push
    // CAMERA DRIFT: how far it travels in over the second half of the scroll
    camera.position.set(
      layout.camPos.x + Math.sin(push * Math.PI) * 0.25,
      layout.camPos.y + push * 0.12,
      layout.camPos.z - push * 1.8,
    )
    camera.rotation.set(-layout.pitch + push * 0.02, push * 0.03, 0)

    if (loaded.current && !announced.current) {
      announced.current = true
      // let this frame reach the screen before the DOM photo is swapped out
      requestAnimationFrame(onReady)
    }
  })

  if (!layout) return null
  return (
    <>
      <hemisphereLight ref={hemi} args={['#e3f0ff', '#6b5236', 1.4]} />
      <directionalLight ref={sun} position={[-4, 7, 5]} intensity={1.9} color="#fff1d6" />
      <Terrain uniforms={uniforms} mobile={mobile} />
      <Woman layout={layout} state={state} onLoaded={onWomanLoaded} />
      <Rocks uniforms={uniforms} layout={layout} mobile={mobile} />
      <GrassField uniforms={uniforms} layout={layout} mobile={mobile} />
      <WildFlowers uniforms={uniforms} layout={layout} mobile={mobile} />
      <FallingPotatoes3D layout={layout} state={state} uniforms={uniforms} mobile={mobile} />
      <PotatoPlants layout={layout} state={state} uniforms={uniforms} mobile={mobile} />
    </>
  )
}

// The 3D ground layer. Sits between the DOM sky and the DOM wings.
export default function GardenCanvas(props: Props) {
  const [active, setActive] = useState(true)
  const host = useRef<HTMLDivElement>(null)

  // stop rendering once the stage has scrolled away
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting))
    if (host.current) io.observe(host.current)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={host} className="absolute inset-0">
      <Canvas
        flat
        dpr={props.mobile ? [1, 1.5] : [1, 1.75]}
        frameloop={props.still ? 'demand' : active ? 'always' : 'never'}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 30, position: [0, 1.5, 8] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  )
}
