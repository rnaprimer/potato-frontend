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

// The outline of a potato leaflet: ovate, pointed tip, slightly wavy margin.
function leafletPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number) {
  const cx = w / 2
  const steps = 60
  const pts: [number, number][] = []
  for (const side of [-1, 1]) {
    for (let i = 0; i <= steps; i++) {
      const t = side < 0 ? i / steps : 1 - i / steps
      // oval: narrow petiole, rounded base, widest a little below the middle, pointed tip
      const half = Math.pow(Math.sin(Math.PI * Math.pow(t, 1.15)), 1.1) * (1 - 0.12 * t) * w * 0.44
      const wave = Math.sin(t * 34 + side) * w * 0.012 * (1 - t)
      pts.push([cx + side * (half + wave), h * 0.97 - t * h * 0.94 + r() * 0.6])
    }
  }
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

// Colour + alpha and a matching bump map for one potato leaflet (tip at the top).
export function createLeafTextures() {
  const W = 256
  const H = 512
  const r = rng(909)
  const [color, cc] = canvas(W, H)
  const [bump, bc] = canvas(W, H)

  // body: deeper at the base, fresher toward the tip, with a soft sheen
  leafletPath(cc, W, H, r)
  const g = cc.createLinearGradient(0, H, 0, 0)
  g.addColorStop(0, '#3e6a25')
  g.addColorStop(0.5, '#5a8d33')
  g.addColorStop(1, '#4f822e')
  cc.fillStyle = g
  cc.fill()
  cc.save()
  cc.clip()
  const sheen = cc.createRadialGradient(W * 0.38, H * 0.45, 10, W * 0.38, H * 0.45, W * 0.7)
  sheen.addColorStop(0, 'rgba(210,235,160,0.22)')
  sheen.addColorStop(1, 'rgba(210,235,160,0)')
  cc.fillStyle = sheen
  cc.fillRect(0, 0, W, H)
  // fine mottling
  for (let i = 0; i < 2600; i++) {
    cc.fillStyle = r() < 0.5 ? 'rgba(20,45,10,0.06)' : 'rgba(190,220,140,0.05)'
    cc.fillRect(r() * W, r() * H, 2 + r() * 3, 2 + r() * 3)
  }
  // margins slightly darker
  cc.lineWidth = 10
  cc.strokeStyle = 'rgba(25,55,15,0.25)'
  leafletPath(cc, W, H, r)
  cc.stroke()

  // bump base: mid grey with puckered blotches between the veins
  bc.fillStyle = '#7a7a7a'
  bc.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) {
    const v = 100 + Math.floor(r() * 60)
    bc.fillStyle = `rgba(${v},${v},${v},0.35)`
    bc.beginPath()
    bc.arc(r() * W, r() * H, 3 + r() * 9, 0, Math.PI * 2)
    bc.fill()
  }

  // veins: pale midrib, then curved pinnate veins reaching for the margin
  const vein = (ctx: CanvasRenderingContext2D, colorStr: string, scale: number) => {
    ctx.strokeStyle = colorStr
    ctx.lineCap = 'round'
    ctx.lineWidth = 6 * scale
    ctx.beginPath()
    ctx.moveTo(W / 2, H * 0.98)
    ctx.quadraticCurveTo(W / 2 + 3, H * 0.5, W / 2, H * 0.05)
    ctx.stroke()
    for (let k = 0; k < 8; k++) {
      const y = H * (0.86 - k * 0.095)
      for (const side of [-1, 1]) {
        ctx.lineWidth = (3 - k * 0.22) * scale
        ctx.beginPath()
        ctx.moveTo(W / 2, y)
        ctx.quadraticCurveTo(W / 2 + side * W * 0.18, y - H * 0.05, W / 2 + side * W * 0.36, y - H * 0.12)
        ctx.stroke()
      }
    }
  }
  vein(cc, 'rgba(176,206,120,0.7)', 1)
  vein(bc, '#d8d8d8', 1.4)
  cc.restore()

  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  const bumpMap = new THREE.CanvasTexture(bump)
  return { map, bumpMap }
}

// A clump of small leaves on transparent ground, for building tree canopies from cards.
export function createFoliageTexture() {
  const S = 512
  const r = rng(2718)
  const [c, ctx] = canvas(S, S)
  const greens = ['#2f5420', '#3b6627', '#4a7a30', '#5b8d39', '#6c9c44', '#7fae52']
  // back leaves darker, front leaves lighter, so each card has depth of its own
  for (let pass = 0; pass < greens.length; pass++) {
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2
      const d = Math.pow(r(), 0.7) * S * 0.42 * (1 - pass * 0.06)
      const x = S / 2 + Math.cos(a) * d
      const y = S / 2 + Math.sin(a) * d * 0.9
      const len = 18 + r() * 22
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(r() * Math.PI * 2)
      ctx.fillStyle = greens[pass]
      ctx.beginPath()
      ctx.moveTo(0, -len)
      ctx.quadraticCurveTo(len * 0.5, -len * 0.2, 0, len * 0.4)
      ctx.quadraticCurveTo(-len * 0.5, -len * 0.2, 0, -len)
      ctx.fill()
      ctx.strokeStyle = 'rgba(20,40,12,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, -len * 0.9)
      ctx.lineTo(0, len * 0.35)
      ctx.stroke()
      ctx.restore()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
