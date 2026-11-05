import type { ReactNode } from 'react'
import { Roboto_Condensed } from 'next/font/google'
import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'

const condensed = Roboto_Condensed({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'] })

/*
 * LEGAL DETAILS: fill these in before going live. They appear on both the Terms &
 * Support and Privacy Policy pages.
 */
export const LEGAL = {
  brand: 'PotatoBae',
  supportEmail: '[support email]',
  updated: '5 November 2026',
}

export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className={`${condensed.className} min-h-[100dvh] bg-[#fafafa] text-black`}>
      <Navbar />
      <article className="mx-auto max-w-[760px] px-5 pb-24 pt-28 md:px-8 md:pt-36">
        <h1 className="text-[40px] font-bold leading-none tracking-tight md:text-[64px]">{title}</h1>
        <p className="mt-4 text-[14px] uppercase tracking-wider text-black/50">Last updated {LEGAL.updated}</p>
        <div className="mt-8 text-[18px] leading-relaxed md:text-[20px]">{intro}</div>
        <div className="mt-12 space-y-12">{children}</div>
      </article>
      <SiteFooter />
    </main>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="border-t-[2px] border-black pt-4 text-[24px] font-bold leading-tight md:text-[30px]">{title}</h2>
      <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-black/80 md:text-[18px] [&_a]:underline [&_a]:underline-offset-2 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
