// Shared layout data for the explore-page hero sequence.
// All geometry is deterministic so server and client markup match.

// Where the hero artwork's layers sit inside its 1920x1080 (16:9) frame,
// as percentages of that frame (see public/explore/hero-*.webp).
export const HERO_LAYERS = {
  wingLeft: { left: 0, top: 0, width: 45.16 },
  wingRight: { left: 52.29, top: 0, width: 47.71 },
  woman: { left: 37.92, top: 41.85, width: 21.82 },
} as const

// Small seeded PRNG (mulberry32) so procedural shapes are stable across renders.
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
