import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata bytes para string legível (ex: 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Formata data do Firebase Timestamp para exibição
 */
export function formatDate(
  timestamp: import('firebase/firestore').Timestamp | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!timestamp) return '—'
  const date = timestamp.toDate()
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  })
}

/**
 * Trunca string longa com ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}…`
}

/**
 * Gera ID de tabela de preço no formato "{familyCode}_{número}"
 */
export function generatePriceTableId(familyCode: string, suffix: number): string {
  return `${familyCode}_${suffix.toString().padStart(4, '0')}`
}
