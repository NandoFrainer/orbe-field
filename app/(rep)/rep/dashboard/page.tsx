'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
} from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Package, Table2, File } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { PriceTable } from '@/types'

export default function RepDashboardPage() {
  const { user } = useAuth()
  const [productCount, setProductCount] = useState(0)
  const [fileCount, setFileCount] = useState(0)
  const [tables, setTables] = useState<PriceTable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.familyId) return

    async function fetchData() {
      setLoading(true)
      try {
        const fid = user!.familyId!

        const [productsSnap, filesSnap, tablesSnap] = await Promise.all([
          getCountFromServer(
            query(
              collection(db, 'products'),
              where('familyId', '==', fid),
              where('status', '==', 'active')
            )
          ),
          getCountFromServer(
            query(collection(db, 'product_files'))
          ),
          getDocs(
            query(
              collection(db, 'price_tables'),
              where('familyId', '==', fid),
              orderBy('lastImportedAt', 'desc'),
              limit(3)
            )
          ),
        ])

        setProductCount(productsSnap.data().count)
        setFileCount(filesSnap.data().count)
        setTables(tablesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceTable)))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.familyId])

  const firstName = user?.displayName?.split(' ')[0] ?? 'Representante'

  const cards = [
    {
      label: 'Produtos disponíveis',
      value: productCount,
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/rep/products',
    },
    {
      label: 'Tabelas de preço',
      value: tables.length,
      icon: Table2,
      color: 'text-[#0071E3]',
      bg: 'bg-[#0071E3]/10',
      href: '/rep/price-tables',
    },
    {
      label: 'Arquivos disponíveis',
      value: fileCount,
      icon: File,
      color: 'text-[#30D158]',
      bg: 'bg-green-50',
      href: '/rep/products',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saudação */}
      <div>
        <h2 className="text-2xl font-semibold text-[#1D1D1F]">
          Olá, {firstName} 👋
        </h2>
        <p className="text-sm text-[#6E6E73] mt-1">
          {user?.familyCode ? `Família ${user.familyCode}` : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Cards rápidos */}
          <div className="grid grid-cols-3 gap-4">
            {cards.map((card, i) => {
              const Icon = card.icon
              return (
                <motion.a
                  key={card.label}
                  href={card.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 30 }}
                  className="bg-white rounded-2xl shadow-apple-sm p-5 hover:shadow-apple-md transition-shadow cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                    <Icon size={20} className={card.color} />
                  </div>
                  <p className="text-2xl font-semibold text-[#1D1D1F]">{card.value}</p>
                  <p className="text-sm text-[#6E6E73] mt-0.5">{card.label}</p>
                </motion.a>
              )
            })}
          </div>

          {/* Tabelas recentes */}
          {tables.length > 0 && (
            <div className="bg-white rounded-2xl shadow-apple-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-[#1D1D1F]">
                  Tabelas de preço recentes
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {tables.map((table) => (
                  <div key={table.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-[#1D1D1F]">{table.name}</p>
                      <p className="text-xs text-[#6E6E73]">
                        {table.rowCount} item(s)
                        {table.lastImportedAt
                          ? ` · Atualizado ${formatDate(table.lastImportedAt)}`
                          : ''}
                      </p>
                    </div>
                    <a
                      href="/rep/price-tables"
                      className="text-xs text-[#0071E3] hover:underline"
                    >
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
