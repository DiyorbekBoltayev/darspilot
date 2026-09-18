import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, CircleX, Sparkles, X } from 'lucide-react'
import type { SwarmKind } from './fx/swarmScene'
import { AiContext } from './ai-context'
import { reducedMotion, webglAvailable } from './fx/support'
import { cn } from '@/lib/utils'

const MESSAGES: Record<SwarmKind, string[]> = {
  create: ['4 darajali masala matnlari yozilmoqda…', 'Sonlar va javoblar kod bilan tekshirilmoqda…', 'Nomli kartochkalar PDF tayyorlanmoqda…'],
  scan: ['Suratdagi ArUco markerlar qidirilmoqda…', 'Chiziqlar perspektivadan tekislanmoqda…', "Doirachalar va son panjarasi o'qilmoqda…"],
  demo: ["Sinov surati yaratilmoqda (10 ta to'ldirilgan chiziq)…", 'Markerlar qidirilmoqda…', "Javoblar o'qilmoqda…"],
  grade: ["Har bir o'quvchiga bosqichli tashxis qo'yilmoqda…", "O'quvchi, ota-ona va o'qituvchi uchun feedback yozilmoqda…", 'Sinf xulosasi tayyorlanmoqda…'],
  report: ["Haftaning diagnostikalari va e'tibor jurnali yig'ilmoqda…", "Tizimli xatolar va ilg'or guruh aniqlanmoqda…", 'Haftalik xulosa yozilmoqda…'],
  homework: ["Daftar sahifasi tekislanmoqda…", "Har bir mashq raqami bo'yicha ajratilmoqda…", "To'g'ri-xato va xato turi aniqlanmoqda…"],
  lesson: ["Ustuvorlik bali hisoblanmoqda: kim bilan ishlash kerak…", 'Har bosqichga metod tanlanmoqda…', "Guruhlar va qismlar taqsimlanmoqda…", '45 daqiqalik ssenariy yig\'ilmoqda…'],
}

const TITLES: Record<SwarmKind, string> = {
  create: 'Diagnostika yaratilmoqda',
  scan: 'Suratlar skanerlanmoqda',
  demo: 'Demo surat skanerlanmoqda',
  grade: 'AI baholamoqda',
  lesson: 'Keyingi dars ssenariysi',
  report: 'Haftalik xulosa',
  homework: 'Uy vazifasi tekshirilmoqda',
}

type Toast = { id: number; text: string; tone: 'good' | 'bad' }

export function AiProvider({ children }: { children: ReactNode }) {
  // Taqdimot videosi va skrinshotlar uchun: manzilga ?fxdemo=grade (create, scan, demo, lesson) qo'shilsa overley ochiladi
  const [kind, setKind] = useState<SwarmKind | null>(() => {
    const demo = new URLSearchParams(window.location.search).get('fxdemo')
    return demo && demo in MESSAGES ? (demo as SwarmKind) : null
  })
  const [busy, setBusy] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const toast = useCallback((text: string, tone: 'good' | 'bad' = 'good') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200)
  }, [])

  const run = useCallback(async <T,>(k: SwarmKind, fn: () => Promise<T>) => {
    setBusy(true)
    let shownAt = 0
    // Tez tugaydigan amallarda overley "miltillamasligi" uchun kechikib ochiladi va kamida 1,6 s turadi
    const timer = setTimeout(() => {
      shownAt = performance.now()
      setKind(k)
    }, 350)
    try {
      return await fn()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Xatolik yuz berdi', 'bad')
      throw e
    } finally {
      clearTimeout(timer)
      if (shownAt) {
        const left = 1600 - (performance.now() - shownAt)
        if (left > 0) await new Promise((r) => setTimeout(r, left))
      }
      setKind(null)
      setBusy(false)
    }
  }, [toast])

  const value = useMemo(() => ({ run, toast, busy }), [run, toast, busy])

  return (
    <AiContext.Provider value={value}>
      {children}
      <AnimatePresence>{kind && <Overlay key="ai" kind={kind} />}</AnimatePresence>
      <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift',
                t.tone === 'good' ? 'border-firuza-200 bg-surface text-ink' : 'border-terra-100 bg-surface text-ink',
              )}
            >
              {t.tone === 'good' ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-firuza-500" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-terra-500" />}
              <span className="flex-1">{t.text}</span>
              <button className="text-faint hover:text-ink" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AiContext.Provider>
  )
}

function Overlay({ kind }: { kind: SwarmKind }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mi, setMi] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const msgs = MESSAGES[kind]

  useEffect(() => {
    const a = setInterval(() => setMi((i) => (i + 1) % msgs.length), 2400)
    const t0 = performance.now()
    const b = setInterval(() => setElapsed((performance.now() - t0) / 1000), 100)
    return () => {
      clearInterval(a)
      clearInterval(b)
    }
  }, [msgs.length])

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas || !webglAvailable() || reducedMotion()) return
    let stop: (() => void) | undefined
    let cancelled = false
    import('./fx/swarmScene').then(({ createSwarm }) => {
      if (!cancelled) stop = createSwarm(host, canvas, kind)
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [kind])

  return (
    <motion.div
      ref={hostRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      className="fixed inset-0 z-[60] bg-paper/95 backdrop-blur-sm"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-0 bottom-[9vh] flex flex-col items-center px-6 text-center">
        <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-2 shadow-card ring-1 ring-line">
          <Sparkles className="size-3.5 text-firuza-500" /> DarsPilot AI
          <span className="tabular-nums text-faint">{elapsed.toFixed(1)} s</span>
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-indigo-600 sm:text-3xl">{TITLES[kind]}</h2>
        <div className="mt-3 h-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={mi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-ink-2"
            >
              {msgs[mi]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-5 h-1.5 w-64 overflow-hidden rounded-full bg-firuza-100">
          <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,transparent,#0A8A91,#23328C,transparent)] bg-[length:200%_100%]" />
        </div>
      </div>
    </motion.div>
  )
}
