import type { Metadata } from 'next'
import { Roboto_Condensed } from 'next/font/google'
import { Navbar } from '@/components/navbar'
import { ScrollTransition } from '@/components/explore/scroll-transition'
import { HowItWorks } from '@/components/explore/how-it-works'

const condensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-condensed',
})

export const metadata: Metadata = {
  title: 'Explore · PotatoBae',
  description: 'How PotatoBae works: claim your potato, write your message, hand it over.',
}

export default function ExplorePage() {
  return (
    <main className={`${condensed.variable} w-full bg-[#fafafa] overflow-x-clip`}>
      <Navbar />
      <ScrollTransition />
      <HowItWorks />
    </main>
  )
}
