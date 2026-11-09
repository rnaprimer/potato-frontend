'use client'

import { useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'
import { PotatoBaeOrbitShowcase } from './orbit-showcase'

// The square canvas holding the orbiting POTATOBAE ribbon and the two silver pouches.
// One revolution every `orbitDurationMs`; it stays still for reduced-motion users.
export function OrbitStage({ orbitDurationMs = 6000 }: { orbitDurationMs?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  // Start fetching the pouch photo with the page HTML, not after the script runs.
  preload('/buy/pouches-rgb.jpg', { as: 'image', fetchPriority: 'high' })
  preload('/buy/pouches-alpha.png', { as: 'image', fetchPriority: 'high' })

  useEffect(() => {
    if (!canvas.current) return
    const showcase = new PotatoBaeOrbitShowcase(canvas.current, { orbitDurationMs, onReady: () => setReady(true) })
    return () => showcase.destroy()
  }, [orbitDurationMs])

  return (
    <div className="relative aspect-square w-full select-none">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Two silver PotatoBae pouches with a neon green POTATOBAE ribbon orbiting around them"
        className={`block h-full w-full transition-opacity duration-500 ease-out ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
