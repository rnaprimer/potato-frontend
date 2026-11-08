import * as THREE from 'three'
import { terrainHeight } from './noise'
import { FRAMERS, POTATOES, SPROUT_ON, createGardenState, type GardenState, type PotatoSpec } from './garden-store'

export { FRAMERS, POTATOES, SPROUT_ON, createGardenState, type GardenState, type PotatoSpec }

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
