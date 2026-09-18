import { Link, useParams } from 'react-router'
import { motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpenCheck, CalendarDays, Check, GraduationCap, Heart, House, Lock, ShieldCheck, Sparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { ParentPortal as Portal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-context'
import { StarLogo } from '@/components/Brand'
import { Button } from '@/components/ui'

const today = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const WORD: Record<string, { cls: string; label: string }> = {
  yaxshi: { cls: 'bg-firuza-50 text-firuza-700 ring-firuza-200', label: 'Yaxshi' },
  "o'rtacha": { cls: 'bg-oltin-50 text-oltin-600 ring-oltin-100', label: "O'rtacha" },
  'yordam kerak': { cls: 'bg-terra-50 text-terra-600 ring-terra-100', label: 'Yordam kerak' },
}

export default function ParentPortal() {
  const token = useParams().token ?? ''
  const { data, error, isLoading } = useQuery({ queryKey: ['parent', token], queryFn: () => api.parentPortal(token) })
  const { role } = useSession()
  const qc = useQueryClient()
  const consent = useMutation({ mutationFn: (v: boolean) => api.parentConsent(token, v), onSuccess: (d) => { qc.setQueryData(['parent', token], d); qc.invalidateQueries({ queryKey: ['parents'] }) } })

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <StarLogo className="size-8" />
          <div className="leading-tight">
            <div className="font-display text-[15px] font-semibold text-indigo-600">Dars<span className="text-firuza-500">Pilot</span></div>
            <div className="text-[11px] text-mute">ota-ona kabineti</div>
          </div>
          {role === 'parent' && <Link to="/ota-ona" className="ml-auto inline-flex items-center gap-1 text-[13px] text-firuza-700"><ArrowLeft className="size-3.5" />Demo ro'yxat</Link>}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        {isLoading && <div className="space-y-3"><div className="skeleton h-28" /><div className="skeleton h-64" /></div>}
        {error && <div className="card p-6 text-sm text-terra-600">Havola noto'g'ri yoki eskirgan. O'qituvchidan yangi havola so'rang.</div>}
        {data && (data.consent ? <Content data={data} onRevoke={() => consent.mutate(false)} /> : <ConsentGate data={data} loading={consent.isPending} onAccept={() => consent.mutate(true)} />)}
      </main>
    </div>
  )
}

function ConsentGate({ data, loading, onAccept }: { data: Portal; loading: boolean; onAccept: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <div className="girih h-20 opacity-20" />
      <div className="-mt-10 p-6">
        <div className="grid size-16 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lift"><Lock className="size-7" /></div>
        <h1 className="mt-4 font-display text-[22px] font-semibold text-ink">Assalomu alaykum!</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          {data.class.teacher} sizni <b>{data.student.first_name}</b>ning ({data.class.name} sinf) matematika bo'yicha natijalarini kuzatishga taklif qildi.
        </p>
        <div className="mt-5 space-y-2 rounded-xl bg-sunken p-4 text-[13.5px] leading-relaxed text-ink-2 ring-1 ring-line">
          <div className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-firuza-600" />Faqat farzandingizning ko'nikmalari va diagnostika natijalari ko'rsatiladi</div>
          <div className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-firuza-600" />AI modeliga ism yuborilmaydi — faqat anonim kod</div>
          <div className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-firuza-600" />Roziligingizni istalgan payt qaytarib olishingiz mumkin</div>
        </div>
        <Button variant="primary" icon={ShieldCheck} className="mt-5 h-12 w-full text-[15px]" loading={loading} onClick={onAccept}>Roziman, davom etish</Button>
        <p className="mt-3 text-center text-[11.5px] text-faint">«Shaxsga doir ma'lumotlar to'g'risida»gi Qonun asosida</p>
      </div>
    </motion.div>
  )
}

function Content({ data, onRevoke }: { data: Portal; onRevoke: () => void }) {
  const last = data.history[0]
  return (
    <div className="space-y-4">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-5">
        <div className="girih pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.12] [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative">
          <div className="eyebrow">{data.class.name} sinf · {data.class.subject}</div>
          <h1 className="mt-1 font-display text-[26px] font-semibold text-indigo-600">{data.student.first_name}</h1>
          <p className="mt-1 text-sm text-mute">O'qituvchi: {data.class.teacher}</p>
          {data.good.length > 0 && <p className="mt-3 text-[15px] leading-relaxed text-ink">👏 {data.student.first_name} <b>{data.good.map((g) => g.toLowerCase()).join(', ')}</b> bo'yicha yaxshi natija ko'rsatyapti.</p>}
        </div>
      </motion.section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><GraduationCap className="size-4 text-firuza-600" />Ko'nikmalar</h2>
        <div className="mt-3 space-y-2">
          {data.skills.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1 ring-line">
              <span className="text-[14px] text-ink">{s.name.split(' (')[0]}</span>
              <span className={cn('rounded-lg px-2 py-0.5 text-[12.5px] font-semibold ring-1', WORD[s.word]?.cls)}>{WORD[s.word]?.label ?? s.word}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card bg-firuza-50/60 p-5 ring-1 ring-firuza-100">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-firuza-700"><House className="size-4" />Uyda nima qilish mumkin</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{data.tip}</p>
      </section>

      {last && (
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><BookOpenCheck className="size-4 text-indigo-600" />Oxirgi diagnostika</h2>
          <div className="mt-3 flex items-center justify-between">
            <div><div className="text-[14px] text-ink">{last.title}</div><div className="text-xs text-mute">{last.date}</div></div>
            <div className="num text-2xl font-semibold text-indigo-600">{last.correct}/{last.total}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {last.steps.map((s, i) => <span key={i} className={cn('rounded-md px-2 py-1 text-[11.5px] font-medium', s.ok ? 'bg-firuza-50 text-firuza-700' : 'bg-terra-50 text-terra-600')}>{s.ok ? '✓' : '•'} {s.step}</span>)}
          </div>
          <div className="mt-3 rounded-xl bg-sunken p-3 text-[13.5px] leading-relaxed text-ink-2 ring-1 ring-line">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600"><Sparkles className="size-3.5" />{data.student.first_name}ga yozilgan izoh</div>
            {last.student}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><CalendarDays className="size-4 text-firuza-600" />Yaqin kunlarda</h2>
        <div className="mt-3 space-y-2 text-[14px]">
          {data.upcoming.topic && <div className="flex justify-between gap-3"><span className="text-mute">{data.upcoming.date === today() ? 'Bugungi dars' : `Keyingi dars (${data.upcoming.date})`}</span><span className="text-right text-ink">{data.upcoming.topic}</span></div>}
          <div className="flex justify-between gap-3"><span className="text-mute">Qog'ozli diagnostika</span><span className="text-ink">{data.upcoming.diagnostic ? (data.upcoming.diagnostic === today() ? 'bugun' : data.upcoming.diagnostic) : 'rejalashtirilmagan'}</span></div>
          {data.upcoming.workbook && <div className="flex justify-between gap-3"><span className="text-mute">Mashq daftari (uy vazifasi)</span><span className="text-ink">{data.upcoming.workbook}-bet</span></div>}
          {data.upcoming.assessment && <div className="flex justify-between gap-3"><span className="text-mute">Yaqin summativ ish</span><span className="text-right text-ink">{data.upcoming.assessment}</span></div>}
        </div>
      </section>

      {data.history.length > 1 && (
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Heart className="size-4 text-terra-500" />Tarix</h2>
          <div className="mt-2 divide-y divide-line">
            {data.history.map((h, i) => <div key={i} className="flex justify-between py-2 text-[14px]"><span className="text-ink-2">{h.date} · {h.title}</span><span className="num text-ink">{h.correct}/{h.total}</span></div>)}
          </div>
        </section>
      )}

      <button onClick={onRevoke} className="mx-auto flex items-center gap-1.5 py-2 text-[12.5px] text-faint hover:text-terra-600"><X className="size-3.5" />Roziligimni qaytarib olaman</button>
    </div>
  )
}
