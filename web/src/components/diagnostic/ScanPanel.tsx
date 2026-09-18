import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Camera, Check, CircleCheck, Image as ImageIcon, ListChecks, Pencil, ScanLine, TriangleAlert, Upload, WandSparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { DiagnosticDetail as Detail, DiagnosticRow } from '@/lib/types'
import { LEVEL_NAMES, cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Button, Card, CardHeader, Modal } from '@/components/ui'

const QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'] as const

export function Scanner({ data, onDone, onShowAnswers }: { data: Detail; onDone: () => void; onShowAnswers: () => void }) {
  const ai = useAi()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [last, setLast] = useState<{ found: number; matched: number; flagged: number; errors: string[] } | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  const scan = useMutation({
    mutationFn: (files: File[]) => ai.run('scan', () => api.scan(data.id, files)),
    onSuccess: (r) => { setLast(r); onDone(); ai.toast(`${r.matched} ta javob chizig'i o'qildi`) },
  })
  const demo = useMutation({
    mutationFn: () => ai.run('demo', () => api.demoPhoto(data.id)),
    onSuccess: (r) => { setLast({ ...r, errors: [] }); onDone(); ai.toast(`Demo surat: ${r.matched} ta chiziq o'qildi`) },
  })
  const onFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length) scan.mutate(files)
  }
  const remaining = data.rows.length - data.responses

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div className="space-y-4 xl:col-span-2">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className={cn('relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-surface px-6 py-12 text-center transition-colors',
            drag ? 'border-firuza-500 bg-firuza-50' : 'border-line-strong hover:border-firuza-300')}
        >
          <div className="girih pointer-events-none absolute inset-0 opacity-[0.07]" />
          <div className="relative grid size-16 place-items-center rounded-2xl bg-firuza-500 text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]"><Camera className="size-7" /></div>
          <div className="relative mt-4 text-lg font-semibold text-ink">Suratni yuklang yoki torting</div>
          <p className="relative mt-1 text-sm text-mute">Bir suratda 10 tagacha kartochka · bir nechta surat mumkin · telefonda kamera ochiladi</p>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <Button variant="primary" icon={Upload} className="relative mt-5" loading={scan.isPending}>Surat tanlash</Button>
        </div>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <WandSparkles className="mt-0.5 size-5 shrink-0 text-indigo-600" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">Printer yo'qmi? Demo surat</div>
              <p className="mt-1 text-[13px] text-mute">Javobi yo'q o'quvchilar uchun profiliga mos to'ldirilgan 10 ta chiziqli sun'iy surat yaratiladi va haqiqiy surat kabi skanerlanadi.</p>
              <Button className="mt-3" icon={ImageIcon} disabled={remaining === 0} loading={demo.isPending} onClick={() => demo.mutate()}>
                {remaining === 0 ? 'Barcha javoblar kiritilgan' : `Demo surat (${Math.min(10, remaining)} ta chiziq)`}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Javoblar" value={`${data.responses}/${data.rows.length}`} />
          <MiniStat label="Tekshirish kerak" value={data.flagged} warn={data.flagged > 0} />
          <MiniStat label="Suratlar" value={data.scans.length} />
        </div>
      </div>

      <div className="space-y-4 xl:col-span-3">
        {last && (
          <Card className="p-5 ring-1 ring-firuza-200">
            <div className="flex flex-wrap items-center gap-4">
              <CircleCheck className="size-8 text-firuza-500" />
              <div className="flex-1">
                <div className="text-lg font-semibold text-ink">{last.matched} ta chiziq o'qildi</div>
                <div className="text-sm text-mute">Topildi: {last.found} · {last.flagged ? <span className="font-medium text-oltin-600">{last.flagged} tasini tasdiqlang</span> : 'barchasi ishonchli'}</div>
              </div>
              <Button icon={ListChecks} onClick={onShowAnswers}>Javoblarni ko'rish</Button>
            </div>
            {last.errors.map((e) => <div key={e} className="mt-2 text-sm text-terra-600">{e}</div>)}
          </Card>
        )}
        <Card>
          <CardHeader icon={ScanLine} title="Skanerlangan suratlar" hint="Yashil ramka — ishonchli o'qilgan, sariq — o'qituvchi tasdig'i kerak" />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {data.scans.length === 0 && <p className="text-sm text-mute">Hali surat yuklanmagan.</p>}
            {data.scans.map((s) => (
              <button key={s.id} onClick={() => setZoom(s.url)} className="group relative overflow-hidden rounded-xl bg-sunken ring-1 ring-line">
                <img src={s.url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/70 to-transparent px-3 py-2 text-xs text-white">
                  <span>{s.strips} ta kartochka</span>
                  <a href={s.original} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-white/80 hover:text-white">asl surat</a>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {zoom && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}>
            <img src={zoom} alt="" className="max-h-[90vh] max-w-full rounded-xl shadow-lift" />
            <button className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white" aria-label="Yopish"><X className="size-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MiniStat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="card p-3.5">
      <div className="text-xs text-mute">{label}</div>
      <div className={cn('num mt-1 text-xl font-semibold', warn ? 'text-oltin-600' : 'text-ink')}>{value}</div>
    </div>
  )
}

export function Answers({ data, onSaved }: { data: Detail; onSaved: () => void }) {
  const [edit, setEdit] = useState<DiagnosticRow | null>(null)
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const ai = useAi()
  const qc = useQueryClient()
  const confirm = useMutation({
    mutationFn: (sid: number) => api.confirmResponse(data.id, sid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diagnostic', data.id] }); ai.toast("Tasdiqlandi") },
  })
  const rows = onlyFlagged ? data.rows.filter((r) => Object.keys(r.flags).length) : data.rows

  return (
    <Card className="overflow-hidden">
      <CardHeader icon={ListChecks} title="O'qilgan javoblar" hint="Ishonchsiz o'qilgan kataklar sariq. Bir tegishda tasdiqlang yoki qatorni ochib tuzating."
        action={<label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} className="accent-firuza-500" />Faqat tekshirish kerak</label>} />
      <div className="overflow-x-auto p-3">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-xs text-mute">
              <th className="px-3 py-2 font-medium">№</th>
              <th className="px-3 py-2 font-medium">O'quvchi</th>
              <th className="px-2 py-2 font-medium">Variant</th>
              {QS.map((q, i) => <th key={q} className="px-1 py-2 text-center font-medium" title={data.question_steps[q]}>{i + 1}</th>)}
              <th className="px-3 py-2 font-medium">Manba</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const flagged = Object.keys(r.flags).length > 0
              return (
                <tr key={r.id} className={cn('border-t border-line', flagged && 'bg-oltin-50/60')}>
                  <td className="num px-3 py-2 text-faint">{r.journal_no}</td>
                  <td className="px-3 py-2"><div className="text-ink">{r.name}</div><div className="text-[11px] text-faint">{r.code}</div></td>
                  <td className="px-2 py-2 text-xs font-medium text-ink-2">{r.level}</td>
                  {QS.map((q) => {
                    const v = r.marks?.[q]
                    return (
                      <td key={q} className="px-1 py-2 text-center">
                        <span title={r.flags[q]} className={cn('num inline-grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-xs',
                          r.flags[q] ? 'bg-oltin-100 text-oltin-600 ring-1 ring-oltin-500/40' : v ? 'bg-sunken text-ink' : 'text-faint')}>{v ?? '·'}</span>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-xs">
                    <span className="text-mute">{r.source ?? '—'}</span>
                    {r.flags.chiziq && <div className="flex items-center gap-1 text-oltin-600"><TriangleAlert className="size-3" />{r.flags.chiziq}</div>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.graded && <CircleCheck className="size-4 text-firuza-500" />}
                      {flagged && <Button variant="primary" icon={BadgeCheck} className="h-8 px-2.5 text-xs" loading={confirm.isPending && confirm.variables === r.id} onClick={() => confirm.mutate(r.id)}>Tasdiqlash</Button>}
                      <Button variant="ghost" icon={Pencil} className="h-8 px-2" onClick={() => setEdit(r)} aria-label="Tahrirlash" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <AnimatePresence>{edit && <EditModal data={data} row={edit} onClose={() => setEdit(null)} onSaved={onSaved} />}</AnimatePresence>
    </Card>
  )
}

function EditModal({ data, row, onClose, onSaved }: { data: Detail; row: DiagnosticRow; onClose: () => void; onSaved: () => void }) {
  const spec = data.levels.find((l) => l.level === row.level)?.spec
  const [marks, setMarks] = useState<Record<string, string | null>>(() => Object.fromEntries(QS.map((q) => [q, row.marks?.[q] ?? null])))
  const ai = useAi()
  const save = useMutation({
    mutationFn: () => api.saveResponse(data.id, row.id, marks),
    onSuccess: () => { onSaved(); ai.toast(`${row.name}: javoblar saqlandi`); onClose() },
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  return (
    <Modal wide title={row.name} subtitle={`${row.code} · ${row.level} (${LEVEL_NAMES[row.level]})`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" icon={Check} loading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></>}>
      <div className="space-y-3">
        {spec?.questions.map((q, i) => (
          <div key={q.key} className={cn('rounded-xl p-3.5 ring-1', row.flags[q.key] ? 'bg-oltin-50 ring-oltin-100' : 'ring-line')}>
            <div className="flex items-start justify-between gap-3 text-sm text-ink"><span><span className="num mr-1 text-faint">{i + 1}.</span>{q.text}</span>{row.flags[q.key] && <span className="shrink-0 text-xs text-oltin-600">{row.flags[q.key]}</span>}</div>
            {q.options ? (
              <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {q.options.map((o) => (
                  <button key={o.letter} onClick={() => setMarks((m) => ({ ...m, [q.key]: m[q.key] === o.letter ? null : o.letter }))}
                    className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ring-1 transition-colors', marks[q.key] === o.letter ? 'bg-firuza-50 text-ink ring-firuza-500' : 'text-ink-2 ring-line hover:ring-line-strong')}>
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold', marks[q.key] === o.letter ? 'bg-firuza-500 text-white' : 'ring-1 ring-line-strong')}>{o.letter}</span>{o.text}
                  </button>
                ))}
              </div>
            ) : (
              <input value={marks[q.key] ?? ''} onChange={(e) => setMarks((m) => ({ ...m, [q.key]: e.target.value || null }))} inputMode="decimal" placeholder={`masalan ${spec.answer}`}
                className="num mt-2.5 w-40 rounded-lg px-3 py-2 ring-1 ring-line-strong outline-none focus:ring-firuza-500" />
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
