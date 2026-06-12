'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  where,
  getCountFromServer,
  serverTimestamp,
} from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FolderOpen, Users, Table2, Trash2, X, AlertCircle } from 'lucide-react'
import { db } from '@/lib/firebase'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { Family } from '@/types'

interface FamilyCard extends Family {
  repCount: number
  tableCount: number
}

export default function AdminFamiliesPage() {
  const [families, setFamilies] = useState<FamilyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchFamilies = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'families'), orderBy('name')))
      const cards = await Promise.all(
        snap.docs.map(async (d) => {
          const family = { id: d.id, ...d.data() } as Family
          const [repSnap, tableSnap] = await Promise.all([
            getCountFromServer(
              query(collection(db, 'users'), where('familyId', '==', d.id))
            ),
            getCountFromServer(
              query(collection(db, 'price_tables'), where('familyId', '==', d.id))
            ),
          ])
          return {
            ...family,
            repCount: repSnap.data().count,
            tableCount: tableSnap.data().count,
          }
        })
      )
      setFamilies(cards)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFamilies() }, [fetchFamilies])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (families.some((f) => f.code === code.trim())) {
      setError('Já existe uma família com esse código.')
      return
    }

    setCreating(true)
    try {
      await addDoc(collection(db, 'families'), {
        name: name.trim(),
        code: code.trim(),
        createdAt: serverTimestamp(),
      })
      setName(''); setCode('')
      setShowModal(false)
      fetchFamilies()
    } catch {
      setError('Erro ao criar família.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(family: FamilyCard) {
    if (family.repCount > 0 || family.tableCount > 0) {
      alert(
        `Não é possível remover "${family.name}" pois possui ${family.repCount} representante(s) e ${family.tableCount} tabela(s) vinculados.`
      )
      return
    }
    if (!confirm(`Remover a família "${family.name}"?`)) return

    setDeletingId(family.id)
    try {
      await deleteDoc(doc(db, 'families', family.id))
      setFamilies((prev) => prev.filter((f) => f.id !== family.id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Famílias</h2>
          <p className="text-sm text-[#6E6E73] mt-0.5">{families.length} família(s)</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white rounded-xl
            text-sm font-medium hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Nova família
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : families.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-apple-sm">
          <FolderOpen size={40} className="text-gray-200 mb-3" />
          <p className="text-sm text-[#6E6E73]">Nenhuma família cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map((family, i) => (
            <motion.div
              key={family.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-apple-sm p-5 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <FolderOpen size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1D1D1F] text-sm">{family.name}</p>
                    <p className="text-xs text-[#6E6E73] mt-0.5">Código: {family.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(family)}
                  disabled={deletingId === family.id}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg
                    flex items-center justify-center text-[#6E6E73] hover:bg-red-50
                    hover:text-[#FF3B30] transition-all disabled:opacity-30"
                >
                  {deletingId === family.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#FF3B30] rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-xs text-[#6E6E73]">
                  <Users size={13} />
                  <span>{family.repCount} rep.</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6E6E73]">
                  <Table2 size={13} />
                  <span>{family.tableCount} tabela(s)</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal criar família */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-apple-lg p-6 z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[#1D1D1F]">Nova família</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} className="text-[#6E6E73]" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                    Nome da família
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="ex: Família Sul"
                    className="input-apple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                    Código
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    required
                    placeholder="ex: 4836"
                    className="input-apple"
                  />
                  <p className="text-xs text-[#6E6E73] mt-1.5">
                    Usado para prefixar IDs de tabelas de preço.
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-[#FF3B30] text-sm bg-red-50 rounded-xl px-4 py-3"
                    >
                      <AlertCircle size={15} />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-[#3A3A3C] hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-60"
                  >
                    {creating ? 'Criando…' : 'Criar família'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
