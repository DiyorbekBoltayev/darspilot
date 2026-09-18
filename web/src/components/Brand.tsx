import { cn } from '@/lib/utils'
import { starPoints } from '@/lib/brand'

export function StarLogo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill={light ? '#FFFFFF' : '#23328C'} />
      <polygon points={starPoints(32, 32, 23)} fill={light ? '#0A8A91' : '#12A7AE'} />
      <circle cx="32" cy="32" r="9.5" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="4" fill="#23328C" />
    </svg>
  )
}

export function BrandMark({ light, className }: { light?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <StarLogo light={light} className="size-9 shrink-0" />
      <div className="leading-none">
        <div className={cn('font-display text-[17px] font-semibold tracking-tight', light ? 'text-white' : 'text-indigo-600')}>
          Dars<span className={light ? 'text-firuza-300' : 'text-firuza-500'}>Pilot</span>
        </div>
        <div className={cn('mt-1 text-[10.5px] font-medium', light ? 'text-indigo-100/70' : 'text-mute')}>o'qituvchining yo'lchi yulduzi</div>
      </div>
    </div>
  )
}
