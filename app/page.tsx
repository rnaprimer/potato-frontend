import Image from 'next/image'
import { ClientPinForm } from '@/components/client-pin-form'
import { Navbar } from '@/components/navbar'

export default function Home() {
  return (
    <main className="w-full h-[100dvh] bg-white relative flex flex-col items-center justify-center overflow-hidden">
      <Navbar />

      {/* 
        ======== DESKTOP VIEW ======== 
        A scaled fixed-size container perfectly locking proportions.
        Visibile on screens medium (md) and up.
      */}
      <div
        className="hidden md:block relative w-[1200px] h-[900px] flex-shrink-0 origin-center scale-[0.6] lg:scale-[0.85] xl:scale-100"
      >
        {/* The Text Layer (Front Overlap) */}
        <div className="absolute top-[190px] left-1/2 -translate-x-1/2 flex flex-col items-start z-20">

          <h1 className="text-[140px] leading-[0.85] font-extrabold text-black tracking-[-0.05em]">POTATO</h1>
        </div>

        {/* The Shadow */}
        <div className="absolute top-[700px] left-1/2 -translate-x-1/2 z-0 flex justify-center items-center">
          <div className="w-[360px] h-[30px] bg-black blur-[22px] rounded-[100%] animate-pulse-shadow" />
        </div>

        {/* The Potato Layer (Background) */}
        <div className="absolute top-[100px] left-1/2 -translate-x-1/2 z-10 pointer-events-none w-[520px]">
          <div className="animate-bounce-potato">
            <Image
              src="/potato.png"
              width={1000}
              height={1414}
              alt="potato"
              sizes="(max-width: 768px) 0vw, 50vw"
              className="w-full h-auto object-contain"
              priority
            />
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
        {/* <div className="relative flex flex-col items-start z-10 ml-[-10px]">
          <h1 className="text-[75px] leading-[0.85] font-extrabold text-black tracking-[-0.05em]">POTATO</h1>
        </div> */}

        <div className="relative flex flex-col items-start z-10 ml-[-10px] mt-18">
          <h1 className="text-[75px] leading-[0.85] font-extrabold text-black tracking-[-0.05em]">
            POTATO
          </h1>
        </div>

        {/* The Potato Layer */}
        <div className="relative w-full max-w-[260px] mt-[-70px] z-15 flex flex-col items-center">
          <div className="w-full relative z-24 pointer-events-none animate-bounce-potato">
            <Image
              src="/potato.png"
              width={600}
              height={848}
              alt="potato"
              sizes="(max-width: 768px) 100vw, 0vw"
              className="w-full h-auto object-contain"
              priority
            />
          </div>
          {/* The Shadow */}
          {/* <div className="w-[180px] h-[15px] bg-black blur-[12px] rounded-[100%] absolute -bottom-4 z-0 animate-pulse-shadow" /> */}

          <div className="w-[180px] h-[15px] bg-black/70 blur-[12px] rounded-[100%] absolute bottom-[10px] z-0 animate-pulse-shadow" />
        </div>

      </div>
      {/* The Interactive Form Controls (Responsive) */}
      <ClientPinForm />

    </main>
  )
}
