import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { HERO_LAYERS } from './potato-field'

// The artwork's 16:9 frame spans the full viewport width (wider than the screen on
// phones, so she stays a readable size). It is placed so her feet, which sit at 96.1%
// of the frame's height, always land at 74vh; the 3D landscape fills the space below.
const HERO_BOX = {
  '--box-w': 'max(100vw, 110vh)',
  width: 'var(--box-w)',
  left: 'calc(50% - var(--box-w) / 2)',
  top: 'calc(74vh - var(--box-w) * 0.5625 * 0.961)',
} as CSSProperties

/*
 * SKY & CLOUDS: tweak here. Photographic clouds; `width` is in vw, `depth`
 * scales how much each drifts with scroll (bigger = nearer = moves more).
 */
const SKY = 'linear-gradient(180deg, #1f6fc4 0%, #3b8fdb 22%, #6fb2e8 42%, #a9d2f1 58%, #d6ebf8 72%)'
const CLOUDS = [
  { src: '/explore/cloud-2.webp', w: 1200, h: 443, left: '2%', top: '5%', width: 30, o: 0.95, depth: 1 },
  { src: '/explore/cloud-4.webp', w: 1200, h: 745, left: '62%', top: '-2%', width: 26, o: 0.92, depth: 0.8 },
  { src: '/explore/cloud-3.webp', w: 1200, h: 419, left: '80%', top: '26%', width: 16, o: 0.8, depth: 0.55 },
  { src: '/explore/cloud-1.webp', w: 1200, h: 562, left: '30%', top: '24%', width: 14, o: 0.6, depth: 0.45 },
]

// The static hero: sky, clouds, embroidered wings and the seated woman.
// Every animated layer carries a js-* class the ScrollTransition timeline targets.
export function HeroScene({ ground }: { ground?: ReactNode }) {
  return (
    <>
      {/* Sky: clean blue, paling toward the horizon behind the hills. */}
      <div className="js-sky absolute inset-0" style={{ background: SKY }} />
      <div className="js-clouds absolute inset-x-[-10%] top-0 h-[60%] will-change-transform">
        {CLOUDS.map((c, i) => (
          <div key={i} className="js-cloud absolute will-change-transform" data-depth={c.depth} style={{ left: c.left, top: c.top }}>
            <Image
              src={c.src}
              alt=""
              width={c.w}
              height={c.h}
              sizes={`${c.width}vw`}
              style={{ width: `${c.width}vw`, height: 'auto', opacity: c.o }}
            />
          </div>
        ))}
      </div>

      {/* Time-lapse light: a sun arcing over and a dusk wash, both hidden at rest. */}
      <div
        className="js-sun invisible absolute left-0 top-[30%] size-[22vmin] rounded-full will-change-transform"
        style={{ background: 'radial-gradient(closest-side, #fff6c9 0%, #ffd66b 45%, rgba(255,190,80,0) 100%)' }}
      />
      <div
        className="js-dusk invisible absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #1c2a5c 0%, #6c4a86 35%, #f08a4b 70%, rgba(250,250,250,0) 85%)' }}
      />

      {/* 3D terrain and vegetation, between the sky and the wings */}
      {ground}

      {/* The artwork frame keeps the original 16:9 composition; layers sit at their source coordinates. */}
      <div className="js-hero-box absolute aspect-[16/9]" style={HERO_BOX}>
        <div
          className="js-wing-left absolute will-change-transform"
          style={{ left: `${HERO_LAYERS.wingLeft.left}%`, top: `${HERO_LAYERS.wingLeft.top}%`, width: `${HERO_LAYERS.wingLeft.width}%` }}
        >
          <Image src="/explore/hero-wing-left.webp" alt="" width={867} height={778} priority sizes="50vw" className="w-full h-auto" />
        </div>
        <div
          className="js-wing-right absolute will-change-transform"
          style={{ left: `${HERO_LAYERS.wingRight.left}%`, top: `${HERO_LAYERS.wingRight.top}%`, width: `${HERO_LAYERS.wingRight.width}%` }}
        >
          <Image src="/explore/hero-wing-right.webp" alt="" width={916} height={775} priority sizes="50vw" className="w-full h-auto" />
        </div>
        <div
          className="js-woman absolute z-[2]"
          style={{ left: `${HERO_LAYERS.woman.left}%`, top: `${HERO_LAYERS.woman.top}%`, width: `${HERO_LAYERS.woman.width}%` }}
        >
          <Image
            src="/explore/hero-woman.webp"
            alt="A grandmother in a red embroidered dupatta sits cross-legged, golden light streaming from her eyes"
            width={419}
            height={587}
            priority
            sizes="(max-width: 768px) 60vw, 25vw"
            className="w-full h-auto"
          />
        </div>
      </div>
    </>
  )
}

// Wings release their potatoes, then fade out in place (24-51%); the sky runs a quick
// time-lapse (50-75%) while the woman stays put at the centre.
export function addHeroScene(tl: gsap.core.Timeline, root: HTMLElement) {
  const q = gsap.utils.selector(root)
  // the sacks stay put and simply fade out once their potatoes have dropped
  tl.to(q('.js-wing-left'), { autoAlpha: 0, duration: 26, ease: 'power1.in' }, 24)
    .to(q('.js-wing-right'), { autoAlpha: 0, duration: 26, ease: 'power1.in' }, 25)
    .to(q('.js-clouds'), { xPercent: -6, duration: 50 }, 0)
    .to(q('.js-clouds'), { xPercent: -24, duration: 25, ease: 'power1.inOut' }, 50)
    // parallax: nearer clouds rise more than distant ones as you scroll down
    .to(q('.js-cloud'), { y: (_: number, el: HTMLElement) => `${-Number(el.dataset.depth) * 9}vh`, duration: 100, ease: 'none' }, 0)
    // sun arcs across the sky while the light dips to dusk and back
    .fromTo(q('.js-sun'), { autoAlpha: 0, x: '-25vmin', y: '20vh' }, { autoAlpha: 1, duration: 3 }, 50)
    .to(q('.js-sun'), { x: '100vw', duration: 22, ease: 'none' }, 50)
    .to(q('.js-sun'), { y: '-22vh', duration: 11, ease: 'sine.out' }, 50)
    .to(q('.js-sun'), { y: '20vh', duration: 11, ease: 'sine.in' }, 61)
    .fromTo(q('.js-dusk'), { autoAlpha: 0 }, { autoAlpha: 0.55, duration: 8, ease: 'sine.inOut' }, 53)
    .to(q('.js-dusk'), { autoAlpha: 0, duration: 9, ease: 'sine.inOut' }, 63)
}
