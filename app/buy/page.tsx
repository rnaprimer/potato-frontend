'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { createOrder, verifyPayment } from '@/services/api'

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
    <main className="w-full min-h-[100dvh] bg-[#fdfdfd] flex flex-col items-center justify-center p-4 relative overflow-x-hidden">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Back Button */}
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-black font-bold hover:opacity-70 transition-opacity z-50">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </Link>

      <div className="w-full max-w-4xl bg-white border-[3px] border-black rounded-[32px] p-6 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-10 mt-16 md:mt-0 relative z-10">
        
        {/* Left Side - Product Showcase */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#fce373] border-[3px] border-black rounded-[24px] p-8 relative overflow-hidden shadow-inner">
          <h2 className="text-2xl font-black mb-2 tracking-widest">THE POTATO.</h2>
          <p className="text-sm font-bold opacity-70 mb-8">100% Genuine Physical Potato</p>
          
          <div className="relative w-48 h-48 md:w-64 md:h-64 mb-6">
            <Image 
              src="/potato.png" 
              alt="Physical Potato" 
              fill 
              priority
              className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" 
            />
          </div>
          
          <div className="mt-auto text-center z-10">
            <p className="text-2xl font-black bg-white px-6 py-2 border-[3px] border-black rounded-full inline-block transform -rotate-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              $99.00
            </p>
          </div>
        </div>

        {/* Right Side - Checkout Form Placeholder */}
        <div className="flex-1 flex flex-col pt-4">
          <h1 className="text-4xl font-black mb-2">Checkout</h1>
          <p className="text-black/60 font-semibold mb-8">Where should we ship your potato?</p>

          <form className="flex flex-col gap-5 flex-1" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm tracking-wide">FULL NAME</label>
              <input type="text" className="w-full p-4 font-medium border-[2.5px] border-black rounded-xl focus:outline-none focus:ring-0 focus:bg-[#f2ddfa] transition-colors bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" placeholder="John Doe" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm tracking-wide">SHIPPING ADDRESS</label>
              <textarea className="w-full p-4 font-medium border-[2.5px] border-black rounded-xl focus:outline-none focus:ring-0 focus:bg-[#f2ddfa] transition-colors bg-white resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" rows={3} placeholder="123 Spud Street..."></textarea>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="font-bold text-sm tracking-wide">PIN CODE</label>
                <input type="text" className="w-full p-4 font-medium border-[2.5px] border-black rounded-xl focus:outline-none focus:ring-0 focus:bg-[#f2ddfa] transition-colors bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" placeholder="10001" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="font-bold text-sm tracking-wide">PHONE</label>
                <input type="tel" className="w-full p-4 font-medium border-[2.5px] border-black rounded-xl focus:outline-none focus:ring-0 focus:bg-[#f2ddfa] transition-colors bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" placeholder="+1 (555) 000-0000" />
              </div>
            </div>

            {/* Payment Button Placeholder */}
            <div className="mt-auto pt-10">
              <button onClick={handlePayment} disabled={loading} type="button" className="relative group w-full block outline-none cursor-pointer">
                <div className={`absolute inset-0 rounded-2xl border-[3px] border-black bg-black translate-y-[8px] ${loading ? '' : 'group-active:translate-y-[2px]'} transition-transform`}></div>
                <div className={`relative w-full h-[64px] flex items-center justify-center rounded-2xl border-[3px] border-black bg-[#cfb5e7] text-black font-black text-xl ${loading ? '' : 'group-active:translate-y-[6px]'} transition-transform uppercase tracking-wider`}>
                  {loading ? 'Processing...' : 'Pay Now'}
                </div>
              </button>
              <p className="text-center text-xs text-black/50 mt-6 font-bold uppercase tracking-widest">* Razorpay Integration Connected *</p>
            </div>

          </form>
        </div>

      </div>
    </main>
  )
}
