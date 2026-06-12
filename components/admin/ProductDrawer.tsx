'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { formatBytes } from '@/lib/utils'
import { FileIcon, detectFileType } from '@/components/shared/FileIcon'
import type { Family, Product, ProductFile } from '@/types'

interface ProductDrawerProps {
  open: boolean
  product?: Product | null  // null = criar novo
  onClose: () => void
  onSuccess: () => void
}

interface UploadItem {
  file: File
  progress: number
  status: 'waiting' | 'uploading' | 'done' | 'error'
  url?: string
  fileId?: string
}

export function ProductDrawer({ open, product, onClose, onSuccess }: ProductDrawerProps) {
  const [families, setFamilies] = useState<Family[]>([])
  const [files, setFiles] = useState<ProductFile[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    getDocs(query(collection(db, 'families'), orderBy('name'))).then((snap) =>
      setFamilies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Family)))
    )
    if (product) {
      setName(product.name)
      setDescription(product.description)
      setFamilyId(product.familyId)
      setStatus(product.status)
      // Carrega arquivos existentes
      getDocs(
        query(collection(db, 'product_files'), where('productId', '==', product.id))
      ).then((snap) =>
        setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductFile)))
      )
    } else {
      setName(''); setDescription(''); setFamilyId(''); setStatus('active')
      setFiles([])
    }
    setUploads([])
    setError(null)
  }, [open, product])

  function handleClose() { setUploads([]); onClose() }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function addFiles(newFiles: File[]) {
    const items: UploadItem[] = newFiles.map((f) => ({
      file: f,
      progress: 0,
      status: 'waiting',
    }))
    setUploads((prev) => [...prev, ...items])
  }

  async function uploadFile(productId: string, item: UploadItem, index: number) {
    const fileType = detectFileType(item.file.name)
    const storageRef = ref(
      storage,
      `products/${productId}/${Date.now()}_${item.file.name}`
    )
    const task = uploadBytesResumable(storageRef, item.file)

    return new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
          setUploads((prev) =>
            prev.map((u, i) =>
              i === index ? { ...u, progress, status: 'uploading' } : u
            )
          )
        },
        (err) => {
          setUploads((prev) =>
            prev.map((u, i) => (i === index ? { ...u, status: 'error' } : u))
          )
          reject(err)
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          const fileDoc = await addDoc(collection(db, 'product_files'), {
            productId,
            fileName: item.file.name,
            fileUrl: url,
            fileType,
            fileSize: item.file.size,
            uploadedAt: serverTimestamp(),
          })
          setUploads((prev) =>
            prev.map((u, i) =>
              i === index ? { ...u, status: 'done', url, fileId: fileDoc.id } : u
            )
          )
          resolve()
        }
      )
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      let productId = product?.id

      if (product) {
        // Atualizar produto existente
        await updateDoc(doc(db, 'products', product.id), {
          name: name.trim(),
          description: description.trim(),
          familyId,
          status,
          updatedAt: serverTimestamp(),
        })
      } else {
        // Criar novo produto
        const newDoc = await addDoc(collection(db, 'products'), {
          name: name.trim(),
          description: description.trim(),
          familyId,
          status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        productId = newDoc.id
      }

      // Upload dos arquivos pendentes
      if (uploads.length > 0 && productId) {
        await Promise.all(
          uploads
            .filter((u) => u.status === 'waiting')
            .map((u, i) => uploadFile(productId!, u, i))
        )
      }

      onSuccess()
      handleClose()
    } catch {
      setError('Erro ao salvar produto. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteFile(file: ProductFile) {
    if (!confirm(`Remover o arquivo "${file.fileName}"?`)) return
    try {
      const storageRef = ref(storage, file.fileUrl)
      await deleteObject(storageRef)
    } catch { /* arquivo pode não existir no storage */ }
    await updateDoc(doc(db, 'product_files', file.id), { deleted: true })
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="ml-auto relative w-96 bg-white h-full shadow-apple-lg flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold text-[#1D1D1F]">
                {product ? 'Editar produto' : 'Novo produto'}
              </h3>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-[#6E6E73]" />
              </button>
            </div>

            {/* Corpo */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nome do produto"
                    className="input-apple"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Descrição</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição detalhada do produto…"
                    rows={3}
                    className="input-apple resize-none"
                  />
                </div>

                {/* Família */}
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Família</label>
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

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {(['active', 'inactive'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          status === s
                            ? s === 'active'
                              ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                              : 'bg-gray-100 text-[#6E6E73] ring-1 ring-gray-200'
                            : 'bg-gray-50 text-[#6E6E73] hover:bg-gray-100'
                        }`}
                      >
                        {s === 'active' ? 'Ativo' : 'Inativo'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Arquivos existentes */}
                {files.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] mb-2">
                      Arquivos ({files.length})
                    </label>
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <FileIcon fileType={f.fileType} size={16} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#1D1D1F] truncate">
                              {f.fileName}
                            </p>
                            <p className="text-xs text-[#6E6E73]">{formatBytes(f.fileSize)}</p>
                          </div>
                          <div className="flex gap-1">
                            <a
                              href={f.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                            >
                              <Download size={13} className="text-[#6E6E73]" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(f)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} className="text-[#FF3B30]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload de novos arquivos */}
                <div>
                  <label className="block text-xs font-medium text-[#6E6E73] mb-2">
                    Adicionar arquivos
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                      dragging
                        ? 'border-[#0071E3] bg-[#0071E3]/5'
                        : 'border-gray-200 hover:border-[#0071E3]/40 hover:bg-gray-50'
                    }`}
                  >
                    <Upload size={20} className="mx-auto text-[#6E6E73] mb-2" />
                    <p className="text-sm text-[#6E6E73]">
                      Arraste arquivos ou clique para selecionar
                    </p>
                    <p className="text-xs text-[#6E6E73] mt-1">PDF, imagens, documentos</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                    />
                  </div>

                  {/* Lista de uploads */}
                  {uploads.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploads.map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <FileIcon fileType={detectFileType(u.file.name)} size={14} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#1D1D1F] truncate">
                              {u.file.name}
                            </p>
                            {u.status === 'uploading' && (
                              <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#0071E3] transition-all"
                                  style={{ width: `${u.progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                          {u.status === 'done' && (
                            <CheckCircle2 size={15} className="text-[#30D158] shrink-0" />
                          )}
                          {u.status === 'error' && (
                            <AlertCircle size={15} className="text-[#FF3B30] shrink-0" />
                          )}
                          {u.status === 'waiting' && (
                            <button
                              type="button"
                              onClick={() => setUploads((p) => p.filter((_, j) => j !== i))}
                              className="w-5 h-5 flex items-center justify-center"
                            >
                              <X size={12} className="text-[#6E6E73]" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-[#3A3A3C] hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando…
                    </span>
                  ) : product ? 'Salvar' : 'Criar produto'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
