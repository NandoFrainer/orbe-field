import { FileText, Image, FileIcon as FileGeneric } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileType } from '@/types'

interface FileIconProps {
  fileType: FileType | string
  className?: string
  size?: number
}

export function FileIcon({ fileType, className, size = 20 }: FileIconProps) {
  if (fileType === 'pdf') {
    return (
      <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl bg-red-50', className)}>
        <FileText size={size} className="text-[#FF3B30]" />
      </div>
    )
  }
  if (fileType === 'image') {
    return (
      <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50', className)}>
        <Image size={size} className="text-[#0071E3]" />
      </div>
    )
  }
  return (
    <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100', className)}>
      <FileGeneric size={size} className="text-[#6E6E73]" />
    </div>
  )
}

/**
 * Detecta o tipo de arquivo pela extensão do nome
 */
export function detectFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  return 'doc'
}
