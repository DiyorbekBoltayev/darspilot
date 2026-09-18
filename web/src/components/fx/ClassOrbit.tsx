import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { StudentRow } from '@/lib/types'
import { cn, tone, toneChip } from '@/lib/utils'
import { createOrbit, type OrbitStudent } from './orbitScene'
import { webglAvailable } from './support'

export default function ClassOrbit({ students, gapAlert, className }: { students: StudentRow[]; gapAlert: number; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<HTMLDivElement[]>([])
  const navigate = useNavigate()
  const [hover, setHover] = useState(-1)
  const [ready, setReady] = useState(false)
  const supported = useMemo(() => webglAvailable(), [])

  const data: OrbitStudent[] = useMemo(
    () => students.map((s) => ({ id: s.id, name: s.name, code: s.code, level: s.level, avg: s.avg, gap: s.gap })),
    [students],
  )
  const key = `${gapAlert}|` + data.map((d) => `${d.id}:${d.gap}:${d.avg.toFixed(2)}`).join('|')

  useEffect(() => {
    if (!supported || !hostRef.current || !canvasRef.current || !tipRef.current || !data.length) return
    const stop = createOrbit(hostRef.current, data, gapAlert, {
      canvas: canvasRef.current,
      tip: tipRef.current,
      labels: labelRefs.current,
      onHover: setHover,
      onSelect: (i) => navigate(`/oquvchi/${data[i].id}`),
    })
    const t = requestAnimationFrame(() => setReady(true))
    return () => {
      cancelAnimationFrame(t)
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, supported])

  const s = hover >= 0 ? data[hover] : null
  const ringLabels = ['bugun', '1–2 dars', gapAlert > 3 ? `3–${gapAlert - 1} dars` : '3 dars', `${gapAlert}+ dars`]

  return (
    <div ref={hostRef} className={cn('relative overflow-hidden', className)}>
      {supported ? (
        <canvas ref={canvasRef} className={cn('absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0')} />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-mute">Brauzeringiz WebGL ni qo'llamaydi</div>
      )}
      {ringLabels.map((l, i) => (
        <div
          key={l}
          ref={(el) => { if (el) labelRefs.current[i] = el }}
          className={cn(
            'pointer-events-none absolute top-0 left-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-card ring-1',
            i === 3 ? 'bg-terra-50 text-terra-600 ring-terra-100' : 'bg-surface text-firuza-700 ring-firuza-100',
          )}
        >
          {l}
        </div>
      ))}
      <div ref={tipRef} className="pointer-events-none absolute top-0 left-0 z-10 opacity-0 transition-opacity duration-150" style={{ willChange: 'transform' }}>
        {s && (
          <div className="mb-1 min-w-48 rounded-xl bg-surface px-3.5 py-2.5 shadow-lift ring-1 ring-line">
            <div className="text-sm font-semibold text-ink">{s.name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-mute">
              {s.code} · {s.level}
              <span className={cn('rounded px-1 font-semibold ring-1', toneChip[tone(s.avg)])}>{Math.round(s.avg * 100)}%</span>
            </div>
            <div className={cn('mt-1 text-xs font-medium', s.gap >= gapAlert ? 'text-terra-500' : s.gap === 0 ? 'text-firuza-600' : 'text-ink-2')}>
              {s.gap === 0 ? 'Bugun ishlangan' : `${s.gap} darsdan beri e'tiborsiz`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
