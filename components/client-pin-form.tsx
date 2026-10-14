'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function ClientPinForm() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleAccess = () => {
    setError('')
    if (pin.includes("-")) {
      const [pinId, rawPin] = pin.split("-");
      router.push(`/manage/${pinId}/${rawPin}`);
    } else {
      setError("Invalid PIN format. Should be like abcd-123456");
    }
  };

  return (
    <>
      {/* 
        ======== DESKTOP VIEW CONTROLS ======== 
      */}
      <div className="hidden md:flex absolute top-[480px] left-1/2 w-0 h-0 justify-center items-center z-30">
        
        <div className="absolute right-[140px] flex flex-col gap-[14px]">
          <div className="flex gap-[14px]">
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
          {error && <p className="text-red-500 font-bold text-sm bg-white/90 px-3 py-1 rounded-lg border-2 border-red-500 inline-block self-start shadow-md">{error}</p>}
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

      {/* 
        ======== MOBILE VIEW CONTROLS ======== 
      */}
      <div className="flex md:hidden flex-col w-full max-w-[280px] gap-4 mt-0 z-30 px-4 relative">
        
        <div className="relative group w-full">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#cfb5e7] translate-y-[3px]"></div>
          <input 
            type="text" 
            placeholder="Enter your PIN" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="relative w-full h-[48px] px-5 rounded-full border-[1.5px] border-black bg-[#f2ddfa] focus:outline-none text-black placeholder:text-black/70 text-[15px] text-center"
          />
        </div>

        {error && <p className="text-red-500 font-bold text-sm text-center">{error}</p>}

        <button onClick={handleAccess} className="relative group outline-none w-full">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#cfb5e7] translate-y-[3px] group-active:translate-y-[1px] transition-transform"></div>
          <div className="relative w-full h-[48px] flex items-center justify-center rounded-full border-[1.5px] border-black bg-[#f2ddfa] text-black font-medium group-active:translate-y-[2px] transition-transform text-[15px]">
            Unlock
          </div>
        </button>

        <Link href="/buy" className="relative group outline-none w-full mt-1 block cursor-pointer">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#e2bf46] translate-y-[3px] group-active:translate-y-[1px] transition-transform"></div>
          <div className="relative w-full h-[48px] flex items-center justify-center rounded-full border-[1.5px] border-black bg-[#fce373] text-black font-medium group-active:translate-y-[2px] transition-transform text-[15px]">
            Get your own Potato
          </div>
        </Link>

      </div>
    </>
  )
}
