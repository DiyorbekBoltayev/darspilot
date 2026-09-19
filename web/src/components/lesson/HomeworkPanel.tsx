import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenCheck, Camera, Check, Loader2, NotebookPen, RefreshCw, TriangleAlert, WandSparkles } from 'lucide-react'
import { api } from '@/lib/api'
import type { HomeworkStudent, HomeworkView } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Badge, Button, Card, CardHeader } from '@/components/ui'

/** Uy vazifasi: mashq daftari sahifasining surati → AI har mashqni tekshiradi, o'qituvchi tasdiqlaydi. */
export default function HomeworkPanel({ lessonId }: { lessonId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['homework', lessonId],
    queryFn: () => api.homework(lessonId),
    // fonda tahlil ketayotganda ro'yxat o'zi yangilanib turadi
    refetchInterval: (q) => ((q.state.data?.pending ?? 0) > 0 ? 2500 : false),
  })
  const [active, setActive] = useState<number | null>(null)
  const ai = useAi()
  const qc = useQueryClient()
  // Daftar yo'q bo'lsa: sun'iy sahifa yaratiladi va haqiqiy AI tekshiruvidan o'tadi
  const demo = useMutation({
    mutationFn: () => api.demoHomework(lessonId),
    onSuccess: (d) => {
      if (d.error) { ai.toast(d.error, 'bad'); return }
      qc.setQueryData(['homework', lessonId], d)
      ai.toast('Demo daftar surati yuborildi — AI tekshirmoqda')
    },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  if (isLoading || !data) return <div className="skeleton h-40" />
  const checked = data.students.filter((s) => s.homework)
  const pending = data.students.filter((s) => !s.homework)
  const working = data.pending

  return (
    <Card>
      <CardHeader icon={NotebookPen} title="Uy vazifasi — mashq daftari"
        hint={`${data.reference ? `Mashq daftari ${data.reference} · ` : ''}Daftar sahifasini suratga oling — AI har mashqni tekshiradi`}
        action={
          <div className="flex items-center gap-3">
            {working > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[12.5px] font-medium text-indigo-600">
                <Loader2 className="size-3.5 animate-spin" />{working} ta tahlilda
              </span>
            )}
            <span className="num text-lg font-semibold text-firuza-600">{data.checked}<span className="text-sm font-normal text-faint">/{data.students.length}</span></span>
          </div>
        } />
      <div className="p-5 pt-3">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Mini label="Tekshirildi" value={`${data.checked}`} hint="o'quvchi daftari" />
          <Mini label="O'rtacha" value={data.avg_pct == null ? '—' : `${data.avg_pct}%`} hint="to'g'ri bajarilgan mashqlar" />
          <Mini label="Tejalgan vaqt" value={`${data.minutes_saved} daq`} hint="daftarlarni qo'lda ko'rish o'rniga" />
          <Mini label="Asosiy xato" value={data.top_errors[0]?.name ?? '—'} hint={data.top_errors[0] ? `${data.top_errors[0].count} ta mashqda` : 'xato topilmadi'} small />
        </div>

        {data.top_errors.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TriangleAlert className="size-3.5 text-terra-500" />
            {data.top_errors.map((e) => (
              <Badge key={e.name} className="bg-terra-50 text-terra-600 ring-terra-100">{e.name} · {e.count}</Badge>
            ))}
            <span className="text-[12px] text-faint">— keyingi dars ssenariysida takrorlashga tushadi</span>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {checked.map((s) => (
            <HomeworkRow key={s.id} lessonId={lessonId} s={s} open={active === s.id} onToggle={() => setActive(active === s.id ? null : s.id)} />
          ))}
        </div>
        {checked.length > 0 && working > 0 && (
          <p className="mt-2 text-[12.5px] text-faint">
            Tahlil fonda ketyapti — keyingi o'quvchini suratga olishingiz mumkin, natijalar tayyor bo'lgach o'zi paydo bo'ladi.
          </p>
        )}

        {pending.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-mute uppercase">
              Tekshirilmagan ({pending.length}) <span className="ml-1 font-normal normal-case">— bosing, kamera ochiladi; suratga olgach keyingisiga o'tavering</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {pending.map((s) => <UploadButton key={s.id} lessonId={lessonId} student={s} />)}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-sunken p-3.5 ring-1 ring-line sm:flex-row sm:items-center">
          <WandSparkles className="size-5 shrink-0 text-indigo-600" />
          <p className="min-w-0 flex-1 text-[13px] text-mute">
            <b className="font-semibold text-ink">Daftar yo'qmi? Demo sahifa.</b> Mashq daftari sahifasi yaratiladi va
            haqiqiy suratdek AI tekshiruvidan o'tadi — jarayonni printersiz ko'rsatish uchun.
          </p>
          <Button icon={NotebookPen} loading={demo.isPending} disabled={pending.length === 0} onClick={() => demo.mutate()}>
            {pending.length === 0 ? 'Hammasi tekshirilgan' : 'Demo daftar surati'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Mini({ label, value, hint, small }: { label: string; value: string; hint: string; small?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-sunken p-3 ring-1 ring-line">
      <div className="text-xs text-mute">{label}</div>
      <div className={cn('mt-0.5 truncate font-semibold text-ink', small ? 'text-[15px]' : 'num text-xl')}>{value}</div>
      <div className="mt-0.5 truncate text-[11.5px] text-faint">{hint}</div>
    </div>
  )
}

function UploadButton({ lessonId, student }: { lessonId: number; student: HomeworkStudent }) {
  const ref = useRef<HTMLInputElement>(null)
  const ai = useAi()
  const qc = useQueryClient()
  const send = useMutation({
    // kutib turmaymiz: surat yuklanadi va tahlil fonda ketadi — o'qituvchi keyingi o'quvchiga o'tadi
    mutationFn: (file: File) => api.checkHomework(lessonId, student.id, file),
    onSuccess: (d: HomeworkView) => { qc.setQueryData(['homework', lessonId], d); ai.toast(`${student.name.split(' ')[0]} — surat qabul qilindi`) },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  return (
    <>
      <button onClick={() => ref.current?.click()} disabled={send.isPending}
        className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-2 text-left text-[13px] text-ink ring-1 ring-line transition-colors hover:ring-firuza-300 disabled:opacity-60">
        <Camera className="size-3.5 shrink-0 text-faint" />
        <span className="num w-4 shrink-0 text-[10.5px] text-faint">{student.journal_no}</span>
        <span className="truncate">{student.name.split(' ')[0]} {student.name.split(' ')[1]?.[0]}.</span>
        {send.isPending && <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-indigo-500" />}
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) send.mutate(f); e.target.value = '' }} />
    </>
  )
}

/** Surat mos kelmasa — shu yerdan qayta suratga olish. */
function RetakeButton({ lessonId, student }: { lessonId: number; student: HomeworkStudent }) {
  const ref = useRef<HTMLInputElement>(null)
  const ai = useAi()
  const qc = useQueryClient()
  const send = useMutation({
    mutationFn: (file: File) => api.checkHomework(lessonId, student.id, file),
    onSuccess: (d: HomeworkView) => { qc.setQueryData(['homework', lessonId], d); ai.toast('Yangi surat qabul qilindi') },
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); ref.current?.click() }} disabled={send.isPending}
        title="Qayta suratga olish"
        className="mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-terra-500 transition-colors hover:bg-terra-50">
        <RefreshCw className={cn('size-4', send.isPending && 'animate-spin')} />
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) send.mutate(f); e.target.value = '' }} />
    </>
  )
}

function HomeworkRow({ lessonId, s, open, onToggle }: { lessonId: number; s: HomeworkStudent; open: boolean; onToggle: () => void }) {
  const hw = s.homework!
  const pct = Math.round((100 * hw.correct) / Math.max(1, hw.total))
  const busy = hw.status === 'navbatda'
  const failed = hw.status === 'xato'
  const ai = useAi()
  const qc = useQueryClient()
  const confirm = useMutation({
    mutationFn: () => api.confirmHomework(lessonId, s.id, { confirmed: !hw.confirmed }),
    onSuccess: (d) => { qc.setQueryData(['homework', lessonId], d); ai.toast(hw.confirmed ? 'Tasdiq olib tashlandi' : 'Tasdiqlandi') },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  return (
    <div className={cn('overflow-hidden rounded-xl ring-1 transition-colors', open ? 'bg-surface ring-firuza-200' : 'ring-line hover:ring-line-strong')}>
      <button onClick={() => !busy && onToggle()} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <span className={cn('num grid size-9 shrink-0 place-items-center rounded-lg text-[12px] font-semibold',
          busy ? 'bg-indigo-50 text-indigo-600' : failed ? 'bg-terra-50 text-terra-600'
            : pct >= 80 ? 'bg-firuza-50 text-firuza-700' : pct >= 50 ? 'bg-oltin-50 text-oltin-600' : 'bg-terra-50 text-terra-600')}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : failed ? <TriangleAlert className="size-4" /> : `${hw.correct}/${hw.total}`}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{s.name}</span>
            <span className="text-xs text-faint">{s.code}</span>
            {busy ? <Badge className="bg-indigo-50 text-indigo-600 ring-indigo-100">tekshirilmoqda…</Badge>
              : failed ? <Badge className="bg-terra-50 text-terra-600 ring-terra-100">surat mos emas</Badge>
                : <Badge className={cn(hw.source === 'ai' ? 'bg-indigo-50 text-indigo-600 ring-indigo-100' : 'bg-firuza-50 text-firuza-700 ring-firuza-100')}>
                    {hw.source === 'ai' ? 'AI tekshirdi' : "O'qituvchi"}
                  </Badge>}
            {hw.confirmed && <Badge className="bg-firuza-50 text-firuza-700 ring-firuza-100">tasdiqlangan</Badge>}
          </div>
          <div className={cn('mt-0.5 truncate text-[13px]', failed ? 'text-terra-600' : 'text-mute')}>{hw.comment}</div>
        </div>
        {failed && <RetakeButton lessonId={lessonId} student={s} />}
        <div className="hidden items-center gap-1 sm:flex">
          {hw.tasks.map((t) => (
            <span key={t.nom} title={`${t.nom}: ${t.togri ? "to'g'ri" : t.xato ?? 'xato'}`}
              className={cn('num rounded px-1.5 py-0.5 text-[10.5px] font-semibold', t.togri ? 'bg-firuza-50 text-firuza-700' : 'bg-terra-50 text-terra-600')}>
              {t.nom}
            </span>
          ))}
        </div>
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-line p-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {hw.image
              ? <a href={hw.image} target="_blank" rel="noreferrer"><img src={hw.image} alt="Daftar sahifasi" className="w-full rounded-lg bg-white ring-1 ring-line" /></a>
              : <div className="rounded-lg bg-sunken p-4 text-[13px] text-faint ring-1 ring-line">Surat saqlanmagan</div>}
          </div>
          <div className="min-w-0 space-y-1.5 lg:col-span-3">
            {hw.tasks.map((t) => (
              <div key={t.nom} className="flex items-start gap-2.5 rounded-lg bg-sunken px-3 py-2 ring-1 ring-line">
                <span className={cn('num mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold',
                  t.togri ? 'bg-firuza-500 text-white' : 'bg-terra-500 text-white')}>{t.nom}</span>
                <div className="min-w-0">
                  <div className="text-[13px] text-ink">{t.togri ? "To'g'ri bajarilgan" : (t.xato ?? 'Xato')}</div>
                  {t.izoh && <div className="text-[12.5px] text-mute">{t.izoh}</div>}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Button variant={hw.confirmed ? 'ghost' : 'primary'} icon={hw.confirmed ? BookOpenCheck : Check} loading={confirm.isPending} onClick={() => confirm.mutate()}>
                {hw.confirmed ? 'Tasdiqlangan' : 'Tekshiruvni tasdiqlash'}
              </Button>
              <span className="text-[12px] text-faint">Tasdiqlangan natija jurnal va keyingi ssenariyga o'tadi</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
