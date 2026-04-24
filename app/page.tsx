'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [pin, setPin] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null;

  const handleAccess = () => {
    if (pin.includes("-")) {
      const [pinId, rawPin] = pin.split("-");
      router.push(`/manage/${pinId}/${rawPin}`);
    } else {
      alert("Invalid PIN. It should look like abcd-123456");
    }
  };

  return (
    <main className="w-full h-[100dvh] bg-white relative flex flex-col items-center justify-center overflow-hidden">
      
      {/* 
        ======== DESKTOP VIEW ======== 
        A scaled fixed-size container perfectly locking proportions.
        Visibile on screens medium (md) and up.
      */}
      <div 
        className="hidden md:block relative w-[1200px] h-[900px] flex-shrink-0 origin-center scale-[0.6] lg:scale-[0.85] xl:scale-100"
      >
        {/* The Text Layer (Front Overlap) */}
        <div className="absolute top-[160px] left-1/2 -translate-x-1/2 flex flex-col items-start z-20">
          <h2 className="text-[26px] font-semibold tracking-[0.5em] text-black mb-0 ml-[4px]">JUST A</h2>
          <h1 className="text-[140px] leading-[0.85] font-extrabold text-black tracking-[-0.05em]">POTATO.</h1>
        </div>

        {/* The Shadow */}
        <div className="absolute top-[700px] left-1/2 -translate-x-1/2 z-0 flex justify-center items-center">
          <motion.div 
            className="w-[360px] h-[30px] bg-black blur-[22px] rounded-[100%]"
            animate={{ scale: [1, 0.75, 1], opacity: [0.35, 0.15, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* The Potato Layer (Background) */}
        <div className="absolute top-[100px] left-1/2 -translate-x-1/2 z-10 pointer-events-none w-[520px]">
          <motion.div
            animate={{ y: [0, -35, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image 
              src="/potato.png" 
              width={1000} 
              height={1414} 
              alt="potato" 
              className="w-full h-auto object-contain" 
              priority 
            />
          </motion.div>
        </div>

        {/* The Controls Layer (Front) */}
        <div className="absolute top-[480px] left-1/2 w-0 h-0 flex justify-center items-center z-30">
          
          <div className="absolute right-[140px] flex gap-[14px]">
            <div className="relative group w-[230px]">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#cfb5e7] translate-y-[5px]"></div>
              <input 
                type="text" 
                placeholder="Enter your PIN" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="relative w-full h-[54px] px-6 rounded-full border-[1.5px] border-black bg-[#f2ddfa] focus:outline-none text-black placeholder:text-black/70 text-[16px] text-center"
              />
            </div>

            <button onClick={handleAccess} className="relative group outline-none w-[120px]">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#cfb5e7] translate-y-[5px] group-active:translate-y-[2px] transition-transform"></div>
              <div className="relative w-full h-[54px] flex items-center justify-center rounded-full border-[1.5px] border-black bg-[#f2ddfa] text-black font-medium group-active:translate-y-[3px] transition-transform text-[16px]">
                Unlock
              </div>
            </button>
          </div>

          <div className="absolute left-[140px]">
            <Link href="/buy" className="relative group outline-none w-[240px] block cursor-pointer">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#e2bf46] translate-y-[5px] group-active:translate-y-[2px] transition-transform"></div>
              <div className="relative w-full h-[54px] flex items-center justify-center rounded-full border-[1.5px] border-black bg-[#fce373] text-black font-medium group-active:translate-y-[3px] transition-transform text-[16px]">
                Get your own Potato
              </div>
            </Link>
          </div>

        </div>
      </div>

      {/* 
        ======== MOBILE VIEW ======== 
        Fluid relative flow stacking for tall/narrow screens.
        Visible completely only on very small screens.
      */}
      <div className="flex md:hidden flex-col items-center justify-center w-full h-full relative overflow-hidden">
        
        {/* The Text Layer */}
        <div className="relative flex flex-col items-start z-20 ml-[-10px]">
          <h2 className="text-[16px] font-semibold tracking-[0.5em] text-black mb-0 ml-[2px]">JUST A</h2>
          <h1 className="text-[85px] leading-[0.85] font-extrabold text-black tracking-[-0.05em]">POTATO.</h1>
        </div>

        {/* The Potato Layer */}
        <div className="relative w-full max-w-[260px] mt-[-30px] z-10 flex flex-col items-center">
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full relative z-20 pointer-events-none"
          >
            <Image 
              src="/potato.png" 
              width={600} 
              height={848} 
              alt="potato" 
              className="w-full h-auto object-contain" 
              priority
            />
          </motion.div>
          {/* The Shadow */}
          <motion.div 
            className="w-[180px] h-[15px] bg-black blur-[12px] rounded-[100%] absolute -bottom-4 z-0"
            animate={{ scale: [1, 0.75, 1], opacity: [0.35, 0.15, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* The Controls Layer */}
        <div className="flex flex-col w-full max-w-[320px] gap-5 mt-10 z-30 px-4">
          
          <div className="relative group w-full">
            <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#cfb5e7] translate-y-[4px]"></div>
            <input 
              type="text" 
              placeholder="Enter your PIN" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="relative w-full h-[54px] px-6 rounded-full border-[1.5px] border-black bg-[#f2ddfa] focus:outline-none text-black placeholder:text-black/70 text-[16px] text-center"
            />
          </div>

          <button onClick={handleAccess} className="relative group outline-none w-full">
            <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#cfb5e7] translate-y-[4px] group-active:translate-y-[2px] transition-transform"></div>
            <div className="relative w-full h-[54px] flex items-center justify-center rounded-full border-[1.5px] border-black bg-[#f2ddfa] text-black font-medium group-active:translate-y-[3px] transition-transform text-[16px]">
              Unlock
            </div>
          </button>

          <Link href="/buy" className="relative group outline-none w-full mt-2 block cursor-pointer">
            <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#e2bf46] translate-y-[4px] group-active:translate-y-[2px] transition-transform"></div>
            <div className="relative w-full h-[54px] flex items-center justify-center rounded-full border-[1.5px] border-black bg-[#fce373] text-black font-medium group-active:translate-y-[3px] transition-transform text-[16px]">
              Get your own Potato
            </div>
          </Link>

        </div>
      </div>

    </main>
  )
}
