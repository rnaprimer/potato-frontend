import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL, LegalPage, Section } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Terms & Support · PotatoBae',
  description: 'The terms for buying and using a PotatoBae, and how to get help.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Support"
      intro={
        <p>
          A PotatoBae is a real potato that carries a message. You buy it, claim it with its PIN, write your message, and
          hand it over. These terms cover that whole journey. By buying or using a PotatoBae you agree to them.
        </p>
      }
    >
      <Section title="Getting help">
        <p>
          Something not working, a PIN that won&apos;t unlock, or a question about your order? Write to us at{' '}
          <strong>{LEGAL.supportEmail}</strong> and include your Razorpay payment ID if it&apos;s about an order. We aim to
          reply within two working days.
        </p>
        <ul>
          <li>
            <strong>Lost your PIN?</strong> We can&apos;t see or recover PINs, because we only store a scrambled version of
            them. Send us your payment ID and we&apos;ll work out what we can do.
          </li>
          <li>
            <strong>Message not showing?</strong> Messages update as soon as you save them. Ask the recipient to refresh the
            page after tapping the potato.
          </li>
        </ul>
      </Section>

      <Section title="What you're buying">
        <p>
          You&apos;re buying a physical potato together with access to a message page linked to it. Each PotatoBae comes
          with a PIN that lets you set and change that message. Anyone who taps the potato can read the current message.
        </p>
        <p>
          It is a novelty gift. It is a real potato, so it won&apos;t last forever, and it isn&apos;t sold as food. Please
          don&apos;t eat it.
        </p>
      </Section>

      <Section title="Prices and payment">
        <p>
          Prices are shown in Indian rupees at checkout. Payments are processed by Razorpay; we never see or store your card
          or bank details. Your order is confirmed once Razorpay tells us the payment succeeded.
        </p>
      </Section>

      <Section title="Cancellations and refunds">
        <p>
          If your potato arrives damaged, or never arrives, contact us within 7 days of delivery (or of the expected
          delivery date) and we&apos;ll replace it or refund you. Because each potato is made for a message, we can&apos;t
          take back a potato that has already been claimed with its PIN for a change of mind. Refunds go back to the
          original payment method through Razorpay.
        </p>
      </Section>

      <Section title="Your PIN and your message">
        <ul>
          <li>Keep your PIN private. Anyone with it can change the message.</li>
          <li>
            You&apos;re responsible for what you write. Don&apos;t post anything unlawful, hateful, threatening, harassing,
            sexually explicit, or that shares someone else&apos;s private information.
          </li>
          <li>We may remove a message, or disable a potato, if it breaks these rules or we&apos;re legally required to.</li>
        </ul>
      </Section>

      <Section title="Our service">
        <p>
          We work to keep message pages online, but we can&apos;t promise they&apos;ll always be available. We may change or
          retire features, and we&apos;ll give reasonable notice before switching off message pages for potatoes we&apos;ve
          sold.
        </p>
        <p>
          To the extent the law allows, our total liability for any claim about a PotatoBae is limited to the amount you
          paid for it. Nothing here limits rights you have as a consumer that can&apos;t be excluded by law.
        </p>
      </Section>

      <Section title="Changes and governing law">
        <p>
          We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of
          India. See our <Link href="/privacy">Privacy Policy</Link> for how we handle your information.
        </p>
      </Section>
    </LegalPage>
  )
}
