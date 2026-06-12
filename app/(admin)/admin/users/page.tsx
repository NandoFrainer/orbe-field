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
} from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, ChevronDown, X } from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { UserModal } from '@/components/admin/UserModal'
import type { User, UserRole, UserStatus, Family } from '@/types'

type FilterRole = UserRole | 'all'
type FilterStatus = UserStatus | 'all'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<FilterRole>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterFamily, setFilterFamily] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersSnap, familiesSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('name'))),
        getDocs(query(collection(db, 'families'), orderBy('name'))),
      ])
      setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as User)))
      setFamilies(familiesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Family)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function toggleStatus(user: User) {
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active'
    if (
      !confirm(
        `${newStatus === 'inactive' ? 'Desativar' : 'Ativar'} o usuário "${user.name}"?`
      )
    )
      return

    setTogglingId(user.uid)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, status: newStatus } : u))
      )
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    const matchStatus = filterStatus === 'all' || u.status === filterStatus
    const matchFamily = filterFamily === 'all' || u.familyId === filterFamily
    return matchSearch && matchRole && matchStatus && matchFamily
  })

  const familyName = (familyId: string) =>
    families.find((f) => f.id === familyId)?.name ?? '—'

  const hasFilters =
    search || filterRole !== 'all' || filterStatus !== 'all' || filterFamily !== 'all'

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Usuários</h2>
          <p className="text-sm text-[#6E6E73] mt-0.5">{filtered.length} resultado(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white rounded-xl
            text-sm font-medium hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Novo usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Busca */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="w-full bg-white border-0 rounded-xl pl-9 pr-4 py-2.5 text-sm shadow-apple-sm
              focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
          />
        </div>

        {/* Filtro role */}
        <div className="relative">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as FilterRole)}
            className="appearance-none bg-white rounded-xl pl-3 pr-8 py-2.5 text-sm shadow-apple-sm
              focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
          >
            <option value="all">Todos os perfis</option>
            <option value="admin">Admin</option>
            <option value="representante">Representante</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] pointer-events-none" />
        </div>

        {/* Filtro status */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="appearance-none bg-white rounded-xl pl-3 pr-8 py-2.5 text-sm shadow-apple-sm
              focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] pointer-events-none" />
        </div>

        {/* Filtro família */}
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

        {/* Limpar filtros */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterRole('all'); setFilterStatus('all'); setFilterFamily('all') }}
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
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[#6E6E73] text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Nome</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Perfil</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Família</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#6E6E73]">Criado em</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => (
                <motion.tr
                  key={user.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 flex items-center justify-center shrink-0">
                        <span className="text-[#0071E3] text-xs font-semibold">
                          {user.name?.charAt(0).toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1D1D1F]">{user.name}</p>
                        <p className="text-xs text-[#6E6E73]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#3A3A3C]">
                      {user.role === 'admin' ? '—' : familyName(user.familyId)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#6E6E73]">
                      {formatDate(user.createdAt, { hour: undefined, minute: undefined })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(user) }}
                      disabled={togglingId === user.uid}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        user.status === 'active'
                          ? 'text-[#FF3B30] hover:bg-red-50'
                          : 'text-[#30D158] hover:bg-green-50'
                      } disabled:opacity-50`}
                    >
                      {togglingId === user.uid
                        ? '…'
                        : user.status === 'active'
                        ? 'Desativar'
                        : 'Ativar'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer de detalhes */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-40 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="ml-auto relative w-80 bg-white h-full shadow-apple-lg p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-[#1D1D1F]">Detalhes</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} className="text-[#6E6E73]" />
                </button>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#0071E3]/10 flex items-center justify-center mb-3">
                  <span className="text-[#0071E3] text-2xl font-semibold">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="font-semibold text-[#1D1D1F]">{selectedUser.name}</p>
                <p className="text-sm text-[#6E6E73]">{selectedUser.email}</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Perfil', value: <RoleBadge role={selectedUser.role} /> },
                  { label: 'Status', value: <StatusBadge status={selectedUser.status} /> },
                  { label: 'Família', value: selectedUser.role === 'admin' ? '—' : familyName(selectedUser.familyId) },
                  { label: 'Código', value: selectedUser.familyCode || '—' },
                  { label: 'Criado em', value: formatDate(selectedUser.createdAt) },
                  { label: 'Atualizado', value: formatDate(selectedUser.updatedAt) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <span className="text-xs text-[#6E6E73]">{row.label}</span>
                    <span className="text-sm font-medium text-[#1D1D1F]">{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { toggleStatus(selectedUser); setSelectedUser(null) }}
                disabled={togglingId === selectedUser.uid}
                className={`mt-6 w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  selectedUser.status === 'active'
                    ? 'bg-red-50 text-[#FF3B30] hover:bg-red-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {selectedUser.status === 'active' ? 'Desativar usuário' : 'Ativar usuário'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UserModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchData}
      />
    </div>
  )
}
