'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, FolderOpen, Package,
  Table2, ScrollText, LogOut, ChevronRight, BookOpen, X,
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard',    label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/admin/users',        label: 'Usuários',          icon: Users },
  { href: '/admin/families',     label: 'Famílias',          icon: FolderOpen },
  { href: '/admin/products',     label: 'Produtos',          icon: Package },
  { href: '/admin/price-tables', label: 'Tabelas de Preço',  icon: Table2 },
  { href: '/admin/logs',         label: 'Logs',              icon: ScrollText },
]

const catalogItem = { href: '/admin/catalogo', label: 'Catálogo', icon: BookOpen }

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
  userName?: string
  userRole?: string
}

export function AdminSidebar({ open, onClose, userName, userRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut(auth)
    document.cookie = 'orbe-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.replace('/login')
  }

  function handleNav() {
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Sidebar panel */}
          <motion.aside
            key="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed left-0 top-0 h-screen w-64 bg-white flex flex-col shadow-xl z-40"
          >
            {/* Header da sidebar */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0071E3] flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">O</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1D1D1F]">Orbe Field</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[#6E6E73]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Info do usuário */}
              {userName && (
                <div className="flex items-center gap-3 px-1">
                  <div className="w-9 h-9 rounded-full bg-[#0071E3]/10 flex items-center justify-center
                    text-[#0071E3] text-sm font-semibold shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1D1D1F] leading-tight">{userName}</p>
                    <p className="text-xs text-[#6E6E73]">{userRole ?? 'Administrador'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navegação */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href} onClick={handleNav}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
                      isActive ? 'bg-[#0071E3]/10 text-[#0071E3]' : 'text-[#3A3A3C] hover:bg-gray-100'
                    )}>
                      <Icon size={18} className={cn(isActive ? 'text-[#0071E3]' : 'text-[#6E6E73]')} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight size={14} className="text-[#0071E3]" />}
                    </div>
                  </Link>
                )
              })}

              <div className="my-2 border-t border-gray-100" />

              {/* Catálogo */}
              {(() => {
                const isActive = pathname === catalogItem.href || pathname.startsWith(catalogItem.href + '/')
                const Icon = catalogItem.icon
                return (
                  <Link href={catalogItem.href} onClick={handleNav}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
                      isActive ? 'bg-[#0071E3]/10 text-[#0071E3]' : 'text-[#3A3A3C] hover:bg-gray-100'
                    )}>
                      <Icon size={18} className={cn(isActive ? 'text-[#0071E3]' : 'text-[#6E6E73]')} />
                      <span className="flex-1">{catalogItem.label}</span>
                      {isActive && <ChevronRight size={14} className="text-[#0071E3]" />}
                    </div>
                  </Link>
                )
              })()}
            </nav>

            {/* Footer — Sair */}
            <div className="px-3 py-4 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                  text-[#6E6E73] hover:bg-red-50 hover:text-[#FF3B30] transition-colors duration-150"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
