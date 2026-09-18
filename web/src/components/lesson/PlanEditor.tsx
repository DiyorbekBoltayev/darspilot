import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck, BookOpen, Eye, EyeOff, FileDown, Lightbulb, ListChecks, Minus, PencilLine, Plus, RefreshCw, Save, Sparkles, Target, TriangleAlert, Undo2, UserCheck, Users, X,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonPlan as Plan, PlanStage } from '@/lib/types'
import { ROLE_LABEL, cn, initials } from '@/lib/utils'
import { ROLE_STYLE, STAGE_COLORS } from '@/lib/conveyor'
import { useAi } from '@/components/ai-context'
import { Badge, Button, Card, CardHeader, LinkButton } from '@/components/ui'

const mm = (m: number) => `${String(m).padStart(2, '0')}:00`
type Draft = Record<string, { method_id?: string; minutes?: number; removed_codes: string[] }>

export default function PlanEditor({ plan: data, lessonId, onRebuild, rebuilding }: { plan: Plan; lessonId: number; onRebuild: (regroup: boolean) => void; rebuilding: boolean }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [showKey, setShowKey] = useState(false)
  const ai = useAi()
  const qc = useQueryClient()

  const save = useMutation({
    mutationFn: (body: { status?: string; stages: { key: string; method_id?: string; minutes?: number; removed_codes?: string[] }[] }) => api.editPlan(data.id, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lesson', lessonId] })
      qc.invalidateQueries({ queryKey: ['today'] })
      qc.invalidateQueries({ queryKey: ['methods'] })
      setDraft(null)
      ai.toast(vars.status === 'tasdiqlangan' ? 'Ssenariy tasdiqlandi' : "O'zgarishlar saqlandi — tanlovlaringiz keyingi ssenariylarda hisobga olinadi")
    },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  const view: PlanStage[] = useMemo(() => {
    const minutes = data.stages.map((st) => draft?.[st.key]?.minutes ?? st.minutes)
    return data.stages.map((st, i) => {
      const d = draft?.[st.key]
      const cand = d?.method_id ? st.candidates.find((c) => c.id === d.method_id) : undefined
      return {
        ...st,
        minutes: minutes[i],
        start: minutes.slice(0, i).reduce((a, b) => a + b, 0),
        method: cand ? { ...st.method, id: cand.id, name: cand.name, short: cand.short } : st.method,
        targeted: st.targeted.filter((t) => !d?.removed_codes.includes(t.code)),
      }
    })
  }, [data, draft])

  const total = view.reduce((a, s) => a + s.minutes, 0)
  const editing = draft !== null
  const patch = (key: string, p: Partial<Draft[string]>) => setDraft((d) => ({ ...d, [key]: { removed_codes: [], ...d?.[key], ...p } }))
  const submit = (status?: string) => save.mutate({ status, stages: Object.entries(draft ?? {}).map(([key, v]) => ({ key, ...v })) })
  const approved = data.status === 'tasdiqlangan'

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
              <span>Ssenariy · {data.created_at}</span>
              <Badge className={approved ? 'bg-firuza-50 text-firuza-700 ring-firuza-200' : 'bg-oltin-50 text-oltin-600 ring-oltin-100'}>{approved ? 'Tasdiqlangan' : 'Qoralama'}</Badge>
              {data.source === 'gpt' && <Badge className="bg-indigo-50 text-indigo-600 ring-indigo-100"><Sparkles className="size-3" /> AI</Badge>}
            </div>
            <div className="mt-1 text-sm text-ink-2">
              <span className={cn('font-semibold', total !== 45 ? 'text-terra-500' : 'text-ink')}>{total} daqiqa</span>
              {` · ${view.length} bosqich · ${data.alerts.length} nomli ko'rsatma${data.groups.length ? ` · ${data.groups.length} guruh` : ' · guruhsiz'}`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button variant="ghost" icon={Undo2} onClick={() => setDraft(null)}>Bekor qilish</Button>
                <Button variant="primary" icon={Save} loading={save.isPending} onClick={() => submit()}>Saqlash</Button>
              </>
            ) : (
              <>
                <Button icon={PencilLine} onClick={() => setDraft({})}>Tahrirlash</Button>
                <LinkButton href={`/api/plans/${data.id}/pdf`} icon={FileDown}>PDF</LinkButton>
                <Button variant="ghost" icon={RefreshCw} loading={rebuilding} onClick={() => onRebuild(false)}>Qayta tuzish</Button>
                {!approved && <Button variant="primary" icon={BadgeCheck} loading={save.isPending} onClick={() => save.mutate({ status: 'tasdiqlangan', stages: [] })}>Tasdiqlash</Button>}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 hidden h-12 gap-1 overflow-hidden rounded-xl sm:flex">
          {view.map((s, i) => (
            <a key={s.key} href={`#stage-${s.key}`} title={`${s.name} · ${s.minutes} daq`} style={{ flex: s.minutes, background: STAGE_COLORS[i] }}
              className="flex min-w-0 flex-col justify-center rounded-lg px-2 text-white transition-[flex] duration-300 hover:brightness-110">
              <span className="truncate text-[11px] font-semibold">{s.name}</span>
              <span className="num text-[10px] opacity-80">{s.minutes}′</span>
            </a>
          ))}
        </div>
      </Card>

      {editing && (
        <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700 ring-1 ring-indigo-100">
          <PencilLine className="size-4 shrink-0" />
          Metodni almashtiring, vaqtni o'zgartiring yoki o'quvchini olib tashlang. Tanlovlaringiz afzallik sifatida saqlanadi.
        </div>
      )}

      {data.focus?.eng_zaif_bosqich && (
        <div className="card flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-terra-50 text-terra-500 ring-1 ring-terra-100"><Target className="size-5" /></div>
          <div className="flex-1 text-sm leading-relaxed">
            <div className="text-ink-2">Oxirgi diagnostikadan: eng zaif bosqich — <b className="text-ink">{data.focus.eng_zaif_bosqich}</b> ({data.focus.togri_foiz}% to'g'ri)
              {data.focus.asosiy_xato && <>, asosiy xato — <b className="text-ink">{data.focus.asosiy_xato.toLowerCase()}</b></>}.</div>
            {data.focus.tavsiya && <div className="mt-1 font-medium text-firuza-700">{data.focus.tavsiya}</div>}
          </div>
          {data.focus.ortacha_foiz != null && <div className="text-right"><div className="num text-2xl font-semibold text-indigo-600">{data.focus.ortacha_foiz}%</div><div className="text-xs text-mute">sinf o'rtachasi</div></div>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon={Target} title="Dars maqsadi" />
          <div className="space-y-3 p-5 text-sm">
            <Goal label="Ta'limiy" text={data.goal.talimiy} />
            <Goal label="Tarbiyaviy" text={data.goal.tarbiyaviy} />
            <Goal label="Rivojlantiruvchi" text={data.goal.rivojlantiruvchi} />
            <div>
              <div className="mb-1.5 text-xs font-medium text-mute">Muvaffaqiyat mezonlari</div>
              {data.goal.mezonlar.map((m) => <div key={m} className="flex gap-2 py-0.5 text-ink-2"><ListChecks className="mt-0.5 size-3.5 shrink-0 text-firuza-500" />{m}</div>)}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader icon={TriangleAlert} title="Nomli ko'rsatmalar" hint="Ustuvorlik bali bo'yicha" />
          <div className="space-y-2 p-5">
            {data.alerts.map((a) => (
              <div key={a.code} className="flex items-center gap-3 text-sm">
                <span className={cn('size-2 rotate-45', a.mandatory ? 'bg-terra-500' : 'bg-firuza-500')} />
                <span className="flex-1 text-ink">{a.name}</span>
                <span className={cn('text-xs', a.mandatory ? 'font-semibold text-terra-500' : 'text-mute')}>{a.mandatory ? `${a.gap} dars` : a.code}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader icon={BookOpen} title="Uy vazifasi" />
          <div className="p-5 text-sm">
            <div className="text-ink">{data.homework.asosiy}</div>
            <div className="mt-3 text-xs font-medium text-mute">Tanlov bo'yicha</div>
            {data.homework.tanlov.map((t) => <div key={t} className="mt-1 text-ink-2">• {t}</div>)}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {view.map((s, i) => {
          const d = draft?.[s.key]
          const original = data.stages[i]
          return (
            <div key={s.key} id={`stage-${s.key}`} className="relative scroll-mt-24 pl-0 sm:pl-11">
              <div className="absolute top-0 bottom-0 left-[16px] w-px bg-line-strong" />
              <div className="num absolute top-4 left-0 grid size-8 place-items-center rounded-lg text-xs font-semibold text-white" style={{ background: STAGE_COLORS[i] }}>{i + 1}</div>
              <Card className={cn('p-5', editing && 'ring-1 ring-indigo-100')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="num text-xs text-mute">{mm(s.start)} – {mm(s.start + s.minutes)}</div>
                    <h3 className="mt-1 text-lg font-semibold text-ink">{s.name}</h3>
                  </div>
                  {editing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={d?.method_id ?? original.method.id} onChange={(e) => patch(s.key, { method_id: e.target.value })}
                        className="h-10 max-w-64 rounded-xl bg-surface px-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500">
                        {original.candidates.map((c) => <option key={c.id} value={c.id}>{c.name}{c.custom ? " (o'z metodim)" : ''}</option>)}
                      </select>
                      <div className="flex h-10 items-center rounded-xl ring-1 ring-line-strong">
                        <button className="grid h-full w-8 place-items-center text-mute hover:text-ink" onClick={() => patch(s.key, { minutes: Math.max(1, s.minutes - 1) })} aria-label="Kamaytirish"><Minus className="size-3.5" /></button>
                        <span className="num w-10 text-center text-sm">{s.minutes}′</span>
                        <button className="grid h-full w-8 place-items-center text-mute hover:text-ink" onClick={() => patch(s.key, { minutes: Math.min(30, s.minutes + 1) })} aria-label="Ko'paytirish"><Plus className="size-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-sunken px-3 py-2 text-right ring-1 ring-line">
                      <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-indigo-600"><BookOpen className="size-3.5" />{s.method.name}</div>
                      <div className="text-[11px] text-mute">{s.method.form} · {s.method.short}</div>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Actions icon={UserCheck} title="O'qituvchi" items={s.teacher} />
                  <Actions icon={Users} title="O'quvchilar" items={s.students} />
                </div>

                {s.targeted.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {s.targeted.map((t) => {
                      const alert = data.alerts.find((a) => a.code === t.code)
                      return (
                        <div key={t.code} className={cn('flex items-start gap-3 rounded-xl p-3 ring-1', alert?.mandatory ? 'bg-terra-50 ring-terra-100' : 'bg-firuza-50 ring-firuza-100')}>
                          <div className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold text-white', alert?.mandatory ? 'bg-terra-500' : 'bg-firuza-500')}>{initials(t.name)}</div>
                          <div className="min-w-0 flex-1 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-ink">{t.name}</span>
                              <span className="text-xs text-mute">{t.code}</span>
                              {alert?.mandatory && <Badge className="bg-surface text-terra-600 ring-terra-100"><TriangleAlert className="size-3" />{alert.gap} dars e'tiborsiz</Badge>}
                            </div>
                            <div className="mt-1 text-ink-2">{t.task}</div>
                            {t.reason && <div className="mt-1 text-xs text-mute">Sabab: {t.reason}</div>}
                          </div>
                          {editing && <Button variant="ghost" icon={X} className="h-8 px-2 text-xs" onClick={() => patch(s.key, { removed_codes: [...(d?.removed_codes ?? []), t.code] })}>Olib tashlash</Button>}
                        </div>
                      )
                    })}
                  </div>
                )}

                {!editing && (
                  <details className="mt-4 text-sm">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] text-mute hover:text-ink"><Lightbulb className="size-3.5 text-oltin-500" /> Nega aynan shu metod va uning qadamlari</summary>
                    <div className="mt-2 rounded-xl bg-sunken p-3 ring-1 ring-line">
                      <p className="text-ink-2">{s.why}</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-mute">{s.method.steps.map((x, k) => <li key={k}>{x}</li>)}</ol>
                    </div>
                  </details>
                )}
              </Card>
            </div>
          )
        })}
      </div>

      {data.groups.length > 0 && data.group_problem && (
        <GroupsCard data={data} showKey={showKey} onToggleKey={() => setShowKey((v) => !v)} onRegroup={() => onRebuild(true)} rebuilding={rebuilding} />
      )}

      {editing && (
        <div className="sticky bottom-3 z-20 mx-auto flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-surface p-2 shadow-lift ring-1 ring-line sm:w-fit sm:flex-nowrap">
          <span className="px-2 text-sm text-ink-2">Jami: <b className={cn('num', total !== 45 ? 'text-terra-500' : 'text-ink')}>{total}′</b></span>
          <Button variant="ghost" icon={Undo2} onClick={() => setDraft(null)}>Bekor qilish</Button>
          <Button variant="primary" icon={Save} loading={save.isPending} onClick={() => submit()}>Saqlash</Button>
          <Link to="/metodlar" className="hidden px-2 text-[13px] text-firuza-700 hover:underline sm:inline">O'z metodimni qo'shish</Link>
        </div>
      )}
    </div>
  )
}

function Actions({ icon: Icon, title, items }: { icon: typeof Users; title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-mute"><Icon className="size-3.5" />{title}</div>
      <ul className="space-y-1.5 text-sm">{items.map((x, k) => <li key={k} className="flex gap-2 text-ink-2"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-faint" />{x}</li>)}</ul>
    </div>
  )
}

function Goal({ label, text }: { label: string; text: string }) {
  return <div><div className="text-xs font-medium text-mute">{label}</div><div className="text-ink-2">{text}</div></div>
}

function GroupsCard({ data, showKey, onToggleKey, onRegroup, rebuilding }: { data: Plan; showKey: boolean; onToggleKey: () => void; onRegroup: () => void; rebuilding: boolean }) {
  const problem = data.group_problem!
  return (
    <Card>
      <CardHeader icon={Users} title="Guruh ishi: qiyin masalani qismlarga bo'lish"
        hint={data.groups_formed ? `Guruhlar ${data.groups_formed} da tuzildi va 2 hafta saqlanadi — har darsda qayta bo'linmaydi.` : "Saqlangan guruhlar ishlatildi — o'quvchilar o'z guruhini biladi, vaqt ketmaydi."}
        action={<div className="flex flex-wrap gap-1">
          <Button variant="ghost" icon={showKey ? EyeOff : Eye} onClick={onToggleKey} className="h-8 text-[13px]"><span className="hidden sm:inline">{showKey ? 'Kalitni yashirish' : 'Kalit'}</span><span className="sm:hidden">Kalit</span></Button>
          <Button variant="ghost" icon={RefreshCw} loading={rebuilding} onClick={onRegroup} className="h-8 text-[13px]"><span className="hidden sm:inline">Guruhlarni yangilash</span><span className="sm:hidden">Yangilash</span></Button>
        </div>} />
      <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <div className="rounded-xl bg-sunken p-4 text-sm leading-relaxed text-ink ring-1 ring-line">{problem.text}</div>
          <div className="mt-3 space-y-2">
            {problem.parts.map((p) => (
              <div key={p.id} className="flex items-start gap-3 rounded-xl p-3 text-sm ring-1 ring-line">
                <span className="num grid size-6 shrink-0 place-items-center rounded-md bg-indigo-600 text-xs font-semibold text-white">{p.id}</span>
                <div className="flex-1">
                  <div className="text-ink">{p.text}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
                    <span>{p.skill}</span>
                    <span className="flex gap-0.5">{[1, 2, 3, 4].map((k) => <span key={k} className={cn('h-1.5 w-3 rounded-full', k <= p.difficulty ? 'bg-oltin-500' : 'bg-line')} />)}</span>
                    {showKey && <span className="rounded bg-firuza-50 px-1.5 font-semibold text-firuza-700">{p.answer}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-3">
          {data.groups.map((g) => (
            <div key={g.n} className="rounded-xl p-3.5 ring-1 ring-line">
              <div className="mb-2 text-sm font-semibold text-indigo-600">{g.n}-guruh</div>
              <div className="space-y-1.5">
                {g.members.map((m) => (
                  <div key={m.code} className="flex items-center gap-2 text-sm">
                    <span className="num grid h-5 min-w-8 place-items-center rounded bg-sunken px-1 text-[11px] text-ink-2">{m.part}</span>
                    <span className="flex-1 truncate text-ink">{m.name}</span>
                    {m.role !== "a'zo" && <Badge className={ROLE_STYLE[m.role]}>{ROLE_LABEL[m.role]}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
