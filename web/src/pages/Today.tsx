import { Link, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, CircleCheck, FileText, Leaf, TriangleAlert, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonBrief, TodayView } from '@/lib/types'
import { STEP_ICON, lessonHref, stepCta } from '@/lib/conveyor'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-context'
import { Badge, Button, Card, CardHeader, ErrorState, PageSkeleton } from '@/components/ui'
import { FormatBadges, MiniStepper } from '@/components/lesson/bits'
import ImpactPanel from '@/components/ImpactPanel'

export default function Today() {
  const { data, error, isLoading } = useQuery({ queryKey: ['today'], queryFn: api.today })
  const { classId } = useSession()
  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />

  const diag = data.lessons.filter((l) => l.diagnostic_day).length
  const group = data.lessons.filter((l) => l.group_work).length
  const done = data.lessons.filter((l) => l.steps.every((s) => s.done)).length

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="girih pointer-events-none absolute -top-8 -right-8 size-64 opacity-[0.14] [mask-image:radial-gradient(circle_at_top_right,black,transparent_70%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow flex items-center gap-2"><CalendarClock className="size-3.5" />{data.label} · {data.weekday}, {data.date}</div>
            <h1 className="mt-3 font-display text-[28px] leading-[1.15] font-semibold tracking-tight text-indigo-600 sm:text-[34px]">
              {done === data.lessons.length && data.lessons.length ? `${data.lessons.length} ta dars yakunlandi` : `Bugun ${data.lessons.length} ta dars`}
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
              Har bir dars 5 qadamdan o'tadi. Bugun <b className="font-semibold text-ink">{diag} ta</b> qog'ozli diagnostika,
              qolganlarida qog'ozsiz tezkor tekshiruv; guruh ishi — <b className="font-semibold text-ink">{group} ta</b> darsda.
            </p>
          </div>
          <ConveyorLegend />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {data.lessons.length === 0 && <Card className="p-6 text-sm text-mute">Jadvalda dars topilmadi.</Card>}
          {data.lessons.map((l, i) => <LessonCard key={l.id} lesson={l} index={i} gapAlert={data.gap_alert} />)}
        </div>
        <div className="space-y-6">
          <DiagnosticsCalendar data={data} />
          <PaperCard data={data} />
        </div>
      </div>

      <ImpactPanel classId={classId} compact />
    </div>
  )
}

function ConveyorLegend() {
  const labels = ['Tayyorlash', 'Darsda', 'Tekshirish', 'Tahlil', 'Keyingi dars'] as const
  const keys = ['tayyorlash', 'darsda', 'tekshirish', 'tahlil', 'keyingi'] as const
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-sunken p-2 ring-1 ring-line">
      {keys.map((k, i) => {
        const Icon = STEP_ICON[k]
        return (
          <div key={k} className="flex items-center gap-1">
            {i > 0 && <ArrowRight className="size-3 text-faint" />}
            <span className="flex items-center gap-1.5 rounded-lg bg-surface px-2 py-1.5 text-[12px] font-medium text-ink-2 ring-1 ring-line">
              <Icon className="size-3.5 text-firuza-600" /><span className="hidden sm:inline">{labels[i]}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LessonCard({ lesson: l, index, gapAlert }: { lesson: LessonBrief; index: number; gapAlert: number }) {
  const navigate = useNavigate()
  const { setClassId } = useSession()
  const finished = l.steps.every((s) => s.done)
  const currentStep = l.steps.find((s) => s.key === l.current)
  const open = () => {
    setClassId(l.class_id)
    navigate(lessonHref(l.id, finished ? undefined : l.current))
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.35 }}
      className={cn('card overflow-hidden', finished && 'bg-paper')}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="num text-[26px] leading-none font-semibold text-indigo-600">{l.hour ?? '–'}</span>
            <span className="mt-1 text-[11px] text-mute">soat</span>
          </div>
          <div className="h-12 w-px bg-line" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">{l.class_name}</span>
              <span className="text-xs text-mute">{l.students} o'quvchi</span>
              {!!l.neglected && (
                <Badge className="bg-terra-50 text-terra-600 ring-terra-100" ><TriangleAlert className="size-3" />{l.neglected} ta {gapAlert}+ dars</Badge>
              )}
            </div>
            <div className="mt-1.5 line-clamp-2 text-[15px] leading-snug font-semibold text-ink">{l.topic}</div>
            {l.lesson_no && <div className="mt-0.5 text-[11.5px] text-faint">Reja: {l.lesson_no}-dars{l.workbook ? ` · mashq daftari ${l.workbook}-bet` : ''}</div>}
            <FormatBadges lesson={l} className="mt-2" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className={cn('max-w-52 text-[12.5px] leading-snug sm:text-right', finished ? 'text-firuza-700' : 'text-ink-2')}>
            {finished ? <span className="inline-flex items-center gap-1"><CircleCheck className="size-3.5" />Konveyer yakunlandi</span> : currentStep?.hint}
          </div>
          <Button variant={finished ? 'secondary' : 'primary'} onClick={open} className="shrink-0">
            {stepCta(l)} <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="border-t border-line bg-paper/60 px-5 pt-4 pb-3 sm:px-6"><MiniStepper steps={l.steps} current={l.current} /></div>
    </motion.div>
  )
}

function DiagnosticsCalendar({ data }: { data: TodayView }) {
  return (
    <Card>
      <CardHeader icon={FileText} title="Qog'ozli diagnostikalar" hint="Keyingi 14 kun · mavzu oxirida yoki har N darsda" />
      <div className="space-y-1 p-3">
        {data.upcoming_diagnostics.length === 0 && <p className="p-2 text-sm text-mute">Yaqin kunlarda qog'ozli diagnostika yo'q.</p>}
        {data.upcoming_diagnostics.map((d) => (
          <Link key={d.lesson_id} to={lessonHref(d.lesson_id, 'tayyorlash')} className="group flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-sunken">
            <div className="w-12 text-center">
              <div className="num text-sm font-semibold text-ink">{d.date.slice(0, 5)}</div>
              <div className="text-[10.5px] text-mute">{d.weekday.slice(0, 3)}</div>
            </div>
            <span className="num rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600">{d.class_name}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-ink">{d.topic}</div>
              <div className="text-[11px] text-mute">{d.sheets} A4 varaq · {d.cards} kartochka (4 tadan, old-orqa)</div>
            </div>
            {d.ready ? <CircleCheck className="size-4 text-firuza-500" /> : <span className="text-[11px] text-oltin-600">tayyorlanmagan</span>}
          </Link>
        ))}
      </div>
    </Card>
  )
}

function PaperCard({ data }: { data: TodayView }) {
  const p = data.paper
  const share = p.sheets_if_every_lesson ? p.sheets_used / p.sheets_if_every_lesson : 0
  return (
    <Card>
      <CardHeader icon={Leaf} title="Qog'oz hisobi" hint={`${p.since} dan beri, barcha sinflar`} />
      <div className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="num text-[34px] leading-none font-semibold text-firuza-600">{p.sheets_saved.toLocaleString('uz')}</div>
            <div className="mt-1 text-[13px] text-mute">varaq tejaldi</div>
          </div>
          <div className="text-right text-[12.5px] text-ink-2">
            <div className="flex items-center justify-end gap-1.5"><FileText className="size-3.5 text-indigo-600" />{p.paper_lessons} ta qog'ozli</div>
            <div className="mt-1 flex items-center justify-end gap-1.5"><Zap className="size-3.5 text-firuza-600" />{p.quick_lessons} ta tezkor</div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-firuza-100">
          <motion.div className="h-full rounded-full bg-indigo-600" initial={{ width: 0 }} animate={{ width: `${Math.max(2, share * 100)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="mt-2 flex justify-between text-[11.5px] text-mute">
          <span>Ishlatildi: {p.sheets_used}</span>
          <span>Har darsda test bo'lsa: {p.sheets_if_every_lesson}</span>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-mute">
          Qog'ozli diagnostika faqat mavzu oxirida yoki har N darsda. Qolgan darslarda — svetofor, mini-doska yoki chiqish savoli bilan qog'ozsiz tekshiruv.
        </p>
      </div>
    </Card>
  )
}
