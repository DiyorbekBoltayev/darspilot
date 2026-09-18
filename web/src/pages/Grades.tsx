import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, FileSpreadsheet, Info, Save, Sparkles, Undo2 } from 'lucide-react'
import { api } from '@/lib/api'
import { lessonHref } from '@/lib/conveyor'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { useSession } from '@/components/session-context'
import { Button, Card, CardHeader, ErrorState, PageHeader, PageSkeleton } from '@/components/ui'

type Draft = Record<string, string>

const cellTone = (pct: number) => (pct >= 80 ? 'bg-firuza-50 text-firuza-700' : pct >= 55 ? 'bg-oltin-50 text-oltin-600' : 'bg-terra-50 text-terra-600')

export default function Grades() {
  const { classId } = useSession()
  const { data, error, isLoading } = useQuery({ queryKey: ['grades', classId], queryFn: () => api.grades(classId!), enabled: classId != null })
  const [draft, setDraft] = useState<Draft>({})
  const ai = useAi()
  const qc = useQueryClient()

  const save = useMutation({
    mutationFn: async (lessonId: number) => {
      const marks: Record<number, number | null> = {}
      for (const key of Object.keys(draft)) {
        const [lid, sid] = key.split(':').map(Number)
        if (lid !== lessonId) continue
        const raw = draft[key].trim().replace(',', '.')
        marks[sid] = raw === '' ? null : Number(raw)
      }
      return api.saveGrades(lessonId, marks)
    },
    onSuccess: (view) => {
      qc.setQueryData(['grades', classId], view)
      setDraft({})
      ai.toast('Baholar saqlandi')
    },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  const pendingLessons = useMemo(() => [...new Set(Object.keys(draft).map((k) => Number(k.split(':')[0])))], [draft])

  if (isLoading || !data) return error ? <ErrorState error={error} /> : <PageSkeleton />

  const value = (lessonId: number, sid: number) => {
    const key = `${lessonId}:${sid}`
    if (key in draft) return draft[key]
    const cell = data.students.find((s) => s.id === sid)?.grades[String(lessonId)]
    return cell ? String(cell.points).replace('.0', '') : ''
  }

  return (
    <div>
      <PageHeader eyebrow={`${data.class} sinf · ${data.quarter}-chorak`} title="Baholar jurnali"
        subtitle="O'tkazilgan darslar bo'yicha formativ ballar (0–10) va summativ ishlar. Diagnostika baholangach, ballar avtomatik tushadi; qolganini shu yerda qo'lda qo'yasiz."
        actions={pendingLessons.length > 0 ? (
          <>
            <Button variant="ghost" icon={Undo2} onClick={() => setDraft({})}>Bekor qilish</Button>
            {pendingLessons.map((lid) => (
              <Button key={lid} variant="primary" icon={Save} loading={save.isPending} onClick={() => save.mutate(lid)}>
                {data.lessons.find((l) => l.lesson_id === lid)?.short} ni saqlash
              </Button>
            ))}
          </>
        ) : undefined} />

      <Card className="overflow-hidden">
        <CardHeader icon={ClipboardList} title="Dars bo'yicha ballar" hint={`${data.lessons.length} ta o'tkazilgan dars · ${data.students.length} o'quvchi`} />
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-mute">
                <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium">O'quvchi</th>
                {data.lessons.map((l) => (
                  <th key={l.lesson_id} className="px-1 py-2 text-center font-medium">
                    <Link to={lessonHref(l.lesson_id)} className="block hover:text-firuza-600">
                      <div className="num text-[12px] text-ink">{l.short}</div>
                      <div className="text-[10.5px] text-faint">{l.lesson_no ? `${l.lesson_no}-dars` : ''}</div>
                      {l.kind !== 'formativ' && <div className="text-[10px] font-semibold text-terra-500">{l.kind.toUpperCase()}</div>}
                      {l.diagnostic_day && <div className="text-[10px] text-indigo-500">diagnostika</div>}
                    </Link>
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium">O'rtacha</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id} className="group">
                  <td className="sticky left-0 z-10 border-t border-line bg-surface px-4 py-1.5 group-hover:bg-firuza-50">
                    <div className="flex items-center gap-2">
                      <span className="num w-5 text-right text-xs text-faint">{s.journal_no}</span>
                      <Link to={`/oquvchi/${s.id}`} className="whitespace-nowrap text-ink hover:text-firuza-600">{s.name}</Link>
                    </div>
                  </td>
                  {data.lessons.map((l) => {
                    const cell = s.grades[String(l.lesson_id)]
                    const pct = cell ? (100 * cell.points) / Math.max(1, cell.max) : null
                    return (
                      <td key={l.lesson_id} className="border-t border-line p-0.5 group-hover:bg-firuza-50/60">
                        <input
                          value={value(l.lesson_id, s.id)}
                          onChange={(e) => setDraft((d) => ({ ...d, [`${l.lesson_id}:${s.id}`]: e.target.value.replace(/[^\d.,]/g, '') }))}
                          inputMode="decimal"
                          title={cell?.source === 'diagnostika' ? 'Diagnostikadan avtomatik' : undefined}
                          className={cn('num h-8 w-12 rounded-lg text-center text-[13px] outline-none ring-1 ring-transparent focus:ring-firuza-400',
                            pct == null ? 'bg-sunken/60 text-faint' : cellTone(pct),
                            cell?.source === 'diagnostika' && 'font-semibold')}
                        />
                      </td>
                    )
                  })}
                  <td className={cn('border-t border-line px-3 text-center group-hover:bg-firuza-50/60')}>
                    <span className={cn('num font-semibold', s.avg == null ? 'text-faint' : s.avg >= 80 ? 'text-firuza-600' : s.avg >= 55 ? 'text-oltin-600' : 'text-terra-500')}>
                      {s.avg == null ? '—' : `${s.avg}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex gap-3 p-4 text-[13px] leading-relaxed text-mute">
          <Sparkles className="size-4 shrink-0 text-firuza-600" />
          <span><b className="text-ink">Diagnostikadan avtomatik.</b> Qog'ozli diagnostika baholangach, har o'quvchining formativ bali (0–10) jurnalga o'zi tushadi.</span>
        </Card>
        <Card className="flex gap-3 p-4 text-[13px] leading-relaxed text-mute">
          <ClipboardList className="size-4 shrink-0 text-terra-500" />
          <span><b className="text-ink">BSB va ChSB.</b> Rejadagi summativ ish kunlarida ustun maksimal ball bilan belgilanadi (15, 20, 25, 40).</span>
        </Card>
        <Card className="flex gap-3 p-4 text-[13px] leading-relaxed text-mute">
          <FileSpreadsheet className="size-4 shrink-0 text-indigo-600" />
          <span><b className="text-ink">Eksport.</b> Har diagnostika natijasini Excel'ga chiqarib, eMaktab jurnaliga ko'chirish mumkin.</span>
        </Card>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-faint"><Info className="size-3.5" />Katakni bosib bahoni o'zgartiring — o'zgargan ustunni saqlash tugmasi yuqorida chiqadi.</p>
    </div>
  )
}
