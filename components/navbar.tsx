import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 w-full h-20 md:h-[88px] z-50 flex items-center justify-between px-6 sm:px-8 md:px-[5%] bg-transparent select-none">
      {/* Top Left: Brand Name */}
      <Link
        href="/"
        className="text-black font-bold text-xl md:text-2xl tracking-tight hover:opacity-80 transition-opacity"
      >
        PotatoBae
      </Link>

      {/* Top Right: Horizontal Navigation Links */}
      <div className="flex items-center gap-7 sm:gap-8 md:gap-10">
        <Link
          href="/explore"
          className="nav-link-animated text-black font-medium text-sm md:text-base tracking-normal transition-colors"
        >
          Explore
        </Link>

        <Link
          href="/buy"
          className="nav-link-animated text-black font-semibold text-sm md:text-base tracking-normal transition-colors"
        >
          Buy Now
        </Link>
      </div>
    </nav>
  )
}

