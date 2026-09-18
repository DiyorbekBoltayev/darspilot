import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'bot'; text: string }

const GREETING: Msg = {
  role: 'bot',
  text: "Salom! Men DarsPilot yordamchisiman. Tizim qanday ishlashi, qog'ozli ish qanday tekshirilishi yoki ma'lumotlar maxfiyligi haqida so'rang — faqat mahsulot haqidagi aniq faktlarga tayanib javob beraman.",
}

function useChat() {
  const [msgs, setMsgs] = useState<Msg[]>([GREETING])
  const [busy, setBusy] = useState(false)
  const suggestions = useQuery({ queryKey: ['chat-suggestions'], queryFn: () => api.chatSuggestions(), staleTime: Infinity })
  const [tips, setTips] = useState<string[] | null>(null)

  const send = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const history = msgs.slice(-6).map((m) => ({ role: m.role, text: m.text }))
      const res = await api.chat(q, history)
      setMsgs((m) => [...m, { role: 'bot', text: res.javob }])
      setTips(res.takliflar?.length ? res.takliflar : null)
    } catch {
      setMsgs((m) => [...m, { role: 'bot', text: "Javob olishda uzilish bo'ldi. Biroz keyin yana urinib ko'ring." }])
    } finally {
      setBusy(false)
    }
  }
  return { msgs, busy, send, tips: tips ?? suggestions.data?.takliflar ?? [], ai: suggestions.data?.ai ?? false }
}

function Thread({ msgs, busy, tips, send, compact }: ReturnType<typeof useChat> & { compact?: boolean }) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, busy])

  return (
    <>
      <div className={cn('flex-1 space-y-3 overflow-y-auto p-4', compact ? 'max-h-[min(58vh,420px)]' : 'max-h-[420px] min-h-[260px]')}>
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed',
              m.role === 'user' ? 'bg-indigo-700 text-white' : 'bg-sunken text-ink ring-1 ring-line')}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl bg-sunken px-3.5 py-3 ring-1 ring-line">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="size-1.5 rounded-full bg-firuza-500"
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {tips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
          {tips.slice(0, 3).map((t) => (
            <button key={t} onClick={() => send(t)} disabled={busy}
              className="rounded-full bg-firuza-50 px-2.5 py-1 text-[12px] text-firuza-700 transition-colors hover:bg-firuza-100 disabled:opacity-50">
              {t}
            </button>
          ))}
        </div>
      )}

      <form className="flex items-center gap-2 border-t border-line p-3"
        onSubmit={(e) => { e.preventDefault(); send(text); setText('') }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Savolingizni yozing…"
          className="h-10 min-w-0 flex-1 rounded-xl bg-surface px-3 text-[14px] text-ink ring-1 ring-line-strong outline-none placeholder:text-faint focus:ring-firuza-400" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Yuborish"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-firuza-600 text-white transition-colors hover:bg-firuza-700 disabled:opacity-40">
          <Send className="size-4" />
        </button>
      </form>
    </>
  )
}

/** Sahifaga o'rnatilgan suhbat oynasi. */
export function ChatPanel() {
  const chat = useChat()
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg bg-firuza-50 text-firuza-600"><Sparkles className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">DarsPilot yordamchisi</div>
          <div className="text-[12px] text-faint">{chat.ai ? 'Javoblar mahsulot faktlariga asoslanadi' : 'Tayyor javoblar rejimi'}</div>
        </div>
      </div>
      <Thread {...chat} />
    </div>
  )
}

/** Ekran burchagidagi suzuvchi tugma va oyna. */
export function ChatBubble() {
  const [open, setOpen] = useState(false)
  const chat = useChat()
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 bottom-20 z-50 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_24px_60px_-20px_rgba(19,32,43,0.4)] ring-1 ring-line sm:right-6 sm:bottom-24">
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span className="grid size-8 place-items-center rounded-lg bg-firuza-50 text-firuza-600"><Sparkles className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">Savolingiz bormi?</div>
                <div className="text-[12px] text-faint">Tizim qanday ishlashini so'rang</div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Yopish" className="text-faint hover:text-ink"><X className="size-4" /></button>
            </div>
            <Thread {...chat} compact />
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((v) => !v)} aria-label="AI yordamchi"
        className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full bg-indigo-700 py-3 pr-4 pl-3.5 text-[13.5px] font-medium text-white shadow-[0_14px_34px_-12px_rgba(35,50,140,0.75)] transition-transform hover:scale-[1.03] sm:right-6 sm:bottom-6">
        {open ? <X className="size-4.5" /> : <MessageCircle className="size-4.5" />}
        <span className="hidden sm:inline">{open ? 'Yopish' : 'AI dan so\'rang'}</span>
      </button>
    </>
  )
}
