import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, FileText, Minus, Plus, SlidersHorizontal, Users, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonBrief } from '@/lib/types'
import { lessonHref } from '@/lib/conveyor'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { useSession } from '@/components/session-context'
import { Card, CardHeader, ErrorState, PageHeader, PageSkeleton } from '@/components/ui'
import { FormatBadges } from '@/components/lesson/bits'

export default function Lessons() {
  const { classId, current } = useSession()
  const { data, error, isLoading } = useQuery({ queryKey: ['class-lessons', classId], queryFn: () => api.classLessons(classId!), enabled: classId != null })
  const ai = useAi()
  const qc = useQueryClient()
  const setEvery = useMutation({
    mutationFn: (n: number) => api.updateClass(classId!, n),
    onSuccess: (classes, n) => {
      qc.setQueryData(['classes'], classes)
      qc.invalidateQueries({ queryKey: ['class-lessons'] })
      qc.invalidateQueries({ queryKey: ['today'] })
      ai.toast(`Qog'ozli diagnostika: har ${n} darsda yoki mavzu oxirida. Tayyorlanmagan kelgusi darslar qayta rejalandi.`)
    },
    onError: (e) => ai.toast(e.message, 'bad'),
  })

  if (isLoading || !data) return error ? <ErrorState error={error} /> : <PageSkeleton />
  const groups: [string, LessonBrief[]][] = [
    ["O'tgan darslar", data.lessons.filter((l) => l.when === "o'tgan")],
    ['Bugun', data.lessons.filter((l) => l.when === 'bugun')],
    ['Kelgusi darslar', data.lessons.filter((l) => l.when === 'kelgusi')],
  ]
  const every = data.class.diag_every
  const paper = data.lessons.filter((l) => l.diagnostic_day).length
  const group = data.lessons.filter((l) => l.group_work).length

  return (
    <div>
      <PageHeader eyebrow={`${data.class.name} sinf · Matematika`} title="Darslar konveyeri"
        subtitle="Jadvaldagi har bir dars — konveyer birligi. O'tgan darslar tarixi, bugungi dars va kelgusi darslarning formati: qaysi kuni qog'ozli diagnostika, qaysi kuni guruh ishi." />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={SlidersHorizontal} title="Diagnostika chastotasi" hint="Qog'ozli diagnostika mavzu oxirida yoki shu chastotada; qolgan darslarda qog'ozsiz tezkor tekshiruv" />
          <div className="flex flex-wrap items-center gap-4 p-5 pt-4">
            <div className="flex h-11 items-center rounded-xl ring-1 ring-line-strong">
              <button className="grid h-full w-10 place-items-center text-mute hover:text-ink disabled:opacity-40" disabled={every <= 1 || setEvery.isPending} onClick={() => setEvery.mutate(every - 1)} aria-label="Kamaytirish"><Minus className="size-4" /></button>
              <span className="num w-24 text-center text-sm"><b className="text-lg text-ink">{every}</b> darsda</span>
              <button className="grid h-full w-10 place-items-center text-mute hover:text-ink disabled:opacity-40" disabled={every >= 10 || setEvery.isPending} onClick={() => setEvery.mutate(every + 1)} aria-label="Ko'paytirish"><Plus className="size-4" /></button>
            </div>
            <p className="max-w-md text-[13px] leading-relaxed text-mute">Har darsda test — qog'oz va vaqt isrofi. 2–3 darsda bir marta bosqichli diagnostika chorakdagi kamida 4 ta formativ baholashni bemalol qoplaydi.</p>
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Mini icon={FileText} label="Qog'ozli diagnostika" value={paper} tone="text-indigo-600" />
          <Mini icon={Zap} label="Tezkor tekshiruv" value={data.lessons.length - paper} tone="text-firuza-600" />
          <Mini icon={Users} label="Guruh ishi" value={group} tone="text-oltin-600" />
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(([title, items]) => items.length > 0 && (
          <Card key={title}>
            <CardHeader title={title} hint={`${items.length} ta dars`} />
            <div className="p-3">
              {items.map((l) => <Row key={l.id} lesson={l} />)}
            </div>
          </Card>
        ))}
      </div>
      {current && <p className="mt-4 text-xs text-faint">Jadval: {current.schedule.map((s) => `${s.weekday.slice(0, 3)} ${s.hour}-soat`).join(' · ')}</p>}
    </div>
  )
}

function Row({ lesson: l }: { lesson: LessonBrief }) {
  const done = l.steps.filter((s) => s.done).length
  return (
    <Link to={lessonHref(l.id)} className={cn('group flex flex-col gap-2 rounded-xl px-3 py-3 hover:bg-sunken sm:flex-row sm:items-center sm:gap-4', l.when === 'bugun' && 'bg-firuza-50/60 ring-1 ring-firuza-100')}>
      <div className="flex w-32 shrink-0 items-center gap-3">
        <div className="text-center">
          <div className="num text-sm font-semibold text-ink">{l.date.slice(0, 5)}</div>
          <div className="text-[10.5px] text-mute">{l.weekday.slice(0, 3)} · {l.hour}-s</div>
        </div>
        <span className="num text-[11px] text-faint">{l.lesson_no ? `${l.lesson_no}-dars` : `#${(l.seq ?? 0) + 1}`}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{l.topic}</div>
        {l.chapter && <div className="truncate text-[11.5px] text-faint">{l.chapter}{l.textbook ? ` · darslik ${l.textbook}-bet` : ''}</div>}
        <FormatBadges lesson={l} className="mt-1" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1" title={`${done}/5 qadam`}>
          {l.steps.map((s) => <span key={s.key} className={cn('h-1.5 w-5 rounded-full', s.done ? 'bg-firuza-500' : s.key === l.current ? 'bg-indigo-300' : 'bg-line')} />)}
        </div>
        <span className={cn('w-40 truncate text-right text-[12px]', done === 5 ? 'text-firuza-700' : 'text-mute')}>{done === 5 ? 'Konveyer yakunlandi' : l.steps.find((s) => s.key === l.current)?.hint}</span>
        <ChevronRight className="size-4 text-faint group-hover:text-firuza-600" />
      </div>
    </Link>
  )
}

function Mini({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <Icon className={cn('size-5', tone)} />
      <div className="min-w-0 flex-1 truncate text-[12.5px] text-mute">{label}</div>
      <div className={cn('num text-xl font-semibold', tone)}>{value}</div>
    </div>
  )
}
