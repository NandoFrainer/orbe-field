'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/admin/dashboard':    'Dashboard',
  '/admin/users':        'Usuários',
  '/admin/families':     'Famílias',
  '/admin/products':     'Produtos',
  '/admin/price-tables': 'Tabelas de Preço',
  '/admin/logs':         'Logs de Auditoria',
  '/admin/catalogo':     'Catálogo',
  '/rep/dashboard':      'Dashboard',
  '/rep/catalogo':       'Catálogo',
  '/rep/products':       'Produtos',
  '/rep/price-tables':   'Tabelas de Preço',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()

  const title =
    Object.entries(pageTitles)
      .sort(([a], [b]) => b.length - a.length)
      .find(([key]) => pathname.startsWith(key))?.[1] ?? 'Orbe Field'

  const isCatalog =
    pathname.startsWith('/admin/catalogo') || pathname.startsWith('/rep/catalogo')

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-20
      bg-white/90 backdrop-blur-md border-b border-gray-100
      flex items-center gap-3 px-4">

      <button
        onClick={onMenuClick}
        className="flex items-center justify-center w-9 h-9 rounded-xl
          hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Menu"
      >
        <Menu size={20} className="text-[#3A3A3C]" />
      </button>

      <h1 className="flex-1 text-[17px] font-semibold text-[#1D1D1F]">{title}</h1>

      {isCatalog && (
        <span className="text-[26px] font-bold tracking-tight text-[#FF3B30] select-none pr-1">
          Orbe
        </span>
      )}
    </header>
  )
}
