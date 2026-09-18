import { Link, useParams } from 'react-router'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, GraduationCap, Heart, History, Radar, Send, TriangleAlert, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { LEVEL_NAMES, cn, initials, levelFor } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Badge, Bar, Button, Card, CardHeader, ErrorState, MaketNote, PageSkeleton, Ring } from '@/components/ui'
import { starPoints } from '@/lib/brand'

export default function Student() {
  const id = Number(useParams().id)
  const { data, error, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => api.student(id) })
  const report = useQuery({ queryKey: ['parent-report', id], queryFn: () => api.parentReport(id) })
  const ai = useAi()
  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />
  const alert = data.gap >= data.gap_alert
  const level = levelFor(data.avg)

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6">
        <div className="girih pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.12] [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="num grid size-20 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-2xl font-semibold text-white">{initials(data.name)}</div>
          <div className="flex-1">
            <div className="eyebrow">O'quvchi profili · №{data.journal_no}</div>
            <h1 className="mt-1 font-display text-[28px] font-semibold tracking-tight text-ink">{data.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-sunken text-ink-2 ring-line">{data.code}</Badge>
              <Badge className="bg-indigo-50 text-indigo-600 ring-indigo-100">{level} · {LEVEL_NAMES[level]}</Badge>
              {alert ? <Badge className="bg-terra-50 text-terra-600 ring-terra-100"><TriangleAlert className="size-3" />{data.gap} darsdan beri e'tiborsiz</Badge>
                : <Badge className="bg-firuza-50 text-firuza-700 ring-firuza-200">{data.gap === 0 ? 'Bugun ishlangan' : `${data.gap} dars oldin ishlangan`}</Badge>}
            </div>
          </div>
          <Ring value={data.avg * 100} size={92} stroke={8} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader icon={Radar} title="Ko'nikmalar xaritasi" hint="Har diagnostikadan keyin yangilanadi" />
            <div className="p-5">
              <RadarChart skills={data.skills.map((s) => ({ name: s.name, v: s.score ?? 0 }))} />
              <div className="mt-4 space-y-3">
                {data.skills.map((s) => (
                  <div key={s.key}>
                    <div className="mb-1 flex justify-between text-sm"><span className="text-ink-2">{s.name}</span><span className="num text-ink">{s.score == null ? '—' : `${Math.round(s.score * 100)}%`}</span></div>
                    <Bar value={(s.score ?? 0) * 100} />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={Heart} title="Ota-ona hisoboti" hint="Telegram xabari ko'rinishida" />
            <div className="space-y-3 p-5">
              {report.data ? (
                <>
                  <div className="rounded-2xl bg-[#E6EEF2] p-3">
                    <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line text-ink shadow-card">{report.data.text}</div>
                  </div>
                  <MaketNote>{report.data.consent ? 'Ota-ona rozilik bergan.' : "Ota-ona hali rozilik bermagan — avval kabinet havolasi yuboriladi."} Telegram bot ulanishi — pilot bosqichida.</MaketNote>
                  <Link to={`/ota-ona/${report.data.token}`} className="block text-center text-[13px] font-medium text-firuza-700 hover:underline">Ota-ona kabinetini ko'rish</Link>
                  <Button icon={Send} className="w-full" onClick={() => ai.toast("Maket: rozilik olingach xabar Telegram orqali yuboriladi")}>Telegram orqali yuborish</Button>
                </>
              ) : <div className="skeleton h-40" />}
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-3">
          <Card>
            <CardHeader icon={History} title="Diagnostikalar tarixi" hint="Bosqichli tashxis va shaxsiy feedback" />
            <div className="space-y-4 p-5">
              {data.history.length === 0 && <p className="text-sm text-mute">Hali diagnostika topshirmagan.</p>}
              {data.history.map((h) => (
                <div key={h.diagnostic_id} className="rounded-xl p-4 ring-1 ring-line">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><div className="font-medium text-ink">{h.title}</div><div className="text-xs text-mute">{h.date} · {h.level} varianti</div></div>
                    <div className="num text-xl font-semibold text-indigo-600">{h.correct}/{h.total}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {h.steps.map((s, i) => <span key={i} className={cn('rounded-md px-2 py-1 text-[11px] font-medium', s.ok ? 'bg-firuza-50 text-firuza-700' : 'bg-terra-50 text-terra-600')}>{s.step}</span>)}
                  </div>
                  <div className="mt-2 text-sm text-mute">{h.primary_text}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Fb icon={GraduationCap} label="O'quvchiga" text={h.feedback.student} />
                    <Fb icon={Heart} label="Ota-onaga" text={h.feedback.parent} />
                    <Fb icon={UserCheck} label="O'qituvchiga" text={h.feedback.teacher} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader icon={CalendarDays} title="E'tibor tarixi" hint="O'qituvchi nomli topshiriq bergan darslar" />
            <div className="flex flex-wrap gap-2 p-5">
              {data.attention.length === 0 && <p className="text-sm text-terra-600">Hali birorta darsda alohida e'tibor olmagan.</p>}
              {data.attention.map((a, i) => <span key={i} className="rounded-lg bg-sunken px-2.5 py-1.5 text-xs text-ink-2 ring-1 ring-line">{a.date}{a.topic ? ` · ${a.topic}` : ''}</span>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Fb({ icon: Icon, label, text }: { icon: typeof Heart; label: string; text: string }) {
  return (
    <div className="rounded-lg bg-sunken p-3 text-xs ring-1 ring-line">
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-indigo-600"><Icon className="size-3" />{label}</div>
      <div className="leading-relaxed text-ink">{text}</div>
    </div>
  )
}

function RadarChart({ skills }: { skills: { name: string; v: number }[] }) {
  const size = 260, c = size / 2, R = 92
  const n = skills.length
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    return [c + Math.cos(a) * r, c + Math.sin(a) * r]
  }
  const poly = skills.map((s, i) => pt(i, R * Math.max(0.04, s.v)).join(',')).join(' ')
  return (
    <svg viewBox={`-50 -6 ${size + 100} ${size + 12}`} className="mx-auto w-full max-w-[360px]">
      <polygon points={starPoints(c, c, 26)} fill="#EAF6F6" />
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={skills.map((_, i) => pt(i, R * k).join(',')).join(' ')} fill="none" stroke="#E2E9EA" />)}
      {skills.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#E2E9EA" /> })}
      <motion.polygon points={poly} fill="rgba(10,138,145,0.18)" stroke="#0A8A91" strokeWidth="2" strokeLinejoin="round"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} style={{ transformOrigin: `${c}px ${c}px` }} />
      {skills.map((s, i) => { const [x, y] = pt(i, R * Math.max(0.04, s.v)); return <circle key={i} cx={x} cy={y} r="3.5" fill="#23328C" /> })}
      {skills.map((s, i) => { const [x, y] = pt(i, R + 22); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#66767E" fontSize="10">{s.name.split(' (')[0]}</text> })}
    </svg>
  )
}
