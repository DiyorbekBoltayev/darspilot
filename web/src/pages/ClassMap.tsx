import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, FileUp, Minus, Plus, Search, Settings2, TrendingUp, TriangleAlert, UserPlus, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { StudentRow } from '@/lib/types'
import { LEVEL_NAMES, cn, tone, toneText } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { useSession } from '@/components/session-context'
import { Button, Card, CardHeader, ErrorState, Modal, PageHeader, PageSkeleton, Stat, Tabs } from '@/components/ui'

const ClassOrbit = lazy(() => import('@/components/fx/ClassOrbit'))

type Sort = 'jurnal' | 'past' | 'etibor'

// terrakota → oltin → firuza, oq fonda o'qiladigan och tuslar
const STOPS: [number, number[]][] = [[0, [246, 221, 210]], [0.5, [246, 232, 189]], [0.75, [210, 236, 236]], [1, [169, 217, 218]]]
function cellBg(v: number | null) {
  if (v == null) return '#F2F6F6'
  const t = Math.max(0, Math.min(1, v))
  let i = 0
  while (i < STOPS.length - 2 && t > STOPS[i + 1][0]) i++
  const [t0, c0] = STOPS[i], [t1, c1] = STOPS[i + 1]
  const k = (t - t0) / (t1 - t0)
  const c = c0.map((x, j) => Math.round(x + (c1[j] - x) * k))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export default function ClassMap() {
  const { classId, role } = useSession()
  const { data, error, isLoading } = useQuery({ queryKey: ['overview', classId], queryFn: () => api.overview(classId), enabled: classId != null })
  const [sort, setSort] = useState<Sort>('jurnal')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const ai = useAi()
  const qc = useQueryClient()
  const setGap = useMutation({
    mutationFn: (n: number) => api.saveSettings(n),
    onSuccess: (r) => { qc.invalidateQueries(); ai.toast(`Ogohlantirish chegarasi: ${r.gap_alert} dars`) },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  const rows = useMemo(() => {
    if (!data) return []
    const list = data.students.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(q.toLowerCase()))
    const by: Record<Sort, (a: StudentRow, b: StudentRow) => number> = {
      jurnal: (a, b) => a.journal_no - b.journal_no, past: (a, b) => a.avg - b.avg, etibor: (a, b) => b.gap - a.gap,
    }
    return [...list].sort(by[sort])
  }, [data, sort, q])

  if (isLoading || !data) return error ? <ErrorState error={error} /> : <PageSkeleton />

  const skillAvg = data.skills.map((sk) => {
    const xs = data.students.map((s) => s.skills[sk.key]).filter((x): x is number => x != null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  })
  const levels = ['B1', 'B2', 'B3', 'B4'].map((l) => ({ l, n: data.students.filter((s) => s.level === l).length }))

  return (
    <div>
      <PageHeader
        eyebrow={`${data.class.subject} · ${data.class.grade}-sinf · o'quvchi modeli`}
        title={`${data.class.name} sinf xaritasi`}
        subtitle="Sinf orbitasi va o'quvchi × ko'nikma issiqlik xaritasi. Har diagnostika va tezkor tekshiruvdan keyin yangilanadi; oxirgi ustun — oxirgi e'tibordan beri o'tgan darslar."
        actions={role === 'teacher' ? <Button variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>O'quvchi qo'shish</Button> : undefined}
      />

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="card relative flex flex-col overflow-hidden xl:col-span-2">
          <div className="absolute inset-x-5 top-4 z-10">
            <div className="text-[13px] font-semibold text-ink">Sinf galaktikasi</div>
            <div className="hidden text-xs text-mute sm:block">Markazda o'qituvchi · qatlam = oxirgi e'tibordan beri darslar · rang = o'zlashtirish</div>
          </div>
          <div className="flex-1 bg-[radial-gradient(ellipse_at_50%_60%,#FFFFFF_0%,#F1F8F8_70%)]">
            <Suspense fallback={<div className="skeleton h-[400px] rounded-none" />}>
              <ClassOrbit key={data.class.id} students={data.students} gapAlert={data.gap_alert} className="h-[380px] sm:h-[420px] xl:h-full xl:min-h-[440px]" />
            </Suspense>
          </div>
          <div className="absolute right-5 bottom-3 left-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
            {[['#0A8A91', '75%+'], ['#D9A21B', '50–75%'], ['#C4572E', "50% dan past"]].map(([c, t]) => <span key={t} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: c }} />{t}</span>)}
            <span className="ml-auto hidden text-faint sm:inline">Sudrab aylantiring · sharni bosing — o'quvchi profili</span>
          </div>
        </section>
        <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Stat icon={Users} label="O'quvchilar" value={data.kpi.students} />
          <Stat icon={TrendingUp} label="O'rtacha o'zlashtirish" value={data.kpi.avg} suffix="%" tone="indigo" />
          <Stat icon={TriangleAlert} label="E'tibordan chetda" value={data.kpi.neglected} tone="terra" hint={`${data.gap_alert} va undan ko'p dars`} />
          <Stat icon={Clock} label="Tejalgan vaqt" value={data.kpi.minutes_saved} suffix=" daq" tone="oltin" hint="Tekshirish va izoh yozishga" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {levels.map(({ l, n }, i) => (
          <div key={l} className="card flex items-center justify-between p-4">
            <div>
              <div className="text-[13px] text-mute">{l} · {LEVEL_NAMES[l]}</div>
              <div className="num mt-1 text-2xl font-semibold text-ink">{n}</div>
            </div>
            <div className="flex h-9 items-end gap-1">
              {[0, 1, 2, 3].map((k) => <span key={k} className={cn('w-1.5 rounded-sm', k <= i ? 'bg-firuza-500' : 'bg-line')} style={{ height: `${(k + 1) * 25}%` }} />)}
            </div>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs<Sort> value={sort} onChange={setSort} tabs={[{ key: 'jurnal', label: 'Jurnal tartibi' }, { key: 'past', label: "Eng past o'zlashtirish" }, { key: 'etibor', label: "E'tiborsizlar" }]} />
          <label className="flex h-10 items-center gap-2 rounded-xl bg-surface px-3 text-sm ring-1 ring-line-strong focus-within:ring-firuza-300">
            <Search className="size-4 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism yoki kod" className="w-40 bg-transparent outline-none placeholder:text-faint" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-mute">
                <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium">O'quvchi</th>
                <th className="px-2 py-3 font-medium">Daraja</th>
                {data.skills.map((s, i) => (
                  <th key={s.key} className="px-1 py-3 text-center font-medium">
                    <div className="leading-tight text-ink-2">{s.name}</div>
                    <div className="mt-0.5 text-[11px] text-faint">sinf: {skillAvg[i] == null ? '—' : `${Math.round(skillAvg[i]! * 100)}%`}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium">O'rtacha</th>
                <th className="px-4 py-3 font-medium">Oxirgi e'tibor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => navigate(`/oquvchi/${s.id}`)} className="group cursor-pointer">
                  <td className="sticky left-0 z-10 border-t border-line bg-surface px-4 py-2 group-hover:bg-firuza-50">
                    <div className="flex items-center gap-3">
                      <span className="num w-5 text-right text-xs text-faint">{s.journal_no}</span>
                      <div>
                        <div className="font-medium whitespace-nowrap text-ink">{s.name}</div>
                        <div className="text-[11px] text-faint">{s.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="border-t border-line px-2 py-2 text-xs font-medium text-ink-2 group-hover:bg-firuza-50">{s.level}</td>
                  {data.skills.map((sk) => {
                    const v = s.skills[sk.key]
                    return (
                      <td key={sk.key} className="border-t border-line p-1 group-hover:bg-firuza-50">
                        <div className="num grid h-9 place-items-center rounded-lg text-xs font-semibold text-ink" style={{ background: cellBg(v) }}>
                          {v == null ? '—' : Math.round(v * 100)}
                        </div>
                      </td>
                    )
                  })}
                  <td className="border-t border-line px-3 py-2 text-center group-hover:bg-firuza-50">
                    <span className={cn('num font-semibold', toneText[tone(s.avg)])}>{Math.round(s.avg * 100)}%</span>
                  </td>
                  <td className="border-t border-line px-4 py-2 group-hover:bg-firuza-50">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, k) => (
                          <span key={k} className={cn('h-3.5 w-1.5 rounded-sm', k < s.gap ? (s.alert ? 'bg-terra-500' : 'bg-oltin-500') : 'bg-line')} />
                        ))}
                      </div>
                      <span className={cn('text-xs whitespace-nowrap', s.alert ? 'font-semibold text-terra-500' : s.gap === 0 ? 'text-firuza-600' : 'text-mute')}>
                        {s.gap === 0 ? 'bugun' : `${s.gap} dars`}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {role === 'teacher' && (
        <Card className="mt-5">
          <CardHeader icon={Settings2} title="Ogohlantirish chegarasi" hint="Necha dars e'tiborsiz qolsa o'quvchi majburiy ro'yxatga tushadi (barcha sinflar uchun)" />
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-11 items-center rounded-xl ring-1 ring-line-strong">
              <button className="grid h-full w-10 place-items-center text-mute hover:text-ink disabled:opacity-40" disabled={data.gap_alert <= 2 || setGap.isPending} onClick={() => setGap.mutate(data.gap_alert - 1)} aria-label="Kamaytirish"><Minus className="size-4" /></button>
              <span className="num w-16 text-center text-lg font-semibold text-ink">{data.gap_alert}</span>
              <button className="grid h-full w-10 place-items-center text-mute hover:text-ink disabled:opacity-40" disabled={data.gap_alert >= 15 || setGap.isPending} onClick={() => setGap.mutate(data.gap_alert + 1)} aria-label="Ko'paytirish"><Plus className="size-4" /></button>
            </div>
            <span className="text-sm text-mute">dars (standart 5)</span>
          </div>
        </Card>
      )}
      <AnimatePresence>{adding && <AddStudents classId={classId} onClose={() => setAdding(false)} />}</AnimatePresence>
    </div>
  )
}

function AddStudents({ classId, onClose }: { classId: number | null; onClose: () => void }) {
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const ai = useAi()
  const done = (n: number) => {
    qc.invalidateQueries()
    ai.toast(`${n} ta o'quvchi qo'shildi, kodlar avtomatik berildi`)
    onClose()
  }
  const add = useMutation({ mutationFn: () => api.addStudents(text.split('\n'), classId), onSuccess: (r) => done(r.added.length), onError: (e) => ai.toast(e.message, 'bad') })
  const imp = useMutation({ mutationFn: (f: File) => api.importStudents(f, classId), onSuccess: (r) => done(r.added.length), onError: (e) => ai.toast(e.message, 'bad') })

  return (
    <Modal title="O'quvchi qo'shish" subtitle="Har bir o'quvchiga neytral kod beriladi (masalan 5B-32); AI ga faqat kod yuboriladi" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" icon={UserPlus} disabled={!text.trim()} loading={add.isPending} onClick={() => add.mutate()}>Qo'shish</Button></>}>
      <label className="text-[13px] font-medium text-ink-2">Ism va familiya — har biri yangi qatorda</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={"Aziz Rahimov\nMadina Yusupova"}
        className="mt-2 w-full rounded-xl bg-surface p-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-300" />
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-sunken p-3 ring-1 ring-line">
        <div className="text-[13px] text-ink-2">yoki Excel / CSV ro'yxatni yuklang (eMaktab eksporti ham mos)</div>
        <input ref={fileRef} type="file" accept=".xlsx,.csv,.txt" hidden onChange={(e) => e.target.files?.[0] && imp.mutate(e.target.files[0])} />
        <Button icon={FileUp} loading={imp.isPending} onClick={() => fileRef.current?.click()}>Fayl</Button>
      </div>
    </Modal>
  )
}
