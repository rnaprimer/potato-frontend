import * as THREE from 'three'
import { rng } from '../potato-field'

// Leaf textures painted on a canvas at load time, so plants get real-looking leaf
// detail (outline, veins, puckering) without shipping image assets.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

// The outline of a potato leaflet: ovate with a rounded, slightly lopsided base, widest
// just below the middle, drawn out into a fine pointed tip, with a gently wavy margin.
function leafletPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number) {
  const cx = w / 2
  const steps = 90
  const pts: [number, number][] = []
  for (const side of [-1, 1]) {
    const lop = side < 0 ? 1 : 0.93
    for (let i = 0; i <= steps; i++) {
      const t = side < 0 ? i / steps : 1 - i / steps
      const body = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.78)), 0.8) * (1 - 0.38 * Math.pow(t, 3))
      const wave = Math.sin(t * 26 + side * 1.3) * 0.012 * (1 - t) * (0.5 + r() * 0.5)
      const half = (body * 0.45 + wave) * w * lop
      pts.push([cx + side * half, h * 0.975 - t * h * 0.955])
    }
  }
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

// Colour + alpha and a matching bump map for one potato leaflet (tip at the top).
// Potato leaves are a deep, matte green with sunken veins (darker grooves on top),
// a paler midrib, a puckered surface between the veins, and fine hairs.
export function createLeafTextures() {
  const W = 384
  const H = 768
  const r = rng(909)
  const [color, cc] = canvas(W, H)
  const [bump, bc] = canvas(W, H)

  leafletPath(cc, W, H, r)
  const g = cc.createLinearGradient(0, H, 0, 0)
  g.addColorStop(0, '#35602a')
  g.addColorStop(0.45, '#4a7d31')
  g.addColorStop(1, '#578a38')
  cc.fillStyle = g
  cc.fill()
  cc.save()
  cc.clip()
  // broad soft light across one half, as on a gently domed leaf
  const sheen = cc.createRadialGradient(W * 0.36, H * 0.48, 20, W * 0.36, H * 0.48, W * 0.75)
  sheen.addColorStop(0, 'rgba(200,225,150,0.14)')
  sheen.addColorStop(1, 'rgba(200,225,150,0)')
  cc.fillStyle = sheen
  cc.fillRect(0, 0, W, H)
  // puckered cells between the veins: soft light/dark blotches
  for (let i = 0; i < 1600; i++) {
    const x = r() * W
    const y = r() * H
    const rad = 3 + r() * 8
    const gr = cc.createRadialGradient(x, y, 0, x, y, rad)
    const light = r() < 0.5
    gr.addColorStop(0, light ? 'rgba(170,205,120,0.10)' : 'rgba(15,35,8,0.10)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    cc.fillStyle = gr
    cc.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  // fine hairs catching light
  for (let i = 0; i < 1400; i++) {
    cc.fillStyle = 'rgba(220,235,200,0.10)'
    cc.fillRect(r() * W, r() * H, 1, 1 + r() * 2)
  }
  // margins a touch darker and yellower
  cc.lineWidth = 9
  cc.strokeStyle = 'rgba(40,55,15,0.28)'
  leafletPath(cc, W, H, r)
  cc.stroke()

  // bump base: puckered blotches
  bc.fillStyle = '#808080'
  bc.fillRect(0, 0, W, H)
  for (let i = 0; i < 1400; i++) {
    const v = 120 + Math.floor(r() * 70)
    const x = r() * W
    const y = r() * H
    const rad = 4 + r() * 10
    const gr = bc.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, `rgba(${v},${v},${v},0.5)`)
    gr.addColorStop(1, 'rgba(128,128,128,0)')
    bc.fillStyle = gr
    bc.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }

  // veins: midrib, curved laterals that loop toward the margin, faint netting between
  const veins = (ctx: CanvasRenderingContext2D, mid: string, lat: string, net: string, k: number) => {
    ctx.lineCap = 'round'
    ctx.strokeStyle = mid
    ctx.lineWidth = 6 * k
    ctx.beginPath()
    ctx.moveTo(W / 2, H * 0.98)
    ctx.quadraticCurveTo(W / 2 + 4, H * 0.5, W / 2, H * 0.03)
    ctx.stroke()
    ctx.strokeStyle = lat
    for (let n = 0; n < 9; n++) {
      const y = H * (0.88 - n * 0.088)
      const reach = Math.sin(Math.PI * Math.min(0.98, 0.12 + n * 0.1)) * 0.34 + 0.06
      for (const side of [-1, 1]) {
        ctx.lineWidth = (3.2 - n * 0.24) * k
        ctx.beginPath()
        ctx.moveTo(W / 2, y)
        ctx.bezierCurveTo(
          W / 2 + side * W * reach * 0.4, y - H * 0.02,
          W / 2 + side * W * reach * 0.9, y - H * 0.06,
          W / 2 + side * W * reach, y - H * 0.12,
        )
        ctx.stroke()
      }
    }
    ctx.strokeStyle = net
    ctx.lineWidth = 1 * k
    for (let n = 0; n < 220; n++) {
      const x = r() * W
      const y = r() * H
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 18)
      ctx.stroke()
    }
  }
  // on the upper surface the veins are sunken: dark grooves, with a paler midrib
  veins(cc, 'rgba(175,205,120,0.65)', 'rgba(18,40,10,0.4)', 'rgba(18,40,10,0.12)', 1)
  veins(bc, '#4a4a4a', '#5a5a5a', '#707070', 1.3)
  cc.restore()

  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  const bumpMap = new THREE.CanvasTexture(bump)
  return { map, bumpMap }
}
