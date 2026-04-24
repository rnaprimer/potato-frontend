'use client'

import { useState } from 'react'
import { adminCreatePotato } from '@/services/api'
import Link from 'next/link'

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await adminCreatePotato(adminKey)
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to create potato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-black font-bold hover:opacity-70 transition-opacity">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Home
      </Link>
      
      <div className="w-full max-w-md bg-white border-[3px] border-black rounded-[24px] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black mb-6 tracking-wide">Admin Panel</h1>
        
        <div className="flex flex-col gap-4">
          <label className="font-bold text-sm tracking-wide">ADMIN KEY</label>
          <input 
            type="password" 
            placeholder="Enter secret key..." 
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            className="w-full p-4 font-medium border-[2.5px] border-black rounded-xl focus:outline-none focus:ring-0 focus:bg-[#f2ddfa] transition-colors bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
          />
          
          <button 
            onClick={handleCreate} 
            disabled={loading}
            className="relative group w-full outline-none cursor-pointer mt-4"
          >
            <div className={`absolute inset-0 rounded-2xl border-[3px] border-black bg-black translate-y-[8px] ${loading ? '' : 'group-active:translate-y-[2px]'} transition-transform`}></div>
            <div className={`relative w-full h-[64px] flex items-center justify-center rounded-2xl border-[3px] border-black bg-[#cfb5e7] text-black font-black text-xl ${loading ? '' : 'group-active:translate-y-[6px]'} transition-transform uppercase tracking-wider`}>
              {loading ? 'Creating...' : 'Create Potato'}
            </div>
          </button>
        </div>

        {error && <p className="text-red-600 mt-6 font-bold text-center border-2 border-red-200 bg-red-50 p-2 rounded-lg">{error}</p>}
        
        {result && (
          <div className="mt-8 p-6 border-[3px] border-black bg-[#fce373] rounded-xl flex flex-col gap-3 shadow-inner">
            <h3 className="font-black text-xl mb-2">Created Successfully! 🥔</h3>
            <p className="font-medium text-black/80"><strong>URL ID:</strong> <span className="text-black bg-white px-2 py-1 rounded inline-block border border-black/20">{result.id}</span></p>
            <p className="font-medium text-black/80"><strong>PIN ID:</strong> <span className="text-black bg-white px-2 py-1 rounded inline-block border border-black/20">{result.pinId}</span></p>
            <p className="font-medium text-black/80"><strong>RAW PIN:</strong> <span className="text-black bg-white px-2 py-1 rounded inline-block border border-black/20">{result.pin}</span></p>
            <hr className="border-black/20 my-2" />
            <p className="mt-1 text-sm font-bold text-black bg-white p-3 rounded-lg border-2 border-black inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Give User PIN: {result.pinId}-{result.pin}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
