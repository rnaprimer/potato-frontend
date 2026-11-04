'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { HeroScene, addHeroScene } from './hero-scene'
import { createGardenState } from './garden/garden-state'
import { addGarden } from './garden/garden-timeline'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// three.js only loads in the browser, after the hero photo is already on screen
const GardenCanvas = dynamic(() => import('./garden/garden-canvas'), { ssr: false })

type Mode = 'pending' | 'motion' | 'still' | 'off'

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

// Pinned hero story: ~350vh of scroll scrubs one 0-100 timeline. The next section is
// pulled up underneath the pinned stage, so when the garden opens it is already there.
export function ScrollTransition() {
  const story = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const garden = useRef(createGardenState())
  const [mode, setMode] = useState<Mode>('pending')
  const [mobile, setMobile] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 767px)')
    const update = () => {
      setMobile(narrow.matches)
      setMode(!hasWebGL() ? 'off' : reduce.matches ? 'still' : 'motion')
    }
    update()
    reduce.addEventListener('change', update)
    narrow.addEventListener('change', update)
    return () => {
      reduce.removeEventListener('change', update)
      narrow.removeEventListener('change', update)
    }
  }, [])

  // Reduced motion shows one calm frame: a green patch beneath her, nothing moving.
  useEffect(() => {
    if (mode === 'still') Object.assign(garden.current, { grow: 0.32, lush: 0.3, wind: 0 })
  }, [mode])

  // Once the 3D woman is drawn in the same place, hide the DOM photo (kept for layout).
  useEffect(() => {
    const woman = stage.current?.querySelector<HTMLElement>('.js-woman')
    if (!woman || !ready) return
    const id = window.setTimeout(() => (woman.style.opacity = '0'), 700)
    return () => {
      window.clearTimeout(id)
      woman.style.opacity = ''
    }
  }, [ready])

  useGSAP(
    () => {
      ScrollTrigger.config({ ignoreMobileResize: true })
      const mm = gsap.matchMedia()
      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', mobile: '(max-width: 767px)' },
        (ctx) => {
          if (!ctx.conditions?.motion) return
          const root = stage.current!
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: story.current,
              start: 'top top',
              end: () => `+=${window.innerHeight * 3.5}`,
              pin: root,
              pinSpacing: false,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          })
          addHeroScene(tl, root)
          addGarden(tl, garden.current, root)
          tl.set({}, {}, 100)
        },
      )
      return () => mm.revert()
    },
    { scope: story },
  )

  const onReady = useCallback(() => setReady(true), [])
  const show3d = mode === 'motion' || mode === 'still'

  return (
    <section ref={story} aria-label="PotatoBae" className="relative z-10 motion-safe:h-[450vh]">
      <div ref={stage} className="relative h-screen w-full overflow-hidden pointer-events-none">
        <div className="js-scene absolute inset-0">
          <HeroScene
            ground={
              show3d && stage.current ? (
                <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
                  <GardenCanvas
                    key={mobile ? 'm' : 'd'}
                    state={garden.current}
                    root={stage.current}
                    mobile={mobile}
                    still={mode === 'still'}
                    onReady={onReady}
                  />
                </div>
              ) : null
            }
          />
        </div>
      </div>
    </section>
  )
}
