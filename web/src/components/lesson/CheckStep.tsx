import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, ListChecks, Minus, Plus, Save, Search, Sparkles, TriangleAlert, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Button, Card, CardHeader, Empty, PageSkeleton } from '@/components/ui'
import { Answers, Scanner } from '@/components/diagnostic/ScanPanel'
import HomeworkPanel from './HomeworkPanel'
import { useLessonRefresh } from './use-refresh'

export default function CheckStep({ lesson, onNext, onBack }: { lesson: LessonDetail; onNext: () => void; onBack: () => void }) {
  if (lesson.diagnostic_day) {
    if (!lesson.diagnostic_id) {
      return <Card><Empty icon={TriangleAlert} title="Diagnostik varaqlar yaratilmagan" text="Bu dars — qog'ozli diagnostika kuni. Avval «Tayyorlash» qadamida varaqlarni yarating va chop eting."
        action={<Button variant="primary" icon={ArrowLeft} onClick={onBack}>Tayyorlashga qaytish</Button>} /></Card>
    }
    return (
      <div className="space-y-6">
        <DiagnosticCheck lesson={lesson} did={lesson.diagnostic_id} onNext={onNext} />
        <HomeworkPanel lessonId={lesson.id} />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <QuickCheckForm key={lesson.quick_check?.at ?? 'yangi'} lesson={lesson} onNext={onNext} />
      <HomeworkPanel lessonId={lesson.id} />
    </div>
  )
}

function DiagnosticCheck({ lesson, did, onNext }: { lesson: LessonDetail; did: number; onNext: () => void }) {
  const { data } = useQuery({ queryKey: ['diagnostic', did], queryFn: () => api.diagnostic(did) })
  const [answers, setAnswers] = useState(false)
  const ai = useAi()
  const refresh = useLessonRefresh(lesson.id)
  const grade = useMutation({
    mutationFn: () => ai.run('grade', () => api.grade(did)),
    onSuccess: (r) => { refresh(); ai.toast(`${r.graded} o'quvchi baholandi, feedback tayyor`); onNext() },
  })
  if (!data) return <PageSkeleton />
  const pct = Math.round((100 * data.responses) / Math.max(1, data.rows.length))

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="num text-3xl font-semibold text-indigo-600">{data.responses}</span>
              <span className="text-mute">/ {data.rows.length} javob o'qildi</span>
              {data.flagged > 0 && <button onClick={() => setAnswers(true)} className="ml-2 text-[13px] font-medium text-oltin-600 hover:underline">{data.flagged} tasini tasdiqlang</button>}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-firuza-500 transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={ListChecks} onClick={() => setAnswers((v) => !v)}>{answers ? 'Skanerga qaytish' : 'Javoblar jadvali'}</Button>
            {data.graded > 0 && lesson.steps[3].done
              ? <Button variant="primary" onClick={onNext}>Tahlilga o'tish <ArrowRight className="size-4" /></Button>
              : <Button variant="primary" icon={Sparkles} disabled={data.responses === 0} loading={grade.isPending} onClick={() => grade.mutate()}>AI bilan baholash</Button>}
          </div>
        </div>
      </Card>
      {answers
        ? <Answers data={data} onSaved={() => refresh()} />
        : <Scanner data={data} onDone={() => refresh()} onShowAnswers={() => setAnswers(true)} />}
    </div>
  )
}

const LIGHTS = [
  { key: 'green', label: 'Tushundim', hint: 'mustaqil yecha oladi', tile: 'bg-firuza-50 ring-firuza-200', dot: 'bg-firuza-500', text: 'text-firuza-700' },
  { key: 'yellow', label: 'Ikkilanyapman', hint: "yordam bilan yechadi", tile: 'bg-oltin-50 ring-oltin-100', dot: 'bg-oltin-500', text: 'text-oltin-600' },
  { key: 'red', label: 'Tushunmadim', hint: 'qayta tushuntirish kerak', tile: 'bg-terra-50 ring-terra-100', dot: 'bg-terra-500', text: 'text-terra-600' },
] as const

function QuickCheckForm({ lesson, onNext }: { lesson: LessonDetail; onNext: () => void }) {
  const qc0 = lesson.quick_check
  const [counts, setCounts] = useState({ green: qc0?.green ?? 0, yellow: qc0?.yellow ?? 0, red: qc0?.red ?? 0 })
  const [struggled, setStruggled] = useState<Set<number>>(() => new Set(qc0?.struggled ?? []))
  const [note, setNote] = useState(qc0?.note ?? '')
  const [q, setQ] = useState('')
  const ai = useAi()
  const refresh = useLessonRefresh(lesson.id)
  const roster = useQuery({ queryKey: ['attention', lesson.id], queryFn: () => api.lessonAttention(lesson.id) })
  const save = useMutation({
    mutationFn: () => api.quickCheck(lesson.id, { ...counts, struggled: [...struggled], note }),
    onSuccess: (d) => { refresh(d); ai.toast("Tezkor tekshiruv saqlandi — qiynalganlar keyingi ssenariyda ustuvor"); onNext() },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  const total = counts.green + counts.yellow + counts.red
  const set = (k: keyof typeof counts, v: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(lesson.students, v)) }))
  const toggle = (id: number) => setStruggled((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const students = (roster.data?.students ?? []).filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-3">
        <CardHeader icon={Zap} title="Qog'ozsiz tezkor tekshiruv" hint="Dars oxirida svetofor: o'quvchilar kartani ko'taradi, siz sanab kiritasiz. Qog'oz kerak emas." />
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {LIGHTS.map((l) => (
              <div key={l.key} className={cn('rounded-2xl p-4 ring-1', l.tile)}>
                <div className="flex items-center gap-2"><span className={cn('size-3 rounded-full', l.dot)} /><span className={cn('text-sm font-semibold', l.text)}>{l.label}</span></div>
                <div className="mt-0.5 text-[12px] text-mute">{l.hint}</div>
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={() => set(l.key, counts[l.key] - 1)} className="grid size-10 place-items-center rounded-xl bg-surface ring-1 ring-line-strong" aria-label="Kamaytirish"><Minus className="size-4" /></button>
                  <input value={counts[l.key]} inputMode="numeric" onChange={(e) => set(l.key, Number(e.target.value.replace(/\D/g, '')) || 0)}
                    className="num w-16 bg-transparent text-center text-[32px] font-semibold text-ink outline-none" aria-label={l.label} />
                  <button onClick={() => set(l.key, counts[l.key] + 1)} className="grid size-10 place-items-center rounded-xl bg-surface ring-1 ring-line-strong" aria-label="Ko'paytirish"><Plus className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-sunken">
              {LIGHTS.map((l) => <div key={l.key} className={cn('h-full transition-[width] duration-300', l.dot)} style={{ width: `${(100 * counts[l.key]) / Math.max(total, lesson.students)}%` }} />)}
            </div>
            <div className={cn('mt-1.5 text-[12.5px]', total > lesson.students ? 'text-terra-600' : 'text-mute')}>
              {total} / {lesson.students} o'quvchi{total < lesson.students && total > 0 ? ` · ${lesson.students - total} tasi kelmagan yoki ko'rsatmagan` : ''}{total > lesson.students ? ' · sinfdagi o\'quvchilardan ko\'p' : ''}
            </div>
          </div>

          <label className="mt-5 block text-[13px] font-medium text-ink-2">Qayerda qiynalishdi? <span className="font-normal text-faint">(ixtiyoriy)</span></label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="masalan: minutni soatga aylantirishda"
            className="mt-1.5 w-full rounded-xl bg-surface p-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500" />

          <div className="mt-4 flex justify-end">
            <Button variant="primary" icon={Save} loading={save.isPending} disabled={total === 0 || total > lesson.students} onClick={() => save.mutate()}>Saqlash va tahlilga o'tish</Button>
          </div>
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader icon={TriangleAlert} title="Qizil ko'rsatganlar" hint="Belgilang — keyingi ssenariyda ularga nomli topshiriq beriladi" action={<span className="num text-lg font-semibold text-terra-500">{struggled.size}</span>} />
        <div className="p-5 pt-3">
          <label className="flex h-9 items-center gap-2 rounded-xl bg-surface px-3 text-sm ring-1 ring-line-strong focus-within:ring-firuza-300">
            <Search className="size-4 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism" className="w-full bg-transparent outline-none placeholder:text-faint" />
          </label>
          <div className="mt-3 grid max-h-[420px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
            {roster.isLoading && <div className="skeleton col-span-2 h-40" />}
            {students.map((s) => (
              <button key={s.id} onClick={() => toggle(s.id)}
                className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] ring-1 transition-colors',
                  struggled.has(s.id) ? 'bg-terra-500 text-white ring-terra-500' : 'bg-surface text-ink ring-line hover:ring-line-strong')}>
                <span className={cn('num w-4 text-[10.5px]', struggled.has(s.id) ? 'text-white/70' : 'text-faint')}>{s.journal_no}</span>
                <span className="truncate">{s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
