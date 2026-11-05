'use client'

import { useEffect, useRef } from 'react'
import { PotatoBaeOrbitShowcase } from './orbit-showcase'

// The square canvas holding the orbiting POTATOBAE ribbon and the two silver pouches.
// One revolution every `orbitDurationMs`; it stays still for reduced-motion users.
export function OrbitStage({ orbitDurationMs = 6000 }: { orbitDurationMs?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvas.current) return
    const showcase = new PotatoBaeOrbitShowcase(canvas.current, { orbitDurationMs })
    return () => showcase.destroy()
  }, [orbitDurationMs])

  return (
    <div className="relative aspect-square w-full select-none">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Two silver PotatoBae pouches with a neon green POTATOBAE ribbon orbiting around them"
        className="block h-full w-full"
      />
    </div>
  )
}
