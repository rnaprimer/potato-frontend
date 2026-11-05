import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL, LegalPage, Section } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy · PotatoBae',
  description: 'What PotatoBae collects, why, and what you can do about it.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          We collect as little as we can. This page explains what {LEGAL.brand} stores, who else handles it, and how to ask
          us to change or delete it.
        </p>
      }
    >
      <Section title="What we store">
        <ul>
          <li>
            <strong>Your potato&apos;s message.</strong> Whatever you write is stored so it can be shown when someone taps
            the potato. Anyone who taps it can read it, so treat it as public.
          </li>
          <li>
            <strong>Your PIN, scrambled.</strong> We store a one-way hash of each PIN, never the PIN itself, so we can check
            it without being able to read it.
          </li>
          <li>
            <strong>Basic records.</strong> Each potato&apos;s ID and when it and its message were created or last changed.
          </li>
        </ul>
        <p>We don&apos;t ask you to create an account, and we don&apos;t use advertising or tracking cookies.</p>
      </Section>

      <Section title="Payments">
        <p>
          Payments are handled by Razorpay. They collect the details needed to take your payment, under their own privacy
          policy. We receive the order and payment IDs and the amount, so we can confirm your order; we never receive your
          card or bank details.
        </p>
      </Section>

      <Section title="Delivery">
        <p>
          If we need your name, address or phone number to deliver your potato, we use them only for that delivery and to
          contact you about your order, and share them only with the courier delivering it.
        </p>
      </Section>

      <Section title="Technical information">
        <p>
          Like most websites, our hosting providers keep short-lived server logs, such as IP addresses and request times, to
          run the service and protect it from abuse. We limit repeated PIN attempts to keep potatoes safe.
        </p>
      </Section>

      <Section title="Who handles your data">
        <ul>
          <li>Razorpay, for payments.</li>
          <li>Our hosting and database providers, who store the site and your potato&apos;s message for us.</li>
          <li>A courier, only for delivery.</li>
        </ul>
        <p>We don&apos;t sell your information.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          A potato&apos;s message is kept while its message page is active. Order and payment records are kept as long as
          we need them for accounting and tax law. Delivery details are deleted once they&apos;re no longer needed for your
          order.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can change or clear your potato&apos;s message at any time with its PIN. To ask what we hold about you, or to
          have it corrected or deleted, email <strong>{LEGAL.supportEmail}</strong>. We&apos;ll respond within 30 days.
        </p>
      </Section>

      <Section title="Children">
        <p>PotatoBae isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their information.</p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this policy, we&apos;ll update the date at the top. See our{' '}
          <Link href="/terms">Terms &amp; Support</Link> for the rules of using a PotatoBae.
        </p>
      </Section>
    </LegalPage>
  )
}
