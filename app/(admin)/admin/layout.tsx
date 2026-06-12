'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/lib/hooks/useAuth'

export default function AdminLayout({
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
    if (user.status === 'inactive') { router.replace('/blocked'); return }
    if (user.role !== 'admin') { router.replace('/rep/dashboard') }
  }, [user, loading, router])

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user.displayName ?? user.email ?? ''}
        userRole="Administrador"
      />
      <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
      <main className="pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
