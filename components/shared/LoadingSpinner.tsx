import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullScreen?: boolean
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
}

export function LoadingSpinner({ size = 'md', className, fullScreen }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        'rounded-full border-[#0071E3]/20 border-t-[#0071E3] animate-spin',
        sizes[size],
        className
      )}
    />
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}
