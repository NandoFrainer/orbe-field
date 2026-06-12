'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Plus, Search, Package, ChevronDown, X } from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ProductDrawer } from '@/components/admin/ProductDrawer'
import type { Product, Family } from '@/types'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterFamily, setFilterFamily] = useState('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsSnap, familiesSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), orderBy('name'))),
        getDocs(query(collection(db, 'families'), orderBy('name'))),
      ])
      setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)))
      setFamilies(familiesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Family)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function toggleStatus(product: Product) {
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    setTogglingId(product.id)
    try {
      await updateDoc(doc(db, 'products', product.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      )
    } finally {
      setTogglingId(null)
    }
  }

  const familyName = (fid: string) =>
    families.find((f) => f.id === fid)?.name ?? '—'

  const filtered = products.filter((p) => {
    const matchSearch =
      !search || p.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchFamily = filterFamily === 'all' || p.familyId === filterFamily
    return matchSearch && matchStatus && matchFamily
  })

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Produtos</h2>
          <p className="text-sm text-[#6E6E73] mt-0.5">{filtered.length} resultado(s)</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowDrawer(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white rounded-xl
            text-sm font-medium hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Novo produto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
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

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="appearance-none bg-white rounded-xl pl-3 pr-8 py-2.5 text-sm shadow-apple-sm
              focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
            className="appearance-none bg-white rounded-xl pl-3 pr-8 py-2.5 text-sm shadow-apple-sm
              focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
          >
            <option value="all">Todas as famílias</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] pointer-events-none" />
        </div>

        {(search || filterStatus !== 'all' || filterFamily !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterFamily('all') }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-[#6E6E73] hover:text-[#FF3B30] transition-colors"
          >
            <X size={14} />
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-apple-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package size={40} className="text-gray-200 mb-3" />
            <p className="text-sm text-[#6E6E73]">Nenhum produto encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Produto</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Família</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Atualizado</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((product) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => { setEditProduct(product); setShowDrawer(true) }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                        <Package size={15} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1D1D1F]">{product.name}</p>
                        <p className="text-xs text-[#6E6E73] line-clamp-1 max-w-xs">
                          {product.description || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#3A3A3C]">{familyName(product.familyId)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#6E6E73]">
                      {formatDate(product.updatedAt, { hour: undefined, minute: undefined })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(product) }}
                      disabled={togglingId === product.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        product.status === 'active'
                          ? 'text-[#FF3B30] hover:bg-red-50'
                          : 'text-[#30D158] hover:bg-green-50'
                      } disabled:opacity-50`}
                    >
                      {togglingId === product.id ? '…' : product.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProductDrawer
        open={showDrawer}
        product={editProduct}
        onClose={() => { setShowDrawer(false); setEditProduct(null) }}
        onSuccess={fetchData}
      />
    </div>
  )
}
