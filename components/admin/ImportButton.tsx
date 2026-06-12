'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface ImportButtonProps {
  tableId: string
  onSuccess?: () => void
}

export function ImportButton({ tableId, onSuccess }: ImportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleImport() {
    setStatus('loading')
    try {
      const res = await fetch('/api/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        onSuccess?.()
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 4000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <button
      onClick={handleImport}
      disabled={status === 'loading'}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
        status === 'success'
          ? 'bg-green-50 text-green-700'
          : status === 'error'
          ? 'bg-red-50 text-[#FF3B30]'
          : 'bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3]/20'
      } disabled:opacity-60`}
    >
      {status === 'loading' && (
        <RefreshCw size={12} className="animate-spin" />
      )}
      {status === 'success' && <CheckCircle2 size={12} />}
      {status === 'error' && <AlertCircle size={12} />}
      {status === 'idle' && <RefreshCw size={12} />}
      {status === 'loading' ? 'Importando…' : status === 'success' ? 'Importado' : status === 'error' ? 'Erro' : 'Importar'}
    </button>
  )
}
