import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Heart, Link2, Search, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-context'
import { Badge, Card, CardHeader, ErrorState, PageHeader, PageSkeleton } from '@/components/ui'

export default function ParentPicker() {
  const { classId, current } = useSession()
  const { data, error, isLoading } = useQuery({ queryKey: ['parents', classId], queryFn: () => api.parentLinks(classId), enabled: classId != null })
  const [q, setQ] = useState('')
  if (isLoading || !data) return error ? <ErrorState error={error} /> : <PageSkeleton />
  const rows = data.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <PageHeader eyebrow="Ota-ona kabineti" title="Farzandim qanday o'qiyapti?"
        subtitle="Ota-ona login-parolsiz, o'qituvchi yuborgan shaxsiy havola orqali kiradi: faqat o'z farzandi, sodda tilda, foizlarsiz. Demo uchun o'quvchini tanlang." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={Heart} title={`${current?.name ?? ''} sinf o'quvchilari`} hint="Havola Telegram orqali yuboriladi"
            action={<label className="flex h-9 items-center gap-2 rounded-xl bg-surface px-3 text-sm ring-1 ring-line-strong"><Search className="size-4 text-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism" className="w-28 bg-transparent outline-none" /></label>} />
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-2">
            {rows.map((s) => (
              <Link key={s.id} to={`/ota-ona/${s.token}`} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken">
                <span className="grid size-9 place-items-center rounded-full bg-firuza-50 text-xs font-semibold text-firuza-700 ring-1 ring-firuza-100">{s.name.split(' ').map((p) => p[0]).join('')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                  <span className="block text-[11.5px] text-mute">{s.code}</span>
                </span>
                <Badge className={cn(s.consent ? 'bg-firuza-50 text-firuza-700 ring-firuza-200' : 'bg-sunken text-mute ring-line')}>{s.consent ? 'rozilik bor' : "rozilik yo'q"}</Badge>
                <ExternalLink className="size-4 text-faint group-hover:text-firuza-600" />
              </Link>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Link2 className="size-4 text-firuza-600" />Qanday ishlaydi</div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-ink-2">
              <li>O'qituvchi «Hisobotlar → Ota-onalar» bo'limidan havolani Telegram orqali yuboradi.</li>
              <li>Ota-ona birinchi kirishda shaxsiy ma'lumotlarni qayta ishlashga rozilik beradi.</li>
              <li>Kabinetda: ko'nikmalar sodda so'zlarda, oxirgi diagnostika, uyda nima qilish mumkinligi va keyingi diagnostika sanasi.</li>
            </ol>
          </Card>
          <Card className="flex gap-3 p-5 text-[13px] leading-relaxed text-ink-2">
            <ShieldCheck className="size-5 shrink-0 text-firuza-600" />
            Rozilik bo'lmasa kabinet ma'lumot ko'rsatmaydi (O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi qonuni). Havola faqat bitta o'quvchiga tegishli.
          </Card>
        </div>
      </div>
    </div>
  )
}
