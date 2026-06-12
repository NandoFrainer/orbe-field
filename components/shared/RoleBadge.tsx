import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface RoleBadgeProps {
  role: UserRole
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
        role === 'admin'
          ? 'bg-[#0071E3]/10 text-[#0071E3]'
          : 'bg-purple-50 text-purple-700',
        className
      )}
    >
      {role === 'admin' ? 'Admin' : 'Representante'}
    </span>
  )
}
