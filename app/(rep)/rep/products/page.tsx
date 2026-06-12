'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Package, Search } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ProductModal } from '@/components/rep/ProductModal'
import type { Product } from '@/types'

export default function RepProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)

  useEffect(() => {
    if (!user?.familyId) return
    setLoading(true)
    getDocs(
      query(
        collection(db, 'products'),
        where('familyId', '==', user.familyId),
        where('status', '==', 'active'),
        orderBy('name')
      )
    )
      .then((snap) =>
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)))
      )
      .finally(() => setLoading(false))
  }, [user?.familyId])

  const filtered = products.filter(
    (p) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-[#1D1D1F]">Produtos</h2>
        <p className="text-sm text-[#6E6E73] mt-0.5">{filtered.length} produto(s) disponível(is)</p>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto…"
          className="w-full bg-white border-0 rounded-xl pl-9 pr-4 py-2.5 text-sm shadow-apple-sm
            focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-apple-sm">
          <Package size={40} className="text-gray-200 mb-3" />
          <p className="text-sm text-[#6E6E73]">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => setSelected(product)}
              className="bg-white rounded-2xl shadow-apple-sm p-5 cursor-pointer
                hover:shadow-apple-md transition-shadow group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                <Package size={20} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-[#1D1D1F] text-sm">{product.name}</h3>
              {product.description && (
                <p className="text-xs text-[#6E6E73] mt-1.5 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              )}
              <div className="mt-4">
                <span className="text-xs font-medium text-[#0071E3]
                  group-hover:underline">
                  Ver arquivos →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
