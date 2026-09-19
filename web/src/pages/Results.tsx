import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Check, ChevronDown, Clock, FileSpreadsheet, GraduationCap, Heart, MessageSquareText, PenLine, ScanLine, ShieldCheck, ThumbsDown, ThumbsUp, Timer, TrendingUp, UserCheck, Users, WandSparkles } from 'lucide-react'
import { api } from '@/lib/api'
import type { ResultStudent, ScanQuality } from '@/lib/types'
import { cn } from '@/lib/utils'
import { lessonHref } from '@/lib/conveyor'
import { useAi } from '@/components/ai-context'
import { Badge, Button, Card, CardHeader, Empty, ErrorState, LinkButton, PageHeader, PageSkeleton, Ring, Stat, Tabs } from '@/components/ui'

const KnowledgeFlow = lazy(() => import('@/components/fx/KnowledgeFlow'))
type Filter = 'hammasi' | 'xato' | 'toliq'

export default function Results() {
  const id = Number(useParams().id)
  const { data, error, isLoading } = useQuery({ queryKey: ['results', id], queryFn: () => api.results(id) })
  const [filter, setFilter] = useState<Filter>('hammasi')
  const [open, setOpen] = useState<number | null>(null)
  const ai = useAi()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const lesson = useMutation({
    mutationFn: () => ai.run('lesson', () => api.prepareNext(data!.lesson_id!)),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['lesson'] }); qc.invalidateQueries({ queryKey: ['today'] }); navigate(lessonHref(r.next_lesson_id, 'tayyorlash')) },
  })

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />
  if (data.graded === 0) {
    return <Card><Empty icon={ScanLine} title="Hali baholanmagan" text="Avval javob chiziqlarini skanerlang va AI bilan baholang." action={<LinkButton to={`/diagnostika/${id}?tab=skaner`} variant="primary" icon={ScanLine}>Skanerga o'tish</LinkButton>} /></Card>
  }
  const maxErr = Math.max(1, ...data.errors.map((e) => e.count))
  const students = data.students.filter((s) => (filter === 'xato' ? s.correct < s.total : filter === 'toliq' ? s.correct === s.total : true))
  const summative = data.kind !== 'formativ'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={data.lesson_id ? <Link to={lessonHref(data.lesson_id, 'tahlil')} className="hover:underline">← Dars konveyeri · {data.date}</Link> : <Link to={`/diagnostika/${id}`} className="hover:underline">Diagnostika · {data.date}</Link>}
        title={`Natijalar: ${data.title}`}
        subtitle="Yopiq javoblarni kompyuter ko'rish o'qiydi, qo'lda yozilgan yechimni AI rubrika bo'yicha baholaydi. Har bir bahoni o'qituvchi bir bosishda tasdiqlaydi yoki tuzatadi."
        actions={<>
          {summative && <Badge className="bg-terra-50 text-terra-600 ring-terra-100">{data.kind.toUpperCase()} · {data.max_points} ball</Badge>}
          <LinkButton href={`/api/diagnostics/${id}/export.xlsx`} download icon={FileSpreadsheet}>Excel (formativ ball)</LinkButton>
          {data.lesson_id && <Button variant="primary" icon={WandSparkles} loading={lesson.isPending} onClick={() => lesson.mutate()}>Keyingi dars ssenariysi</Button>}
        </>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Users} label="Baholandi" value={data.graded} suffix=" o'quvchi" />
        <Stat icon={TrendingUp} label="O'rtacha natija" value={data.avg_pct ?? 0} suffix="%" tone="indigo" />
        <Stat icon={Clock} label="Tejalgan vaqt" value={data.minutes_saved} suffix=" daq" tone="oltin" hint="Qo'lda tekshirish + izoh o'rniga" />
        <Stat icon={Timer} label="AI ishladi" value={Math.round(data.seconds ?? 0)} suffix=" s" hint="Tashxis, feedback va xulosa" />
      </div>

      <QualityPanel q={data.quality} />

      <Card>
        <CardHeader icon={GraduationCap} title="Bilim oqimi" hint="Nuqtalar — o'quvchilar. Har darvozadan o'tish ehtimoli = shu bosqichdagi to'g'ri javob foizi. Terrakota rangga kirib to'kilganlar — shu bosqichda adashganlar." />
        <div className="px-3 pb-4 sm:px-5"><Suspense fallback={<div className="skeleton h-64" />}><KnowledgeFlow steps={data.steps} /></Suspense></div>
      </Card>

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
          <CardHeader icon={TrendingUp} title="Asosiy xato turlari" hint="Har o'quvchining ildiz xatosi bo'yicha" />
          <div className="space-y-4 p-5">
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
      </div>

      <Card>
        <CardHeader icon={MessageSquareText} title="O'quvchilar, yechim bahosi va shaxsiy feedback" hint="Qatorni oching: bosqichli tashxis, qo'lda yozilgan yechim va uch xil feedback"
          action={<Tabs<Filter> value={filter} onChange={setFilter} tabs={[{ key: 'hammasi', label: 'Hammasi' }, { key: 'xato', label: 'Xatosi borlar' }, { key: 'toliq', label: "To'liq" }]} />} />
        <div className="space-y-2 p-4">
          {students.map((s) => <StudentResult key={s.id} did={id} s={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} />)}
        </div>
      </Card>
    </div>
  )
}

function QualityPanel({ q }: { q: ScanQuality }) {
  const cells = [
    { label: 'Avtomatik o\'qildi', value: q.auto_pct == null ? '—' : `${q.auto_pct}%`, hint: `${q.cells} katakdan ${q.cells - q.unsure} tasi shubhasiz` },
    { label: 'O\'qituvchi tuzatdi', value: `${q.corrected}`, hint: q.accuracy_pct == null ? 'katak' : `katak · aniqlik ${q.accuracy_pct}%` },
    { label: "Suratdan o'qildi", value: `${q.scanned}`, hint: `${q.manual} ta ish qo'lda kiritilgan` },
    { label: 'Feedback o\'zgarishsiz', value: q.feedback_kept_pct == null ? '—' : `${q.feedback_kept_pct}%`, hint: `${q.feedback_total} ta matn · 👍 ${q.feedback_up} · 👎 ${q.feedback_down}` },
  ]
  return (
    <Card>
      <CardHeader icon={ShieldCheck} title="Baholash ishonchliligi" hint="Avtomatik baho qayerda ishonchli, qayerda o'qituvchiga chiqdi" />
      <div className="grid grid-cols-1 gap-px overflow-hidden bg-line sm:grid-cols-2 xl:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0 bg-surface p-4">
            <div className="text-xs text-mute">{c.label}</div>
            <div className="num mt-1 text-2xl font-semibold text-ink">{c.value}</div>
            <div className="mt-1 text-[12px] leading-snug text-faint">{c.hint}</div>
          </div>
        ))}
      </div>
    </Card>
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

function StudentResult({ did, s, open, onToggle }: { did: number; s: ResultStudent; open: boolean; onToggle: () => void }) {
  const pct = Math.round((100 * s.correct) / s.total)
  return (
    <div className={cn('overflow-hidden rounded-xl ring-1 transition-colors', open ? 'bg-surface ring-firuza-200' : 'ring-line hover:ring-line-strong')}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Ring value={pct} size={44} stroke={4} label={<span className="text-[11px]">{s.correct}/{s.total}</span>} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/oquvchi/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink hover:text-firuza-600">{s.name}</Link>
            <span className="text-xs text-faint">{s.code} · {s.level}</span>
            {s.gap >= 5 && <Badge className="bg-terra-50 text-terra-600 ring-terra-100">{s.gap} dars e'tiborsiz</Badge>}
          </div>
          <div className="mt-0.5 truncate text-[13px] text-mute">{s.primary_error ? s.primary_text : "Barcha bosqichlar to'g'ri"}</div>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {s.steps.map((st, i) => (
            <div key={st.key} className="flex items-center gap-1" title={`${st.step}: ${st.ok ? "to'g'ri" : st.error_text ?? 'xato'}`}>
              {i > 0 && <span className="h-px w-2 bg-line-strong" />}
              <span className={cn('size-3 rotate-45 rounded-[3px]', st.ok ? 'bg-firuza-500' : 'bg-terra-500')} />
            </div>
          ))}
        </div>
        <ChevronDown className={cn('size-4 text-faint transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="border-t border-line p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
                {s.steps.map((st, i) => (
                  <div key={st.key} className={cn('rounded-lg p-2.5 text-xs ring-1', st.ok ? 'bg-firuza-50 ring-firuza-100' : 'bg-terra-50 ring-terra-100')}>
                    <div className={cn('font-semibold', st.ok ? 'text-firuza-700' : 'text-terra-600')}>{i + 1}. {st.step}</div>
                    <div className="mt-1 text-ink-2">{st.ok ? "To'g'ri" : st.error_text ?? 'Xato'}</div>
                  </div>
                ))}
              </div>
              {s.root_cause_note && <div className="mt-3 rounded-lg bg-oltin-50 px-3 py-2 text-[13px] text-oltin-600 ring-1 ring-oltin-100">{s.root_cause_note}</div>}
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <StudentFeedback did={did} s={s} />
                <Feedback icon={Heart} title="Ota-onaga" text={s.feedback.parent} />
                <Feedback icon={UserCheck} title="O'qituvchiga" text={s.feedback.teacher} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** O'quvchiga feedback: 👍/👎 va tahrir — AI matnining qanchasi o'zgarishsiz ketayotganini o'lchaydi. */
function StudentFeedback({ did, s }: { did: number; s: ResultStudent }) {
  const [edit, setEdit] = useState(false)
  const [text, setText] = useState(s.feedback.student)
  const ai = useAi()
  const qc = useQueryClient()
  const rate = useMutation({
    mutationFn: (body: { rating?: number; text?: string }) => api.rateFeedback(did, s.id, body),
    onSuccess: (r, body) => { qc.setQueryData(['results', did], r); setEdit(false); ai.toast(body.text ? 'Feedback tahrirlandi' : 'Baholandi') },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  return (
    <div className="rounded-xl bg-sunken p-3.5 ring-1 ring-line">
      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
        <GraduationCap className="size-3.5" />O'quvchiga
        {s.feedback_edited && <Badge className="bg-oltin-50 text-oltin-600 ring-oltin-100">tahrirlangan</Badge>}
        <div className="ml-auto flex items-center gap-1">
          <button title="Foydali" onClick={() => rate.mutate({ rating: s.feedback_rating === 1 ? 0 : 1 })}
            className={cn('rounded-md p-1 transition-colors hover:bg-firuza-50', s.feedback_rating === 1 ? 'text-firuza-600' : 'text-faint')}>
            <ThumbsUp className="size-3.5" />
          </button>
          <button title="Foydasiz" onClick={() => rate.mutate({ rating: s.feedback_rating === -1 ? 0 : -1 })}
            className={cn('rounded-md p-1 transition-colors hover:bg-terra-50', s.feedback_rating === -1 ? 'text-terra-500' : 'text-faint')}>
            <ThumbsDown className="size-3.5" />
          </button>
          <button title="Tahrirlash" onClick={() => { setText(s.feedback.student); setEdit(!edit) }}
            className={cn('rounded-md p-1 transition-colors hover:bg-indigo-50', edit ? 'text-indigo-600' : 'text-faint')}>
            <PenLine className="size-3.5" />
          </button>
        </div>
      </div>
      {edit ? (
        <div className="mt-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
            className="w-full rounded-lg bg-white p-2.5 text-[14px] leading-relaxed text-ink ring-1 ring-line outline-none focus:ring-firuza-400" />
          <div className="mt-2 flex gap-2">
            <Button variant="primary" icon={Check} loading={rate.isPending} onClick={() => rate.mutate({ text })}>Saqlash</Button>
            <Button variant="ghost" onClick={() => setEdit(false)}>Bekor</Button>
          </div>
        </div>
      ) : <p className="mt-2 text-[14px] leading-relaxed text-ink">{s.feedback.student}</p>}
    </div>
  )
}

function Feedback({ icon: Icon, title, text }: { icon: typeof Heart; title: string; text: string }) {
  return (
    <div className="rounded-xl bg-sunken p-3.5 ring-1 ring-line">
      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600"><Icon className="size-3.5" />{title}</div>
      <p className="mt-2 text-[14px] leading-relaxed text-ink">{text}</p>
    </div>
  )
}
