import Image from 'next/image'

export default function FloatingPotato() {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Shadow */}
      <div className="absolute bottom-0 w-48 h-12 bg-black rounded-full blur-2xl opacity-30 animate-pulse-shadow" />

      {/* Potato */}
      <div className="relative animate-bounce-potato">
        <Image
          src="/potato.png"
          alt="Just a potato"
          width={200}
          height={200}
          priority
          className="drop-shadow-lg"
        />
      </div>
    </div>
  )
}
