import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, Clock, NotebookPen, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { StepKey } from '@/lib/types'
import { STEP_ORDER, lessonHref } from '@/lib/conveyor'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-context'
import { Badge, ErrorState, LinkButton, PageSkeleton } from '@/components/ui'
import { FormatBadges, Stepper } from '@/components/lesson/bits'
import PrepareStep from '@/components/lesson/PrepareStep'
import ClassStep from '@/components/lesson/ClassStep'
import CheckStep from '@/components/lesson/CheckStep'
import AnalysisStep from '@/components/lesson/AnalysisStep'
import NextStep from '@/components/lesson/NextStep'

const WHEN: Record<string, string> = { bugun: 'bg-firuza-500 text-white ring-firuza-500', "o'tgan": 'bg-sunken text-mute ring-line', kelgusi: 'bg-indigo-50 text-indigo-600 ring-indigo-100' }

export default function Lesson() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const { data, error, isLoading } = useQuery({ queryKey: ['lesson', id], queryFn: () => api.lesson(id) })
  const { classId, setClassId, classes } = useSession()

  useEffect(() => {
    if (data && data.class_id !== classId) setClassId(data.class_id)
  }, [data, classId, setClassId])

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />

  const param = params.get('qadam') as StepKey | null
  const step: StepKey = param && STEP_ORDER.includes(param) ? param : data.current
  const go = (k: StepKey) => {
    setParams({ qadam: k })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const cls = classes.find((c) => c.id === data.class_id)

  return (
    <div className="space-y-5">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-[13px] text-mute">
          <Link to="/bugun" className="hover:text-ink">Bugun</Link>
          <ChevronRight className="size-3.5 text-faint" />
          <Link to="/darslar" className="hover:text-ink">{data.class_name} darslari</Link>
          <ChevronRight className="size-3.5 text-faint" />
          <span className="text-ink-2">{data.seq != null ? `${data.seq + 1}-dars` : data.date}</span>
        </nav>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num rounded-md bg-indigo-600 px-2 py-0.5 text-sm font-semibold text-white">{data.class_name}</span>
              <Badge className={WHEN[data.when]}>{data.when}</Badge>
              <FormatBadges lesson={data} />
            </div>
            <h1 className="mt-2 font-display text-[24px] leading-tight font-semibold tracking-tight text-ink sm:text-[28px]">{data.topic}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-mute">
              <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{data.weekday}, {data.date}</span>
              {data.hour && <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{data.hour}-soat · 45 daqiqa</span>}
              <span className="flex items-center gap-1.5"><Users className="size-3.5" />{data.students} o'quvchi</span>
              {data.lesson_no && <span className="num">Reja bo'yicha {data.lesson_no}-dars / 170</span>}
              {data.textbook && <span className="flex items-center gap-1.5"><BookOpen className="size-3.5" />Darslik {data.textbook.replace(':', ' qism,')}-bet</span>}
              {data.workbook && <span className="flex items-center gap-1.5"><NotebookPen className="size-3.5" />Mashq daftari {data.workbook}-bet</span>}
            </div>
            {data.chapter && <div className="mt-1 text-[12.5px] text-faint">{data.chapter}</div>}
          </div>
          {data.next && (
            <LinkButton to={lessonHref(data.next.id)} variant="ghost" className="self-start lg:self-auto">
              Keyingi dars: {data.next.date.slice(0, 5)} <ArrowRight className="size-4" />
            </LinkButton>
          )}
        </div>
      </div>

      <Stepper steps={data.steps} active={step} current={data.current} onSelect={go} />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className={cn(step === 'darsda' && 'scroll-mt-4')}>
          {step === 'tayyorlash' && <PrepareStep lesson={data} diagEvery={cls?.diag_every ?? 3} onNext={() => go('darsda')} />}
          {step === 'darsda' && <ClassStep lesson={data} onNext={() => go('tekshirish')} onBack={() => go('tayyorlash')} />}
          {step === 'tekshirish' && <CheckStep lesson={data} onNext={() => go('tahlil')} onBack={() => go('tayyorlash')} />}
          {step === 'tahlil' && <AnalysisStep lesson={data} onNext={() => go('keyingi')} onBack={() => go('tekshirish')} />}
          {step === 'keyingi' && <NextStep lesson={data} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
