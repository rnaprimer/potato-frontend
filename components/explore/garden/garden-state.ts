import * as THREE from 'three'
import { terrainHeight } from './noise'

// Scroll-driven values. GSAP tweens these plain numbers and the scene is a pure
// function of them each frame, so scrubbing backwards always rebuilds the same picture.
export type GardenState = {
  grow: number // 0-1 radius of the green front
  lush: number // 0-1 how rich and tall the vegetation is
  wind: number // breeze strength
  dusk: number // 0-1 time-lapse light
  push: number // 0-1 camera drift into the garden
  frame: number // 0-1 large framing plants growing in
  part: number // 0-1 framing plants swinging aside
  swap: number // 0-1 her beams portrait giving way to the sunglasses portrait
  scroll: number // 0-1 overall progress, drives background parallax
  potatoes: { t: number; sink: number }[]
  plants: number[]
}

export type PotatoSpec = {
  sx: number // start on the wings, % of the 16:9 hero frame
  sy: number
  u: number // landing x as a fraction of the visible half-width at that depth
  z: number // landing depth in world units (woman at 0, camera at +D)
  size: number
  sink: number // how far it settles into the soil, as a fraction of its size
  spin: number
  sprite: 0 | 1
  mobile: boolean
}

export const POTATOES: PotatoSpec[] = [
  { sx: 16, sy: 33, u: -0.72, z: -1.2, size: 0.26, sink: 0.45, spin: -2.6, sprite: 0, mobile: true },
  { sx: 91, sy: 11, u: 0.78, z: -2.4, size: 0.24, sink: 0.2, spin: 3.1, sprite: 0, mobile: true },
  { sx: 23, sy: 49, u: -0.42, z: 1.15, size: 0.22, sink: 0.5, spin: 2.2, sprite: 1, mobile: true },
  { sx: 83, sy: 31, u: 0.5, z: 0.9, size: 0.25, sink: 0.35, spin: -3.4, sprite: 0, mobile: true },
  { sx: 11, sy: 15, u: -0.9, z: -3.6, size: 0.27, sink: 0.25, spin: 1.8, sprite: 0, mobile: false },
  { sx: 73, sy: 46, u: 0.3, z: -1.6, size: 0.2, sink: 0.55, spin: -2.1, sprite: 1, mobile: true },
  { sx: 30, sy: 67, u: -0.2, z: 1.9, size: 0.18, sink: 0.15, spin: 2.8, sprite: 1, mobile: false },
  { sx: 87, sy: 39, u: 0.86, z: -0.3, size: 0.23, sink: 0.4, spin: -1.7, sprite: 0, mobile: true },
  { sx: 20, sy: 55, u: -0.58, z: -0.2, size: 0.21, sink: 0.3, spin: 3.6, sprite: 1, mobile: false },
  { sx: 67, sy: 53, u: 0.18, z: 2.2, size: 0.19, sink: 0.5, spin: -2.9, sprite: 0, mobile: true },
  { sx: 12, sy: 22, u: -0.32, z: -2.8, size: 0.24, sink: 0.35, spin: 2.4, sprite: 0, mobile: false },
  { sx: 77, sy: 53, u: 0.62, z: -4.2, size: 0.26, sink: 0.3, spin: -3.2, sprite: 1, mobile: true },
]

// Small plants sprout where some potatoes settled; larger ones frame the finale.
export const SPROUT_ON = [0, 2, 3, 5, 7, 9, 10, 11]

export const FRAMERS = [
  { u: -1.05, depth: 0.35, scale: 3.4, yaw: 0.6 },
  { u: 1.02, depth: 0.45, scale: 3.6, yaw: -0.5 },
  { u: -0.7, depth: 2.2, scale: 2.4, yaw: 1.4 },
  { u: 0.75, depth: 2.6, scale: 2.5, yaw: -1.2 },
  { u: -0.15, depth: 0.15, scale: 2.2, yaw: 2.6 },
  { u: 0.3, depth: 0.25, scale: 2.0, yaw: -2.2 },
]

export function createGardenState(): GardenState {
  return {
    grow: 0,
    lush: 0,
    wind: 0.35,
    dusk: 0,
    push: 0,
    frame: 0,
    part: 0,
    swap: 0,
    scroll: 0,
    potatoes: POTATOES.map(() => ({ t: 0, sink: 0 })),
    plants: SPROUT_ON.map(() => 0),
  }
}

// The image is 419x587; the front foot touches the ground at its very bottom.
export const WOMAN_ASPECT = 419 / 587

// The sunglasses portrait (844x1183) matched to her silhouette in the hero image:
// her figure fills 99.7% of the hero crop's height and 99.8% of the portrait's, and
// is centred in both.
export const GLASSES = {
  aspect: 844 / 1183,
  heightScale: 0.997 / 0.998,
  offsetX: 0,
}
export const FOV = 30
// Camera tilt in degrees (positive looks down). A slight upward tilt puts the horizon
// low behind her, so she reads as sitting up on her mound against the sky.
const PITCH = THREE.MathUtils.degToRad(-2)
const WOMAN_WORLD_HEIGHT = 2.4

export type GardenLayout = {
  camPos: THREE.Vector3
  pitch: number
  woman: { x: number; bottom: number; top: number; width: number }
  // ground depth at the bottom edge of the screen
  zNear: number
  halfWidth: (z: number) => number
  potatoStarts: THREE.Vector3[]
  potatoLandings: THREE.Vector3[]
}

const rayToPlaneZ = (cam: THREE.PerspectiveCamera, ndcX: number, ndcY: number, z: number) => {
  const dir = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position).normalize()
  const t = (z - cam.position.z) / dir.z
  return cam.position.clone().addScaledVector(dir, t)
}

// Fits the camera so the woman's plane lands exactly where her photo sits in the
// page layout (her wings stay as DOM images and must still meet her eyes).
export function computeLayout(
  cam: THREE.PerspectiveCamera,
  canvas: DOMRect,
  womanRect: DOMRect,
  boxRect: DOMRect,
): GardenLayout {
  const H = canvas.height
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const fy = (womanRect.bottom - canvas.top) / H
  const hFrac = womanRect.height / H
  const D = WOMAN_WORLD_HEIGHT / (hFrac * 2 * tanHalf)
  const below = Math.atan((fy - 0.5) * 2 * tanHalf) + PITCH
  // she sits on the mound top, so the camera is placed relative to that height
  const seat = terrainHeight(0, 0)
  const camPos = new THREE.Vector3(0, seat + D * Math.tan(below), D)

  cam.fov = FOV
  cam.aspect = canvas.width / H
  cam.position.copy(camPos)
  cam.rotation.set(-PITCH, 0, 0)
  cam.near = 0.05
  cam.far = 1400
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()

  const toNdcY = (py: number) => 1 - ((py - canvas.top) / H) * 2
  const toNdcX = (px: number) => ((px - canvas.left) / canvas.width) * 2 - 1
  const top = rayToPlaneZ(cam, 0, toNdcY(womanRect.top), 0).y
  const bottom = rayToPlaneZ(cam, 0, toNdcY(womanRect.bottom), 0).y
  // she isn't always dead centre in the artwork; match her horizontal position too,
  // so the eye beams on the DOM sacks meet her exactly
  const x = rayToPlaneZ(cam, toNdcX(womanRect.left + womanRect.width / 2), toNdcY(womanRect.bottom), 0).x

  // ground depth at the bottom of the screen: march the ray through ndc y=-1 down the slope
  const dir = new THREE.Vector3(0, -1, 0.5).unproject(cam).sub(cam.position).normalize()
  let t = 0
  const probe = new THREE.Vector3()
  while (t < 60) {
    probe.copy(cam.position).addScaledVector(dir, t)
    if (probe.y <= terrainHeight(probe.x, probe.z)) break
    t += 0.05
  }
  const zNear = probe.z
  const halfWidth = (z: number) => (cam.position.z - z) * tanHalf * cam.aspect

  const potatoLandings = POTATOES.map((p) => {
    const x = p.u * halfWidth(p.z)
    return new THREE.Vector3(x, terrainHeight(x, p.z), p.z)
  })
  const potatoStarts = POTATOES.map((p, i) =>
    rayToPlaneZ(
      cam,
      toNdcX(boxRect.left + (p.sx / 100) * boxRect.width),
      toNdcY(boxRect.top + (p.sy / 100) * boxRect.height),
      potatoLandings[i].z,
    ),
  )

  return {
    camPos,
    pitch: PITCH,
    woman: { x, bottom, top, width: (top - bottom) * WOMAN_ASPECT },
    zNear,
    halfWidth,
    potatoStarts,
    potatoLandings,
  }
}
