import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { FLOW_HALF_W, createFlow, gateX } from './flowScene'
import { webglAvailable } from './support'

/** Masala yechish bosqichlari bo'yicha "bilim oqimi" va har darvoza ostida foiz yorlig'i. */
export default function KnowledgeFlow({ steps }: { steps: { name: string; pct: number }[] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supported = useMemo(() => webglAvailable(), [])
  const key = steps.map((s) => `${s.name}:${s.pct}`).join('|')
  const xs = gateX(steps.length)

  useEffect(() => {
    if (!supported || !hostRef.current || !canvasRef.current || !steps.length) return
    return createFlow(hostRef.current, canvasRef.current, steps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, supported])

  return (
    <div className="relative">
      <div ref={hostRef} className="relative h-56 w-full sm:h-64">
        {supported && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}
      </div>
      <div className="relative mt-1 h-20 sm:h-14">
        {steps.map((s, i) => (
          <div
            key={s.name}
            className="absolute top-0 -translate-x-1/2 text-center"
            style={{ left: `${((xs[i] + FLOW_HALF_W) / (2 * FLOW_HALF_W)) * 100}%`, width: `${Math.max(9, 100 / steps.length - 1)}%` }}
          >
            <div className={cn('num text-base font-semibold sm:text-lg', s.pct < 50 ? 'text-terra-500' : s.pct < 75 ? 'text-oltin-600' : 'text-firuza-600')}>
              {s.pct}%
            </div>
            <div className="text-[10px] leading-tight text-mute sm:text-[11px]">{s.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
