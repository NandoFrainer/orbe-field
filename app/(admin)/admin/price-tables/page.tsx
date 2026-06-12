'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Table2, RefreshCw, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { ImportStatusBadge } from '@/components/shared/ImportStatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PriceTableWizard } from '@/components/admin/PriceTableWizard'
import { ImportButton } from '@/components/admin/ImportButton'
import type { PriceTable, Family, ImportedRow } from '@/types'

interface TableGroup {
  family: Family
  tables: PriceTable[]
}

const PAGE_SIZE = 20

export default function AdminPriceTablesPage() {
  const [groups, setGroups] = useState<TableGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  // Preview modal state
  const [previewTable, setPreviewTable] = useState<PriceTable | null>(null)
  const [previewRows, setPreviewRows] = useState<ImportedRow[]>([])
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewPage, setPreviewPage] = useState(1)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [tablesSnap, familiesSnap] = await Promise.all([
        getDocs(query(collection(db, 'price_tables'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'families'), orderBy('name'))),
      ])
      const tables = tablesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceTable))
      const families = familiesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Family))

      // Agrupa por família
      const grouped: TableGroup[] = families
        .map((family) => ({
          family,
          tables: tables.filter((t) => t.familyId === family.id),
        }))
        .filter((g) => g.tables.length > 0)

      setGroups(grouped)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function openPreview(table: PriceTable) {
    setPreviewTable(table)
    setPreviewSearch('')
    setPreviewPage(1)
    setLoadingPreview(true)

    try {
      // Lê rows da subcoleção
      const rowsSnap = await getDocs(
        query(
          collection(db, 'price_tables', table.id, 'rows'),
          orderBy('rowIndex')
        )
      )
      const rows = rowsSnap.docs.map((d) => d.data() as ImportedRow)
      setPreviewRows(rows)
    } catch {
      setPreviewRows([])
    } finally {
      setLoadingPreview(false)
    }
  }

  const filteredPreviewRows = previewRows.filter(
    (r) =>
      !previewSearch ||
      r.name?.toLowerCase().includes(previewSearch.toLowerCase()) ||
      r.code?.toLowerCase().includes(previewSearch.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filteredPreviewRows.length / PAGE_SIZE))
  const pagedRows = filteredPreviewRows.slice(
    (previewPage - 1) * PAGE_SIZE,
    previewPage * PAGE_SIZE
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Tabelas de Preço</h2>
          <p className="text-sm text-[#6E6E73] mt-0.5">
            {groups.reduce((sum, g) => sum + g.tables.length, 0)} tabela(s)
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white rounded-xl
            text-sm font-medium hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Nova tabela
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-apple-sm">
          <Table2 size={40} className="text-gray-200 mb-3" />
          <p className="text-sm text-[#6E6E73]">Nenhuma tabela cadastrada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ family, tables }) => (
            <div key={family.id}>
              <h3 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">
                {family.name} — {family.code}
              </h3>
              <div className="space-y-2">
                {tables.map((table, i) => (
                  <motion.div
                    key={table.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
                    className="bg-white rounded-2xl shadow-apple-sm p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
                      <Table2 size={18} className="text-[#0071E3]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#1D1D1F]">{table.name}</p>
                        <span className="text-xs text-[#6E6E73] font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {table.id}
                        </span>
                        <ImportStatusBadge status={table.importStatus} />
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-[#6E6E73]">
                          {table.rowCount} linha(s)
                        </span>
                        {table.lastImportedAt && (
                          <span className="text-xs text-[#6E6E73]">
                            Último: {formatDate(table.lastImportedAt)}
                          </span>
                        )}
                        {table.importError && (
                          <span className="text-xs text-[#FF3B30] truncate max-w-xs">
                            {table.importError}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openPreview(table)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-[#3A3A3C]
                          hover:bg-gray-200 transition-colors"
                      >
                        Ver dados
                      </button>
                      <ImportButton tableId={table.id} onSuccess={fetchData} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PriceTableWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={fetchData}
      />

      {/* Modal preview de dados */}
      <AnimatePresence>
        {previewTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setPreviewTable(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-2xl shadow-apple-lg z-10 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h3 className="font-semibold text-[#1D1D1F]">{previewTable.name}</h3>
                  <p className="text-xs text-[#6E6E73]">
                    {previewRows.length} linha(s) importada(s) · Visualização somente leitura
                  </p>
                </div>
                <button
                  onClick={() => setPreviewTable(null)}
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
                    value={previewSearch}
                    onChange={(e) => { setPreviewSearch(e.target.value); setPreviewPage(1) }}
                    placeholder="Buscar por nome ou código…"
                    className="w-full bg-gray-50 border-0 rounded-xl pl-9 pr-4 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                  />
                </div>
              </div>

              {/* Tabela */}
              <div className="flex-1 overflow-auto">
                {loadingPreview ? (
                  <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
                ) : pagedRows.length === 0 ? (
                  <div className="flex justify-center py-12 text-sm text-[#6E6E73]">
                    Nenhum dado encontrado
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-100">
                      <tr>
                        {['Código', 'Nome', 'Descrição', 'Preço', 'Unidade'].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#6E6E73]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pagedRows.map((row) => (
                        <tr key={row.rowIndex} className="hover:bg-gray-50/50">
                          <td className="px-5 py-2.5 text-xs font-mono text-[#6E6E73]">{row.code}</td>
                          <td className="px-5 py-2.5 font-medium text-[#1D1D1F]">{row.name}</td>
                          <td className="px-5 py-2.5 text-[#6E6E73] max-w-xs truncate">{row.description}</td>
                          <td className="px-5 py-2.5 font-medium">{row.price}</td>
                          <td className="px-5 py-2.5 text-[#6E6E73]">{row.unit}</td>
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
                    Página {previewPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={previewPage === 1}
                      className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                      disabled={previewPage === totalPages}
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
