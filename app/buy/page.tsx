'use client'

import { useState } from 'react'
import Script from 'next/script'
import { Roboto_Condensed } from 'next/font/google'
import { Navbar } from '@/components/navbar'
import { OrbitStage } from '@/components/buy/orbit-stage'
import { createOrder, verifyPayment } from '@/services/api'

const condensed = Roboto_Condensed({ subsets: ['latin'], weight: ['700'] })

export default function BuyPage() {
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    setLoading(true)
    try {
      const order = await createOrder();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "rzp_test_Sc946dIKfIiSAX",
        amount: order.amount,
        currency: "INR",
        name: "Potato",
        description: "Premium Potato",
        order_id: order.id,

        handler: async function (response: any) {
          try {
            await verifyPayment(response);
            alert("Payment Successful 🚀");
          } catch (err) {
            alert("Payment verification failed");
          }
        },

        theme: { color: "#111" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setLoading(false)
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-white">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />

      {/* Product on the left, a single Buy Now on the right; stacked on phones */}
      <div className="mx-auto flex min-h-[100dvh] max-w-[1280px] flex-col items-center justify-center gap-6 px-4 pb-12 pt-24 md:flex-row md:gap-0 md:px-8 md:pb-0 md:pt-0">
        <div className="w-full max-w-[560px] md:w-[52%] md:max-w-[680px]">
          <OrbitStage />
        </div>

        <div className="flex w-full justify-center md:w-[48%]">
          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            aria-busy={loading}
            className={`${condensed.className} h-[64px] w-full max-w-[300px] rounded-full border-[2px] border-[#1a1a1a] bg-white text-[30px] leading-none text-black transition-colors duration-200 hover:bg-[#B6FF00] focus-visible:bg-[#B6FF00] focus-visible:outline-none active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 md:h-[76px] md:max-w-[336px] md:text-[38px]`}
          >
            {loading ? 'Processing…' : 'Buy Now'}
          </button>
        </div>
      </div>
    </main>
  )
}
