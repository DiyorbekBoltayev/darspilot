import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Camera, Check, CircleCheck, Copy, Image as ImageIcon, ListChecks, Pencil, ScanLine, Trash2, TriangleAlert, Upload, WandSparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { DiagnosticDetail as Detail, DiagnosticRow } from '@/lib/types'
import { LEVEL_NAMES, cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Button, Card, CardHeader, Modal } from '@/components/ui'

const QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'] as const

/** Telefon/planshet — sensorli ekran: maydonga tegilganda darhol kamera ochiladi. */
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export function Scanner({ data, onDone, onShowAnswers }: { data: Detail; onDone: () => void; onShowAnswers: () => void }) {
  const ai = useAi()
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [last, setLast] = useState<{ found: number; matched: number; flagged: number; errors: string[] } | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  // 1-bosqich: surat omborga yuklanadi (o'qilmaydi) — o'qituvchi ketma-ket suratga oladi
  const upload = useMutation({
    mutationFn: (files: File[]) => api.uploadPhotos(data.id, files),
    onSuccess: (d, files) => { qc.setQueryData(['diagnostic', data.id], d); ai.toast(`${files.length} ta surat qo'shildi`) },
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  // 2-bosqich: navbatdagi barcha suratlar birdan o'qiladi
  const scan = useMutation({
    mutationFn: () => ai.run('scan', () => api.scanPending(data.id)),
    onSuccess: (r) => {
      setLast({ found: r.found, matched: r.matched, flagged: r.flagged, errors: r.errors })
      onDone()
      ai.toast(r.matched ? `${r.matched} ta javob bloki o'qildi` : "Hech qanday kartochka tanilmadi", r.matched ? 'good' : 'bad')
    },
  })
  const demo = useMutation({
    mutationFn: () => ai.run('demo', () => api.demoPhoto(data.id)),
    onSuccess: (r) => { setLast({ ...r, errors: [] }); onDone(); ai.toast(`Demo surat: ${r.matched} ta chiziq o'qildi`) },
  })
  const onFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length) upload.mutate(files)
  }
  const remaining = data.rows.length - data.responses
  const pending = data.pending

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div className="space-y-4 xl:col-span-2">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files) }}
          onClick={() => (isTouch() ? cameraRef : inputRef).current?.click()}
          className={cn('relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-surface px-6 py-12 text-center transition-colors',
            drag ? 'border-firuza-500 bg-firuza-50' : 'border-line-strong hover:border-firuza-300')}
        >
          <div className="girih pointer-events-none absolute inset-0 opacity-[0.07]" />
          <div className="relative grid size-16 place-items-center rounded-2xl bg-firuza-500 text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]"><Camera className="size-7" /></div>
          <div className="relative mt-4 text-lg font-semibold text-ink">
            {pending > 0 ? `${pending} ta surat navbatda` : 'Kartochkalarni suratga oling'}
          </div>
          <p className="relative mt-1 text-sm text-mute">
            Bir suratda 10 tagacha kartochka. Suratga olasiz — ro'yxatga tushadi, keyingisini olasiz;
            hammasi yig'ilgach «Skanerlash» tugmasini bosasiz.
          </p>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" icon={Camera} loading={upload.isPending}
              onClick={(e) => { e.stopPropagation(); cameraRef.current?.click() }}>
              {pending > 0 ? 'Yana rasmga olish' : 'Rasmga olish'}
            </Button>
            <Button icon={Upload} onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>Fayldan tanlash</Button>
          </div>
        </div>

        {pending > 0 && (
          <Card className="p-5 ring-1 ring-firuza-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink">{pending} ta surat o'qishga tayyor</div>
                <p className="mt-0.5 text-[13px] text-mute">Hammasini suratga olib bo'lgach bitta tugma bilan o'qing.</p>
              </div>
              <Button variant="primary" icon={ScanLine} loading={scan.isPending} onClick={() => scan.mutate()}>
                Skanerlash ({pending})
              </Button>
            </div>
          </Card>
        )}

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
          <MiniStat label="Suratlar" value={pending > 0 ? `${data.scans.length} · ${pending} navbatda` : data.scans.length} />
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
          <CardHeader icon={ScanLine} title="Yuklangan suratlar" hint="Har suratda kim o'qilgani ko'rsatilgan · yashil ramka — ishonchli, sariq — tasdiq kerak" />
          <div className="space-y-3 p-5">
            {data.scans.length === 0 && <p className="text-sm text-mute">Hali surat yuklanmagan.</p>}
            {data.scans.map((s) => <ScanRow key={s.id} did={data.id} scan={s} onZoom={setZoom} onDone={onDone} />)}
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

/** Bitta yuklangan surat: kim o'qilgani, takroriy yuklash belgisi va o'chirish. */
function ScanRow({ did, scan, onZoom, onDone }: {
  did: number
  scan: Detail['scans'][number]
  onZoom: (url: string) => void
  onDone: () => void
}) {
  const ai = useAi()
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const del = useMutation({
    mutationFn: () => api.deleteScan(did, scan.id),
    onSuccess: (d) => { qc.setQueryData(['diagnostic', did], d); onDone(); ai.toast("Surat o'chirildi") },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  return (
    <div className="flex gap-3 rounded-xl bg-sunken p-3 ring-1 ring-line">
      <button onClick={() => onZoom(scan.url)} className="shrink-0 overflow-hidden rounded-lg ring-1 ring-line">
        <img src={scan.url} alt="" loading="lazy" className="size-24 object-cover transition-transform duration-500 hover:scale-105" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num text-[13px] font-semibold text-ink">
            {scan.status === 'yuklandi' ? 'Navbatda — hali o\'qilmagan' : `${scan.strips} ta kartochka`}
          </span>
          {scan.at && <span className="text-[12px] text-faint">{scan.at}</span>}
          <a href={scan.original} target="_blank" rel="noreferrer" className="text-[12px] text-firuza-700 hover:underline">asl surat</a>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {scan.students.length === 0 && <span className="text-[12.5px] text-terra-600">Hech qanday kartochka tanilmadi</span>}
          {scan.students.map((st) => (
            <span key={st.journal_no}
              title={st.repeat ? (st.latest ? 'Bu o\'quvchi bir necha marta yuklangan — jadvalda shu surat natijasi turibdi'
                : 'Bu o\'quvchi keyinroq qayta yuklangan — jadvalda yangirog\'i turibdi') : undefined}
              className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ring-1',
                st.repeat && !st.latest ? 'bg-oltin-50 text-oltin-600 ring-oltin-100'
                  : 'bg-firuza-50 text-firuza-700 ring-firuza-100')}>
              {st.repeat && <Copy className="size-3" />}
              {st.code} · {st.name.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>
      <div className="flex w-full shrink-0 items-start sm:w-auto">
        {confirm ? (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Bekor</Button>
            <Button variant="danger" icon={Trash2} loading={del.isPending} onClick={() => del.mutate()}>O'chirish</Button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} title="Suratni o'chirish"
            className="grid size-9 place-items-center rounded-lg text-faint transition-colors hover:bg-terra-50 hover:text-terra-500">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
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
