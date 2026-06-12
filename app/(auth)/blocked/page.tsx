'use client'

import { motion } from 'framer-motion'
import { ShieldOff, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function BlockedPage() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut(auth)
    document.cookie =
      'orbe-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm text-center"
      >
        <div className="bg-white rounded-2xl shadow-apple-md p-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-5">
            <ShieldOff size={32} className="text-[#FF3B30]" />
          </div>

          <h1 className="text-xl font-semibold text-[#1D1D1F] mb-2">
            Conta desativada
          </h1>
          <p className="text-sm text-[#6E6E73] leading-relaxed mb-8">
            Sua conta está temporariamente desativada. Entre em contato com o
            administrador para reativar o acesso.
          </p>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
              text-[#FF3B30] border border-red-200 hover:bg-red-50 transition-colors duration-150"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </motion.div>
    </div>
  )
}
