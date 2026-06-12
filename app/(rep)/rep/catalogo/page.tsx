'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Search, RefreshCw, ChevronRight, ChevronDown,
  Folder, FolderOpen, FileText, DollarSign, FileImage,
  Wrench, Paperclip, BookOpen, Share2, Send,
  Pencil, Trash2, Upload, X, Check, AlertCircle, Home,
} from 'lucide-react'
import type { CatalogProduct } from '@/app/api/catalog/products/route'
import type { CatalogFile, FileType } from '@/app/api/catalog/files/route'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function fmtUSD(v: number | null) {
  if (v === null) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const FILE_LABELS: Record<FileType, string> = {
  flyer: 'Flyer', desenho: 'Desenho', manual: 'Manual',
  foto: 'Foto', anexo: 'Anexo', outro: 'Arquivo',
}
const FILE_TYPES: FileType[] = ['flyer', 'desenho', 'manual', 'foto', 'anexo', 'outro']

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'precos' | 'descritivo' | 'desenho' | 'flyer' | 'fotos' | 'anexos'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'precos',     label: 'Preços',     icon: <DollarSign size={14} /> },
  { id: 'descritivo', label: 'Descritivo', icon: <FileText size={14} /> },
  { id: 'desenho',    label: 'Desenho',    icon: <Wrench size={14} /> },
  { id: 'flyer',      label: 'Flyer',      icon: <FileImage size={14} /> },
  { id: 'fotos',      label: 'Fotos',      icon: <FileImage size={14} /> },
  { id: 'anexos',     label: 'Anexos',     icon: <Paperclip size={14} /> },
]

interface Group {
  key: string
  label: string
  products: CatalogProduct[]
  expanded: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RepCatalogoPage() {
  const { user } = useAuth()

  const [products, setProducts]   = useState<CatalogProduct[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<CatalogProduct | null>(null)
  const [groups, setGroups]       = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('precos')

  // observações
  const [notes, setNotes]           = useState('')
  const [notesEdit, setNotesEdit]   = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  // arquivos
  const [files, setFiles]               = useState<CatalogFile[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadType, setUploadType]     = useState<FileType>('flyer')
  const [uploadName, setUploadName]     = useState('')
  const [uploadFile, setUploadFile]     = useState<File | null>(null)
  const [showUpload, setShowUpload]     = useState(false)

  // search ref (Ctrl+F / ESC)
  const searchRef = useRef<HTMLInputElement>(null)

  // tab bar scroll
  const tabsRef = useRef<HTMLDivElement>(null)
  const [tabsHasMore, setTabsHasMore] = useState(false)

  // ── Carrega produtos ────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [prodRes, famRes] = await Promise.all([
        fetch('/api/catalog/products'),
        fetch('/api/catalog/families'),
      ])
      const prodData = await prodRes.json()
      if (!prodRes.ok) throw new Error(prodData.error ?? 'Erro ao carregar')

      const famData = await famRes.json()
      const famNames: Record<string, string> = famData.names ?? {}

      let prods: CatalogProduct[] = prodData.products

      // Filtra pela família do representante (se não for admin)
      if (user?.role !== 'admin' && user?.familyCode) {
        prods = prods.filter((p) => p.familia === user.familyCode)
      }

      setProducts(prods)

      const map = new Map<string, CatalogProduct[]>()
      for (const p of prods) {
        const key = p.familia ?? p.cod.split('.')[0] ?? 'Outros'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(p)
      }

      const grps: Group[] = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, ps]) => ({
          key,
          label: famNames[key] ?? key,
          products: ps.sort((a, b) => a.cod.localeCompare(b.cod)),
          expanded: true, // expandido por padrão no mobile
        }))

      setGroups(grps)
      if (prods.length > 0) selectProduct(prods[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [user]) // eslint-disable-line

  useEffect(() => {
    if (user !== undefined) loadProducts()
  }, [user]) // eslint-disable-line

  // tab bar scroll
  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const check = () => setTabsHasMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [selected])

  // Atalhos: Ctrl+F foca busca, ESC limpa e volta ao início
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (e.key === 'Escape') {
        if (searchRef.current === document.activeElement) {
          searchRef.current.blur()
          setSearch('')
          setSelected(null)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // ── Seleciona produto ───────────────────────────────────────────────────────

  const selectProduct = useCallback(async (p: CatalogProduct) => {
    setSelected(p)
    setActiveTab('precos')
    setNotesEdit(false)
    setFiles([])

    try {
      const [nRes, fRes] = await Promise.all([
        fetch(`/api/catalog/notes?cod=${encodeURIComponent(p.cod)}`),
        fetch(`/api/catalog/files?cod=${encodeURIComponent(p.cod)}`),
      ])
      const nData = nRes.ok ? await nRes.json().catch(() => ({})) : {}
      const fData = fRes.ok ? await fRes.json().catch(() => ({})) : {}
      setNotes(nData.notes ?? '')
      setNotesDraft(nData.notes ?? '')
      setFiles(fData.files ?? [])
    } catch {
      setNotes('')
      setNotesDraft('')
      setFiles([])
    }
  }, [])

  // ── Salva observação ────────────────────────────────────────────────────────

  async function saveNotes() {
    if (!selected) return
    setNotesSaving(true)
    await fetch('/api/catalog/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cod: selected.cod, notes: notesDraft }),
    })
    setNotes(notesDraft)
    setNotesEdit(false)
    setNotesSaving(false)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !uploadFile || !uploadName) return
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('cod', selected.cod)
      formData.append('name', uploadName)
      formData.append('type', uploadType)
      const res = await fetch('/api/catalog/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const fRes = await fetch(`/api/catalog/files?cod=${encodeURIComponent(selected.cod)}`)
      setFiles((await fRes.json()).files ?? [])
      setShowUpload(false)
      setUploadFile(null)
      setUploadName('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploadingFile(false)
    }
  }

  async function deleteFile(fileId: string) {
    await fetch(`/api/catalog/files?id=${fileId}`, { method: 'DELETE' })
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  // ── WhatsApp ────────────────────────────────────────────────────────────────

  function shareWhatsApp(fileUrl?: string) {
    if (!selected) return
    const text = fileUrl
      ? `*${selected.cod}* — ${selected.descricao}\n\n${fileUrl}`
      : `*${selected.cod}* — ${selected.descricao}\n\n💰 BRL: R$ ${fmtBRL(selected.brl)}\n🌎 USD: ${fmtUSD(selected.usd)}\n📦 IPI: ${selected.ipi ?? '—'}%`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  // ── Busca ───────────────────────────────────────────────────────────────────

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        expanded: true,
        products: g.products.filter(
          (p) => p.cod.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.products.length > 0)
  }, [groups, search])

  const totalFiltered = filteredGroups.reduce((s, g) => s + g.products.length, 0)

  function toggleGroup(key: string) {
    setGroups((prev) =>
      prev.map((g) => g.key === key ? { ...g, expanded: !g.expanded } : g)
    )
  }

  // ── Navegação prev/next ───────────────────────────────────────────────────

  const flatProducts = useMemo(
    () => filteredGroups.flatMap((g) => g.products),
    [filteredGroups]
  )

  const selectedIndex = useMemo(
    () => (selected ? flatProducts.findIndex((p) => p.cod === selected.cod) : -1),
    [flatProducts, selected]
  )

  function navigateProduct(dir: 1 | -1) {
    const next = flatProducts[selectedIndex + dir]
    if (next) selectProduct(next)
  }

  const TAB_FILE_TYPES: Record<Tab, FileType[]> = {
    precos: [], descritivo: ['outro'], desenho: ['desenho'],
    flyer: ['flyer'], fotos: ['foto'], anexos: ['anexo', 'outro'],
  }

  function tabHasFiles(tab: Tab): boolean {
    if (tab === 'precos') return true
    return files.some((f) => TAB_FILE_TYPES[tab].includes(f.type))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden bg-[#F5F5F7] p-3 gap-3">

      {/* ══ PAINEL ESQUERDO — Árvore ══════════════════════════════════════════ */}
      <div className={`
        w-full md:w-[340px] shrink-0 flex flex-col bg-white
        rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden
        ${selected ? 'hidden md:flex' : 'flex'}
      `}>

        {/* Busca + Home */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {/* Botão Home */}
            <button
              onClick={() => { setSearch(''); setSelected(null) }}
              title="Início (ESC)"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl
                text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#0071E3]/8 transition-colors"
            >
              <Home size={16} />
            </button>

            <div className="relative flex-1">
            <Search
              size={14}
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors
                ${search ? 'text-[#0071E3]' : 'text-[#6E6E73]'}`}
            />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.currentTarget.blur()
                  setSearch('')
                  setSelected(null)
                }
              }}
              placeholder="Buscar… (Ctrl+F)"
              className={`w-full rounded-xl pl-8 pr-8 py-2 text-[13px] text-[#1D1D1F]
                focus:outline-none transition-all border
                ${search
                  ? 'bg-white ring-2 ring-[#0071E3]/30 border-[#0071E3]/30'
                  : 'bg-[#F5F5F7] border-transparent focus:bg-white focus:border-gray-200'
                }`}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
                  bg-[#C7C7CC] hover:bg-[#9E9EA3] transition-colors"
              >
                <X size={11} className="text-white" />
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Contagem */}
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100">
          <span className="text-[13px] text-[#6E6E73]">
            {loading ? 'Carregando…' : `${totalFiltered} itens`}
          </span>
          <button onClick={loadProducts} disabled={loading}
            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-40">
            <RefreshCw size={12} className={cn('text-[#6E6E73]', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Árvore */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <AlertCircle size={18} className="text-red-400 mx-auto mb-2" />
              <p className="text-xs text-red-500 mb-2">{error}</p>
              <button onClick={loadProducts} className="text-xs text-[#0071E3] hover:underline">
                Tentar novamente
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.key}>
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50
                    transition-colors text-left"
                >
                  {group.expanded
                    ? <FolderOpen size={15} className="text-[#FF9500] shrink-0" />
                    : <Folder size={15} className="text-[#FF9500] shrink-0" />
                  }
                  <span className="flex-1 text-xs font-semibold text-[#1D1D1F] truncate">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-[#6E6E73]">{group.products.length}</span>
                  {group.expanded
                    ? <ChevronDown size={12} className="text-[#6E6E73]" />
                    : <ChevronRight size={12} className="text-[#6E6E73]" />
                  }
                </button>

                {group.expanded && (
                  <div className="ml-4 border-l border-gray-100">
                    {group.products.map((p) => (
                      <button
                        key={p.cod}
                        onClick={() => selectProduct(p)}
                        className={cn(
                          'w-full text-left flex items-start gap-2 px-3 py-2 transition-colors',
                          selected?.cod === p.cod
                            ? 'bg-[#0071E3]/8 border-r-2 border-r-[#0071E3]'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        <FileText size={13} className={cn(
                          'shrink-0 mt-0.5',
                          selected?.cod === p.cod ? 'text-[#0071E3]' : 'text-[#6E6E73]'
                        )} />
                        <div className="min-w-0">
                          <p className={cn(
                            'text-[13px] font-semibold font-mono leading-tight',
                            selected?.cod === p.cod ? 'text-[#0071E3]' : 'text-[#3A3A3C]'
                          )}>
                            {p.cod}
                          </p>
                          <p className="text-[12px] text-[#6E6E73] line-clamp-2 leading-tight mt-0.5">
                            {p.descricao}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══ PAINEL DIREITO — Detalhe ══════════════════════════════════════════ */}
      <div className={`
        flex-1 flex flex-col min-w-0 overflow-hidden relative
        bg-white rounded-2xl shadow-sm border border-gray-200/80
        ${selected ? 'flex' : 'hidden md:flex'}
      `}>
        {selected ? (
          <>
            {/* ── Barra de produto ── */}
            <div className="mx-4 mt-3 mb-0 bg-white rounded-2xl border border-gray-100
              shadow-[0_2px_12px_rgba(0,0,0,0.07)] px-3 h-12 flex items-center gap-2 shrink-0">
              {/* Voltar — mobile */}
              <button
                onClick={() => setSelected(null)}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              >
                <ChevronRight size={18} className="text-[#3A3A3C] rotate-180" />
              </button>
              <button onClick={() => navigateProduct(-1)} disabled={selectedIndex <= 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 transition-colors">
                <ChevronRight size={16} className="text-[#3A3A3C] rotate-180" />
              </button>
              <span className="font-mono font-bold text-[15px] text-[#1D1D1F] whitespace-nowrap">
                {selected.cod}
              </span>
              <button onClick={() => navigateProduct(1)} disabled={selectedIndex >= flatProducts.length - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 transition-colors">
                <ChevronRight size={16} className="text-[#3A3A3C]" />
              </button>
              <span className="flex-1 text-sm text-[#6E6E73] truncate">{selected.descricao}</span>
            </div>

            {/* ── Barra de abas ── */}
            <div className="mx-4 mt-3 mb-1 bg-white rounded-2xl border border-gray-100
              shadow-[0_2px_12px_rgba(0,0,0,0.07)] px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {TABS.map((tab) => {
                  const hasFiles = tabHasFiles(tab)
                  const isActive = activeTab === tab.id
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-3 text-[13px] border-b-2 transition-colors',
                        isActive
                          ? 'border-[#FF3B30] text-[#FF3B30] font-semibold'
                          : hasFiles
                            ? 'border-transparent text-[#3A3A3C] font-medium hover:text-[#1D1D1F]'
                            : 'border-transparent text-[#C7C7CC] font-normal hover:text-[#9E9EA3]'
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* ABA PREÇOS */}
              {activeTab === 'precos' && (
                <div className="max-w-2xl mx-auto space-y-3">
                  <div className="bg-[#E8F5E9] rounded-2xl p-5 border border-[#C8E6C9]
                    shadow-[0_4px_16px_rgba(46,125,50,0.12)]">
                    <p className="text-[13px] font-bold text-[#2E7D32] uppercase tracking-wider mb-2">
                      Tabela BRL — Principal
                    </p>
                    <div className="flex items-end justify-between">
                      <p className="text-[2.25rem] font-bold text-[#1B5E20] leading-none">{fmtBRL(selected.brl)}</p>
                      <button onClick={() => shareWhatsApp()}
                        className="flex items-center gap-1.5 text-[13px] font-medium text-[#2E7D32] hover:text-[#1B5E20] transition-colors">
                        <Share2 size={14} />
                        Compartilhar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'USD',     value: fmtUSD(selected.usd) },
                      { label: 'SCTR-PF', value: fmtBRL(selected.sctrpf) },
                      { label: 'SCSN',    value: fmtBRL(selected.scsn) },
                    ].map((item) => (
                      <div key={item.label}
                        className="bg-white rounded-2xl p-4 border border-gray-100
                          shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow">
                        <p className="text-[13px] text-[#6E6E73] font-medium uppercase tracking-wide mb-1">{item.label}</p>
                        <p className="text-[18px] font-semibold text-[#1D1D1F]">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl p-4 border border-gray-100
                      shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow">
                      <p className="text-[13px] text-[#6E6E73] font-medium uppercase tracking-wide mb-1">IPI</p>
                      <p className={cn('text-[18px] font-semibold',
                        selected.ipi && selected.ipi > 0 ? 'text-[#FF9500]' : 'text-[#1D1D1F]')}>
                        {selected.ipi !== null ? `${selected.ipi}%` : '—'}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100
                      shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow">
                      <p className="text-[13px] text-[#6E6E73] font-medium uppercase tracking-wide mb-1">NCM</p>
                      <p className="text-[18px] font-semibold text-[#6E6E73] font-mono tracking-wide">{selected.ncm ?? '—'}</p>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100
                    shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-bold text-[#3A3A3C] uppercase tracking-wider">
                        Observações
                      </p>
                      {!notesEdit ? (
                        <button
                          onClick={() => { setNotesDraft(notes); setNotesEdit(true) }}
                          className="flex items-center gap-1 text-sm text-[#6E6E73] hover:text-[#3A3A3C]"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setNotesEdit(false)} className="text-sm text-[#6E6E73]">
                            <X size={14} />
                          </button>
                          <button onClick={saveNotes} disabled={notesSaving}
                            className="flex items-center gap-1 text-sm font-medium text-[#0071E3] disabled:opacity-50">
                            <Check size={13} />
                            {notesSaving ? 'Salvando…' : 'Salvar'}
                          </button>
                        </div>
                      )}
                    </div>
                    {notesEdit ? (
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Adicione observações sobre este produto…"
                        rows={3}
                        autoFocus
                        className="w-full text-[13px] text-[#1D1D1F] bg-gray-50 rounded-xl px-3 py-2
                          focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 resize-none"
                      />
                    ) : (
                      <p className="text-[13px] text-[#3A3A3C] min-h-[1.5rem]">
                        {notes || <span className="text-[#6E6E73] italic">Sem observações</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ABAS DE ARQUIVO */}
              {activeTab !== 'precos' && (
                <div className="max-w-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[#1D1D1F]">
                      {TABS.find((t) => t.id === activeTab)?.label}
                    </h2>
                    <button
                      onClick={() => { setUploadType(activeTab as FileType); setShowUpload(true) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                        text-white bg-[#0071E3] hover:bg-[#0077ED] transition-colors"
                    >
                      <Upload size={13} /> Upload
                    </button>
                  </div>

                  {(() => {
                    const typeMap: Record<Tab, FileType[]> = {
                      precos: [], descritivo: ['outro'], desenho: ['desenho'],
                      flyer: ['flyer'], fotos: ['foto'], anexos: ['anexo', 'outro'],
                    }
                    const relevant = files.filter((f) => typeMap[activeTab].includes(f.type))
                    if (relevant.length === 0) {
                      return (
                        <div className="text-center py-12 text-[#6E6E73]">
                          <Paperclip size={28} className="mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Nenhum arquivo nesta categoria</p>
                          <p className="text-xs mt-1">Use o botão Upload para adicionar</p>
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-2">
                        {relevant.map((f) => (
                          <div key={f.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                            <FileText size={20} className="text-[#0071E3] shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1D1D1F] truncate">{f.name}</p>
                              <p className="text-xs text-[#6E6E73]">{FILE_LABELS[f.type]}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => shareWhatsApp(f.url)}
                                className="flex items-center gap-1 text-xs font-medium text-[#25D366] hover:text-[#22C55E]"
                              >
                                <Send size={13} /> Enviar
                              </button>
                              <a href={f.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-[#0071E3] hover:underline">
                                Abrir
                              </a>
                              <button onClick={() => deleteFile(f.id)}
                                className="text-[#6E6E73] hover:text-[#FF3B30] p-1">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Botão flutuante Enviar */}
            <button
              onClick={() => shareWhatsApp()}
              className="absolute bottom-5 right-5 flex items-center gap-2 px-5 py-3
                rounded-2xl text-white font-semibold text-[15px]
                bg-[#25D366] hover:bg-[#22C55E] active:scale-95
                shadow-[0_4px_20px_rgba(37,211,102,0.45)]
                transition-all duration-150"
            >
              <Send size={16} />
              Enviar
            </button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-[#6E6E73]">Selecione um produto na lista</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL UPLOAD */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false) }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1D1D1F] mb-4">Upload de arquivo</h3>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="text-xs text-[#6E6E73] mb-1 block">Tipo</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as FileType)}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm text-[#1D1D1F]
                    focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                >
                  {FILE_TYPES.map((t) => <option key={t} value={t}>{FILE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6E6E73] mb-1 block">Nome do arquivo</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Ex: Flyer Câmera HD 2024"
                  required
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm text-[#1D1D1F]
                    focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#6E6E73] mb-1 block">Arquivo (PDF, imagem)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  required
                  className="w-full text-xs text-[#3A3A3C] file:mr-3 file:py-1.5 file:px-3
                    file:rounded-lg file:border-0 file:text-xs file:font-medium
                    file:bg-[#0071E3]/10 file:text-[#0071E3] hover:file:bg-[#0071E3]/20"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowUpload(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#6E6E73]
                    bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={uploadingFile || !uploadFile || !uploadName}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white
                    bg-[#0071E3] hover:bg-[#0077ED] transition-colors disabled:opacity-60">
                  {uploadingFile ? 'Enviando…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
