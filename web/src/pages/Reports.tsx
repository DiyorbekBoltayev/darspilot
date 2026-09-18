import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, Copy, ExternalLink, Heart, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { useSession } from '@/components/session-context'
import { Badge, Button, Card, CardHeader, Empty, ErrorState, MaketNote, PageHeader, PageSkeleton, Tabs } from '@/components/ui'
import ImpactPanel from '@/components/ImpactPanel'

type Tab = 'haftalik' | 'ota-ona'

export default function Reports() {
  const { classId, current, role } = useSession()
  const [tab, setTab] = useState<Tab>('haftalik')
  return (
    <div>
      <PageHeader eyebrow={`${current?.name ?? ''} sinf · metodbirlashma · ota-onalar`} title="Hisobotlar"
        subtitle="Haftalik AI-xulosa va ota-onalar bilan aloqa — diagnostika, tezkor tekshiruv va e'tibor jurnalidan avtomatik. Maktab kesimi — «Direktor» rolida." />
      <div className="mb-6"><ImpactPanel classId={classId} /></div>
      {role === 'teacher' && (
        <Tabs<Tab> className="mb-5" value={tab} onChange={setTab}
          tabs={[{ key: 'haftalik', label: 'Haftalik AI-xulosa', icon: CalendarRange }, { key: 'ota-ona', label: 'Ota-onalar', icon: Heart }]} />
      )}
      {tab === 'haftalik' || role !== 'teacher' ? <Weekly /> : <Parents />}
    </div>
  )
}

function Weekly() {
  const { classId } = useSession()
  const { data, error, isLoading } = useQuery({ queryKey: ['weekly', classId], queryFn: () => api.weekly(classId), enabled: classId != null })
  const ai = useAi()
  const qc = useQueryClient()
  const create = useMutation({
    mutationFn: () => ai.run('report', () => api.createWeekly(classId)),
    onSuccess: (r) => { qc.setQueryData(['weekly', classId], r); ai.toast('Haftalik xulosa tayyor') },
  })
  if (isLoading || !data) return error ? <ErrorState error={error} /> : <PageSkeleton />
  const r = data.report
  const action = <Button variant="primary" icon={Sparkles} loading={create.isPending} onClick={() => create.mutate()}>{r ? 'Yangilash' : 'Xulosani tuzish'}</Button>
  if (!r) return <Card><Empty icon={CalendarRange} title="Hali haftalik xulosa yo'q" text="Oxirgi 7 kunning darslari, diagnostikalari, tezkor tekshiruvlari va e'tibor jurnalidan xulosa tuziladi." action={action} /></Card>

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <div className="eyebrow">Haftalik AI-xulosa</div>
            <h2 className="mt-1 font-display text-xl font-semibold text-indigo-600">{r.sarlavha}</h2>
            <div className="mt-1 text-xs text-mute">Tuzildi: {r.created_at}{r.source === 'gpt' && ' · AI'}</div>
          </div>
          {action}
        </div>
        <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-5">
          <ul className="space-y-3 md:col-span-3">
            {r.bandlar.map((b, i) => <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-ink"><span className="num mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-indigo-50 text-xs text-indigo-600">{i + 1}</span>{b}</li>)}
          </ul>
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-semibold tracking-wide text-mute uppercase">Keyingi hafta</div>
            <div className="space-y-2">{r.keyingi_hafta.map((k, i) => <div key={i} className="rounded-xl bg-firuza-50 p-3 text-sm text-ink ring-1 ring-firuza-100">{k}</div>)}</div>
          </div>
        </div>
      </Card>
      <div className="grid content-start gap-3">
        {[['Darslar', r.stats.darslar], ["E'tibor qamrovi", `${r.stats.etibor_qamrovi_foiz}%`], ['Diagnostikalar', r.stats.diagnostikalar], ["E'tiborsizlar", r.stats.etiborsizlar]].map(([l, v]) => (
          <div key={l as string} className="card flex items-center justify-between p-4"><span className="text-sm text-mute">{l}</span><span className="num text-xl font-semibold text-ink">{v}</span></div>
        ))}
        <div className="text-xs text-faint">Davr: {r.stats.davr}</div>
      </div>
    </div>
  )
}

function Parents() {
  const { classId } = useSession()
  const links = useQuery({ queryKey: ['parents', classId], queryFn: () => api.parentLinks(classId), enabled: classId != null })
  const [sid, setSid] = useState<number | null>(null)
  const current = sid ?? links.data?.[0]?.id ?? null
  const report = useQuery({ queryKey: ['parent-report', current], queryFn: () => api.parentReport(current!), enabled: current != null })
  const ai = useAi()
  if (links.isLoading || !links.data) return links.error ? <ErrorState error={links.error} /> : <PageSkeleton />
  const consented = links.data.filter((l) => l.consent).length
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/ota-ona/${token}`)
      ai.toast('Havola nusxalandi')
    } catch {
      ai.toast("Nusxalab bo'lmadi", 'bad')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader icon={Heart} title="Ota-onalar" hint={`${consented} / ${links.data.length} rozilik bergan`} />
        <div className="max-h-[560px] space-y-0.5 overflow-y-auto p-3">
          {links.data.map((s) => (
            <button key={s.id} onClick={() => setSid(s.id)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm', current === s.id ? 'bg-firuza-50 ring-1 ring-firuza-200' : 'hover:bg-sunken')}>
              <span className={cn('size-2 rounded-full', s.consent ? 'bg-firuza-500' : 'bg-line-strong')} />
              <span className="flex-1 text-ink">{s.name}</span>
              <span className="text-xs text-mute">{s.code}</span>
            </button>
          ))}
        </div>
      </Card>
      <div className="space-y-4 xl:col-span-3">
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">Telegram xabari</div>
            {report.data && <Badge className={report.data.consent ? 'bg-firuza-50 text-firuza-700 ring-firuza-200' : 'bg-oltin-50 text-oltin-600 ring-oltin-100'}>
              <ShieldCheck className="size-3" />{report.data.consent ? 'rozilik bor' : "rozilik hali yo'q — faqat havola yuboriladi"}</Badge>}
          </div>
          <div className="rounded-2xl bg-[#E6EEF2] p-4">
            {report.data ? (
              <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-white px-4 py-3 text-[14px] leading-relaxed whitespace-pre-line text-ink shadow-card">{report.data.text}</div>
            ) : <div className="skeleton h-40" />}
          </div>
          {report.data && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button icon={Copy} onClick={() => copy(report.data!.token)}>Kabinet havolasi</Button>
              <Link to={`/ota-ona/${report.data.token}`} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-ink-2 hover:bg-sunken"><ExternalLink className="size-4" />Kabinetni ochish</Link>
              <Button icon={Send} className="ml-auto" onClick={() => ai.toast('Maket: Telegram bot ulanishi pilot bosqichida')}>Telegram orqali yuborish</Button>
            </div>
          )}
        </Card>
        <MaketNote>Telegram bot orqali yuborish — pilot bosqichida. Ota-ona kabineti va rozilik oqimi hozir ishlaydi.</MaketNote>
      </div>
    </div>
  )
}
