'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

/*
 * One potato travels through "How PotatoBae Works" as you scroll:
 * the lock potato -> between the two elders -> behind the phone -> into a sack.
 *
 * The path is rebuilt from where the anchor elements actually render (data-anchor on
 * lock / toss / phone / sack), so it follows the layout at any size. Scroll position
 * maps to how far along the path the potato is, so it stays near the middle of the
 * screen, stops when you stop, and runs backwards when you scroll up.
 *
 * TWEAK HERE:
 */
const JOURNEY = {
  // where on screen (0 top, 1 bottom) the potato rides while you scroll
  focus: 0.55,
  // how quickly it catches up with the scroll position (higher = snappier)
  follow: 9,
}

// Positions inside the artwork the potato has to hit, as fractions of each image.
const PHONE_POTATO = { x: 0.801, y: 0.395, width: 0.36, rotate: -32 }
const SACK = { x: 0.6917, pile: 0.285, inside: 0.4, potato: 0.032 }

type Anchor = { x: number; y: number; size: number; rotate: number }
type Built = {
  d: string
  length: number
  // samples along the path every STEP px: x, y, and the running max of y
  xs: Float32Array
  ys: Float32Array
  reach: Float32Array
  // path lengths at each anchor, with the size/rotation the potato should have there
  stops: { at: number; size: number; rotate: number }[]
  fallFrom: number
  landAt: number
  phoneAt: number
  lock: { w: number; h: number; y: number }
}

const STEP = 3

function rectIn(el: Element, root: DOMRect) {
  const r = el.getBoundingClientRect()
  return { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height }
}

// Smooth curve through points (Catmull-Rom, converted to cubic Béziers).
function curveThrough(p: { x: number; y: number }[]) {
  let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

function build(section: HTMLElement, measure: SVGPathElement): Built | null {
  const root = section.getBoundingClientRect()
  const W = root.width
  const q = (name: string) => section.querySelector(`[data-anchor="${name}"]`)
  const lockEl = q('lock')
  const tossEl = q('toss')
  const phoneEl = q('phone')
  const sackEl = q('sack')
  if (!lockEl || !tossEl || !phoneEl || !sackEl) return null

  const lock = rectIn(lockEl, root)
  const toss = rectIn(tossEl, root)
  const phone = rectIn(phoneEl, root)
  const sack = rectIn(sackEl, root)
  if (!lock.w || !phone.w || !sack.w) return null

  // the potato part of the lock image is its top 170 of 199 px
  const lockH = lock.w * (170 / 199) * (199 / 260)
  const A: Anchor = { x: lock.x + lock.w / 2, y: lock.y + lockH / 2, size: lock.w, rotate: 0 }
  const T: Anchor = { x: toss.x + toss.w / 2, y: toss.y + toss.h / 2, size: toss.w * 1.05, rotate: -20 }
  const P: Anchor = {
    x: phone.x + phone.w * PHONE_POTATO.x,
    y: phone.y + phone.h * PHONE_POTATO.y,
    size: phone.w * PHONE_POTATO.width,
    rotate: PHONE_POTATO.rotate,
  }
  const S1 = { x: sack.x + sack.w * SACK.x, y: sack.y + sack.h * SACK.pile }
  const S2 = { x: S1.x, y: sack.y + sack.h * SACK.inside }
  const sackSize = sack.w * SACK.potato

  const clampX = (x: number) => Math.min(W * 0.95, Math.max(W * 0.05, x))
  // keep the approach to the elders left of the "Give them this Potato" caption
  const give = section.querySelector('[data-avoid="give"]')
  const giveRect = give ? rectIn(give, root) : null
  const narrow = W < 640
  const giveLeft = giveRect && !narrow ? giveRect.x - 28 : Infinity
  // and the first swing clear of the "Write your message" note
  const chat = section.querySelector('[data-avoid="chat"]')
  const chatRect = chat ? rectIn(chat, root) : null
  const chatLeft = chatRect && chatRect.x > A.x ? chatRect.x - 36 : Infinity
  // leave the lock to the right of its "Enter the PIN / Claim your Potato" caption
  const claim = section.querySelector('[data-avoid="claim"]')
  const claimRect = claim ? rectIn(claim, root) : null
  // and pass to the right of the "Every time they tap..." caption on the way to the phone
  const tap = section.querySelector('[data-avoid="tap"]')
  const tapRect = tap ? rectIn(tap, root) : null
  const tapRange = document.createRange()
  if (tap) tapRange.selectNodeContents(tap)
  const tapRight = tapRect ? tapRange.getBoundingClientRect().right - root.left + 26 : -Infinity
  const dy1 = T.y - A.y
  const dy2 = P.y - T.y
  const dy3 = S1.y - P.y
  // in-between points give the playful swings; all relative to the real layout
  const pts = [
    A,
    // first step sideways off the lock, so the route never cuts through its caption
    ...(claimRect
      ? [{ x: clampX(Math.min(Math.max(lock.x + lock.w, claimRect.x + claimRect.w) + 22, chatLeft + 10)), y: A.y + lockH * 0.1 }]
      : []),
    claimRect
      ? { x: clampX(Math.min(claimRect.x + claimRect.w + 30, chatLeft + 10)), y: claimRect.y + claimRect.h * 0.6 }
      : { x: clampX(Math.min(A.x + W * 0.1, chatLeft)), y: A.y + dy1 * 0.14 },
    ...(narrow
      ? // Phones: down over the first man's arm on the right (clear of his face), then
        // across the caption  into the elders' gap.
        [
          { x: clampX(W * 0.86), y: A.y + dy1 * 0.5 },
          { x: clampX(T.x + W * 0.04), y: (giveRect ? giveRect.y : T.y - dy1 * 0.15) - 26 },
        ]
      : [
          chatRect && chatRect.x > A.x
            ? { x: clampX(Math.min(chatLeft, giveLeft)), y: chatRect.y + chatRect.h + 30 }
            : { x: clampX(Math.min(A.x + W * 0.03, giveLeft)), y: A.y + dy1 * 0.55 },
          { x: clampX(Math.min(T.x + W * 0.06, giveLeft - W * 0.02)), y: T.y - dy1 * 0.14 },
        ]),
    T,
    { x: clampX(Math.max(T.x - W * 0.06, tapRight)), y: T.y + dy2 * 0.42 },
    { x: clampX(Math.max(P.x + W * 0.01, tapRight)), y: P.y - dy2 * 0.24 },
    P,
    { x: clampX(P.x + W * 0.1), y: P.y + dy3 * 0.4 },
    { x: clampX(S1.x + W * 0.08), y: S1.y - dy3 * 0.22 },
    S1,
    S2,
  ]
  const d = curveThrough(pts)
  measure.setAttribute('d', d)
  const length = measure.getTotalLength()
  const n = Math.ceil(length / STEP) + 1
  const xs = new Float32Array(n)
  const ys = new Float32Array(n)
  const reach = new Float32Array(n)
  let best = -Infinity
  for (let i = 0; i < n; i++) {
    const pt = measure.getPointAtLength(Math.min(length, i * STEP))
    xs[i] = pt.x
    ys[i] = pt.y
    best = Math.max(best, pt.y)
    reach[i] = best
  }
  // path length where the curve passes nearest each anchor
  const nearest = (p: { x: number; y: number }, from = 0) => {
    let bi = from
    let bd = Infinity
    for (let i = from; i < n; i++) {
      const dd = (xs[i] - p.x) ** 2 + (ys[i] - p.y) ** 2
      if (dd < bd) {
        bd = dd
        bi = i
      }
    }
    return bi * STEP
  }
  const atT = nearest(T)
  const atP = nearest(P, atT / STEP)
  const atS1 = nearest(S1, atP / STEP)
  return {
    d,
    length,
    xs,
    ys,
    reach,
    // extra whole turns between stops make it tumble on the way
    stops: [
      { at: 0, size: A.size, rotate: A.rotate },
      { at: atT, size: T.size, rotate: T.rotate + 360 },
      { at: atP, size: P.size, rotate: P.rotate },
      { at: atS1, size: sackSize, rotate: P.rotate + 340 },
      { at: length, size: sackSize, rotate: P.rotate + 350 },
    ],
    fallFrom: nearest(pts[9], atP / STEP),
    landAt: atS1,
    phoneAt: atP,
    lock: { w: lock.w, h: lockH, y: A.y },
  }
}

// Linear interpolation of the size/rotation keyed by path length.
function along(stops: Built['stops'], at: number, key: 'size' | 'rotate') {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (at <= b.at) {
      const t = b.at > a.at ? (at - a.at) / (b.at - a.at) : 0
      const s = t * t * (3 - 2 * t)
      return a[key] + (b[key] - a[key]) * s
    }
  }
  return stops[stops.length - 1][key]
}

export function PotatoJourney() {
  const root = useRef<HTMLDivElement>(null)
  const measure = useRef<SVGPathElement>(null)
  const mover = useRef<HTMLDivElement>(null)
  const locked = useRef<HTMLImageElement>(null)
  const free = useRef<HTMLImageElement>(null)
  const [enabled, setEnabled] = useState(false)

  // only for people who are fine with motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(!mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const host = root.current
    const section = host?.closest('section') as HTMLElement | null
    if (!host || !section || !measure.current) return
    section.dataset.journey = 'on'

    let built: Built | null = null
    let current = 0
    let visible = false

    const rebuild = () => {
      built = build(section, measure.current!)
      if (!built) return
      current = Math.min(current, built.length)
      draw()
    }

    // which path length the scroll position asks for
    const target = () => {
      if (!built) return 0
      // The follow line starts level with the lock potato when the section reaches the
      // top of the screen (so the journey visibly begins there), then eases down to
      // JOURNEY.focus over the next screenful of scrolling.
      const vh = window.innerHeight
      const top = section.getBoundingClientRect().top
      const start = Math.min(JOURNEY.focus, built.lock.y / vh)
      const t = Math.min(1, Math.max(0, -top / vh))
      const focusY = vh * (start + (JOURNEY.focus - start) * t) - top
      const { reach, length } = built
      let lo = 0
      let hi = reach.length - 1
      if (focusY <= reach[0]) return 0
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (reach[mid] < focusY) lo = mid + 1
        else hi = mid
      }
      let at = Math.min(length, lo * STEP)
      // if the page bottom arrives before the sack reaches the follow line (short
      // layouts, phones), finish the journey over the last half-screen of scrolling
      const maxScroll = document.documentElement.scrollHeight - vh
      const tail = Math.min(1, Math.max(0, (window.scrollY - (maxScroll - vh * 0.5)) / (vh * 0.5)))
      at = at + (length - at) * tail * tail
      // gravity: the final drop into the sack speeds up as it falls
      if (at > built.fallFrom) {
        const f = (at - built.fallFrom) / (length - built.fallFrom)
        at = built.fallFrom + (length - built.fallFrom) * Math.pow(f, 1.6)
      }
      return at
    }

    const draw = () => {
      if (!built) return
      const b = built
      const i = Math.min(b.xs.length - 1, Math.round(current / STEP))
      let x = b.xs[i]
      let y = b.ys[i]

      const size = along(b.stops, current, 'size')
      let rotate = along(b.stops, current, 'rotate')

      // squash and stretch where the path turns hard
      const j0 = Math.max(0, i - 4)
      const j1 = Math.min(b.xs.length - 1, i + 4)
      const k = Math.max(0, i - 8)
      const a1 = Math.atan2(b.ys[j0] - b.ys[k], b.xs[j0] - b.xs[k])
      const a2 = Math.atan2(b.ys[j1] - b.ys[j0], b.xs[j1] - b.xs[j0])
      let turn = Math.abs(a2 - a1)
      if (turn > Math.PI) turn = 2 * Math.PI - turn
      const squash = Math.min(0.16, turn * 0.35)

      // a light bob while travelling, settling at each stop
      const nearStop = b.stops.some((s) => Math.abs(current - s.at) < 40)
      if (!nearStop) {
        y += Math.sin(current * 0.045) * 3
        rotate += Math.sin(current * 0.03) * 6
      }

      // landing on the pile: a small hop, then it drops into the sack, shrinking a
      // little and fading as it sinks out of sight among the other potatoes
      let sink = 0
      if (current > b.landAt) {
        const f = (current - b.landAt) / Math.max(1, b.length - b.landAt)
        if (f < 0.35) y -= Math.sin((f / 0.35) * Math.PI) * size * 0.35
        const t = Math.min(1, Math.max(0, (f - 0.35) / 0.55))
        sink = t * t * (3 - 2 * t)
      }
      mover.current!.style.opacity = String(1 - sink)

      // behind the phone only while it sits in the phone's potato spot, and behind the
      // sack's rim from the moment it reaches the pile
      const behind = Math.abs(current - b.phoneAt) < size * 0.9 || current > b.landAt - size * 0.3
      mover.current!.style.zIndex = behind ? '5' : '7'

      // the lock potato peels away as a plain potato in the first stretch
      const peel = Math.min(1, current / 60)
      locked.current!.style.opacity = String(1 - peel)
      free.current!.style.opacity = String(peel)
      const h = size * (b.lock.h / b.lock.w) * (1 - peel) + size * (251 / 260) * peel
      x -= size / 2
      y -= h / 2
      mover.current!.style.width = `${size}px`
      mover.current!.style.height = `${h}px`
      const shrink = 1 - sink * 0.35
      mover.current!.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${(1 + squash) * shrink}, ${(1 - squash) * shrink})`

    }

    const tick = (_: number, dt: number) => {
      if (!built || !visible) return
      const goal = target()
      const step = Math.min(1, (dt / 1000) * JOURNEY.follow)
      const next = current + (goal - current) * step
      if (Math.abs(next - current) < 0.05 && Math.abs(goal - current) < 0.05) return
      current = next
      draw()
    }

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(section)
    const ro = new ResizeObserver(() => rebuild())
    ro.observe(section)
    // images finishing late can shift anchors
    const imgs = Array.from(section.querySelectorAll('img'))
    imgs.forEach((im) => im.addEventListener('load', rebuild))
    window.addEventListener('orientationchange', rebuild)
    gsap.ticker.add(tick)
    rebuild()
    current = target()
    draw()

    return () => {
      gsap.ticker.remove(tick)
      io.disconnect()
      ro.disconnect()
      imgs.forEach((im) => im.removeEventListener('load', rebuild))
      window.removeEventListener('orientationchange', rebuild)
      delete section.dataset.journey
    }
  }, [enabled])

  if (!enabled) return null
  return (
    // no z-index here: the potato stacks directly against the phone (z 6) and
    // sack rim (z 6), so the potato can pass in front of or behind them
    <div ref={root} className="pointer-events-none absolute inset-0" aria-hidden>
      {/* invisible guide path, only used to measure the route */}
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <path ref={measure} fill="none" stroke="none" />
      </svg>
      <div ref={mover} className="absolute left-0 top-0 will-change-transform" style={{ transformOrigin: '50% 50%' }}>
        {/* plain <img>: these are absolutely sized each frame, not laid out */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={locked} src="/explore/lock-potato-locked.webp" alt="" className="absolute inset-0 h-full w-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={free} src="/explore/potato-sprite.webp" alt="" className="absolute inset-0 h-full w-full opacity-0" />
      </div>
    </div>
  )
}
