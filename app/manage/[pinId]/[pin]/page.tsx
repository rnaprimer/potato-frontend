'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { accessPotato, updatePotato } from '@/services/api'
import Link from 'next/link'

export default function Manage() {
  const params = useParams()
  // App Router params can be arrays if it's a catch-all, but single brackets give strings.
  const pinId = Array.isArray(params?.pinId) ? params.pinId[0] : params?.pinId
  const pin = Array.isArray(params?.pin) ? params.pin[0] : params?.pin

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [potatoId, setPotatoId] = useState("")

  useEffect(() => {
    const fetchPotato = async () => {
      try {
        const res = await accessPotato(pinId as string, pin as string)
        setMessage(res.message || "")
        if (res.id) setPotatoId(res.id)
      } catch (err: any) {
        console.error(err)
        setError("Invalid or expired access 🔒")
      } finally {
        setLoading(false)
      }
    }
    if (pinId && pin) {
      fetchPotato()
    }
  }, [pinId, pin])

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await updatePotato(pinId as string, pin as string, message)
      alert("Saved 💛")
    } catch (err: any) {
      console.error(err)
      alert("Update failed ❌")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center">
        <p className="text-xl font-medium">Loading... 🥔</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center gap-6">
        <p className="text-xl font-medium text-red-500">{error}</p>
        <Link href="/">
          <div className="relative group outline-none w-[160px]">
            <div className="absolute inset-0 rounded-full border-[1.5px] border-black bg-[#cfb5e7] translate-y-[4px]"></div>
            <div className="relative w-full h-[50px] flex items-center justify-center rounded-full border-[1.5px] border-black bg-[#f2ddfa] text-black font-medium text-[16px]">
              Go Home
            </div>
          </div>
        </Link>
      </main>
    )
  }

  return (
    <main className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center px-4 relative overflow-hidden">
      
      {/* Neo brutalism styling wrapper */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <h2 className="text-3xl font-bold mb-6 text-center">Edit your message ✨</h2>

        <div className="relative group w-full mb-6">
          <div className="absolute inset-0 rounded-xl border-[2px] border-black bg-black translate-y-[6px] translate-x-[4px]"></div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="relative w-full h-40 p-4 rounded-xl border-[2px] border-black bg-[#fff] focus:outline-none focus:bg-[#fcf8ff] text-black text-[16px] resize-none"
            placeholder="Write a lovely message here..."
          />
        </div>

        <button 
          onClick={handleUpdate} 
          disabled={saving}
          className="relative group outline-none w-[200px] mb-8"
        >
          <div className="absolute inset-0 rounded-full border-[2px] border-black bg-[#e2bf46] translate-y-[4px] group-hover:translate-y-[6px] group-active:translate-y-[2px] transition-transform"></div>
          <div className="relative w-full h-[54px] flex items-center justify-center rounded-full border-[2px] border-black bg-[#fce373] text-black font-bold group-active:translate-y-[3px] transition-transform text-[18px]">
            {saving ? 'Saving...' : 'Save'}
          </div>
        </button>

        {potatoId && (
          <div className="mb-6 flex flex-col items-center gap-2 w-full">
            <p className="font-bold text-sm text-black/70 uppercase tracking-widest text-center">Your Potato Link ⬇️</p>
            <div className="w-full relative group">
              <div className="absolute inset-0 rounded-xl border-[2px] border-black bg-black translate-y-[4px] translate-x-[2px] pointer-events-none"></div>
              <div className="relative w-full flex items-center justify-center p-3 rounded-xl border-[2px] border-black bg-white text-black break-all shadow-[inset_0_0_10px_rgba(0,0,0,0.05)]">
                <Link href={`/potato/${potatoId}`} target="_blank" className="font-medium underline hover:text-blue-600 block text-center w-full">
                  {typeof window !== 'undefined' ? `${window.location.origin}/potato/${potatoId}` : `/potato/${potatoId}`}
                </Link>
              </div>
            </div>
            <p className="text-xs text-black/50 text-center font-medium mt-1">Share this link with someone special!</p>
          </div>
        )}

        <Link href="/">
          <p className="underline font-medium text-black/60 hover:text-black">Return to Home</p>
        </Link>
      </div>
    </main>
  )
}
