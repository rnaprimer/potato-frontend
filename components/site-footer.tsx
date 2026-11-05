import Link from 'next/link'

// The black strip at the foot of the Explore and Buy pages. Legal links live here,
// not in the navbar.
export function SiteFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`relative flex items-center gap-6 bg-black px-5 py-3 text-[12px] font-semibold text-white md:px-8 ${className}`}>
      <Link href="/terms" className="hover:underline underline-offset-2">
        Terms &amp; Support
      </Link>
      <Link href="/privacy" className="hover:underline underline-offset-2">
        Privacy Policy
      </Link>
    </footer>
  )
}
