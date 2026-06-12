'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, ChevronRight, Check } from 'lucide-react'
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Family, ColumnMap } from '@/types'

interface PriceTableWizardProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const COLUMN_FIELDS = [
  { key: 'name', label: 'Nome do produto' },
  { key: 'description', label: 'Descrição' },
  { key: 'code', label: 'Código' },
  { key: 'price', label: 'Preço' },
  { key: 'unit', label: 'Unidade' },
] as const

const COLUMN_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T']

const DEFAULT_COLUMN_MAP: ColumnMap = {
  name: 'A', description: 'B', code: 'C', price: 'D', unit: 'E',
}

export function PriceTableWizard({ open, onClose, onSuccess }: PriceTableWizardProps) {
  const [step, setStep] = useState(1)
  const [families, setFamilies] = useState<Family[]>([])

  // Passo 1
  const [tableName, setTableName] = useState('')
  const [familyId, setFamilyId] = useState('')

  // Passo 2
  const [sheetId, setSheetId] = useState('')
  const [sheetName, setSheetName] = useState('Produtos')
  const [headerRow, setHeaderRow] = useState(1)
  const [dataStartRow, setDataStartRow] = useState(2)

  // Passo 3
  const [columnMap, setColumnMap] = useState<ColumnMap>(DEFAULT_COLUMN_MAP)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    getDocs(query(collection(db, 'families'), orderBy('name'))).then((snap) =>
      setFamilies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Family)))
    )
    // Reset
    setStep(1)
    setTableName(''); setFamilyId(''); setSheetId('')
    setSheetName('Produtos'); setHeaderRow(1); setDataStartRow(2)
    setColumnMap(DEFAULT_COLUMN_MAP); setError(null)
  }, [open])

  const selectedFamily = families.find((f) => f.id === familyId)

  function generateTableId() {
    if (!selectedFamily) return ''
    const suffix = String(Date.now()).slice(-4)
    return `${selectedFamily.code}_${suffix}`
  }

  async function handleFinish() {
    setError(null)
    setSaving(true)
    try {
      const tableId = generateTableId()
      await addDoc(collection(db, 'price_tables'), {
        id: tableId,
        familyId,
        familyCode: selectedFamily?.code ?? '',
        name: tableName.trim(),
        sheetId: sheetId.trim(),
        sheetName: sheetName.trim() || 'Produtos',
        headerRow,
        dataStartRow,
        columnMap,
        lastImportedAt: null,
        importStatus: 'pending',
        importError: null,
        rowCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Dispara importação imediata (não bloqueia)
      fetch('/api/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      }).catch(() => {})

      onSuccess()
      onClose()
    } catch {
      setError('Erro ao criar tabela. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const stepLabels = ['Dados básicos', 'Planilha', 'Colunas']

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-apple-lg z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#1D1D1F]">Nova tabela de preço</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} className="text-[#6E6E73]" />
                </button>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center gap-2">
                {stepLabels.map((label, i) => {
                  const n = i + 1
                  const isActive = n === step
                  const isDone = n < step
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 ${isActive ? '' : 'opacity-50'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isDone ? 'bg-[#30D158] text-white' : isActive ? 'bg-[#0071E3] text-white' : 'bg-gray-200 text-[#6E6E73]'
                        }`}>
                          {isDone ? <Check size={12} /> : n}
                        </div>
                        <span className={`text-xs font-medium ${isActive ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'}`}>
                          {label}
                        </span>
                      </div>
                      {i < stepLabels.length - 1 && (
                        <ChevronRight size={12} className="text-gray-300 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 py-5 min-h-64">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                        Nome da tabela
                      </label>
                      <input
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        placeholder="ex: Tabela de Preços Q1 2025"
                        className="input-apple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Família</label>
                      <select
                        value={familyId}
                        onChange={(e) => setFamilyId(e.target.value)}
                        className="input-apple"
                      >
                        <option value="">Selecionar família…</option>
                        {families.map((f) => (
                          <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                        ID da planilha Google Sheets
                      </label>
                      <input
                        type="text"
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                        className="input-apple font-mono text-xs"
                      />
                      <p className="text-xs text-[#6E6E73] mt-1.5">
                        Encontrado na URL da planilha: /spreadsheets/d/<strong>ID</strong>/edit
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                        Nome da aba
                      </label>
                      <input
                        type="text"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="Produtos"
                        className="input-apple"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                          Linha do cabeçalho
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={headerRow}
                          onChange={(e) => setHeaderRow(Number(e.target.value))}
                          className="input-apple"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                          Linha inicial dos dados
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={dataStartRow}
                          onChange={(e) => setDataStartRow(Number(e.target.value))}
                          className="input-apple"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-[#6E6E73] mb-1">
                      Mapeie qual coluna da planilha corresponde a cada campo.
                    </p>
                    {COLUMN_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center justify-between">
                        <label className="text-sm font-medium text-[#1D1D1F] w-36">
                          {field.label}
                        </label>
                        <select
                          value={columnMap[field.key]}
                          onChange={(e) =>
                            setColumnMap((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="flex-1 ml-4 bg-gray-50 border-0 rounded-xl px-3 py-2 text-sm
                            focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                        >
                          {COLUMN_LETTERS.map((l) => (
                            <option key={l} value={l}>Coluna {l}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-[#FF3B30] text-sm bg-red-50 rounded-xl px-4 py-3 mt-4"
                  >
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-2 border-t border-gray-100 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-[#3A3A3C] hover:bg-gray-200 transition-colors"
                >
                  Voltar
                </button>
              )}
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#6E6E73] hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <div className="ml-auto">
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1 && (!tableName.trim() || !familyId)) {
                        setError('Preencha todos os campos.')
                        return
                      }
                      if (step === 2 && !sheetId.trim()) {
                        setError('Informe o ID da planilha.')
                        return
                      }
                      setError(null)
                      setStep((s) => s + 1)
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Criando…
                      </span>
                    ) : 'Criar tabela'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
