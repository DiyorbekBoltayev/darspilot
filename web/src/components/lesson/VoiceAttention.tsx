import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation } from '@tanstack/react-query'
import { Check, Keyboard, LoaderCircle, Mic, Search, ShieldCheck, Square, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { HeardNames } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Button, Card, CardHeader } from '@/components/ui'

type Rec = { recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; started: number }

/** docx 9.4: "Bugun Aziza, Bekzod va Dilshod bilan ishladim" — ovoz → matn → ro'yxatdagi ismlar → o'qituvchi tasdig'i. */
export default function VoiceAttention({ lessonId, onMarked }: { lessonId: number; onMarked: () => void }) {
  const ai = useAi()
  const rec = useRef<Rec | null>(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [heard, setHeard] = useState<HeardNames | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setSeconds(Math.floor((performance.now() - (rec.current?.started ?? 0)) / 1000)), 250)
    return () => clearInterval(t)
  }, [recording])
  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), [])

  const show = (r: HeardNames) => {
    setHeard(r)
    setPicked(new Set(r.matches.map((m) => m.id)))
    if (!r.matches.length && !r.ambiguous.length) ai.toast("Ro'yxatdan ism topilmadi — qaytadan ayting yoki yozing", 'bad')
  }
  const voice = useMutation({
    mutationFn: ({ blob, name }: { blob: Blob; name: string }) => api.attentionVoice(lessonId, blob, name),
    onSuccess: show,
    onError: (e) => { ai.toast(e.message, 'bad'); setTyping(true) },
  })
  const parse = useMutation({ mutationFn: () => api.attentionText(lessonId, text), onSuccess: show, onError: (e) => ai.toast(e.message, 'bad') })
  const mark = useMutation({
    mutationFn: () => api.markAttention(lessonId, [...picked]),
    onSuccess: () => { ai.toast(`${picked.size} o'quvchi e'tibor jurnaliga yozildi`); setHeard(null); setText(''); onMarked() },
    onError: (e) => ai.toast(e.message, 'bad'),
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
        if (blob.size > 0) voice.mutate({ blob, name: `ovoz.${ext}` })
      }
      rec.current = r
      recorder.start()
      setSeconds(0)
      setRecording(true)
      setHeard(null)
    } catch {
      ai.toast("Mikrofonga ruxsat berilmadi — ismlarni yozib kiriting", 'bad')
      setTyping(true)
    }
  }
  const stop = () => {
    rec.current?.recorder.stop()
    setRecording(false)
  }
  const toggle = (id: number) => setPicked((p) => {
    const n = new Set(p)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const busy = voice.isPending || parse.isPending

  return (
    <Card>
      <CardHeader icon={Mic} title="Ovozli e'tibor jurnali" hint="«Bugun Aziza va Bekzod bilan ishladim» deb ayting" />
      <div className="p-5 pt-4">
        <div className="flex items-center gap-3">
          {recording ? (
            <button onClick={stop} className="relative grid size-14 shrink-0 place-items-center rounded-full bg-terra-500 text-white" aria-label="To'xtatish">
              <motion.span className="absolute inset-0 rounded-full bg-terra-500" animate={{ scale: [1, 1.45], opacity: [0.45, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <Square className="relative size-5 fill-current" />
            </button>
          ) : (
            <button onClick={start} disabled={!canRecord || busy} className="grid size-14 shrink-0 place-items-center rounded-full bg-firuza-500 text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)] hover:bg-firuza-600 disabled:opacity-40" aria-label="Yozishni boshlash">
              {voice.isPending ? <LoaderCircle className="size-6 animate-spin" /> : <Mic className="size-6" />}
            </button>
          )}
          <div className="min-w-0 flex-1 text-sm">
            {recording ? <div className="font-medium text-terra-600">Yozilmoqda… <span className="num">{seconds}s</span></div>
              : voice.isPending ? <div className="text-ink-2">Matnga aylantirilmoqda…</div>
                : <div className="text-ink-2">{canRecord ? 'Bosing, ayting, yana bosing' : "Brauzer mikrofonni qo'llamaydi"}</div>}
            <button onClick={() => setTyping((v) => !v)} className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] text-firuza-700 hover:underline">
              <Keyboard className="size-3.5" />{typing ? 'Yozishni yopish' : 'Yoki yozib kiriting'}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {typing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && parse.mutate()}
                  placeholder="Aziza, Bekzod, Dilshod R." className="h-10 min-w-0 flex-1 rounded-xl bg-surface px-3 text-sm ring-1 ring-line-strong outline-none focus:ring-firuza-500" />
                <Button icon={Search} loading={parse.isPending} disabled={!text.trim()} onClick={() => parse.mutate()} className="px-3" aria-label="Topish" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {heard && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-sunken px-3 py-2 text-[13px] text-ink-2 italic ring-1 ring-line">“{heard.transcript}”</div>
            <div className="flex flex-wrap gap-1.5">
              {heard.matches.map((m) => (
                <button key={m.id} onClick={() => toggle(m.id)}
                  className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] ring-1 transition-colors',
                    picked.has(m.id) ? 'bg-firuza-500 text-white ring-firuza-500' : 'bg-surface text-ink-2 ring-line-strong')}>
                  {picked.has(m.id) ? <Check className="size-3.5" /> : <X className="size-3.5" />}{m.name}
                </button>
              ))}
            </div>
            {heard.ambiguous.map((a) => (
              <div key={a.heard} className="rounded-xl bg-oltin-50 p-2.5 ring-1 ring-oltin-100">
                <div className="text-[12.5px] text-oltin-600">«{a.heard}» — qaysi biri?</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {a.options.map((o) => (
                    <button key={o.id} onClick={() => toggle(o.id)}
                      className={cn('rounded-lg px-2 py-1 text-[12.5px] ring-1', picked.has(o.id) ? 'bg-firuza-500 text-white ring-firuza-500' : 'bg-surface text-ink ring-line-strong')}>{o.name}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="primary" icon={Check} className="flex-1" disabled={!picked.size} loading={mark.isPending} onClick={() => mark.mutate()}>Tasdiqlash ({picked.size})</Button>
              <Button variant="ghost" onClick={() => setHeard(null)}>Bekor</Button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 text-[11.5px] leading-snug text-faint">
          <ShieldCheck className="mt-px size-3.5 shrink-0" />Ovoz faqat matnga aylantiriladi va saqlanmaydi; ismlar sinf ro'yxati bilan kod ichida solishtiriladi.
        </div>
      </div>
    </Card>
  )
}
