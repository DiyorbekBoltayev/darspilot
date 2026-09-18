import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Brain, CalendarDays, CircleCheck, Hand, SkipForward, Users, WandSparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonDetail } from '@/lib/types'
import { lessonHref } from '@/lib/conveyor'
import { useAi } from '@/components/ai-context'
import { Button, Card, Empty, LinkButton } from '@/components/ui'
import { FormatBadges } from './bits'
import { useLessonRefresh } from './use-refresh'

export default function NextStep({ lesson }: { lesson: LessonDetail }) {
  const ai = useAi()
  const navigate = useNavigate()
  const refresh = useLessonRefresh(lesson.id)
  const prepare = useMutation({
    mutationFn: () => ai.run('lesson', () => api.prepareNext(lesson.id)),
    onSuccess: (r) => {
      refresh(r.lesson)
      ai.toast("Keyingi dars ssenariysi tayyor — ko'rib chiqing va tasdiqlang")
      navigate(lessonHref(r.next_lesson_id, 'tayyorlash'))
    },
  })
  const next = lesson.next
  if (!next) return <Card><Empty icon={CalendarDays} title="Jadvalda keyingi dars yo'q" text="Sinf jadvalini tekshiring." /></Card>

  const result = lesson.diagnostic_day
    ? (lesson.graded ? `Diagnostika: o'rtacha ${lesson.avg_pct}%` : 'Diagnostika hali baholanmagan')
    : (lesson.quick_check ? `Svetofor: ${lesson.quick_check.green} · ${lesson.quick_check.yellow} · ${lesson.quick_check.red}` : "Tezkor tekshiruv kiritilmagan")

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Card className="relative overflow-hidden p-6 xl:col-span-3">
        <div className="girih pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.1] [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative">
          <div className="eyebrow flex items-center gap-2"><SkipForward className="size-3.5" />Keyingi dars · {next.weekday}, {next.date}{next.hour ? ` · ${next.hour}-soat` : ''}</div>
          <h2 className="mt-2 font-display text-[24px] leading-tight font-semibold text-indigo-600">{next.topic}</h2>
          <FormatBadges lesson={next} className="mt-3" />
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-2">
            {next.diagnostic_day
              ? "Bu dars qog'ozli diagnostika kuni: mavzu yakunlanadi yoki oxirgi diagnostikadan beri yetarli dars o'tdi."
              : next.group_work
                ? "Mustahkamlash guruhlarda — saqlangan guruhlar ishlatiladi, bo'linishga vaqt ketmaydi."
                : "Oddiy dars: mustahkamlash yakka va juftlikda, oxirida qog'ozsiz tezkor tekshiruv."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {next.plan_id ? (
              <>
                <div className="flex items-center gap-2 text-sm text-firuza-700"><CircleCheck className="size-4" />Ssenariy tuzilgan</div>
                <LinkButton to={lessonHref(next.id, 'tayyorlash')} variant="primary" className="ml-auto">Keyingi darsni ochish <ArrowRight className="size-4" /></LinkButton>
              </>
            ) : (
              <Button variant="primary" icon={WandSparkles} loading={prepare.isPending} onClick={() => prepare.mutate()}>Keyingi dars ssenariysini tuzish</Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <div className="text-sm font-semibold text-ink">Bu darsdan keyingisiga nima o'tadi</div>
        <div className="mt-4 space-y-3">
          <Flow icon={lesson.diagnostic_day ? Brain : Zap} title="Natija" text={result} />
          <Flow icon={Hand} title="E'tibor jurnali" text={`Bugun ${lesson.attended.length} o'quvchi bilan ishlandi; e'tiborsizlar majburiy ro'yxatga tushadi`} />
          <Flow icon={Users} title="Guruhlar" text="Tarkib 2 hafta saqlanadi; o'qituvchi xohlasa yangilaydi" />
        </div>
      </Card>
    </div>
  )
}

function Flow({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-sunken p-3 ring-1 ring-line">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-firuza-600 ring-1 ring-line"><Icon className="size-4" /></span>
      <div><div className="text-[13px] font-semibold text-ink">{title}</div><div className="text-[12.5px] leading-snug text-mute">{text}</div></div>
    </div>
  )
}
