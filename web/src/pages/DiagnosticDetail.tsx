import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChartNoAxesColumn, Check, FileText, ListChecks, Printer, ScanLine, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import type { DiagnosticDetail as Detail, Level } from '@/lib/types'
import { ERROR_SHORT, STATUS, cn } from '@/lib/utils'
import { lessonHref } from '@/lib/conveyor'
import { useAi } from '@/components/ai-context'
import { Badge, Button, Card, CardHeader, ErrorState, LinkButton, PageHeader, PageSkeleton, Tabs } from '@/components/ui'
import { Answers, Scanner } from '@/components/diagnostic/ScanPanel'

type Tab = 'varaqlar' | 'skaner' | 'javoblar'

export default function DiagnosticDetail() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'varaqlar'
  const { data, error, isLoading } = useQuery({ queryKey: ['diagnostic', id], queryFn: () => api.diagnostic(id) })
  const ai = useAi()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['diagnostic', id] })
    qc.invalidateQueries({ queryKey: ['lesson'] })
    qc.invalidateQueries({ queryKey: ['today'] })
    qc.invalidateQueries({ queryKey: ['overview'] })
  }, [qc, id])

  const grade = useMutation({
    mutationFn: () => ai.run('grade', () => api.grade(id)),
    onSuccess: (r) => {
      refresh()
      qc.invalidateQueries({ queryKey: ['results', id] })
      ai.toast(`${r.graded} o'quvchi baholandi, feedback tayyor`)
      navigate(`/diagnostika/${id}/natijalar`)
    },
  })

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />
  const st = STATUS[data.status]

  return (
    <div>
      {data.lesson_id && (
        <Link to={lessonHref(data.lesson_id, 'tekshirish')} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-firuza-700 hover:underline">
          <ArrowLeft className="size-3.5" />Dars konveyeriga qaytish
        </Link>
      )}
      <PageHeader
        eyebrow={<span className="flex items-center gap-2">
          {data.kind === 'formativ' ? 'Diagnostika' : 'Summativ ish'} · {data.date} <Badge className={st?.cls}>{st?.label}</Badge>
          {data.kind !== 'formativ' && <Badge className="bg-terra-50 text-terra-600 ring-terra-100">{data.kind.toUpperCase()} · {data.max_points} ball</Badge>}
        </span>}
        title={data.title}
        subtitle="Kartochkalarni duplex chop eting va 4 ga keting, dars oxirida yig'ib oling va orqa tomonini suratga oling."
        actions={
          <>
            <LinkButton href={data.pdf.varaqlar} icon={Printer}>Kartochkalar (4 tadan)</LinkButton>
            <LinkButton href={data.pdf.kalit} icon={FileText}>O'qituvchi kaliti</LinkButton>
            {data.graded > 0 && <LinkButton to={`/diagnostika/${id}/natijalar`} icon={ChartNoAxesColumn}>Natijalar</LinkButton>}
            <Button variant="primary" icon={Sparkles} disabled={data.responses === 0} loading={grade.isPending} onClick={() => grade.mutate()}>
              {data.graded ? 'Qayta baholash' : 'AI bilan baholash'}
            </Button>
          </>
        }
      />

      {data.responses > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-4">
          {[
            { label: "Avtomatik o'qildi", value: data.quality.auto_pct == null ? '—' : `${data.quality.auto_pct}%`, hint: `${data.quality.cells} katakdan` },
            { label: 'Skaner ishonchi', value: data.quality.confidence_pct == null ? '—' : `${data.quality.confidence_pct}%`, hint: `${data.quality.unsure} ta shubhali belgi` },
            { label: "O'qituvchi tuzatdi", value: `${data.quality.corrected}`, hint: data.quality.accuracy_pct == null ? 'katak' : `aniqlik ${data.quality.accuracy_pct}%` },
            { label: 'Yechim baholandi', value: `${data.quality.open_graded}`, hint: `${data.quality.open_confirmed} tasi tasdiqlangan` },
          ].map((c) => (
            <div key={c.label} className="min-w-0 bg-surface p-3.5">
              <div className="text-xs text-mute">{c.label}</div>
              <div className="num mt-0.5 text-xl font-semibold text-ink">{c.value}</div>
              <div className="mt-0.5 truncate text-[11.5px] text-faint">{c.hint}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<Tab> value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })}
          tabs={[
            { key: 'varaqlar', label: 'Variantlar', icon: FileText },
            { key: 'skaner', label: 'Skaner', icon: ScanLine },
            { key: 'javoblar', label: `Javoblar${data.flagged ? ` · ${data.flagged} tekshirish` : ''}`, icon: ListChecks },
          ]} />
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          {[['Varaqlar', true], [`Javoblar ${data.responses}/${data.rows.length}`, data.responses > 0], [data.graded ? `Baholandi ${data.graded}` : 'Baholash', data.graded > 0]].map(([l, done], i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className={cn('hidden h-px w-5 sm:block', done ? 'bg-firuza-500' : 'bg-line-strong')} />}
              <span className={cn('flex items-center gap-1 rounded-lg px-2 py-1 font-medium ring-1', done ? 'bg-firuza-50 text-firuza-700 ring-firuza-200' : 'bg-surface text-mute ring-line')}>
                {done ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-faint" />}{l as string}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {tab === 'varaqlar' && <Variants data={data} />}
          {tab === 'skaner' && <Scanner data={data} onDone={refresh} onShowAnswers={() => setParams({ tab: 'javoblar' }, { replace: true })} />}
          {tab === 'javoblar' && <Answers data={data} onSaved={refresh} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Variants({ data }: { data: Detail }) {
  const [level, setLevel] = useState<Level>(data.levels[0]?.level ?? 'B2')
  const item = data.levels.find((l) => l.level === level)
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-1 xl:content-start">
        {data.levels.map((l, i) => (
          <button key={l.level} onClick={() => setLevel(l.level)}
            className={cn('card p-4 text-left transition-shadow', level === l.level ? 'ring-2 ring-firuza-500' : 'hover:shadow-lift')}>
            <div className="flex items-center justify-between">
              <span className="num text-xl font-semibold text-indigo-600">{l.level}</span>
              <span className="text-xs text-mute">{data.counts[l.level]} o'quvchi</span>
            </div>
            <div className="mt-1 text-sm text-ink-2">{l.name}</div>
            <div className="mt-3 flex h-1.5 gap-1">{[0, 1, 2, 3].map((k) => <span key={k} className={cn('flex-1 rounded-full', k <= i ? 'bg-firuza-500' : 'bg-line')} />)}</div>
          </button>
        ))}
      </div>
      {item && (
        <Card className="xl:col-span-3">
          <CardHeader icon={FileText} title={`${item.level} · ${item.name} varianti`} hint="Sonlar va to'g'ri javob kod bilan hisoblangan; noto'g'ri variantlar aniq xato turiga bog'langan"
            action={item.spec.story_source === 'gpt' && <Badge className="bg-indigo-50 text-indigo-600 ring-indigo-100"><Sparkles className="size-3" /> AI matn</Badge>} />
          <div className="p-5">
            <div className="rounded-xl bg-sunken p-5 ring-1 ring-line">
              <p className="text-[15px] leading-relaxed text-ink">{item.spec.story}</p>
              <p className="mt-2 text-[15px] font-semibold text-indigo-600">{item.spec.ask}</p>
              <div className="mt-3 text-xs text-mute">To'g'ri javob: <b className="text-ink">{item.spec.answer} {item.spec.unit}</b></div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {item.spec.questions.map((q, qi) => (
                <div key={q.key} className="rounded-xl bg-surface p-4 ring-1 ring-line">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-ink"><span className="num mr-1.5 text-faint">{qi + 1}.</span>{q.text}</div>
                    <Badge className="shrink-0 bg-sunken text-ink-2 ring-line">{data.question_steps[q.key]}</Badge>
                  </div>
                  {q.options ? (
                    <div className="mt-3 space-y-1">
                      {q.options.map((o) => (
                        <div key={o.letter} className={cn('flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm', o.correct ? 'bg-firuza-50 text-firuza-700' : 'text-ink-2')}>
                          <span className={cn('grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold', o.correct ? 'bg-firuza-500 text-white' : 'ring-1 ring-line-strong text-mute')}>{o.letter}</span>
                          <span className="flex-1">{o.text}</span>
                          {o.error && <span className="shrink-0 rounded bg-terra-50 px-1.5 text-[10.5px] text-terra-600" title={data.errors[o.error]}>{ERROR_SHORT[o.error] ?? o.error}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <div className="flex gap-1">{String(q.answer).split('').map((ch, k) => <span key={k} className="num grid h-8 w-7 place-items-center rounded-md bg-firuza-50 text-firuza-700 ring-1 ring-firuza-200">{ch}</span>)}</div>
                      <span className="text-mute">{q.unit} · son panjarasi</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

