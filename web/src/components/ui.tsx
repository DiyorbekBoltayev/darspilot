import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import { animate, motion, useInView } from 'motion/react'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card relative', className)}>{children}</div>
}

export function CardHeader({ icon: Icon, title, hint, action, className }: {
  icon?: LucideIcon; title: ReactNode; hint?: ReactNode; action?: ReactNode; className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-firuza-50 text-firuza-600 ring-1 ring-firuza-100">
            <Icon className="size-[18px]" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {hint && <p className="mt-0.5 text-[13px] leading-snug text-mute">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'indigo' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-firuza-500 text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)] hover:bg-firuza-600',
  indigo: 'bg-indigo-600 text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-indigo-700',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-firuza-300 hover:bg-firuza-50/60',
  ghost: 'text-ink-2 hover:bg-sunken',
  danger: 'bg-terra-50 text-terra-600 border border-terra-100 hover:bg-terra-100',
}

export function Button({ variant = 'secondary', icon: Icon, loading, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; icon?: LucideIcon; loading?: boolean
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  )
}

export function LinkButton({ to, href, variant = 'secondary', icon: Icon, className, children, download }: {
  to?: string; href?: string; variant?: Variant; icon?: LucideIcon; className?: string; children: ReactNode; download?: boolean
}) {
  const cls = cn('inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150', variants[variant], className)
  const inner = <>{Icon && <Icon className="size-4" />}{children}</>
  if (href) return <a href={href} className={cls} target={download ? undefined : '_blank'} rel="noreferrer" download={download}>{inner}</a>
  return <Link to={to ?? '/'} className={cls}>{inner}</Link>
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1', className)}>{children}</span>
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-ink sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function CountUp({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: setV })
    return () => c.stop()
  }, [inView, value])
  return <span ref={ref} className="tabular-nums">{v.toFixed(decimals)}{suffix}</span>
}

export function Stat({ icon: Icon, label, value, suffix, hint, tone = 'firuza', decimals = 0 }: {
  icon: LucideIcon; label: string; value: number; suffix?: string; hint?: ReactNode; tone?: 'firuza' | 'indigo' | 'terra' | 'oltin'
  decimals?: number
}) {
  const t = {
    firuza: 'bg-firuza-50 text-firuza-600', indigo: 'bg-indigo-50 text-indigo-600', terra: 'bg-terra-50 text-terra-500', oltin: 'bg-oltin-50 text-oltin-600',
  }[tone]
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-mute">{label}</span>
        <span className={cn('grid size-8 place-items-center rounded-lg', t)}><Icon className="size-4" /></span>
      </div>
      <div className="num mt-3 text-[28px] leading-none font-semibold text-ink"><CountUp value={value} suffix={suffix} decimals={decimals} /></div>
      {hint && <div className="mt-2 text-xs text-faint">{hint}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-96" />
    </div>
  )
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-firuza-50 text-firuza-500 ring-1 ring-firuza-100">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-mute">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  return <Card className="p-6 text-sm text-terra-600">Ma'lumotni yuklab bo'lmadi: {error instanceof Error ? error.message : String(error)}</Card>
}

export function Ring({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = value < 50 ? '#C4572E' : value < 75 ? '#D9A21B' : '#0A8A91'
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E9EA" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="num absolute inset-0 grid place-items-center text-[13px] font-semibold text-ink">{label ?? `${Math.round(value)}%`}</div>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { key: T; label: ReactNode; icon?: LucideIcon }[]; value: T; onChange: (k: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex gap-1 overflow-x-auto rounded-xl bg-sunken p-1 ring-1 ring-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn('relative flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors', value === t.key ? 'text-ink' : 'text-mute hover:text-ink')}
        >
          {value === t.key && <motion.span layoutId={`tab-${tabs.map((x) => x.key).join('')}`} className="absolute inset-0 rounded-lg bg-surface shadow-card ring-1 ring-line" transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />}
          <span className="relative flex items-center gap-2">{t.icon && <t.icon className="size-4" />}{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Bar({ value, className }: { value: number; className?: string }) {
  const color = value < 50 ? 'bg-terra-500' : value < 75 ? 'bg-oltin-500' : 'bg-firuza-500'
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-sunken', className)}>
      <motion.div className={cn('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${Math.max(2, Math.min(100, value))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  )
}

export function Modal({ title, subtitle, onClose, children, footer, wide }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={cn('flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-lift ring-1 ring-line', wide ? 'max-w-3xl' : 'max-w-xl')}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <div className="text-base font-semibold text-ink">{title}</div>
            {subtitle && <div className="mt-0.5 text-[13px] text-mute">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-mute hover:bg-sunken" aria-label="Yopish">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper px-6 py-3">{footer}</div>}
      </motion.div>
    </motion.div>
  )
}

export function MaketNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-oltin-50 px-3 py-2 text-[13px] text-oltin-600 ring-1 ring-oltin-100">
      <span className="mt-px font-semibold">Maket</span>
      <span className="text-ink-2">{children}</span>
    </div>
  )
}
