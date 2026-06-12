'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RepSidebar } from '@/components/layout/RepSidebar'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/lib/hooks/useAuth'

export default function RepLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (user.status === 'inactive') { router.replace('/blocked') }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <RepSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user.displayName ?? user.email ?? ''}
        userRole="Representante"
      />
      <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
      <main className="pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
