import { gsap } from 'gsap'
import type { GardenState } from './garden-state'

/*
 * SCROLL TIMING: tweak here. The pinned hero runs one timeline from 0 to 100 over
 * ~350vh of scroll; the last argument of each tween is where it starts on that scale.
 *   grow   0-80   green spreads from her mound (to 34), then over the whole land
 *   lush   55-88  grass deepens, wildflowers open
 *   potatoes 6-38 fall and bounce, 46-56 settle into the soil
 *   plants 52-75  potato plants sprout where potatoes landed
 *   swap   40-55  her portrait changes to the sunglasses one as the sacks vanish
 *   frame  74-100 large plants close in, then the garden opens onto the next section
 */
export function addGarden(tl: gsap.core.Timeline, state: GardenState, root: HTMLElement) {
  // green spreads from beneath the woman from the first scroll, then takes the whole land
  tl.fromTo(state, { scroll: 0 }, { scroll: 1, duration: 100, ease: 'none' }, 0)
    .fromTo(state, { grow: 0 }, { grow: 0.3, duration: 33, ease: 'power1.out' }, 1)
    .to(state, { grow: 1, duration: 46, ease: 'power1.in' }, 34)
    .fromTo(state, { lush: 0 }, { lush: 1, duration: 33, ease: 'sine.inOut' }, 55)
    // the breeze picks up during the time-lapse
    .fromTo(state, { wind: 0.35 }, { wind: 1, duration: 12, ease: 'sine.inOut' }, 50)
    .to(state, { wind: 0.6, duration: 13, ease: 'sine.inOut' }, 62)
    .fromTo(state, { dusk: 0 }, { dusk: 1, duration: 8, ease: 'sine.inOut' }, 53)
    .to(state, { dusk: 0, duration: 9, ease: 'sine.inOut' }, 63)
    .fromTo(state, { push: 0 }, { push: 1, duration: 50, ease: 'power1.inOut' }, 50)
    // as the sacks finish fading (24-51), her beams portrait gives way to the sunglasses one
    .fromTo(state, { swap: 0 }, { swap: 1, duration: 15, ease: 'sine.inOut' }, 40)

  state.potatoes.forEach((p, i) => {
    tl.fromTo(p, { t: 0 }, { t: 1, duration: 14, ease: 'none' }, 6 + i * 1.6).fromTo(
      p,
      { sink: 0 },
      { sink: 1, duration: 10, ease: 'power1.inOut' },
      46 + (i % 5),
    )
  })

  state.plants.forEach((_, k) => {
    tl.fromTo(
      state.plants,
      { [k]: 0 },
      { [k]: 1, duration: 14, ease: 'power1.out' },
      52 + k * 1.6,
    )
  })

  tl.fromTo(state, { frame: 0 }, { frame: 1, duration: 14, ease: 'power2.out' }, 74).fromTo(
    state,
    { part: 0 },
    { part: 1, duration: 12, ease: 'power2.inOut' },
    88,
  )

  // the garden splits down the middle, following the plants as they swing aside, and
  // the section underneath shows through the widening gap (two soft-edged half masks)
  const scene = root.querySelector('.js-scene')
  const half = (dir: number) =>
    `linear-gradient(${dir}deg, #000 calc(50% - var(--gap) * 1vw), transparent calc(50% - var(--gap) * 1vw + 12vw))`
  const mask = `${half(90)}, ${half(270)}`
  tl.set(scene, { '--gap': -14, maskImage: mask, webkitMaskImage: mask }, 87).to(
    scene,
    { '--gap': 64, duration: 12, ease: 'power2.inOut' },
    88,
  )
}
