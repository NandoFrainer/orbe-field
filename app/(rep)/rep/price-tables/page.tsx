'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Table2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatDate } from '@/lib/utils'
import { ImportStatusBadge } from '@/components/shared/ImportStatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { PriceTable, ImportedRow } from '@/types'

const PAGE_SIZE = 20

export default function RepPriceTablesPage() {
  const { user } = useAuth()
  const [tables, setTables] = useState<PriceTable[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de tabela
  const [selectedTable, setSelectedTable] = useState<PriceTable | null>(null)
  const [rows, setRows] = useState<ImportedRow[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!user?.familyId) return
    setLoading(true)
    getDocs(
      query(
        collection(db, 'price_tables'),
        where('familyId', '==', user.familyId),
        orderBy('name')
      )
    )
      .then((snap) =>
        setTables(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceTable)))
      )
      .finally(() => setLoading(false))
  }, [user?.familyId])

  async function openTable(table: PriceTable) {
    setSelectedTable(table)
    setTableSearch('')
    setPage(1)
    setLoadingRows(true)
    try {
      const rowsSnap = await getDocs(
        query(
          collection(db, 'price_tables', table.id, 'rows'),
          orderBy('rowIndex')
        )
      )
      setRows(rowsSnap.docs.map((d) => d.data() as ImportedRow))
    } catch {
      setRows([])
    } finally {
      setLoadingRows(false)
    }
  }

  const filteredRows = rows.filter(
    (r) =>
      !tableSearch ||
      r.name?.toLowerCase().includes(tableSearch.toLowerCase()) ||
      r.code?.toLowerCase().includes(tableSearch.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-[#1D1D1F]">Tabelas de Preço</h2>
        <p className="text-sm text-[#6E6E73] mt-0.5">{tables.length} tabela(s) disponível(is)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-apple-sm">
          <Table2 size={40} className="text-gray-200 mb-3" />
          <p className="text-sm text-[#6E6E73]">Nenhuma tabela disponível</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tables.map((table, i) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-apple-sm p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
                <Table2 size={18} className="text-[#0071E3]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1D1D1F] text-sm">{table.name}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <ImportStatusBadge status={table.importStatus} />
                  <span className="text-xs text-[#6E6E73]">{table.rowCount} item(s)</span>
                  {table.lastImportedAt && (
                    <span className="text-xs text-[#6E6E73]">
                      Atualizado {formatDate(table.lastImportedAt)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => openTable(table)}
                disabled={table.importStatus !== 'success' || table.rowCount === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0071E3] rounded-xl
                  hover:bg-[#0077ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ver tabela
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal visualização da tabela */}
      <AnimatePresence>
        {selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setSelectedTable(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-apple-lg z-10 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h3 className="font-semibold text-[#1D1D1F]">{selectedTable.name}</h3>
                  <p className="text-xs text-[#6E6E73]">
                    {rows.length} item(s)
                    {selectedTable.lastImportedAt
                      ? ` · Atualizado ${formatDate(selectedTable.lastImportedAt)}`
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} className="text-[#6E6E73]" />
                </button>
              </div>

              {/* Busca */}
              <div className="px-6 py-3 border-b border-gray-100 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => { setTableSearch(e.target.value); setPage(1) }}
                    placeholder="Buscar por nome ou código…"
                    className="w-full bg-gray-50 border-0 rounded-xl pl-9 pr-4 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                  />
                </div>
              </div>

              {/* Tabela */}
              <div className="flex-1 overflow-auto">
                {loadingRows ? (
                  <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
                ) : pagedRows.length === 0 ? (
                  <div className="flex justify-center py-12 text-sm text-[#6E6E73]">
                    Nenhum item encontrado
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-100">
                      <tr>
                        {['Código', 'Nome', 'Preço', 'Unidade'].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#6E6E73]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pagedRows.map((row) => (
                        <tr key={row.rowIndex} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-xs font-mono text-[#6E6E73]">{row.code}</td>
                          <td className="px-5 py-3 font-medium text-[#1D1D1F]">{row.name}</td>
                          <td className="px-5 py-3 font-semibold text-[#1D1D1F]">{row.price}</td>
                          <td className="px-5 py-3 text-[#6E6E73]">{row.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 shrink-0">
                  <span className="text-xs text-[#6E6E73]">
                    {filteredRows.length} resultado(s) · Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
