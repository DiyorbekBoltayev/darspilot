import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, BookOpen, ChevronDown, Clock, ListPlus, Search, Sparkles, Star, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { MethodCard, Stage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Badge, Button, Card, ErrorState, Modal, PageHeader, PageSkeleton } from '@/components/ui'

export default function Methods() {
  const { data, error, isLoading } = useQuery({ queryKey: ['methods'], queryFn: api.methods })
  const [stage, setStage] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const list = useMemo(() => {
    if (!data) return []
    const needle = q.toLowerCase()
    return data.methods
      .filter((m) => (stage === 'all' || m.stages.includes(stage)) && `${m.name} ${m.short}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(!!b.custom) - Number(!!a.custom) || (b.chosen ?? 0) - (a.chosen ?? 0))
  }, [data, stage, q])

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <ErrorState error={error} />
  const stageName = Object.fromEntries(data.stages.map((s) => [s.key, s.name]))
  const customCount = data.methods.filter((m) => m.custom).length

  return (
    <div>
      <PageHeader eyebrow={`${data.methods.length} ta metod · ${customCount} tasi o'qituvchiniki`} title="Metodlar kutubxonasi"
        subtitle="Har bir dars bosqichi uchun interfaol metodlar. Ssenariy shu kutubxonadan tanlaydi; siz almashtirgan metodlar keyingi ssenariylarda birinchi taklif qilinadi."
        actions={<Button variant="primary" icon={ListPlus} onClick={() => setAdding(true)}>O'z metodimni qo'shish</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {data.stages.map((s, i) => {
          const count = data.methods.filter((m) => m.stages.includes(s.key)).length
          const active = stage === s.key
          return (
            <button key={s.key} onClick={() => setStage(active ? 'all' : s.key)}
              className={cn('card p-3 text-left transition-shadow', active ? 'ring-2 ring-firuza-500' : 'hover:shadow-lift')}>
              <div className="flex items-center justify-between text-[11px] text-faint"><span>{i + 1}-bosqich</span><span className="num">{s.minutes}′</span></div>
              <div className="mt-1 truncate text-sm font-semibold text-ink">{s.name}</div>
              <div className="mt-1.5 text-xs text-mute">{count} metod</div>
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-mute">{stage === 'all' ? 'Barcha bosqichlar' : <>Bosqich: <b className="text-ink">{stageName[stage]}</b> — {data.stages.find((s) => s.key === stage)?.goal}</>}</div>
        <label className="flex h-10 items-center gap-2 rounded-xl bg-surface px-3 text-sm ring-1 ring-line-strong focus-within:ring-firuza-300">
          <Search className="size-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Metodni qidirish" className="w-48 bg-transparent outline-none placeholder:text-faint" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => (
          <Card key={m.id} className={cn(m.custom && 'ring-1 ring-indigo-100')}>
            <button onClick={() => setOpen(open === m.id ? null : m.id)} className="w-full p-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={cn('grid size-9 shrink-0 place-items-center rounded-xl', m.custom ? 'bg-indigo-600 text-white' : 'bg-firuza-50 text-firuza-600')}><BookOpen className="size-4" /></div>
                  <div>
                    <div className="font-semibold text-ink">{m.name}</div>
                    <div className="mt-0.5 text-[13px] text-mute">{m.short}</div>
                  </div>
                </div>
                <ChevronDown className={cn('mt-1 size-4 shrink-0 text-faint transition-transform', open === m.id && 'rotate-180')} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                {m.custom && <Badge className="bg-indigo-50 text-indigo-600 ring-indigo-100">O'qituvchi metodi</Badge>}
                {!!m.chosen && <Badge className="bg-oltin-50 text-oltin-600 ring-oltin-100"><Star className="size-3" />{m.chosen} marta tanlangan</Badge>}
                <span className="flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-ink-2"><Users className="size-3" />{m.form}</span>
                <span className="flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-ink-2"><Clock className="size-3" />{m.minutes} daq</span>
                {m.stages.map((s) => <span key={s} className="rounded-md bg-firuza-50 px-1.5 py-0.5 text-firuza-700">{stageName[s] ?? s}</span>)}
              </div>
            </button>
            <AnimatePresence initial={false}>
              {open === m.id && (
                <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line px-4">
                  {m.steps.map((s, k) => <li key={k} className="flex gap-3 py-2 text-sm text-ink-2 first:pt-3 last:pb-4"><span className="num grid size-5 shrink-0 place-items-center rounded-md bg-indigo-600 text-[11px] text-white">{k + 1}</span>{s}</li>)}
                </motion.ol>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>
      <AnimatePresence>{adding && <AddMethod stages={data.stages} onClose={() => setAdding(false)} />}</AnimatePresence>
    </div>
  )
}

function AddMethod({ stages, onClose }: { stages: Stage[]; onClose: () => void }) {
  const [text, setText] = useState('')
  const [card, setCard] = useState<MethodCard | null>(null)
  const [source, setSource] = useState('')
  const ai = useAi()
  const qc = useQueryClient()
  const draft = useMutation({
    mutationFn: () => api.methodDraft(text),
    onSuccess: (r) => { setCard(r.card); setSource(r.source) },
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  const save = useMutation({
    mutationFn: () => api.saveMethod(card!, text),
    onSuccess: (m) => { qc.invalidateQueries({ queryKey: ['methods'] }); ai.toast(`“${m.name}” kutubxonaga qo'shildi va ssenariylarda taklif qilinadi`); onClose() },
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  const upd = (p: Partial<MethodCard>) => setCard((c) => (c ? { ...c, ...p } : c))

  return (
    <Modal wide title="O'z metodingizni qo'shing" subtitle="O'z so'zlaringiz bilan yozing — AI uni kartochkaga aylantiradi, siz tekshirib tasdiqlaysiz" onClose={onClose}
      footer={card
        ? <><Button variant="ghost" onClick={() => setCard(null)}>Orqaga</Button><Button variant="primary" icon={BadgeCheck} loading={save.isPending} onClick={() => save.mutate()}>Tasdiqlash va qo'shish</Button></>
        : <><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" icon={Sparkles} disabled={text.trim().length < 15} loading={draft.isPending} onClick={() => draft.mutate()}>AI kartochka</Button></>}>
      {!card ? (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} autoFocus
            placeholder="Masalan: Sinfni 4 guruhga bo'laman, har guruh bitta masalani yechib qog'ozga yozadi. Keyin qog'ozlar soat strelkasi bo'yicha almashadi va har guruh boshqasining yechimidagi xatoni topadi..."
            className="w-full rounded-xl p-3 text-sm leading-relaxed ring-1 ring-line-strong outline-none focus:ring-firuza-500" />
          <p className="mt-2 text-xs text-faint">Matn AI ga o'quvchi ma'lumotisiz yuboriladi.</p>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-mute">{source === 'gpt' ? <><Sparkles className="size-3.5 text-indigo-600" />AI tuzgan kartochka — tahrirlashingiz mumkin</> : 'Shablon asosida tuzildi — tekshirib chiqing'}</div>
          <Field label="Nomi"><input value={card.name} onChange={(e) => upd({ name: e.target.value })} className="h-10 w-full rounded-lg px-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500" /></Field>
          <Field label="Qisqacha"><input value={card.short} onChange={(e) => upd({ short: e.target.value })} className="h-10 w-full rounded-lg px-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500" /></Field>
          <Field label="Dars bosqichlari">
            <div className="flex flex-wrap gap-1.5">
              {stages.map((s) => {
                const on = card.stages.includes(s.key)
                return <button key={s.key} onClick={() => upd({ stages: on ? card.stages.filter((x) => x !== s.key) : [...card.stages, s.key] })}
                  className={cn('rounded-lg px-2.5 py-1 text-[13px] ring-1', on ? 'bg-firuza-500 text-white ring-firuza-500' : 'text-ink-2 ring-line-strong hover:ring-firuza-300')}>{s.name}</button>
              })}
            </div>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Shakl">
              <select value={card.form} onChange={(e) => upd({ form: e.target.value })} className="h-10 w-full rounded-lg px-3 text-sm ring-1 ring-line-strong outline-none">
                {['Sinf', 'Guruh', 'Juftlik', 'Yakka'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Daqiqa"><input value={card.minutes} onChange={(e) => upd({ minutes: e.target.value })} className="h-10 w-full rounded-lg px-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500" /></Field>
          </div>
          <Field label="Qadamlar (har biri yangi qatorda)">
            <textarea value={card.steps.join('\n')} onChange={(e) => upd({ steps: e.target.value.split('\n') })} rows={4} className="w-full rounded-lg p-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500" />
          </Field>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1.5 text-[13px] font-medium text-ink-2">{label}</div>{children}</div>
}
