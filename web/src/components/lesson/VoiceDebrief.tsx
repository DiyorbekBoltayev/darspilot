import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Keyboard, LoaderCircle, Mic, NotebookPen, RefreshCw, ShieldCheck, Sparkles, Square, ThumbsUp, TriangleAlert } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonDebrief } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Button, Card, CardHeader } from '@/components/ui'

type Rec = { recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; started: number }

const TAG: Record<string, { label: string; cls: string }> = {
  kuchaydi: { label: 'kuchaydi', cls: 'bg-firuza-50 text-firuza-700 ring-firuza-200' },
  qiynaldi: { label: 'qiynaldi', cls: 'bg-terra-50 text-terra-600 ring-terra-200' },
  "e'tibor": { label: "e'tibor", cls: 'bg-oltin-50 text-oltin-600 ring-oltin-100' },
}

/**
 * «Dars qanday o'tdi» — o'qituvchi 20–30 soniya erkin gapiradi, AI uni tuzilgan xulosaga aylantiradi:
 * nima yaxshi ketdi, kim qiynaldi, keyingi darsga nima kerak. Raqamli tahlilning yonidagi jonli qatlam.
 */
export default function VoiceDebrief({ lessonId, saved, onSaved }: { lessonId: number; saved: LessonDebrief | null; onSaved: () => void }) {
  const ai = useAi()
  const qc = useQueryClient()
  const rec = useRef<Rec | null>(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setSeconds(Math.floor((performance.now() - (rec.current?.started ?? 0)) / 1000)), 250)
    return () => clearInterval(t)
  }, [recording])
  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), [])

  const done = (d: LessonDebrief) => {
    qc.setQueryData(['lesson', lessonId], (old: unknown) => (old && typeof old === 'object' ? { ...old, debrief: d } : old))
    setText('')
    setTyping(false)
    onSaved()
    ai.toast(d.manba === 'gpt' ? 'Dars tahlili tayyor' : 'Tahlil saqlandi (AI kalitsiz — matn o‘z holicha)')
  }
  const voice = useMutation({
    mutationFn: ({ blob, name }: { blob: Blob; name: string }) => ai.run('debrief', () => api.debriefVoice(lessonId, blob, name)),
    onSuccess: done,
    onError: (e) => { ai.toast(e.message, 'bad'); setTyping(true) },
  })
  const write = useMutation({
    mutationFn: () => ai.run('debrief', () => api.debriefText(lessonId, text)),
    onSuccess: done,
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  const clear = useMutation({
    mutationFn: () => api.clearDebrief(lessonId),
    onSuccess: () => { qc.setQueryData(['lesson', lessonId], (old: unknown) => (old && typeof old === 'object' ? { ...old, debrief: null } : old)); onSaved() },
  })

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t))
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      const r: Rec = { recorder, stream, chunks: [], started: performance.now() }
      recorder.ondataavailable = (e) => { if (e.data.size) r.chunks.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const mime = recorder.mimeType || 'audio/webm'
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(r.chunks, { type: mime })
        if (blob.size > 0) voice.mutate({ blob, name: `tahlil.${ext}` })
      }
      rec.current = r
      recorder.start()
      setSeconds(0)
      setRecording(true)
    } catch {
      ai.toast('Mikrofonga ruxsat berilmadi — tahlilni yozib kiriting', 'bad')
      setTyping(true)
    }
  }
  const stop = () => {
    rec.current?.recorder.stop()
    setRecording(false)
  }
  const busy = voice.isPending || write.isPending

  if (saved && !recording && !busy) return <Saved data={saved} onRedo={() => clear.mutate()} redoing={clear.isPending} />

  return (
    <Card>
      <CardHeader icon={Mic} title="Ovozli dars tahlili" hint="«Dars yaxshi o'tdi, Aziza qavslarda qiynaldi…» deb ayting" />
      <div className="p-4 pt-4 sm:p-5">
        <div className="flex items-center gap-3">
          {recording ? (
            <button onClick={stop} className="relative grid size-14 shrink-0 place-items-center rounded-full bg-terra-500 text-white" aria-label="To'xtatish">
              <motion.span className="absolute inset-0 rounded-full bg-terra-500" animate={{ scale: [1, 1.45], opacity: [0.45, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <Square className="relative size-5 fill-current" />
            </button>
          ) : (
            <button onClick={start} disabled={!canRecord || busy} className="grid size-14 shrink-0 place-items-center rounded-full bg-indigo-600 text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)] hover:bg-indigo-700 disabled:opacity-40" aria-label="Yozishni boshlash">
              {busy ? <LoaderCircle className="size-6 animate-spin" /> : <Mic className="size-6" />}
            </button>
          )}
          <div className="min-w-0 flex-1 text-sm">
            {recording ? <div className="font-medium text-terra-600">Yozilmoqda… <span className="num">{seconds}s</span></div>
              : busy ? <div className="text-ink-2">AI tahlil qilmoqda…</div>
                : <div className="text-ink-2">{canRecord ? "Bosing va dars qanday o'tganini ayting" : "Brauzer mikrofonni qo'llamaydi"}</div>}
            <button onClick={() => setTyping((v) => !v)} className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] text-firuza-700 hover:underline">
              <Keyboard className="size-3.5" />{typing ? 'Yozishni yopish' : 'Yoki yozib kiriting'}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {typing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 space-y-2">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
                  placeholder="Dars qanday o'tdi? Kim qiynaldi, keyingi darsga nima kerak?"
                  className="w-full resize-y rounded-xl bg-surface px-3 py-2 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500" />
                <Button variant="primary" icon={Sparkles} className="w-full sm:w-auto" loading={write.isPending} disabled={!text.trim()} onClick={() => write.mutate()}>
                  Tahlil qilish
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex items-start gap-2 text-[11.5px] leading-snug text-faint">
          <ShieldCheck className="mt-px size-3.5 shrink-0" />Ovoz faqat matnga aylantiriladi va saqlanmaydi; xulosa darsga biriktiriladi va keyingi ssenariyda hisobga olinadi.
        </div>
      </div>
    </Card>
  )
}

function Saved({ data, onRedo, redoing }: { data: LessonDebrief; onRedo: () => void; redoing: boolean }) {
  return (
    <Card>
      <CardHeader icon={Mic} title="O'qituvchi tahlili" hint={`${data.source === 'ovoz' ? 'Ovozdan' : 'Matndan'} · ${data.created_at}`}
        action={<Button icon={RefreshCw} loading={redoing} onClick={onRedo} className="px-2.5" aria-label="Qaytadan" />} />
      <div className="space-y-4 p-4 sm:p-5">
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[15px] leading-relaxed text-ink">{data.xulosa}</motion.p>

        {!!(data.yaxshi.length || data.qiyinchilik.length) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Bullets icon={ThumbsUp} title="Yaxshi ketdi" items={data.yaxshi} tone="firuza" />
            <Bullets icon={TriangleAlert} title="Qiyinchilik" items={data.qiyinchilik} tone="terra" />
          </div>
        )}

        {!!data.oquvchilar.length && (
          <div>
            <div className="mb-2 text-[12.5px] font-semibold tracking-wide text-mute uppercase">O'quvchilar</div>
            <div className="flex flex-wrap gap-1.5">
              {data.oquvchilar.map((p, i) => (
                <motion.div key={`${p.ism}-${i}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className={cn('inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] ring-1', TAG[p.holat]?.cls ?? TAG["e'tibor"].cls)}>
                  <span className="font-medium">{p.ism}</span>
                  {p.izoh && <span className="truncate opacity-80">— {p.izoh}</span>}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!!data.keyingi_dars.length && (
          <div className="rounded-xl bg-indigo-50 p-3.5 ring-1 ring-indigo-100">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-indigo-700"><ArrowRight className="size-3.5" />Keyingi darsga</div>
            <ul className="mt-1.5 space-y-1">
              {data.keyingi_dars.map((x, i) => <li key={i} className="flex gap-2 text-[13.5px] text-ink-2"><Check className="mt-0.5 size-3.5 shrink-0 text-indigo-600" />{x}</li>)}
            </ul>
          </div>
        )}

        {data.uy_vazifasi && (
          <div className="flex items-start gap-2 rounded-xl bg-sunken p-3 text-[13px] text-ink-2 ring-1 ring-line">
            <NotebookPen className="mt-0.5 size-4 shrink-0 text-faint" /><span><b className="font-semibold text-ink">Uy vazifasi:</b> {data.uy_vazifasi}</span>
          </div>
        )}

        <details className="text-[12.5px] text-mute">
          <summary className="cursor-pointer select-none hover:text-ink-2">Aytilgan matn</summary>
          <p className="mt-1.5 rounded-xl bg-sunken px-3 py-2 text-ink-2 italic ring-1 ring-line">“{data.transcript}”</p>
        </details>
      </div>
    </Card>
  )
}

function Bullets({ icon: Icon, title, items, tone }: { icon: typeof ThumbsUp; title: string; items: string[]; tone: 'firuza' | 'terra' }) {
  if (!items.length) return null
  return (
    <div className={cn('rounded-xl p-3.5 ring-1', tone === 'firuza' ? 'bg-firuza-50 ring-firuza-200' : 'bg-terra-50 ring-terra-200')}>
      <div className={cn('flex items-center gap-1.5 text-[12.5px] font-semibold', tone === 'firuza' ? 'text-firuza-700' : 'text-terra-600')}>
        <Icon className="size-3.5" />{title}
      </div>
      <ul className="mt-1.5 space-y-1">
        {items.map((x, i) => <li key={i} className="text-[13.5px] leading-snug text-ink-2">• {x}</li>)}
      </ul>
    </div>
  )
}
