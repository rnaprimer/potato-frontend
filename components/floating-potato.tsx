'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export default function FloatingPotato() {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Shadow */}
      <motion.div
        className="absolute bottom-0 w-48 h-12 bg-black rounded-full blur-2xl opacity-30"
        animate={{
          scaleY: [0.6, 0.8, 0.6],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Potato */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -24, 0],
          rotate: [0, 3, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Image
          src="/potato.png"
          alt="Just a potato"
          width={200}
          height={200}
          priority
          className="drop-shadow-lg"
        />
      </motion.div>
    </div>
  )
}
