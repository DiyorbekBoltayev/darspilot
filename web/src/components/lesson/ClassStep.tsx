import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleCheck, FileText, Flag, Hand, Presentation, TriangleAlert, UserCheck, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonDetail } from '@/lib/types'
import { ROLE_LABEL, cn, initials } from '@/lib/utils'
import { ROLE_STYLE, STAGE_COLORS, STAGE_SHORT } from '@/lib/conveyor'
import { useAi } from '@/components/ai-context'
import { Badge, Button, Card, CardHeader, Empty, LinkButton } from '@/components/ui'
import VoiceAttention from './VoiceAttention'
import { useLessonRefresh } from './use-refresh'

export default function ClassStep({ lesson, onNext, onBack }: { lesson: LessonDetail; onNext: () => void; onBack: () => void }) {
  const plan = lesson.plan
  const [active, setActive] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const ai = useAi()
  const refresh = useLessonRefresh(lesson.id)
  const roster = useQuery({ queryKey: ['attention', lesson.id], queryFn: () => api.lessonAttention(lesson.id) })
  const toggle = useMutation({
    mutationFn: ({ code, on }: { code: string; on: boolean }) => api.toggleAttention(code, on, lesson.id),
    onSuccess: () => refresh(),
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  const conduct = useMutation({
    mutationFn: () => api.conduct(lesson.id),
    onSuccess: (d) => { refresh(d); ai.toast("Dars yakunlandi — endi tekshiruv natijasini kiriting"); onNext() },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  if (!plan) {
    return <Card><Empty icon={Presentation} title="Avval ssenariy kerak" text="Darsda ekranda bosqichma-bosqich ko'rsatma va nomli topshiriqlar chiqadi. Ssenariyni «Tayyorlash» qadamida tuzing."
      action={<Button variant="primary" icon={ArrowLeft} onClick={onBack}>Tayyorlashga qaytish</Button>} /></Card>
  }

  const stage = plan.stages[active]
  const attended = new Set(roster.data?.students.filter((s) => s.today).map((s) => s.code) ?? lesson.attended.map((a) => a.code))
  const students = roster.data?.students ?? []
  const neglected = students.filter((s) => s.gap >= lesson.gap_alert && !s.today).sort((a, b) => b.gap - a.gap)
  const stageEnd = plan.stages.slice(0, active + 1).reduce((a, s) => a + s.minutes, 0)

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <div className="card p-2 sm:overflow-x-auto">
          <div className="grid grid-cols-4 gap-1 sm:min-w-[720px] sm:grid-cols-8">
            {plan.stages.map((s, i) => (
              <button key={s.key} onClick={() => setActive(i)} style={{ background: i === active ? STAGE_COLORS[i] : undefined }}
                className={cn('min-w-0 rounded-lg px-2.5 py-2 text-left transition-colors', i === active ? 'text-white' : i < active ? 'bg-sunken text-mute' : 'text-ink-2 hover:bg-sunken')}>
                <div className="num text-[10.5px] opacity-80">{i + 1} · {s.minutes}′</div>
                <div className="truncate text-[12px] font-semibold">{s.key === 'diagnostika' ? (lesson.diagnostic_day ? 'Diagnostika' : 'Tekshiruv') : STAGE_SHORT[i]}</div>
              </button>
            ))}
          </div>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="num text-xs text-mute">{stageEnd - stage.minutes}′ – {stageEnd}′ · {active + 1}/{plan.stages.length}</div>
              <h2 className="mt-1 font-display text-[22px] leading-tight font-semibold text-ink">{stage.name}</h2>
            </div>
            <div className="rounded-xl bg-sunken px-3 py-2 text-right ring-1 ring-line">
              <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-indigo-600"><BookOpen className="size-3.5" />{stage.method.name}</div>
              <div className="text-[11px] text-mute">{stage.method.form}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Big icon={UserCheck} title="Siz" items={stage.teacher} />
            <Big icon={Users} title="O'quvchilar" items={stage.students} />
          </div>

          {stage.targeted.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold tracking-wide text-mute uppercase">Nomli topshiriqlar</div>
              {stage.targeted.map((t) => {
                const done = attended.has(t.code)
                const alert = plan.alerts.find((a) => a.code === t.code)
                return (
                  <div key={t.code} className={cn('flex flex-wrap items-center gap-3 rounded-xl p-3 ring-1 sm:flex-nowrap', done ? 'bg-firuza-50 ring-firuza-200' : alert?.mandatory ? 'bg-terra-50 ring-terra-100' : 'bg-surface ring-line')}>
                    <div className={cn('grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold text-white', done ? 'bg-firuza-500' : alert?.mandatory ? 'bg-terra-500' : 'bg-indigo-600')}>{initials(t.name)}</div>
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">{t.name}
                        {alert?.mandatory && <Badge className="bg-surface text-terra-600 ring-terra-100"><TriangleAlert className="size-3" />{alert.gap} dars</Badge>}
                      </div>
                      <div className="mt-0.5 text-[14px] text-ink-2">{t.task}</div>
                    </div>
                    <button onClick={() => toggle.mutate({ code: t.code, on: !done })}
                      className={cn('ml-auto inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 transition-colors',
                        done ? 'bg-firuza-500 text-white ring-firuza-500' : 'bg-surface text-ink-2 ring-line-strong hover:ring-firuza-300')}>
                      <Check className="size-4" />{done ? 'Ishlandi' : 'Ishladim'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {stage.key === 'mustahkamlash' && plan.groups.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold tracking-wide text-mute uppercase">Guruhlar (saqlangan tarkib)</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {plan.groups.map((g) => (
                  <div key={g.n} className="rounded-xl p-3 ring-1 ring-line">
                    <div className="text-sm font-semibold text-indigo-600">{g.n}-guruh</div>
                    {g.members.map((m) => (
                      <div key={m.code} className="mt-1 flex items-center gap-2 text-[13px]">
                        <span className="flex-1 truncate text-ink">{m.name}</span>
                        {m.role !== "a'zo" && <Badge className={ROLE_STYLE[m.role]}>{ROLE_LABEL[m.role]}</Badge>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === 'diagnostika' && lesson.diagnostic_day && lesson.diagnostic && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700 ring-1 ring-indigo-100">
              <FileText className="size-4" /><span className="flex-1">Kartochkalarni tarqating — har birida o'quvchining ismi va variant yozilgan.</span>
              <LinkButton href={lesson.diagnostic.pdf.varaqlar} className="h-8 text-xs">Kartochkalar PDF</LinkButton>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <Button variant="ghost" icon={ArrowLeft} disabled={active === 0} onClick={() => setActive((a) => a - 1)}>Oldingi</Button>
            {active < plan.stages.length - 1
              ? <Button variant="indigo" onClick={() => setActive((a) => a + 1)}>Keyingi bosqich <ArrowRight className="size-4" /></Button>
              : <Button variant="primary" icon={Flag} loading={conduct.isPending} disabled={lesson.when === 'kelgusi'} onClick={() => (lesson.conducted ? onNext() : conduct.mutate())}>{lesson.conducted ? 'Tekshirishga o\'tish' : 'Darsni yakunlash'}</Button>}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <VoiceAttention lessonId={lesson.id} onMarked={() => refresh()} />

        <Card>
          <CardHeader icon={Hand} title="Bugun e'tibor berildi" hint={`${lesson.gap_alert}+ dars e'tiborsizlar terrakota`}
            action={<span className="num text-2xl font-semibold text-indigo-600">{attended.size}<span className="text-sm text-faint">/{lesson.students}</span></span>} />
          <div className="p-5 pt-3">
            {neglected.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {neglected.map((s) => (
                  <button key={s.id} onClick={() => toggle.mutate({ code: s.code, on: true })}
                    className="inline-flex items-center gap-1 rounded-lg bg-terra-50 px-2 py-1 text-[12.5px] text-ink ring-1 ring-terra-100 hover:ring-terra-300">
                    {s.name.split(' ')[0]} <span className="num text-[11px] font-semibold text-terra-500">{s.gap}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {students.filter((s) => s.today).map((s) => (
                <button key={s.id} onClick={() => toggle.mutate({ code: s.code, on: false })} className="inline-flex items-center gap-1 rounded-lg bg-firuza-500 px-2 py-1 text-[12.5px] text-white">
                  <Check className="size-3" />{s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.
                </button>
              ))}
            </div>
            <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-[12.5px] text-firuza-700 hover:underline">{showAll ? 'Ro\'yxatni yopish' : 'Butun sinf ro\'yxati'}</button>
            {showAll && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {students.map((s) => (
                  <button key={s.id} onClick={() => toggle.mutate({ code: s.code, on: !s.today })}
                    className={cn('flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12.5px] ring-1',
                      s.today ? 'bg-firuza-500 text-white ring-firuza-500' : s.gap >= lesson.gap_alert ? 'bg-terra-50 text-ink ring-terra-100' : 'bg-surface text-ink ring-line')}>
                    <span className="truncate">{s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.</span>
                    {s.today ? <Check className="size-3.5" /> : <span className="num text-[11px] text-mute">{s.gap}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          {lesson.conducted ? (
            <div className="flex items-center gap-3">
              <CircleCheck className="size-6 text-firuza-500" />
              <div className="flex-1 text-sm text-ink">Dars o'tkazildi</div>
              <Button variant="primary" onClick={onNext}>Tekshirish <ArrowRight className="size-4" /></Button>
            </div>
          ) : (
            <>
              <div className="text-sm text-ink-2">Dars tugagach bosing — keyin {lesson.diagnostic_day ? 'javob chiziqlarini skanerlaysiz' : 'tezkor tekshiruv natijasini kiritasiz'}.</div>
              <Button variant="primary" icon={Flag} className="mt-3 w-full" loading={conduct.isPending} disabled={lesson.when === 'kelgusi'} onClick={() => conduct.mutate()}>Darsni yakunlash</Button>
              {lesson.when === 'kelgusi' && <p className="mt-2 text-center text-xs text-faint">Kelgusi darsni hali yakunlab bo'lmaydi</p>}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function Big({ icon: Icon, title, items }: { icon: typeof Users; title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-mute uppercase"><Icon className="size-3.5" />{title}</div>
      <ul className="space-y-2">{items.map((x, k) => <li key={k} className="flex gap-2.5 text-[15.5px] leading-relaxed text-ink"><span className="mt-[9px] size-1.5 shrink-0 rotate-45 bg-firuza-500" />{x}</li>)}</ul>
    </div>
  )
}
