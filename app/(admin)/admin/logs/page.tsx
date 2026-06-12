'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, X, Search } from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { AuditLog } from '@/types'

const PAGE_SIZE = 50

const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: 'Criar usuário',
  UPDATE_USER: 'Atualizar usuário',
  DISABLE_USER: 'Desativar usuário',
  CREATE_FAMILY: 'Criar família',
  UPDATE_FAMILY: 'Atualizar família',
  DELETE_FAMILY: 'Remover família',
  CREATE_PRODUCT: 'Criar produto',
  UPDATE_PRODUCT: 'Atualizar produto',
  DELETE_PRODUCT: 'Remover produto',
  UPLOAD_FILE: 'Upload de arquivo',
  DELETE_FILE: 'Remover arquivo',
  CREATE_PRICE_TABLE: 'Criar tabela',
  UPDATE_PRICE_TABLE: 'Atualizar tabela',
  DELETE_PRICE_TABLE: 'Remover tabela',
  IMPORT_SHEET: 'Importar planilha',
  DOWNLOAD_FILE: 'Download de arquivo',
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filtros
  const [filterEmail, setFilterEmail] = useState('')
  const [filterAction, setFilterAction] = useState('all')

  const fetchLogs = useCallback(
    async (reset = false) => {
      setLoading(true)
      try {
        let q = query(
          collection(db, 'audit_logs'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        )

        if (filterAction !== 'all') {
          q = query(
            collection(db, 'audit_logs'),
            where('action', '==', filterAction),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          )
        }

        if (!reset && lastDoc) {
          q = query(q, startAfter(lastDoc))
        }

        const snap = await getDocs(q)
        const newLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))

        // Filtra por email no cliente (Firestore não suporta contains)
        const filtered = filterEmail
          ? newLogs.filter((l) =>
              l.userEmail?.toLowerCase().includes(filterEmail.toLowerCase())
            )
          : newLogs

        setLogs(reset ? filtered : (prev) => [...prev, ...filtered])
        setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
        setHasMore(snap.docs.length === PAGE_SIZE)
      } finally {
        setLoading(false)
      }
    },
    [filterAction, filterEmail, lastDoc]
  )

  useEffect(() => {
    setLastDoc(null)
    fetchLogs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterEmail])

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[#1D1D1F]">Logs de Auditoria</h2>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          Registro imutável de todas as operações
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]" />
          <input
            type="text"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="Filtrar por e-mail…"
            className="w-full bg-white border-0 rounded-xl pl-9 pr-4 py-2.5 text-sm shadow-apple-sm
              focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
          />
        </div>

        <div className="relative">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="appearance-none bg-white rounded-xl pl-3 pr-8 py-2.5 text-sm shadow-apple-sm
              focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
          >
            <option value="all">Todas as ações</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] pointer-events-none" />
        </div>

        {(filterEmail || filterAction !== 'all') && (
          <button
            onClick={() => { setFilterEmail(''); setFilterAction('all') }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-[#6E6E73] hover:text-[#FF3B30] transition-colors"
          >
            <X size={14} />
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-apple-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : logs.length === 0 ? (
          <div className="flex justify-center py-16">
            <p className="text-sm text-[#6E6E73]">Nenhum log encontrado</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-8 px-4 py-3.5" />
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Ação</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Usuário</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Coleção</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <>
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                    >
                      <td className="px-4 py-3.5">
                        <ChevronRight
                          size={14}
                          className={`text-[#6E6E73] transition-transform ${
                            expandedId === log.id ? 'rotate-90' : ''
                          }`}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-[#1D1D1F]">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-[#6E6E73]">{log.userEmail}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-[#6E6E73]">
                          {log.collection}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-[#6E6E73]">{formatDate(log.createdAt)}</span>
                      </td>
                    </motion.tr>

                    <AnimatePresence>
                      {expandedId === log.id && (
                        <tr key={`${log.id}-expanded`}>
                          <td colSpan={5} className="bg-gray-50 px-5 py-4">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="grid grid-cols-2 gap-4"
                            >
                              <div>
                                <p className="text-xs font-medium text-[#6E6E73] mb-2">
                                  Antes
                                </p>
                                <pre className="bg-white rounded-xl p-3 text-xs overflow-auto max-h-48 text-[#3A3A3C]">
                                  {log.before
                                    ? JSON.stringify(log.before, null, 2)
                                    : 'null'}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#6E6E73] mb-2">
                                  Depois
                                </p>
                                <pre className="bg-white rounded-xl p-3 text-xs overflow-auto max-h-48 text-[#3A3A3C]">
                                  {log.after
                                    ? JSON.stringify(log.after, null, 2)
                                    : 'null'}
                                </pre>
                              </div>
                              <div className="col-span-2 flex gap-6 text-xs text-[#6E6E73]">
                                <span>ID: <span className="font-mono text-[#3A3A3C]">{log.documentId}</span></span>
                                <span>IP: <span className="font-mono text-[#3A3A3C]">{log.ip}</span></span>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}
              </tbody>
            </table>

            {/* Carregar mais */}
            {hasMore && (
              <div className="flex justify-center py-4 border-t border-gray-100">
                <button
                  onClick={() => fetchLogs(false)}
                  disabled={loading}
                  className="text-sm text-[#0071E3] hover:underline disabled:opacity-50"
                >
                  {loading ? 'Carregando…' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
