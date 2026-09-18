import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Building2, ClipboardList, Eye, FileCheck2, LineChart, ShieldCheck, TriangleAlert, TrendingUp, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { DirectorPanel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-context'
import { Card, CardHeader, ErrorState, PageHeader, PageSkeleton, Stat } from '@/components/ui'
import ImpactPanel from '@/components/ImpactPanel'

const heat = (v: number) => (v < 50 ? 'bg-terra-100 text-terra-600' : v < 75 ? 'bg-oltin-100 text-oltin-600' : 'bg-firuza-100 text-firuza-700')
const LINE_COLORS = ['#0A8A91', '#23328C', '#C4572E', '#D9A21B', '#3444A8']

export default function Director() {
  const { data, error, isLoading } = useQuery({ queryKey: ['director'], queryFn: api.director })
  const { setClassId } = useSession()
  const navigate = useNavigate()
  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />
  const s = data.school

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`Direktor · o'quv ishlari bo'yicha o'rinbosar · chorak ${s.quarter_start} dan, ${s.weeks}-hafta`} title="Maktab paneli"
        subtitle="Sinflar kesimida o'zlashtirish, formativ baholash rejasi, e'tibor qamrovi va DarsPilot'dan foydalanish. Faqat agregat ko'rsatkichlar — o'quvchi ismlari ko'rinmaydi." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Users} label="O'quvchilar" value={s.students} hint={`${s.classes} sinf · ${s.teachers} o'qituvchi`} />
        <Stat icon={TrendingUp} label="O'rtacha o'zlashtirish" value={s.avg} suffix="%" tone="indigo" hint="5 ko'nikma bo'yicha" />
        <Stat icon={FileCheck2} label="Formativ baholash" value={s.formative} tone="oltin" hint="Chorak boshidan, barcha sinflar" />
        <Stat icon={TriangleAlert} label="E'tibordan chetda" value={s.neglected} tone="terra" hint={`${data.gap_alert}+ dars e'tiborsiz o'quvchilar`} />
      </div>

      <ImpactPanel />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={LineChart} title="Diagnostika natijalari dinamikasi" hint="Har sinf bo'yicha o'rtacha foiz, chorak boshidan" />
          <div className="p-5"><TrendChart data={data} /></div>
        </Card>
        <Card>
          <CardHeader icon={TriangleAlert} title="Diqqat talab qiladi" hint="Avtomatik ogohlantirishlar" />
          <div className="space-y-2 p-5 pt-3">
            {data.alerts.length === 0 && <p className="text-sm text-firuza-600">Ogohlantirish yo'q.</p>}
            {data.alerts.map((a) => <div key={a} className="flex gap-2 rounded-xl bg-terra-50 p-3 text-[13px] text-ink ring-1 ring-terra-100"><TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-terra-500" />{a}</div>)}
            <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-[13px] leading-relaxed text-indigo-700 ring-1 ring-indigo-100">{data.insight}</div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader icon={Building2} title="Sinflar kesimi" hint="Qatorni bosing — sinf xaritasi (o'qish rejimi)" />
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="text-left text-xs text-mute">
                <th className="py-2 pr-3 font-medium">Sinf</th>
                {data.skills.map((k) => <th key={k.key} className="px-1 py-2 text-center font-medium">{k.name.split(' (')[0]}</th>)}
                <th className="px-2 py-2 text-center font-medium">O'rtacha</th>
                <th className="px-2 py-2 font-medium">Formativ reja</th>
                <th className="px-2 py-2 font-medium">E'tibor qamrovi</th>
                <th className="px-2 py-2 text-center font-medium">{data.gap_alert}+ dars</th>
                <th className="px-2 py-2 text-center font-medium">Ssenariy bilan</th>
                <th className="px-2 py-2 text-center font-medium">Ota-ona roziligi</th>
              </tr>
            </thead>
            <tbody>
              {data.classes.map((c) => {
                const formPct = Math.min(100, (100 * c.formative) / Math.max(1, c.formative_expected))
                return (
                  <tr key={c.id} onClick={() => { setClassId(c.id); navigate('/sinf') }} className="group cursor-pointer border-t border-line">
                    <td className="py-2.5 pr-3 group-hover:bg-firuza-50/50">
                      <div className="flex items-center gap-2.5">
                        <span className="num grid h-8 w-11 place-items-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">{c.name}</span>
                        <div className="leading-tight whitespace-nowrap"><div className="text-[13px] text-ink">{c.students} o'quvchi</div><div className="text-[11px] text-mute">{c.teacher?.split(' ')[0]} · {c.lessons_quarter} dars</div></div>
                      </div>
                    </td>
                    {data.skills.map((k) => <td key={k.key} className="p-1 group-hover:bg-firuza-50/50"><div className={cn('num grid h-8 place-items-center rounded-lg text-xs font-semibold', heat(c.skills[k.key]))}>{c.skills[k.key]}</div></td>)}
                    <td className="num px-2 text-center font-semibold text-ink group-hover:bg-firuza-50/50">{c.avg}%</td>
                    <td className="px-2 group-hover:bg-firuza-50/50">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sunken"><div className={cn('h-full rounded-full', formPct >= 100 ? 'bg-firuza-500' : 'bg-oltin-500')} style={{ width: `${formPct}%` }} /></div>
                        <span className="num text-xs whitespace-nowrap text-ink-2">{c.formative} / {c.formative_expected}</span>
                      </div>
                    </td>
                    <td className="px-2 group-hover:bg-firuza-50/50">
                      <div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-firuza-500" style={{ width: `${c.coverage}%` }} /></div><span className="num text-xs">{c.coverage}%</span></div>
                    </td>
                    <td className={cn('num px-2 text-center font-semibold group-hover:bg-firuza-50/50', c.neglected ? 'text-terra-500' : 'text-firuza-600')}>{c.neglected}</td>
                    <td className="num px-2 text-center text-ink-2 group-hover:bg-firuza-50/50">{c.plan_share == null ? '—' : `${c.plan_share}%`}</td>
                    <td className="num px-2 text-center text-ink-2 group-hover:bg-firuza-50/50">{c.consent}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Note icon={ClipboardList} title="Formativ reja" text="Chorakda kamida 4 ta formativ baholash (Vazirlik talabi). DarsPilot'da har qog'ozli diagnostika — bitta formativ baholash, Excel orqali jurnalga." />
        <Note icon={Eye} title="E'tibor qamrovi" text={`Oxirgi ${data.gap_alert} darsda nomli topshiriq olgan o'quvchilar ulushi. 100% ga yaqin — hech kim chetda qolmayapti.`} />
        <Note icon={ShieldCheck} title="Maxfiylik" text="Direktor sinf va ko'nikma darajasidagi agregatlarni ko'radi. O'quvchi darajasidagi ma'lumot faqat o'qituvchi va ota-onada." />
      </div>
    </div>
  )
}

function TrendChart({ data }: { data: DirectorPanel }) {
  const W = 640, H = 220, P = { l: 34, r: 12, t: 12, b: 28 }
  const dates = [...new Set(data.trend.flatMap((t) => t.points.map((p) => p.date)))].sort((a, b) => {
    const [da, ma] = a.split('.').map(Number), [db, mb] = b.split('.').map(Number)
    return ma - mb || da - db
  })
  if (dates.length === 0) return <p className="text-sm text-mute">Chorakda hali baholangan diagnostika yo'q.</p>
  const x = (d: string) => P.l + (dates.length === 1 ? (W - P.l - P.r) / 2 : (dates.indexOf(d) / (dates.length - 1)) * (W - P.l - P.r))
  const y = (v: number) => P.t + (1 - v / 100) * (H - P.t - P.b)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#E2E9EA" strokeDasharray={v === 50 || v === 75 ? '0' : '3 4'} />
            <text x={P.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#97A5AB">{v}</text>
          </g>
        ))}
        {dates.map((d) => <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="10" fill="#66767E">{d}</text>)}
        {data.trend.map((t, i) => {
          const pts = t.points.map((p) => [x(p.date), y(p.avg)] as const)
          const color = LINE_COLORS[i % LINE_COLORS.length]
          return (
            <g key={t.class}>
              {pts.length > 1 && (
                <motion.polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: i * 0.1 }} />
              )}
              {pts.map(([px, py], k) => <motion.circle key={k} cx={px} cy={py} r="5" fill="#fff" stroke={color} strokeWidth="2.5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.1 + k * 0.05 }} />)}
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-2">
        {data.trend.map((t, i) => (
          <span key={t.class} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />{t.class}
            {t.points.length > 0 && <span className="num text-mute">{t.points[t.points.length - 1].avg}%</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

function Note({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon className="size-4 text-firuza-600" />{title}</div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-mute">{text}</p>
    </div>
  )
}
