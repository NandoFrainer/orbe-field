'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Family, UserRole } from '@/types'

interface UserModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserModal({ open, onClose, onSuccess }: UserModalProps) {
  const [families, setFamilies] = useState<Family[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<UserRole>('representante')
  const [familyId, setFamilyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    getDocs(query(collection(db, 'families'), orderBy('name'))).then((snap) =>
      setFamilies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Family)))
    )
  }, [open])

  function reset() {
    setName(''); setEmail(''); setPassword('')
    setRole('representante'); setFamilyId(''); setError(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (role === 'representante' && !familyId) {
      setError('Selecione a família do representante.')
      return
    }

    setLoading(true)
    try {
      const selectedFamily = families.find((f) => f.id === familyId)
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, password, role,
          familyId: role === 'representante' ? familyId : '',
          familyCode: role === 'representante' ? selectedFamily?.code ?? '' : '',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erro ao criar usuário')
      reset()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-apple-lg p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Novo usuário</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-[#6E6E73]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Nome completo"
                  className="input-apple"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="usuario@email.com"
                  className="input-apple"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                  Senha temporária
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mínimo 8 caracteres"
                    className="input-apple pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E73] p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Perfil</label>
                <div className="flex gap-2">
                  {(['representante', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        role === r
                          ? 'bg-[#0071E3] text-white'
                          : 'bg-gray-100 text-[#3A3A3C] hover:bg-gray-200'
                      }`}
                    >
                      {r === 'admin' ? 'Admin' : 'Representante'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Família (somente rep) */}
              {role === 'representante' && (
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                    Família
                  </label>
                  <select
                    value={familyId}
                    onChange={(e) => setFamilyId(e.target.value)}
                    required
                    className="input-apple"
                  >
                    <option value="">Selecionar família…</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Erro */}
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

              {/* Ações */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-[#3A3A3C] hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando…
                    </span>
                  ) : (
                    'Criar usuário'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
