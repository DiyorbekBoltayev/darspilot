import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, CircleCheck, Circle, ClipboardList, Eye, FileText, Printer, RefreshCw, SlidersHorizontal, TriangleAlert, Users, WandSparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import type { LessonDetail } from '@/lib/types'
import { STAGE_COLORS, STAGE_MINUTES, STAGE_SHORT } from '@/lib/conveyor'
import { cn } from '@/lib/utils'
import { useAi } from '@/components/ai-context'
import { Button, Card, CardHeader, Empty, LinkButton } from '@/components/ui'
import { Switch } from './bits'
import PlanEditor from './PlanEditor'
import { useLessonRefresh } from './use-refresh'

export default function PrepareStep({ lesson, diagEvery, onNext }: { lesson: LessonDetail; diagEvery: number; onNext: () => void }) {
  const ai = useAi()
  const refresh = useLessonRefresh(lesson.id)
  const plan = useMutation({
    mutationFn: (regroup: boolean) => ai.run('lesson', () => api.preparePlan(lesson.id, regroup)),
    onSuccess: (d, regroup) => { refresh(d); ai.toast(regroup ? 'Guruhlar yangilandi va ssenariy qayta tuzildi' : "Ssenariy tayyor — ko'rib chiqib tasdiqlang") },
  })
  const format = useMutation({
    mutationFn: (body: { diagnostic_day?: boolean; group_work?: boolean }) => api.lessonFormat(lesson.id, body),
    onSuccess: (d) => refresh(d),
    onError: (e) => ai.toast(e.message, 'bad'),
  })
  const diag = useMutation({
    mutationFn: () => ai.run('create', () => api.prepareDiagnostic(lesson.id)),
    onSuccess: (d) => { refresh(d); ai.toast('Kartochkalar tayyor: har A4 da 4 ta, old-orqa tomoni bilan') },
  })

  const assessment = lesson.kind === 'bsb' || lesson.kind === 'chsb'
  const approved = lesson.plan?.status === 'tasdiqlangan' && !lesson.plan_outdated
  const checklist = [
    { label: 'Ssenariy tuzildi', done: !!lesson.plan },
    { label: "Ko'rib chiqildi va tasdiqlandi", done: approved },
    ...(lesson.diagnostic_day ? [{ label: 'Diagnostik varaqlar yaratildi', done: !!lesson.diagnostic }] : []),
  ]
  const minutes = lesson.diagnostic_day ? STAGE_MINUTES.diag : STAGE_MINUTES.quick
  const locked = lesson.conducted

  return (
    <div className="space-y-6">
      {assessment && (
        <Card className="border-terra-100 bg-terra-50/40">
          <CardHeader icon={ClipboardList} title={`${lesson.topic} — rasmiy summativ baholash`}
            hint="Bu kun taqvim-mavzu rejada belgilangan yozma ish. Ssenariy va diagnostik varaq shart emas." />
          <div className="p-5 pt-3 text-sm leading-relaxed text-ink-2">
            Yozma ishdan keyin natijani «Tekshirish» qadamida svetofor ko'rinishida kiriting — qiynalgan o'quvchilar
            keyingi ssenariyda ustuvor bo'ladi va «BSB tahlili» darsi shu ma'lumot bilan tuziladi.
          </div>
        </Card>
      )}

      <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-3', assessment && 'hidden')}>
        <Card>
          <CardHeader icon={SlidersHorizontal} title="Dars formati" hint={`Qog'ozli diagnostika — mavzu oxirida yoki har ${diagEvery} darsda. Guruh ishi — hamma darsda emas.`} />
          <div className="space-y-2 p-5 pt-4">
            <FormatRow icon={FileText} title="Qog'ozli diagnostika" on={lesson.diagnostic_day}
              text={!lesson.template ? "Bu mavzuga diagnostik shablon yo'q — qog'ozsiz tekshiruv" : lesson.diagnostic_day ? '8 daqiqa bosqichli varaq, telefon bilan skaner' : "Bugun qog'ozsiz tezkor tekshiruv (4 daqiqa)"}
              disabled={locked || !lesson.template || !!lesson.diagnostic_id || format.isPending} onChange={(v) => format.mutate({ diagnostic_day: v })} />
            <FormatRow icon={Users} title="Guruh ishi" on={lesson.group_work}
              text={lesson.diagnostic_day ? "Diagnostika kunida guruhga vaqt qolmaydi" : lesson.group_work ? `Aralash guruhlar · ${lesson.groups_note ?? 'guruhlar 2 hafta saqlanadi'}` : "Mustahkamlash yakka va juftlikda — bo'linishga vaqt ketmaydi"}
              disabled={locked || lesson.diagnostic_day || format.isPending} onChange={(v) => format.mutate({ group_work: v })} />
            <div className="pt-2">
              <div className="flex h-7 gap-0.5 overflow-hidden rounded-lg">
                {minutes.map((m, i) => (
                  <div key={i} title={`${STAGE_SHORT[i]} · ${m} daq`} style={{ flex: m, background: STAGE_COLORS[i] }} className="grid place-items-center text-[10px] font-semibold text-white/90">{m}</div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10.5px] text-faint"><span>Motivatsiya</span><span>{lesson.diagnostic_day ? 'Varaq 8′' : 'Tekshiruv 4′'}</span><span>45′</span></div>
            </div>
            {lesson.plan_outdated && (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-oltin-50 p-3 text-[13px] text-ink-2 ring-1 ring-oltin-100">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-oltin-600" />
                <div className="flex-1">Format o'zgardi — ssenariyni yangilang.
                  <Button variant="secondary" icon={RefreshCw} className="mt-2 h-8 text-xs" loading={plan.isPending} onClick={() => plan.mutate(false)}>Qayta tuzish</Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {lesson.diagnostic_day ? (
          <Card>
            <CardHeader icon={Printer} title="Diagnostik varaqlar" hint="4 darajali variant · A4 da 3 ta javob chizig'i" />
            <div className="p-5 pt-4">
              {lesson.diagnostic ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-firuza-700"><CircleCheck className="size-4" />Tayyor: {lesson.diagnostic.title}</div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-sunken p-3 ring-1 ring-line"><div className="num text-xl font-semibold text-ink">{Math.ceil(lesson.students / 4)}</div><div className="text-[11px] text-mute">A4 varaq</div></div>
                    <div className="rounded-xl bg-sunken p-3 ring-1 ring-line"><div className="num text-xl font-semibold text-ink">{lesson.students}</div><div className="text-[11px] text-mute">nomli kartochka</div></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <LinkButton href={lesson.diagnostic.pdf.varaqlar} icon={Printer} className="h-9 text-[13px]">Kartochkalar</LinkButton>
                    <LinkButton href={lesson.diagnostic.pdf.kalit} icon={FileText} className="h-9 text-[13px]">O'qituvchi kaliti</LinkButton>
                    <LinkButton to={`/diagnostika/${lesson.diagnostic.id}`} variant="ghost" icon={Eye} className="h-9 text-[13px]">Variantlar</LinkButton>
                  </div>
                  <p className="text-[12px] leading-relaxed text-mute">Duplex (old-orqa) chop eting va varaqni 4 ga kesing: har o'quvchiga o'z ismi yozilgan kartochka. Yirtish shart emas — kartochka butunligicha yig'iladi.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-ink-2">Har o'quvchiga ismi yozilgan kartochka va o'z darajasidagi variant. Bitta A4 da 4 ta kartochka (old-orqa tomoni ishlatiladi).</p>
                  <Button variant="primary" icon={WandSparkles} className="w-full" loading={diag.isPending} disabled={locked} onClick={() => diag.mutate()}>Varaqlarni yaratish</Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader icon={Zap} title="Qog'ozsiz tezkor tekshiruv" hint="Bugun hech narsa chop etilmaydi" />
            <div className="space-y-3 p-5 pt-4 text-sm leading-relaxed text-ink-2">
              <p>Dars oxirida 4 daqiqa: o'quvchilar svetofor kartasi yoki barmoq bilan ko'rsatadi — yashil «tushundim», sariq «ikkilanyapman», qizil «tushunmadim».</p>
              <p>«Tekshirish» qadamida 3 ta sonni va qiynalgan o'quvchilarni belgilaysiz — ular keyingi ssenariyda ustuvor bo'ladi.</p>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader icon={BadgeCheck} title="Darsga tayyorlik" />
          <div className="space-y-2.5 p-5 pt-4">
            {checklist.map((c) => (
              <div key={c.label} className={cn('flex items-center gap-2.5 text-sm', c.done ? 'text-ink' : 'text-mute')}>
                {c.done ? <CircleCheck className="size-4 text-firuza-500" /> : <Circle className="size-4 text-faint" />}{c.label}
              </div>
            ))}
            <Button variant={lesson.steps[0].done ? 'primary' : 'secondary'} className="mt-3 w-full" onClick={onNext}>
              Darsga o'tish <ArrowRight className="size-4" />
            </Button>
            {!lesson.steps[0].done && <p className="text-center text-[12px] text-faint">{lesson.steps[0].hint}</p>}
          </div>
        </Card>
      </div>

      {lesson.plan ? (
        <PlanEditor key={lesson.plan.id} plan={lesson.plan} lessonId={lesson.id} rebuilding={plan.isPending} onRebuild={(regroup) => plan.mutate(regroup)} />
      ) : (
        <Card>
          <Empty icon={WandSparkles} title="Ssenariy hali tuzilmagan"
            text="DarsPilot oxirgi diagnostika, oldingi darsdagi tezkor tekshiruv va e'tibor jurnalidan 45 daqiqalik ssenariy tuzadi: metodlar, vaqt va aniq o'quvchilarga nomli ko'rsatmalar."
            action={<Button variant="primary" icon={WandSparkles} loading={plan.isPending} disabled={locked} onClick={() => plan.mutate(false)}>Ssenariy tuzish</Button>} />
          {locked && <p className="-mt-6 pb-6 text-center text-xs text-faint">Dars o'tkazilgan. <Link to="/darslar" className="text-firuza-700 hover:underline">Kelgusi darslarni ko'rish</Link></p>}
        </Card>
      )}
    </div>
  )
}

function FormatRow({ icon: Icon, title, text, on, disabled, onChange }: { icon: LucideIcon; title: string; text: string; on: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl p-3 ring-1', on ? 'bg-firuza-50/60 ring-firuza-100' : 'ring-line')}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', on ? 'text-firuza-600' : 'text-faint')} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-mute">{text}</div>
      </div>
      <Switch on={on} onChange={onChange} disabled={disabled} label={title} />
    </div>
  )
}
