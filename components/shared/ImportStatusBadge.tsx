import { cn } from '@/lib/utils'
import type { ImportStatus } from '@/types'

interface ImportStatusBadgeProps {
  status: ImportStatus
  className?: string
}

export function ImportStatusBadge({ status, className }: ImportStatusBadgeProps) {
  const config = {
    success: { label: 'Importado', classes: 'bg-green-50 text-green-700', dot: 'bg-[#30D158]' },
    pending: { label: 'Pendente', classes: 'bg-yellow-50 text-yellow-700', dot: 'bg-[#FF9F0A]' },
    error:   { label: 'Erro', classes: 'bg-red-50 text-[#FF3B30]', dot: 'bg-[#FF3B30]' },
  }[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.classes,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
