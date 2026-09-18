import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Check, Printer, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Landing hero animatsiyasi: chop etish → surat → AI baho. Uch bosqich aylanib turadi. */
const PHASES = [
  { key: 'chop', icon: Printer, title: 'Chop etish', text: '1 A4 = 4 kartochka, ikkala tomoni ishlatiladi' },
  { key: 'surat', icon: Camera, title: 'Bitta surat', text: 'ArUco markerlar 10 tagacha ishni ajratadi' },
  { key: 'baho', icon: Sparkles, title: 'AI baho va feedback', text: 'Yopiq javob + qo\'lda yozilgan yechim' },
] as const

const NAMES = ['Aziza K.', 'Bekzod T.', 'Dilshod R.', 'Farangiz U.']
const BUBBLES = [0, 1, 2, 3, 4, 5]

export default function HeroScene() {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 3600)
    return () => clearInterval(id)
  }, [])
  const P = PHASES[phase]

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(10,138,145,0.14),transparent_70%)]" />
      <div className="card relative overflow-hidden p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          {PHASES.map((p, i) => (
            <button key={p.key} onClick={() => setPhase(i)} aria-label={p.title}
              className={cn('h-1.5 flex-1 rounded-full transition-colors', i === phase ? 'bg-firuza-500' : 'bg-line')}>
              <span className="sr-only">{p.title}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-5 h-[248px] sm:h-[268px]">
          <AnimatePresence mode="wait">
            {phase === 0 && <Sheet key="chop" />}
            {phase === 1 && <Scan key="surat" />}
            {phase === 2 && <Grade key="baho" />}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-start gap-3 border-t border-line pt-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-firuza-50 text-firuza-600"><P.icon className="size-4.5" /></span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink">{P.title}</div>
            <div className="text-[13px] text-mute">{P.text}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35 },
}

/** 1-bosqich: A4 varaq 4 ta nomli kartochkaga bo'lingan. */
function Sheet() {
  return (
    <motion.div {...fade} className="absolute inset-0 grid place-items-center">
      <div className="relative w-[196px] rounded-xl bg-white p-2 shadow-[0_18px_40px_-18px_rgba(19,32,43,0.35)] ring-1 ring-line">
        <div className="grid grid-cols-2 gap-1.5">
          {NAMES.map((n, i) => (
            <motion.div key={n} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 + i * 0.1, duration: 0.3 }}
              className="rounded-lg bg-paper p-2 ring-1 ring-line">
              <div className="h-3 rounded bg-indigo-700/90 px-1 text-[5.5px] leading-3 font-semibold text-white">{n}</div>
              <div className="mt-1 space-y-[3px]">
                <div className="h-1 w-full rounded bg-line" />
                <div className="h-1 w-4/5 rounded bg-line" />
                <div className="h-1 w-3/5 rounded bg-line" />
              </div>
              <div className="mt-1.5 rounded bg-firuza-50 px-1 py-[3px] text-[5px] leading-[7px] font-medium text-firuza-700">
                Senga — o'tgan ishingdan
              </div>
            </motion.div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-line-strong" />
        <div className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-line-strong" />
      </div>
      <div className="mt-3 text-[12px] text-faint">Har o'quvchiga ismi bilan — yirtish shart emas</div>
    </motion.div>
  )
}

/** 2-bosqich: kartochkaning orqa tomoni telefon kamerasida skanerlanadi. */
function Scan() {
  return (
    <motion.div {...fade} className="absolute inset-0 grid place-items-center">
      <div className="relative w-[210px] rounded-[22px] bg-ink/90 p-2.5 shadow-[0_18px_40px_-18px_rgba(19,32,43,0.45)]">
        <div className="relative overflow-hidden rounded-[14px] bg-paper p-2.5">
          {/* javob bloki */}
          <div className="relative rounded-lg bg-white p-2 ring-1 ring-line">
            {[['left-1 top-1'], ['right-1 top-1'], ['left-1 bottom-1'], ['right-1 bottom-1']].map(([pos], i) => (
              <motion.span key={pos} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                className={cn('absolute size-3 rounded-[2px] bg-ink', pos)} />
            ))}
            <div className="mx-4 space-y-1.5 py-1">
              {BUBBLES.map((r) => (
                <div key={r} className="flex items-center gap-1.5">
                  <span className="num w-2 text-[6px] text-faint">{r + 1}</span>
                  {[0, 1, 2, 3].map((c) => (
                    <motion.span key={c} initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
                      animate={{ backgroundColor: (r + c) % 4 === 1 ? 'rgb(19,32,43)' : 'rgba(255,255,255,0)' }}
                      transition={{ delay: 0.5 + r * 0.09, duration: 0.25 }}
                      className="size-2 rounded-full ring-1 ring-ink/25" />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* yechim maydoni */}
          <div className="mt-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-dashed ring-line-strong">
            <div className="text-[5.5px] font-semibold text-indigo-700">YECHIM (5-savol)</div>
            <div className="mt-1 space-y-[3px]">
              <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ delay: 0.7, duration: 0.5 }} className="h-[3px] rounded bg-ink/40" />
              <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ delay: 0.9, duration: 0.5 }} className="h-[3px] rounded bg-ink/40" />
            </div>
          </div>
          {/* skaner nuri */}
          <motion.div initial={{ top: '-10%' }} animate={{ top: '110%' }} transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
            className="pointer-events-none absolute inset-x-0 h-10 bg-[linear-gradient(to_bottom,transparent,rgba(10,138,145,0.28),transparent)]" />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-white/70">
          <Camera className="size-3" />10 ta kartochka · 1 surat
        </div>
      </div>
    </motion.div>
  )
}

/** 3-bosqich: rubrika bo'yicha baho va uch xil feedback. */
function Grade() {
  const rubric = [
    { name: 'Amal/ifoda', ball: 2 },
    { name: 'Hisob-kitob', ball: 2 },
    { name: 'Javob birligi', ball: 1 },
  ]
  const feedback = [
    { who: "O'quvchiga", text: 'Javobing to‘g‘ri — endi bosqichlarni ham yozib bor.', tone: 'bg-firuza-50 text-firuza-700' },
    { who: 'Ota-onaga', text: 'Uyda 5 daqiqa: amallar tartibi mashqi.', tone: 'bg-indigo-50 text-indigo-700' },
    { who: "O'qituvchiga", text: 'Takrorlashda qavs bilan ifoda tuzish.', tone: 'bg-oltin-50 text-oltin-600' },
  ]
  return (
    <motion.div {...fade} className="absolute inset-0 flex flex-col justify-center gap-3">
      <div className="rounded-xl bg-sunken p-3 ring-1 ring-line">
        <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600">
          <span>Qo'lda yozilgan yechim · AI rubrika</span><span className="num text-ink">5/6</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {rubric.map((r, i) => (
            <motion.div key={r.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }}
              className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-line">
              <span className="flex-1 text-[11.5px] text-ink-2">{r.name}</span>
              {[0, 1].map((b) => <span key={b} className={cn('size-2 rotate-45 rounded-[2px]', b < r.ball ? 'bg-firuza-500' : 'bg-line-strong')} />)}
              <span className="num w-7 text-right text-[11px] font-semibold text-ink">{r.ball}/2</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {feedback.map((f, i) => (
          <motion.div key={f.who} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.12 }}
            className={cn('rounded-lg p-2', f.tone)}>
            <div className="flex items-center gap-1 text-[10px] font-semibold"><Check className="size-3" />{f.who}</div>
            <div className="mt-0.5 text-[10.5px] leading-snug opacity-90">{f.text}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
