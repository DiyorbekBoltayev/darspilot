import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Coins, Cpu, FileText, MessageSquareText, RotateCcw, Route, ShieldCheck, Timer, TriangleAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Button, Card, CardHeader, Empty, ErrorState, Modal, PageHeader, PageSkeleton, Stat } from '@/components/ui'

const PURPOSE: Record<string, string> = {
  feedback: "O'quvchi / ota-ona / o'qituvchi feedbacki",
  sinf_xulosasi: 'Sinf xulosasi',
  dars_ssenariysi: 'Dars ssenariysi',
  haftalik_xulosa: 'Haftalik xulosa',
  metod_kartochkasi: 'Metod kartochkasi',
  oquv_dasturi: "O'quv dasturini ajratish",
  ovozli_etibor: "Ovozli e'tibor jurnali (nutq → matn)",
}
const purposeLabel = (p: string) => (p.startsWith('masala_matni_') ? `Masala matni · ${p.slice(-2)}` : PURPOSE[p] ?? p)

const USES = [
  { icon: FileText, title: 'Masala matni', text: "AI faqat hikoyani yozadi. Sonlar, javob va xato-variantlar kodda; matndagi har bir son tekshiriladi, mos kelmasa shablon qoladi." },
  { icon: MessageSquareText, title: 'Feedback', text: "Bosqichli tashxisdan o'quvchi, ota-ona va o'qituvchi uchun 3 xil qisqa matn; 10 tadan paket, tezkor model." },
  { icon: Activity, title: 'Xulosalar', text: "Sinf va haftalik xulosa faqat agregat statistikadan: bosqich foizlari, xato turlari, kodlar." },
  { icon: Route, title: 'Dars ssenariysi', text: "Nomzod metodlar va ustuvor o'quvchilar kodidan 8 bosqich; natija validatordan o'tadi." },
]

export default function AiLog() {
  const { data, error, isLoading } = useQuery({ queryKey: ['ai-log'], queryFn: api.aiLog, refetchInterval: 15000 })
  const [confirm, setConfirm] = useState(false)
  const ai = useAi()
  const qc = useQueryClient()
  const reset = useMutation({
    mutationFn: api.demoReset,
    onSuccess: () => { qc.invalidateQueries(); setConfirm(false); ai.toast("Demo ma'lumotlari boshlang'ich holatga qaytarildi") },
  })
  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Shaffoflik" title="AI jurnali" subtitle="Har bir til modeli chaqiruvi: maqsad, davomiylik va tokenlar — xarajat va tezlikni o'lchash uchun."
        actions={<Button variant="danger" icon={RotateCcw} onClick={() => setConfirm(true)}>Demo reset</Button>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Cpu} label="Chaqiruvlar" value={data.totals.calls} />
        <Stat icon={Coins} label="Kirish tokenlari" value={data.totals.prompt_tokens} tone="indigo" />
        <Stat icon={Coins} label="Chiqish tokenlari" value={data.totals.completion_tokens} tone="oltin" />
        <Stat icon={Timer} label="O'rtacha vaqt" value={data.totals.avg_seconds} suffix=" s" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {USES.map((u) => (
          <div key={u.title} className="card p-4">
            <div className="grid size-8 place-items-center rounded-lg bg-firuza-50 text-firuza-600"><u.icon className="size-4" /></div>
            <div className="mt-2.5 font-semibold text-ink">{u.title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-mute">{u.text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-firuza-50 p-4 ring-1 ring-firuza-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-firuza-600" />
        <p className="text-sm text-ink-2">Modelga o'quvchi ismi yuborilmaydi — faqat <b className="text-ink">5B-07</b> kabi kodlar va agregat natijalar. Model javob bermasa yoki noto'g'ri format qaytarsa, tizim shablon natija bilan ishlashda davom etadi.</p>
      </div>

      <Card>
        <CardHeader icon={Activity} title="So'nggi chaqiruvlar" hint="Har 15 soniyada yangilanadi" />
        {data.calls.length === 0 ? <Empty icon={Cpu} title="Hali chaqiruv yo'q" text="Diagnostika yarating yoki baholang — chaqiruvlar shu yerda ko'rinadi." /> : (
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs text-mute">
                <th className="px-3 py-2 font-medium">Vaqt</th><th className="px-3 py-2 font-medium">Maqsad</th><th className="px-3 py-2 font-medium">Holat</th>
                <th className="px-3 py-2 text-right font-medium">Davomiylik</th><th className="px-3 py-2 text-right font-medium">Tokenlar (kirish / chiqish)</th>
              </tr></thead>
              <tbody>
                {data.calls.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="num px-3 py-2.5 text-xs text-mute">{c.at}</td>
                    <td className="px-3 py-2.5 text-ink">{purposeLabel(c.purpose)}</td>
                    <td className="px-3 py-2.5">{c.ok ? <span className="inline-flex items-center gap-1.5 text-firuza-600"><span className="size-1.5 rounded-full bg-firuza-500" />muvaffaqiyatli</span>
                      : <span className="inline-flex items-center gap-1.5 text-terra-500" title={c.error ?? ''}><TriangleAlert className="size-3.5" />xato → shablon</span>}</td>
                    <td className="num px-3 py-2.5 text-right text-ink-2">{c.seconds.toFixed(1)} s</td>
                    <td className={cn('num px-3 py-2.5 text-right', c.prompt_tokens ? 'text-ink-2' : 'text-faint')}>{c.prompt_tokens ?? '—'} / {c.completion_tokens ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {confirm && (
          <Modal title="Demo ma'lumotlarini tozalash?" subtitle="Diagnostikalar, javoblar, ssenariylar, qo'shilgan metodlar va o'quvchilar o'chiriladi; 3 ta sinf (5-A, 5-B, 5-V) jadvali va tarixi bilan qayta yaratiladi. AI jurnali saqlanadi."
            onClose={() => setConfirm(false)}
            footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Bekor qilish</Button><Button variant="danger" icon={RotateCcw} loading={reset.isPending} onClick={() => reset.mutate()}>Tozalash</Button></>}>
            <p className="text-sm text-ink-2">Bu taqdimotdan oldin demo sahnani toza boshlash uchun (docx, 21.2 — zaxira reja).</p>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
