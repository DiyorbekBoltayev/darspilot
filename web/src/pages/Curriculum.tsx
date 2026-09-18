import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, BookOpen, CalendarRange, ClipboardList, FileUp, Library, NotebookPen, RotateCcw, ScanLine, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import type { CurriculumTopic } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { useSession } from '@/components/session-context'
import { Badge, Button, Card, CardHeader, ErrorState, Modal, PageHeader, PageSkeleton } from '@/components/ui'

const QUARTERS = ['I chorak', 'II chorak', 'III chorak', 'IV chorak']

export default function Curriculum() {
  const { classId } = useSession()
  const { data, error, isLoading } = useQuery({ queryKey: ['curriculum', classId], queryFn: () => api.curriculum(classId), enabled: classId != null })
  const [preview, setPreview] = useState<{ topics: CurriculumTopic[]; source: string } | null>(null)
  const [quarter, setQuarter] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ai = useAi()
  const qc = useQueryClient()
  const imp = useMutation({ mutationFn: (f: File) => api.importCurriculum(f), onSuccess: (r) => setPreview(r), onError: (e) => ai.toast(e.message, 'bad') })
  const reset = useMutation({
    mutationFn: () => api.resetCurriculum(classId),
    onSuccess: (r) => {
      qc.setQueryData(['curriculum', classId], r)
      qc.invalidateQueries({ queryKey: ['class-lessons'] })
      qc.invalidateQueries({ queryKey: ['today'] })
      ai.toast('Standart reja tiklandi')
    },
  })

  const current = data?.calendar.current_quarter ?? 1
  const shown = quarter ?? current
  const groups = useMemo(() => {
    const out: { chapter: string; topics: CurriculumTopic[] }[] = []
    for (const t of data?.topics ?? []) {
      if ((t.quarter ?? 1) !== shown) continue
      const title = t.chapter_title ? `${t.chapter}. ${t.chapter_title}` : 'Mavzular'
      const last = out[out.length - 1]
      if (last && last.chapter === title) last.topics.push(t)
      else out.push({ chapter: title, topics: [t] })
    }
    return out
  }, [data, shown])

  if (isLoading || !data) return error ? <ErrorState error={error} /> : <PageSkeleton />
  const skillName = Object.fromEntries(data.skills.map((s) => [s.key, s.name]))
  const uploaded = data.topics.some((t) => t.source === 'yuklangan')
  const cal = data.calendar
  const hours = data.topics.reduce((a, t) => a + t.hours, 0)

  return (
    <div>
      <PageHeader eyebrow={`${data.class} sinf · ${cal.year} o'quv yili`} title="O'quv dasturi"
        subtitle={`${cal.source.plan}. Sana ustuni rejada bo'sh bo'lgani uchun har bir dars sinf jadvalidan hisoblanadi: mavzu, darslik va mashq daftari betlari shu tartibda konveyerga tushadi.`}
        actions={<>
          {uploaded && <Button variant="ghost" icon={RotateCcw} loading={reset.isPending} onClick={() => reset.mutate()}>Standart reja</Button>}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.txt,.csv" hidden onChange={(e) => { if (e.target.files?.[0]) imp.mutate(e.target.files[0]); e.target.value = '' }} />
          <Button variant="primary" icon={FileUp} loading={imp.isPending} onClick={() => fileRef.current?.click()}>O'z rejasini yuklash</Button>
        </>} />

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={CalendarRange} title="O'quv yili kalendari" hint={`${hours} soat · haftasiga 5 soat · ${data.topics.length} ta mavzu qatori`} />
          <div className="grid grid-cols-2 gap-2 p-5 pt-3 sm:grid-cols-4">
            {cal.quarters.map((q) => (
              <button key={q.no} onClick={() => setQuarter(q.no)}
                className={cn('rounded-xl p-3 text-left ring-1 transition-colors',
                  shown === q.no ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-surface ring-line hover:ring-line-strong')}>
                <div className={cn('text-[12.5px] font-semibold', shown === q.no ? 'text-white' : 'text-ink')}>{QUARTERS[q.no - 1]}{q.no === current ? ' · hozir' : ''}</div>
                <div className={cn('num mt-1 text-[11.5px]', shown === q.no ? 'text-indigo-100' : 'text-mute')}>{q.start.slice(0, 5)} – {q.end.slice(0, 5)}</div>
                <div className={cn('num text-[11px]', shown === q.no ? 'text-indigo-200' : 'text-faint')}>{q.lessons}-darslar</div>
              </button>
            ))}
          </div>
          <div className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-mute">
            Ta'til: {cal.breaks.map((b) => `${b.start.slice(0, 5)}–${b.end.slice(0, 5)}`).join(' · ')} · Bayramlar: {cal.holidays.map((h) => h.date.slice(0, 5)).join(', ')}.
            <span className="text-faint"> {cal.source.note}</span>
          </div>
        </Card>
        <Card>
          <CardHeader icon={BookOpen} title="Manba" hint="Reja va darsliklar" />
          <div className="space-y-2.5 p-5 pt-3 text-[13px] leading-relaxed">
            <div className="flex gap-2"><BookOpen className="mt-0.5 size-4 shrink-0 text-indigo-600" /><span className="text-ink">{cal.source.textbook}</span></div>
            <div className="flex gap-2"><NotebookPen className="mt-0.5 size-4 shrink-0 text-firuza-600" /><span className="text-ink">{cal.source.workbook}</span></div>
            <div className="flex gap-2"><ClipboardList className="mt-0.5 size-4 shrink-0 text-terra-500" /><span className="text-mute">BSB — bo'lim bo'yicha, ChSB — chorak bo'yicha summativ baholash (50 + 40 ball).</span></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={Library} title={`${QUARTERS[shown - 1]} mavzulari`} hint="Mavzu → soat → darslik va mashq daftari betlari" />
          <div className="p-5">
            {groups.map((g) => (
              <div key={g.chapter} className="mb-5 last:mb-0">
                <div className="mb-2 text-xs font-semibold tracking-wide text-mute uppercase">{g.chapter}</div>
                <div className="overflow-hidden rounded-xl ring-1 ring-line">
                  {g.topics.map((t) => {
                    const assessment = t.kind === 'bsb' || t.kind === 'chsb'
                    return (
                      <div key={t.id} className={cn('flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0 sm:flex-row sm:items-center',
                        assessment ? 'bg-terra-50/50' : t.id === data.current_topic_id ? 'bg-firuza-50/60' : 'bg-surface')}>
                        <span className="num w-16 shrink-0 text-xs text-faint">{t.lesson_no}{t.hours > 1 ? `–${(t.lesson_no ?? 0) + t.hours - 1}` : ''}-dars</span>
                        <div className="min-w-0 flex-1">
                          <div className={cn('text-sm font-medium', assessment ? 'text-terra-600' : 'text-ink')}>{t.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {t.textbook && <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] text-ink-2">darslik {t.textbook}</span>}
                            {t.workbook && <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] text-ink-2">mashq daftari {t.workbook}</span>}
                            {t.skills.map((k) => <span key={k} className="rounded-md bg-firuza-50 px-1.5 py-0.5 text-[11px] text-firuza-700">{skillName[k]}</span>)}
                          </div>
                        </div>
                        <span className="num shrink-0 text-xs text-mute">{t.hours} soat</span>
                        {t.passed && <Badge className="bg-indigo-50 text-indigo-600 ring-indigo-100">o'tildi</Badge>}
                        {assessment
                          ? <Badge className="bg-terra-500 text-white ring-terra-500"><ClipboardList className="size-3" />{t.points} ball</Badge>
                          : t.template
                            ? <Link to="/darslar"><Badge className="bg-firuza-500 text-white ring-firuza-500"><ScanLine className="size-3" />Diagnostika bor</Badge></Link>
                            : <Badge className="bg-sunken text-mute ring-line">tezkor tekshiruv</Badge>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={Sparkles} title="Ko'nikmalar xaritasi" hint="Mavzu → ko'nikma → tayanch ko'nikma" />
            <div className="space-y-3 p-5">
              {data.skills.map((s) => {
                const topics = data.topics.filter((t) => t.skills.includes(s.key))
                const needs = data.topics.filter((t) => t.prerequisites.includes(s.key))
                return (
                  <div key={s.key} className="rounded-xl p-3 ring-1 ring-line">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-ink">{s.name}</span><span className="num text-xs text-mute">{topics.length} mavzu</span></div>
                    <div className="mt-2 flex h-1.5 gap-px">{data.topics.map((t, i) => <span key={i} className={cn('flex-1 rounded-full', t.skills.includes(s.key) ? 'bg-firuza-500' : t.prerequisites.includes(s.key) ? 'bg-indigo-300' : 'bg-line')} />)}</div>
                    {needs.length > 0 && <div className="mt-2 text-xs text-mute">Tayanch bo'ladi: {needs.length} ta mavzu uchun</div>}
                  </div>
                )
              })}
            </div>
          </Card>
          <Card className="p-5 text-[13px] leading-relaxed text-mute">
            <div className="mb-1 font-semibold text-ink">Qanday ishlaydi</div>
            Standart reja — Vazirlik tavsiya etgan darslik bo'yicha yillik taqvim-mavzu reja. O'zingizning rejangizni (PDF, DOCX, XLSX)
            yuklasangiz, AI uni mavzularga ajratadi, siz tasdiqlaysiz va darslar shu reja bo'yicha qayta taqsimlanadi.
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {preview && <ImportPreview preview={preview} classId={classId} skills={data.skills} onClose={() => setPreview(null)}
          onConfirm={(r) => {
            qc.setQueryData(['curriculum', classId], r)
            qc.invalidateQueries({ queryKey: ['class-lessons'] })
            qc.invalidateQueries({ queryKey: ['today'] })
            setPreview(null)
            ai.toast(`${r.topics.length} ta mavzu saqlandi, darslarga taqsimlandi`)
          }} />}
      </AnimatePresence>
    </div>
  )
}

function ImportPreview({ preview, classId, skills, onClose, onConfirm }: {
  preview: { topics: CurriculumTopic[]; source: string }; classId: number | null; skills: { key: string; name: string }[]; onClose: () => void; onConfirm: (r: Awaited<ReturnType<typeof api.confirmCurriculum>>) => void
}) {
  const [topics, setTopics] = useState(preview.topics)
  const ai = useAi()
  const confirm = useMutation({ mutationFn: () => api.confirmCurriculum(topics, classId), onSuccess: onConfirm, onError: (e) => ai.toast(e.message, 'bad') })
  const skillName = Object.fromEntries(skills.map((s) => [s.key, s.name]))
  return (
    <Modal wide title={`${topics.length} ta mavzu topildi`} subtitle={preview.source === 'gpt' ? "AI mavzularga ajratdi — tekshirib, keraksizini olib tashlang" : "Qatorlar bo'yicha ajratildi — tekshirib chiqing"} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" icon={BadgeCheck} disabled={!topics.length} loading={confirm.isPending} onClick={() => confirm.mutate()}>Tasdiqlash</Button></>}>
      <div className="space-y-2">
        {topics.map((t, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-line">
            <span className="num w-6 pt-2 text-xs text-faint">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <input value={t.title} onChange={(e) => setTopics((ts) => ts.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="h-9 w-full rounded-lg px-2 text-sm ring-1 ring-line outline-none focus:ring-firuza-500" />
              <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
                {t.week != null && <span className="rounded bg-sunken px-1.5 py-0.5 text-ink-2">{t.week}-hafta</span>}
                <span className="rounded bg-sunken px-1.5 py-0.5 text-ink-2">{t.hours} soat</span>
                {t.skills.map((k) => <span key={k} className="rounded bg-firuza-50 px-1.5 py-0.5 text-firuza-700">{skillName[k]}</span>)}
              </div>
            </div>
            <button onClick={() => setTopics((ts) => ts.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-xs text-terra-600 hover:bg-terra-50">olib tashlash</button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
