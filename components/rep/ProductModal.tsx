'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatBytes } from '@/lib/utils'
import { FileIcon } from '@/components/shared/FileIcon'
import type { Product, ProductFile } from '@/types'

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [files, setFiles] = useState<ProductFile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!product) return
    setLoading(true)
    getDocs(query(collection(db, 'product_files'), where('productId', '==', product.id)))
      .then((snap) =>
        setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductFile)))
      )
      .finally(() => setLoading(false))
  }, [product])

  async function handleDownload(file: ProductFile) {
    // Log de download em share_logs
    window.open(file.fileUrl, '_blank')
  }

  return (
    <AnimatePresence>
      {product && (
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
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-apple-lg p-6 z-10 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1D1D1F] pr-4">{product.name}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
              >
                <X size={16} className="text-[#6E6E73]" />
              </button>
            </div>

            {product.description && (
              <p className="text-sm text-[#3A3A3C] leading-relaxed mb-5">
                {product.description}
              </p>
            )}

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">
                Arquivos ({files.length})
              </h3>

              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-[#0071E3]/20 border-t-[#0071E3] rounded-full animate-spin" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-[#6E6E73] py-3">Nenhum arquivo disponível.</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <FileIcon fileType={file.fileType} size={16} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1D1D1F] truncate">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-[#6E6E73]">{formatBytes(file.fileSize)}</p>
                      </div>
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                          text-[#0071E3] bg-[#0071E3]/10 rounded-lg hover:bg-[#0071E3]/20 transition-colors"
                      >
                        <Download size={12} />
                        Baixar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
