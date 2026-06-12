import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'active' | 'inactive'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        status === 'active'
          ? 'bg-green-50 text-green-700'
          : 'bg-gray-100 text-[#6E6E73]',
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'active' ? 'bg-[#30D158]' : 'bg-gray-400'
        )}
      />
      {status === 'active' ? 'Ativo' : 'Inativo'}
    </span>
  )
}
