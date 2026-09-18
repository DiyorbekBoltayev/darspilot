import { useQuery } from '@tanstack/react-query'
import { Clock, FileText, Leaf, MessageSquareText, PenLine, ScanLine, Sparkles, Zap, type LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardHeader, Stat } from '@/components/ui'

export default function ImpactPanel({ classId, compact }: { classId?: number | null; compact?: boolean }) {
  const { data, error, isLoading } = useQuery({ queryKey: ['impact', classId ?? 0], queryFn: () => api.impact(classId) })
  if (isLoading) return <div className="skeleton h-28" />
  if (error || !data) return null

  return (
    <Card>
      <CardHeader icon={Sparkles} title="AI ta'siri" hint={`${data.since} dan beri (chorak boshidan)`} />
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Clock} label="Tejalgan vaqt" value={data.hours_saved >= 1 ? data.hours_saved : data.minutes_saved}
          suffix={data.hours_saved >= 1 ? ' soat' : ' daq'} decimals={data.hours_saved >= 1 ? 1 : 0} tone="oltin"
          hint={`${data.graded_works} ta ish + ${data.homework_checked} ta uy vazifasi avtomatik tekshirildi`}
        />
        <Stat
          icon={ScanLine} label="O'qish aniqligi" value={data.accuracy_pct ?? 0} suffix="%" decimals={1} tone="indigo"
          hint={`${data.cells_read} katakdan ${data.cells_corrected} tasi o'qituvchi tomonidan tuzatildi`}
        />
        <Stat
          icon={Leaf} label="Qog'oz" value={data.sheets_used} suffix=" varaq"
          hint={`har darsda test bo'lganda ${data.sheets_if_every_lesson} varaq ketardi — ${data.sheets_saved} varaq tejaldi`}
        />
        <Stat
          icon={MessageSquareText} label="Feedback sifati" value={data.feedback_kept_pct ?? 0} suffix="%" tone="indigo"
          hint={`${data.feedback_written} ta shaxsiy feedback; shu qismi o'zgartirilmasdan yuborildi`}
        />
      </div>
      {!compact && (
        <div className="grid grid-cols-1 gap-3 border-t border-line px-5 py-4 sm:grid-cols-3">
          <Mini icon={FileText} title="Qog'ozli diagnostika" value={data.paper_lessons} unit="ta dars"
            text="Mavzu oxirida yoki har N darsda — varaq faqat shu darslarga ketadi." />
          <Mini icon={Zap} title="Qog'ozsiz tezkor tekshiruv" value={data.quick_lessons} unit="ta dars"
            text="Svetofor, mini-doska yoki chiqish savoli — joyida, varaqsiz." />
          <Mini icon={PenLine} title="AI baholagan qo'lyozma yechim" value={data.open_graded} unit="ta ish"
            text="Ochiq masala yechimi rasmdan o'qilib, bosqichma-bosqich baholandi." />
        </div>
      )}
    </Card>
  )
}

function Mini({ icon: Icon, title, value, unit, text }: { icon: LucideIcon; title: string; value: number; unit: string; text: string }) {
  return (
    <div className="rounded-xl bg-sunken p-3.5 ring-1 ring-line">
      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600"><Icon className="size-3.5 shrink-0" />{title}</div>
      <div className="num mt-1.5 text-[20px] leading-none font-semibold text-ink">{value} <span className="text-[13px] font-medium text-mute">{unit}</span></div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-mute">{text}</p>
    </div>
  )
}
