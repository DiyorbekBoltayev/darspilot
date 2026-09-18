import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Brain, ChartNoAxesColumn, Clock, FileSpreadsheet, Hand, Sparkles, Timer, TrendingUp, TriangleAlert, Users, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Bar, Button, Card, CardHeader, Empty, LinkButton, PageSkeleton, Stat } from '@/components/ui'
import { useLessonRefresh } from './use-refresh'

export default function AnalysisStep({ lesson, onNext, onBack }: { lesson: LessonDetail; onNext: () => void; onBack: () => void }) {
  const ai = useAi()
  const refresh = useLessonRefresh(lesson.id)
  const grade = useMutation({
    mutationFn: () => ai.run('grade', () => api.grade(lesson.diagnostic_id!)),
    onSuccess: (r) => { refresh(); ai.toast(`${r.graded} o'quvchi baholandi, feedback tayyor`) },
  })

  if (lesson.diagnostic_day) {
    if (!lesson.graded) {
      return (
        <Card>
          <Empty icon={Brain} title={lesson.responses ? `${lesson.responses} ta javob baholashni kutmoqda` : "Hali javoblar yo'q"}
            text={lesson.responses ? "AI har o'quvchining bosqichli tashxisini qo'yadi va o'quvchi, ota-ona, o'qituvchi uchun feedback yozadi." : "Avval «Tekshirish» qadamida javob chiziqlarini skanerlang."}
            action={lesson.responses
              ? <Button variant="primary" icon={Sparkles} loading={grade.isPending} onClick={() => grade.mutate()}>AI bilan baholash</Button>
              : <Button variant="primary" icon={ArrowLeft} onClick={onBack}>Skanerga qaytish</Button>} />
        </Card>
      )
    }
    return <DiagnosticSummary did={lesson.diagnostic_id!} onNext={onNext} />
  }
  if (!lesson.quick_check) {
    return <Card><Empty icon={Zap} title="Tezkor tekshiruv kiritilmagan" text="Svetofor natijasini kiriting — tahlil va keyingi ssenariy shundan tuziladi."
      action={<Button variant="primary" icon={ArrowLeft} onClick={onBack}>Tekshirishga qaytish</Button>} /></Card>
  }
  return <QuickSummary lesson={lesson} onNext={onNext} />
}

function DiagnosticSummary({ did, onNext }: { did: number; onNext: () => void }) {
  const { data } = useQuery({ queryKey: ['results', did], queryFn: () => api.results(did) })
  if (!data) return <PageSkeleton />
  const maxErr = Math.max(1, ...data.errors.map((e) => e.count))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={TrendingUp} label="O'rtacha natija" value={data.avg_pct ?? 0} suffix="%" tone="indigo" />
        <Stat icon={Users} label="Baholandi" value={data.graded} suffix=" o'quvchi" />
        <Stat icon={Clock} label="Tejalgan vaqt" value={data.minutes_saved} suffix=" daq" tone="oltin" hint="Qo'lda tekshirish + izoh o'rniga" />
        <Stat icon={Timer} label="AI ishladi" value={Math.round(data.seconds ?? 0)} suffix=" s" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader icon={Brain} title="AI xulosa" hint="Anonim statistikadan (ism emas, kod) tuzilgan" />
          {data.summary ? (
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              <List title="Sinf holati" items={data.summary.xulosa} />
              <List title="Keyingi darsga" items={data.summary.keyingi_dars} accent />
            </div>
          ) : <p className="p-5 text-sm text-mute">Xulosa yo'q.</p>}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader icon={ChartNoAxesColumn} title="Masala yechish bosqichlari" hint="To'g'ri javob foizi" />
          <div className="space-y-3 p-5">
            {data.steps.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="text-ink-2">{s.name}</span><span className="num font-semibold text-ink">{s.pct}%</span></div>
                <Bar value={s.pct} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader icon={TriangleAlert} title="Asosiy xato turlari" hint="Har o'quvchining ildiz xatosi bo'yicha"
          action={<div className="flex gap-2">
            <LinkButton href={`/api/diagnostics/${did}/export.xlsx`} download icon={FileSpreadsheet} className="h-9 text-[13px]">Excel</LinkButton>
            <LinkButton to={`/diagnostika/${did}/natijalar`} className="h-9 text-[13px]">Har o'quvchi feedbacki</LinkButton>
          </div>} />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {data.errors.length === 0 && <p className="text-sm text-firuza-600">Xato topilmadi — sinf mavzuni o'zlashtirgan.</p>}
          {data.errors.map((e, i) => (
            <div key={e.name}>
              <div className="mb-1.5 flex items-start justify-between gap-3 text-sm"><span className="text-ink-2">{e.name}</span><span className="num font-semibold text-ink">{e.count}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-sunken">
                <motion.div className={cn('h-full rounded-full', i === 0 ? 'bg-terra-500' : 'bg-indigo-300')} initial={{ width: 0 }} animate={{ width: `${(e.count / maxErr) * 100}%` }} transition={{ delay: 0.1 + i * 0.06, duration: 0.7 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex justify-end"><Button variant="primary" onClick={onNext}>Keyingi darsga <ArrowRight className="size-4" /></Button></div>
    </div>
  )
}

function QuickSummary({ lesson, onNext }: { lesson: LessonDetail; onNext: () => void }) {
  const qc = lesson.quick_check!
  const roster = useQuery({ queryKey: ['attention', lesson.id], queryFn: () => api.lessonAttention(lesson.id) })
  const total = Math.max(1, qc.green + qc.yellow + qc.red)
  const pct = (n: number) => Math.round((100 * n) / total)
  const names = new Map(roster.data?.students.map((s) => [s.id, s.name]) ?? [])
  const attended = roster.data?.students.filter((s) => s.today).length ?? lesson.attended.length
  const neglected = roster.data?.students.filter((s) => s.gap >= lesson.gap_alert && !s.today) ?? []
  const verdict = pct(qc.green) >= 70 ? "Sinf mavzuni asosan tushundi — keyingi darsda yangi mavzuga o'tish mumkin."
    : pct(qc.red) >= 25 ? "Chorakdan ko'pi tushunmadi — keyingi darsning takrorlash bosqichi shu mavzuga qaratiladi."
      : "Aralash natija — takrorlashda qisqa mashq va qiynalganlar bilan alohida ishlash tavsiya etiladi."

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader icon={Zap} title="Svetofor natijasi" hint={`Kiritildi: ${qc.at}`} />
          <div className="p-5">
            <div className="flex h-14 overflow-hidden rounded-2xl">
              {[['green', qc.green, 'bg-firuza-500'], ['yellow', qc.yellow, 'bg-oltin-500'], ['red', qc.red, 'bg-terra-500']].map(([k, n, c]) => (
                (n as number) > 0 && (
                  <motion.div key={k as string} initial={{ flexGrow: 0 }} animate={{ flexGrow: n as number }} transition={{ duration: 0.7 }} className={cn('grid min-w-12 place-items-center text-white', c as string)} style={{ flexBasis: 0 }}>
                    <span className="num text-lg font-semibold">{pct(n as number)}%</span>
                  </motion.div>
                )
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 text-center text-[13px]">
              <div><span className="num font-semibold text-firuza-700">{qc.green}</span> <span className="text-mute">tushundi</span></div>
              <div><span className="num font-semibold text-oltin-600">{qc.yellow}</span> <span className="text-mute">ikkilanmoqda</span></div>
              <div><span className="num font-semibold text-terra-600">{qc.red}</span> <span className="text-mute">tushunmadi</span></div>
            </div>
            <div className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700 ring-1 ring-indigo-100">{verdict}</div>
            {qc.note && <div className="mt-3 text-sm text-ink-2"><span className="text-mute">Izoh:</span> {qc.note}</div>}
          </div>
        </Card>
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader icon={TriangleAlert} title="Keyingi ssenariyga o'tadi" />
            <div className="space-y-3 p-5 pt-3 text-sm">
              <div>
                <div className="text-[12.5px] text-mute">Qiynalganlar — ustuvorlik oshadi</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {qc.struggled.length === 0 && <span className="text-mute">belgilanmagan</span>}
                  {qc.struggled.map((id) => <span key={id} className="rounded-lg bg-terra-50 px-2 py-1 text-[12.5px] text-ink ring-1 ring-terra-100">{names.get(id) ?? `#${id}`}</span>)}
                </div>
              </div>
              <div>
                <div className="text-[12.5px] text-mute">{lesson.gap_alert}+ dars e'tiborsiz — majburiy nomli topshiriq</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {neglected.length === 0 && <span className="text-firuza-700">hech kim</span>}
                  {neglected.map((s) => <span key={s.id} className="rounded-lg bg-sunken px-2 py-1 text-[12.5px] text-ink ring-1 ring-line">{s.name} <span className="num text-terra-500">{s.gap}</span></span>)}
                </div>
              </div>
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <Hand className="size-6 text-indigo-600" />
            <div className="flex-1 text-sm text-ink-2">Bugun e'tibor berilgan o'quvchilar</div>
            <span className="num text-2xl font-semibold text-indigo-600">{attended}<span className="text-sm text-faint">/{lesson.students}</span></span>
          </Card>
        </div>
      </div>
      <div className="flex justify-end"><Button variant="primary" onClick={onNext}>Keyingi darsga <ArrowRight className="size-4" /></Button></div>
    </div>
  )
}

function List({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  return (
    <div>
      <div className="mb-2.5 text-xs font-semibold tracking-wide text-mute uppercase">{title}</div>
      <ul className="space-y-2.5">
        {items.map((x, i) => <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-2"><span className={cn('mt-[7px] size-1.5 shrink-0 rotate-45', accent ? 'bg-firuza-500' : 'bg-indigo-600')} />{x}</li>)}
      </ul>
    </div>
  )
}
