import { motion } from 'motion/react'
import { Check, ClipboardList, FileText, Users, Zap } from 'lucide-react'
import type { LessonBrief, Step, StepKey } from '@/lib/types'
import { STEP_ICON } from '@/lib/conveyor'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'

export function FormatBadges({ lesson, className }: { lesson: Pick<LessonBrief, 'diagnostic_day' | 'group_work' | 'kind' | 'points'>; className?: string }) {
  if (lesson.kind === 'bsb' || lesson.kind === 'chsb') {
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
        <Badge className="bg-terra-50 text-terra-600 ring-terra-100">
          <ClipboardList className="size-3" />{lesson.kind === 'bsb' ? 'BSB · summativ' : 'Chorak summativ'}{lesson.points ? ` · ${lesson.points} ball` : ''}
        </Badge>
      </span>
    )
  }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {lesson.diagnostic_day
        ? <Badge className="bg-indigo-50 text-indigo-600 ring-indigo-100"><FileText className="size-3" />Qog'ozli diagnostika</Badge>
        : <Badge className="bg-firuza-50 text-firuza-700 ring-firuza-200"><Zap className="size-3" />Tezkor tekshiruv</Badge>}
      {lesson.group_work && <Badge className="bg-oltin-50 text-oltin-600 ring-oltin-100"><Users className="size-3" />Guruh ishi</Badge>}
    </span>
  )
}

/** Kartochkalar uchun ixcham 5 qadamli konveyer. */
export function MiniStepper({ steps, current, className }: { steps: Step[]; current: StepKey; className?: string }) {
  const allDone = steps.every((s) => s.done)
  let run = 0
  while (run < steps.length && steps[run].done) run++
  const progress = Math.min(run, steps.length - 1) / (steps.length - 1)
  return (
    <ol className={cn('relative grid grid-cols-5', className)}>
      <span className="absolute top-4 right-[10%] left-[10%] h-0.5 -translate-y-1/2 rounded-full bg-line" />
      <motion.span className="absolute top-4 left-[10%] h-0.5 -translate-y-1/2 rounded-full bg-firuza-500"
        initial={{ width: 0 }} animate={{ width: `${progress * 80}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
      {steps.map((s) => {
        const Icon = STEP_ICON[s.key]
        const active = !allDone && s.key === current
        return (
          <li key={s.key} className="relative flex flex-col items-center">
            <span className={cn('relative grid size-8 place-items-center rounded-full ring-1 transition-colors',
              s.done ? 'bg-firuza-500 text-white ring-firuza-500' : active ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-surface text-faint ring-line-strong')}>
              {active && <motion.span className="absolute inset-0 rounded-full ring-2 ring-indigo-300" animate={{ scale: [1, 1.4], opacity: [0.8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />}
              {s.done ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" />}
            </span>
            <span className={cn('mt-1.5 text-center text-[11px] leading-tight', active ? 'font-semibold text-indigo-600' : s.done ? 'text-firuza-700' : 'text-faint')}>{s.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Dars sahifasi tepasidagi katta konveyer: har qadam bosiladi. */
export function Stepper({ steps, active, current, onSelect }: { steps: Step[]; active: StepKey; current: StepKey; onSelect: (k: StepKey) => void }) {
  return (
    <div className="card overflow-x-auto p-2">
      <ol className="grid min-w-[720px] grid-cols-5 gap-1.5">
        {steps.map((s, i) => {
          const Icon = STEP_ICON[s.key]
          const isActive = s.key === active
          const isCurrent = s.key === current && !s.done
          return (
            <li key={s.key}>
              <button onClick={() => onSelect(s.key)} aria-current={isActive ? 'step' : undefined}
                className={cn('relative flex h-full w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  isActive ? 'bg-indigo-600 text-white' : 'hover:bg-sunken')}>
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg ring-1',
                  isActive ? 'bg-white/15 ring-white/25' : s.done ? 'bg-firuza-500 text-white ring-firuza-500' : isCurrent ? 'bg-indigo-50 text-indigo-600 ring-indigo-200' : 'bg-surface text-faint ring-line')}>
                  {s.done && !isActive ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" />}
                </span>
                <span className="min-w-0">
                  <span className={cn('flex items-center gap-1.5 text-[11px] font-medium', isActive ? 'text-indigo-100' : 'text-faint')}>
                    <span className="num">{i + 1}</span>{s.done ? 'bajarildi' : isCurrent ? 'hozir' : ''}
                  </span>
                  <span className={cn('block text-sm font-semibold', isActive ? 'text-white' : 'text-ink')}>{s.label}</span>
                  <span className={cn('mt-0.5 line-clamp-2 block text-[12px] leading-snug', isActive ? 'text-indigo-100' : 'text-mute')}>{s.hint}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        on ? 'bg-firuza-500' : 'bg-line-strong')}>
      <motion.span layout transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
        className={cn('size-5 rounded-full bg-white shadow-card', on ? 'ml-[22px]' : 'ml-0.5')} />
    </button>
  )
}
