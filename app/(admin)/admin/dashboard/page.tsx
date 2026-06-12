'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Users, Package, Table2, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { AuditLog, DashboardMetrics } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: 'Usuário criado',
  UPDATE_USER: 'Usuário atualizado',
  DISABLE_USER: 'Usuário desativado',
  CREATE_FAMILY: 'Família criada',
  UPDATE_FAMILY: 'Família atualizada',
  DELETE_FAMILY: 'Família removida',
  CREATE_PRODUCT: 'Produto criado',
  UPDATE_PRODUCT: 'Produto atualizado',
  DELETE_PRODUCT: 'Produto removido',
  UPLOAD_FILE: 'Arquivo enviado',
  DELETE_FILE: 'Arquivo removido',
  CREATE_PRICE_TABLE: 'Tabela criada',
  UPDATE_PRICE_TABLE: 'Tabela atualizada',
  DELETE_PRICE_TABLE: 'Tabela removida',
  IMPORT_SHEET: 'Planilha importada',
  DOWNLOAD_FILE: 'Arquivo baixado',
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      // Contagem de usuários ativos
      const usersQ = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      )
      const usersSnap = await getCountFromServer(usersQ)

      // Contagem de produtos ativos
      const productsQ = query(
        collection(db, 'products'),
        where('status', '==', 'active')
      )
      const productsSnap = await getCountFromServer(productsQ)

      // Contagem de tabelas importadas com sucesso
      const tablesQ = query(
        collection(db, 'price_tables'),
        where('importStatus', '==', 'success')
      )
      const tablesSnap = await getCountFromServer(tablesQ)

      // Última importação
      const lastImportQ = query(
        collection(db, 'audit_logs'),
        where('action', '==', 'IMPORT_SHEET'),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      const lastImportSnap = await getDocs(lastImportQ)
      const lastImportAt =
        lastImportSnap.docs[0]?.data()?.createdAt ?? null

      setMetrics({
        totalActiveUsers: usersSnap.data().count,
        totalActiveProducts: productsSnap.data().count,
        totalImportedTables: tablesSnap.data().count,
        lastImportAt,
      })

      // Últimas 10 ações
      const logsQ = query(
        collection(db, 'audit_logs'),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      const logsSnap = await getDocs(logsQ)
      setLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog)))
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function handleImportAll() {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importAll: true }),
      })
      const data = await res.json()
      if (data.success) {
        setImportResult(`✓ ${data.message ?? 'Importação concluída'}`)
        fetchData()
      } else {
        setImportResult(`✗ ${data.error ?? 'Erro na importação'}`)
      }
    } catch {
      setImportResult('✗ Erro de conexão')
    } finally {
      setImporting(false)
    }
  }

  const metricCards = metrics
    ? [
        {
          label: 'Usuários ativos',
          value: metrics.totalActiveUsers,
          icon: Users,
          color: 'text-[#0071E3]',
          bg: 'bg-[#0071E3]/10',
        },
        {
          label: 'Produtos ativos',
          value: metrics.totalActiveProducts,
          icon: Package,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
        },
        {
          label: 'Tabelas importadas',
          value: metrics.totalImportedTables,
          icon: Table2,
          color: 'text-[#30D158]',
          bg: 'bg-green-50',
        },
        {
          label: 'Última importação',
          value: formatDate(metrics.lastImportAt, { dateStyle: undefined, hour: '2-digit', minute: '2-digit' }),
          icon: Clock,
          color: 'text-[#FF9F0A]',
          bg: 'bg-yellow-50',
          small: true,
        },
      ]
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Visão geral</h2>
          <p className="text-sm text-[#6E6E73] mt-0.5">Métricas em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          {importResult && (
            <span
              className={`text-sm px-3 py-1.5 rounded-xl ${
                importResult.startsWith('✓')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-[#FF3B30]'
              }`}
            >
              {importResult}
            </span>
          )}
          <button
            onClick={handleImportAll}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white rounded-xl
              text-sm font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-60"
          >
            <RefreshCw size={15} className={importing ? 'animate-spin' : ''} />
            {importing ? 'Importando…' : 'Importar todas'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Métricas 2x2 */}
          <div className="grid grid-cols-2 gap-4">
            {metricCards.map((card, i) => {
              const Icon = card.icon
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                  className="bg-white rounded-2xl p-5 shadow-apple-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#6E6E73]">{card.label}</p>
                      <p
                        className={`mt-1 font-semibold text-[#1D1D1F] ${
                          card.small ? 'text-lg' : 'text-3xl'
                        }`}
                      >
                        {card.value}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${card.bg}`}>
                      <Icon size={20} className={card.color} />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Últimas ações */}
          <div className="bg-white rounded-2xl shadow-apple-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#1D1D1F]">
                Atividade recente
              </h3>
            </div>

            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle size={32} className="text-gray-300 mb-2" />
                <p className="text-sm text-[#6E6E73]">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#0071E3]/10 flex items-center justify-center shrink-0">
                        <span className="text-[#0071E3] text-xs font-semibold">
                          {log.userEmail?.charAt(0).toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1D1D1F] truncate">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </p>
                        <p className="text-xs text-[#6E6E73] truncate">
                          {log.userEmail}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#6E6E73] shrink-0 ml-4">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
