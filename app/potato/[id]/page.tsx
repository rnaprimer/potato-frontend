'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getPotato } from '@/services/api'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function PotatoView() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchPotato = async () => {
      try {
        const res = await getPotato(id as string)
        setMessage(res.message || "")
      } catch (err: any) {
        console.error(err)
        setError("Potato not found")
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchPotato()
  }, [id])

  if (loading) {
     return (
      <main className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center">
         <p className="text-xl font-medium">Loading... 🥔</p>
      </main>
     )
  }

  if (error) {
     return (
        <main className="w-full h-[100dvh] bg-[#f8f8f8] flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">{error}</h1>
            <Link href="/" className="underline text-blue-600">Go back home</Link>
        </main>
     )
  }

  return (
    <main className="w-full h-[100dvh] bg-[#fff] relative flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="z-20 text-center flex flex-col items-center mt-[-100px]">
        <p className="text-black/60 font-semibold mb-4 tracking-widest uppercase">💌 A message for you</p>
        
        <h1 className="text-3xl md:text-5xl font-extrabold text-black max-w-2xl leading-tight">
          {message || "Something beautiful is waiting..."}
        </h1>
      </div>

      {/* The Potato Layer (Background decorative) */}
      <div className="absolute top-[50vh] left-1/2 -translate-x-1/2 z-10 pointer-events-none w-[320px] opacity-20">
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image 
            src="/potato.png" 
            width={600} 
            height={848} 
            alt="potato" 
            className="w-full h-auto object-contain blur-[2px]" 
            priority 
          />
        </motion.div>
      </div>
    </main>
  )
}
