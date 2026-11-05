import Image from 'next/image'
import { PotatoJourney } from './potato-journey'

function Cursor({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 30" aria-hidden>
      <path d="M2 1 L2 25 L8 19 L12.5 28.5 L16.5 26.5 L12 17.5 L20 17.5Z" fill="#000" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 40" fill="none" aria-hidden>
      <path d="M3 4 Q3 2 5 2 H43 Q45 2 45 4 V30 Q45 32 43 32 H16 L8 38 V32 H5 Q3 32 3 30Z" stroke="#000" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="16" cy="17" r="2" fill="#000" />
      <circle cx="24" cy="17" r="2" fill="#000" />
      <circle cx="32" cy="17" r="2" fill="#000" />
    </svg>
  )
}

function Website() {
  return (
    <div>
      <div className="flex items-center">
        <span className="rounded-[6px] border-[1.5px] border-black px-2 py-0.5 text-[15px] md:text-[17px] tracking-wide">www.</span>
        <Cursor className="-ml-2 mt-6 w-6 md:w-8 shrink-0" />
        <span className="-ml-1 text-[20px] md:text-[26px] font-bold italic tracking-tight">PotatoBae.com</span>
      </div>
      <p className="mt-3 text-[15px] md:text-[17px]">Go to the website</p>
    </div>
  )
}

function ClaimPin() {
  return (
    <div>
      {/* journey start: while the journey runs, the travelling potato sits on this spot and
          only the PIN stars stay printed below it */}
      <div data-anchor="lock" className="relative w-[68px] md:w-[78px]">
        <Image src="/explore/lock-potato.webp" alt="" width={260} height={199} className="w-full h-auto group-data-[journey=on]/how:invisible" />
        <Image
          src="/explore/lock-potato-stars.webp"
          alt=""
          width={260}
          height={29}
          className="hidden group-data-[journey=on]/how:block absolute left-0 top-[85.43%] w-full h-auto"
        />
      </div>
      <p data-avoid="claim" className="mt-3 w-fit text-[15px] md:text-[17px] leading-snug">
        Enter the PIN
        <br />
        Claim your Potato
      </p>
    </div>
  )
}

function WriteMessage() {
  return (
    <div>
      <ChatIcon className="w-11 md:w-12" />
      <p className="mt-2 text-[15px] md:text-[17px]">Write your message</p>
    </div>
  )
}

// The section the hero's leaves part to reveal: the three steps and the closing banner.
export function HowItWorks() {
  return (
    <section id="how-it-works" className="group/how relative z-0 bg-[#fafafa] text-black motion-safe:-mt-[100vh] font-[family-name:var(--font-condensed)]">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8 pt-28 md:pt-32">
        <h2 className="text-center text-[34px] md:text-[56px] font-bold leading-none tracking-tight">How PotatoBae Works</h2>

        {/* Step 1: website, PIN, message */}
        <div className="mt-10 md:mt-6 md:relative md:aspect-[1200/640]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:block">
            <div className="col-span-2 md:absolute md:left-[6%] md:top-[4%]">
              <Website />
            </div>
            <div className="md:absolute md:left-[64%] md:top-[6%]">
              <ClaimPin />
            </div>
            <div data-avoid="chat" className="self-end md:absolute md:left-[78%] md:top-[46%]">
              <WriteMessage />
            </div>
          </div>
          <Image
            src="/explore/step-glasses.webp"
            alt="A grinning grandfather in a green elephant-print silk shirt and gold chains adjusts his yellow sunglasses"
            width={1400}
            height={700}
            sizes="(max-width: 768px) 100vw, 900px"
            className="mt-8 w-full h-auto md:mt-0 md:absolute md:left-[1%] md:bottom-0 md:w-[76%]"
          />
        </div>
      </div>

      {/* Step 2: hand it over */}
      <div className="mx-auto max-w-[1200px] px-5 md:px-8 mt-24 md:mt-40">
        <div className="relative aspect-[1200/760] md:aspect-[1200/560]">
          <p data-avoid="give" className="absolute right-[4%] top-0 md:right-[14%] text-[17px] md:text-[20px]">
            Give them this Potato, <b className="italic">Act Normal</b>.
          </p>
          <Image
            src="/explore/man-sickle.webp"
            alt="A grandfather in a checked lungi and sunglasses rests a sickle on his shoulder"
            width={900}
            height={1301}
            sizes="(max-width: 768px) 45vw, 330px"
            className="absolute left-0 bottom-0 w-[42%] md:left-[8%] md:w-[29%] h-auto"
          />
          <svg className="absolute left-[34%] top-[36%] w-[30%] md:left-[34%] md:top-[30%] md:w-[22%]" viewBox="0 0 240 110" fill="none" aria-hidden>
            <path d="M2 4 C60 0 70 30 80 60 S150 92 238 96" stroke="#000" strokeWidth="2" strokeDasharray="8 7" />
          </svg>
          <Image
            src="/explore/potato-sprite-small.webp"
            alt=""
            width={140}
            height={141}
            data-anchor="toss"
            className="absolute left-[46%] top-[58%] md:left-[43%] md:top-[54%] w-[9%] md:w-[5%] h-auto rotate-[-20deg] group-data-[journey=on]/how:invisible"
          />
          <Image
            src="/explore/woman-smile.webp"
            alt="A grandmother in jasmine flowers, sunglasses and a cream and gold saree grins to show her gold teeth"
            width={1000}
            height={921}
            sizes="(max-width: 768px) 48vw, 360px"
            className="absolute right-0 bottom-0 w-[48%] md:right-[10%] md:w-[31%] h-auto"
          />
        </div>
      </div>

      {/* Step 3: the message lives on the potato */}
      <div className="mx-auto max-w-[1200px] px-5 md:px-8 mt-24 md:mt-40">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <p data-avoid="tap" className="md:w-[40%] md:pl-[6%] text-[17px] md:text-[20px] leading-snug">
            Every time they tap the Potato,
            <br />
            your updated <b className="italic">message</b> appears.
          </p>
          {/* sits above the travelling potato, which slides in behind the phone */}
          <div data-anchor="phone" className="relative z-[6] w-full md:w-[56%]">
            <Image
              src="/explore/phone-hand.webp"
              alt="A hand holds a phone showing a message beside a potato"
              width={1200}
              height={875}
              sizes="(max-width: 768px) 100vw, 640px"
              className="w-full h-auto group-data-[journey=on]/how:invisible"
            />
            <Image
              src="/explore/phone-hand-empty.webp"
              alt=""
              width={1200}
              height={875}
              sizes="(max-width: 768px) 100vw, 640px"
              className="hidden group-data-[journey=on]/how:block absolute inset-0 w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* Closing banner */}
      <div className="mt-24 md:mt-36">
        <div data-anchor="sack" className="relative">
          <Image
            src="/explore/footer-sacks.webp"
            alt="A man in an orange turban sits among sacks of golden PotatoBae potatoes"
            width={2400}
            height={1071}
            sizes="100vw"
            className="w-full h-auto"
          />
          {/* the front rim of the sack the potato drops into, laid over the same pixels so
              the potato can fall behind it */}
          <Image
            src="/explore/sack-rim.webp"
            alt=""
            loading="eager"
            width={520}
            height={460}
            sizes="22vw"
            className="hidden group-data-[journey=on]/how:block absolute z-[6] left-[57.92%] top-[28.01%] w-[21.67%] h-auto"
          />
        </div>
        <footer className="relative z-[7] flex items-center gap-6 bg-black px-5 md:px-8 py-3 text-[12px] font-semibold text-white">
          <span>Terms &amp; Support</span>
          <span>Privacy Policy</span>
        </footer>
      </div>
      <PotatoJourney />
    </section>
  )
}
