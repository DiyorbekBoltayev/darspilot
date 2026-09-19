import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, Blocks, BookOpenCheck, Brain, Building2, ClipboardCheck, Clock, FileStack, Heart, Leaf, ListOrdered,
  Mic, NotebookPen, Presentation, ScanLine, ShieldCheck, SkipForward, Sparkles, Timer, UserRound, Users,
  type LucideIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useUser, roleKey } from '@/lib/auth-store'
import { ROLE_HOME } from '@/components/session-context'
import { BrandMark } from '@/components/Brand'
import HeroScene from '@/components/landing/HeroScene'
import { ChatBubble, ChatPanel } from '@/components/landing/Chatbot'

const NAV = [
  { href: '#muammo', label: 'Muammo' },
  { href: '#yechim', label: 'Yechim' },
  { href: '#baholash', label: 'Baholash' },
  { href: '#natija', label: 'Natijalar' },
  { href: '#savol', label: 'Savol-javob' },
]

export default function Landing() {
  const user = useUser()
  const home = user ? ROLE_HOME[roleKey(user.role)] : '/kirish'
  const impact = useQuery({ queryKey: ['impact', 0], queryFn: () => api.impact(), retry: 0 })
  const d = impact.data

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <TopBar home={home} signedIn={!!user} />

      {/* ------------------------------------------------ hero */}
      <header className="relative overflow-hidden">
        <div className="girih pointer-events-none absolute inset-0 opacity-[0.045]" />
        <div className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(10,138,145,0.16),transparent_65%)]" />
        <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-10 px-5 pt-12 pb-14 lg:grid-cols-2 lg:gap-14 lg:pt-20 lg:pb-20">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-firuza-50 px-3 py-1.5 text-[12.5px] font-medium text-firuza-700 ring-1 ring-firuza-100">
              <Sparkles className="size-3.5" />Umummilliy AI xakaton · Ta'lim · 2-ustuvor mavzu
            </span>
            <h1 className="mt-5 text-[38px] leading-[1.06] font-semibold tracking-tight text-ink sm:text-[52px]">
              O'qituvchining vaqtini <span className="text-firuza-600">darsga</span> qaytaramiz
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-mute">
              DarsPilot — 5–6-sinf matematika o'qituvchisi uchun AI yordamchi. Dars ssenariysini tuzadi, qog'ozli ishni
              telefon suratidan avtomatik tekshiradi — javoblarni kompyuter ko'rish o'qiydi (AI emas),
              AI esa har bir o'quvchiga shaxsiy feedback va sinf bo'yicha xulosa yozadi.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to={home} className="inline-flex h-12 items-center gap-2 rounded-xl bg-firuza-600 px-5 text-[15px] font-medium text-white transition-colors hover:bg-firuza-700">
                {signedInLabel(!!user)}<ArrowRight className="size-4" />
              </Link>
              <a href="#yechim" className="inline-flex h-12 items-center gap-2 rounded-xl bg-surface px-5 text-[15px] font-medium text-ink ring-1 ring-line-strong transition-colors hover:ring-firuza-300">
                Qanday ishlaydi?
              </a>
            </div>
            <p className="mt-4 text-[13px] text-faint">
              Demo hisobi: <span className="num text-ink-2">demo@darspilot.uz</span> · <span className="num text-ink-2">demo1234</span> — kirish sahifasida bir bosishda
            </p>
          </Reveal>

          <Reveal delay={0.12}><HeroScene /></Reveal>
        </div>

        {/* real ko'rsatkichlar (demo maktab bazasidan) */}
        <div className="mx-auto max-w-[1180px] px-5 pb-14">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line lg:grid-cols-4">
            <Metric icon={ScanLine} value={d ? `${d.accuracy_pct ?? 0}%` : '—'} label="Avtomatik o'qish aniqligi" hint="markerlar bo'yicha tekislangan javob bloki" />
            <Metric icon={Clock} value={d ? `${d.hours_saved} soat` : '—'} label="Chorakda tejalgan vaqt" hint={d ? `${d.graded_works} ta ish + ${d.homework_checked} ta uy vazifasi` : 'tekshirish va izoh yozish'} />
            <Metric icon={Leaf} value={d ? `${d.sheets_used} varaq` : '—'} label="Ishlatilgan qog'oz" hint={d ? `har darsda test bo'lsa ${d.sheets_if_every_lesson} varaq ketardi` : "qog'ozsiz tezkor tekshiruv bilan"} />
            <Metric icon={Timer} value="26 s" label="Bir sinfni baholash" hint="10 o'quvchi: javob + feedback" />
          </div>
          <p className="mt-2 text-[12px] text-faint">Ko'rsatkichlar shu ilovadagi demo maktab ma'lumotlaridan real vaqtda olinadi.</p>
        </div>
      </header>

      {/* ------------------------------------------------ muammo */}
      <Section id="muammo" eyebrow="Muammo" title="Nega o'qituvchiga vaqt yetmaydi?"
        text="Bir sinfda 30 o'quvchi, har birida boshqa daraja. Tekshirish va hujjat esa darsdan keyin boshlanadi.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Problem icon={ClipboardCheck} title="Tekshirish — soatlab"
            text="Bitta yozma ishni ko'rib, xatosini tushuntirib izoh yozish ~3,5 daqiqa. 30 o'quvchi = har bir ishda 1,5 soatdan ortiq." />
          <Problem icon={FileStack} title="Qog'oz — butun mamlakat muammosi"
            text="Har darsda test chiqarish qimmat: bitta sinfga bir chorakda 292 varaqqa yaqin ketadi. Ko'p maktabda printer va qog'oz cheklangan." />
          <Problem icon={Users} title="Differensiatsiya — amalda yo'q"
            text="Kim qaysi bosqichda adashgani yozilib borilmaydi; kuchli o'quvchi zerikadi, qiynalgani ortda qoladi." />
        </div>
      </Section>

      {/* ------------------------------------------------ yechim: konveyer */}
      <Section id="yechim" eyebrow="Yechim" title="Dars konveyeri: 5 qadam, har biri keyingisiga ma'lumot beradi"
        text="DarsPilot alohida «AI vositalar» to'plami emas — bu o'qituvchining ish kuni bo'ylab ketadigan yagona oqim."
        tone="sunken">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {[
            { icon: NotebookPen, title: '1. Tayyorlash', text: '45 daqiqalik ssenariy, metodlar va kim bilan alohida ishlash ro\'yxati. Kerak bo\'lsa — nomli kartochkalar PDF.' },
            { icon: Presentation, title: '2. Darsda', text: "E'tibor jurnali: kim bilan ishlandi. Ovoz bilan ham aytish mumkin — «Dilshod doskaga chiqdi»." },
            { icon: ClipboardCheck, title: '3. Tekshirish', text: "Qog'ozli diagnostika bitta suratdan o'qiladi yoki qog'ozsiz svetofor bilan tezkor tekshiruv." },
            { icon: Brain, title: '4. Tahlil', text: 'Bosqichli tashxis: kim qayerda adashgan, sinf xulosasi va har o\'quvchiga uch xil feedback.' },
            { icon: SkipForward, title: '5. Keyingi dars', text: 'Natijalar keyingi ssenariyga o\'tadi: takrorlash bosqichi, guruhlar va nomli topshiriqlar.' },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="card h-full p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><s.icon className="size-5" /></span>
                <div className="mt-3.5 text-[15px] font-semibold text-ink">{s.title}</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------ baholash */}
      <Section id="baholash" eyebrow="Avtomatik baholash" title="Javobni kod o'qiydi, AI xulosa yozadi"
        text="Baho AI ning fikri emas: javoblar kompyuter ko'rish bilan o'qiladi va kod bilan tekshiriladi. AI faqat matn yozadi — oxirgi so'z o'qituvchida.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Reveal>
            <Layer icon={ScanLine} tone="firuza" step="1-qatlam" title="Kompyuter ko'rish — javoblarni o'qiydi"
              points={[
                'Kartochkaning 4 burchagidagi ArUco markerlar har bir ishni o\'quvchi raqamiga bog\'laydi.',
                'Bitta suratda 10 tagacha kartochka o\'qiladi; qiyshiq va soyali surat tekislanadi.',
                'Har katak uchun ishonch darajasi hisoblanadi — shubhali belgi o\'qituvchiga tasdiqlashga chiqadi.',
              ]} />
          </Reveal>
          <Reveal delay={0.1}>
            <Layer icon={Sparkles} tone="indigo" step="2-qatlam" title="AI — masala, xulosa va feedback"
              points={[
                'Har bir o\'quvchiga darajasiga mos masala AI yordamida individual generatsiya qilinadi.',
                'Noto\'g\'ri variantlar tasodifiy emas: har biri aniq tushuncha xatosiga bog\'langan — natija «5/7» emas, «amallar tartibini buzyapti».',
                'AI baho qo\'ymaydi: u o\'quvchi, ota-ona va o\'qituvchiga matn yozadi — oxirgi so\'z o\'qituvchida.',
              ]} />
          </Reveal>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Small icon={BookOpenCheck} title="Uy vazifasi suratdan" text="Mashq daftari sahifasi: har mashq raqami bo'yicha to'g'ri/xato va xato turi aniqlanadi." />
          <Small icon={Blocks} title="BSB va ChSB" text="Summativ ish ham shu dvigatel bilan: har o'quvchiga o'z varianti, ball rejadagi maksimalga nisbatan." />
          <Small icon={ShieldCheck} title="Ishonch o'lchanadi" text="Avtomatik o'qilgan kataklar, o'qituvchi tuzatishlari va o'zgarishsiz yuborilgan feedback ulushi ko'rinadi." />
        </div>
      </Section>

      {/* ------------------------------------------------ yana nimalar bor */}
      <Section id="natija" eyebrow="Tizimda yana" title="O'qituvchi, direktor va ota-ona uchun" tone="sunken"
        text="Bitta ma'lumot uch xil ko'rinishda: kimga nima kerak bo'lsa, o'shanchasi.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Role icon={UserRound} title="O'qituvchi" points={['Dars konveyeri va ssenariylar', 'Baholar jurnali va Excel eksport', 'Sinf galaktikasi: kim e\'tibordan chetda']} />
          <Role icon={Building2} title="Direktor" points={['Sinflar kesimida o\'zlashtirish', 'Faqat agregat — ismlar ko\'rinmaydi', 'Qog\'oz va vaqt hisobi']} />
          <Role icon={Heart} title="Ota-ona" points={['Elektron rozilik bilan havola', 'Farzandi haqida qisqa xabar', 'Foiz va reyting ko\'rsatilmaydi']} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Small icon={ListOrdered} title="Haqiqiy o'quv dasturi" text="«AHA! Matematika 5-sinf» darsligi, mashq daftari va rasmiy yillik ish reja — 170 dars, chorak va ta'til sanalari bilan." />
          <Small icon={Mic} title="Ovozli e'tibor jurnali" text="Dars davomida gapirib qo'yasiz — tizim ismlarni tanib, jurnalga belgilaydi." />
          <Small icon={ShieldCheck} title="Maxfiylik" text="AI ga ismlar emas, kodlar yuboriladi (5B-17). Har bir AI chaqiruvi jurnalga yoziladi." />
        </div>
      </Section>

      {/* ------------------------------------------------ chatbot */}
      <Section id="savol" eyebrow="Savol-javob" title="Tizim haqida istalgan savolni bering"
        text="AI yordamchi faqat mahsulot haqidagi tasdiqlangan faktlarga tayanadi — bilmagan narsasini o'ylab topmaydi.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3"><ChatPanel /></div>
          <div className="lg:col-span-2">
            <div className="card h-full p-5">
              <div className="text-[15px] font-semibold text-ink">Ko'p so'raladigan savollar</div>
              <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-mute">
                {['Maktabga qanday qurilma kerak?', 'Internet uzilsa nima bo\'ladi?', 'O\'quvchi ma\'lumotlari qayerda saqlanadi?',
                  'Boshqa fanlarga ham mosmi?', 'eMaktab bilan ishlaydimi?'].map((q) => (
                  <li key={q} className="flex gap-2.5"><span className="mt-[7px] size-1.5 shrink-0 rotate-45 bg-firuza-500" />{q}</li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] text-faint">Savolingizni chapdagi oynaga yozing — yordamchi shu yerda javob beradi.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ CTA */}
      <section className="relative overflow-hidden bg-indigo-700 text-white">
        <div className="girih-dark pointer-events-none absolute inset-0 opacity-[0.12]" />
        <div className="relative mx-auto max-w-[1180px] px-5 py-16 text-center">
          <h2 className="text-[30px] leading-tight font-semibold sm:text-[38px]">Bitta dars — besh qadam. Bugundan boshlang.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-indigo-100/80">
            Demo maktab ma'lumotlari bilan tizimni to'liq aylanib chiqing: ssenariy tuzing, kartochkalarni chop eting,
            suratdan baholang va feedbackni ko'ring.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to={home} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-medium text-indigo-700 transition-transform hover:scale-[1.02]">
              {signedInLabel(!!user)}<ArrowRight className="size-4" />
            </Link>
            <a href="#savol" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-5 text-[15px] font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/15">
              AI yordamchidan so'rash
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <p className="text-[13px] text-faint">
            Umummilliy AI xakaton · Xorazm bosqichi · Ta'lim yo'nalishi, 2-ustuvor mavzu — AI yordamida avtomatik baholash va feedback
          </p>
        </div>
      </footer>

      <ChatBubble />
    </div>
  )
}

const signedInLabel = (signedIn: boolean) => (signedIn ? 'Ish stoliga' : 'Tizimga kirish')

function TopBar({ home, signedIn }: { home: string; signedIn: boolean }) {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className={cn('sticky top-0 z-40 transition-colors', solid ? 'border-b border-line bg-paper/90 backdrop-blur' : 'bg-transparent')}>
      <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-5 py-3.5">
        <BrandMark />
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-mute transition-colors hover:bg-sunken hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>
        <Link to={home} className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-indigo-700 px-4 text-[14px] font-medium text-white transition-colors hover:bg-indigo-800">
          {signedInLabel(signedIn)}
        </Link>
      </div>
    </div>
  )
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

function Section({ id, eyebrow, title, text, children, tone }: {
  id: string; eyebrow: string; title: string; text?: string; children: ReactNode; tone?: 'sunken'
}) {
  return (
    <section id={id} className={cn('scroll-mt-16 py-16 sm:py-20', tone === 'sunken' && 'bg-sunken')}>
      <div className="mx-auto max-w-[1180px] px-5">
        <Reveal>
          <div className="mb-8 max-w-3xl">
            <div className="text-[12.5px] font-semibold tracking-wide text-firuza-600 uppercase">{eyebrow}</div>
            <h2 className="mt-2 text-[27px] leading-tight font-semibold tracking-tight text-ink sm:text-[34px]">{title}</h2>
            {text && <p className="mt-3 text-[15.5px] leading-relaxed text-mute">{text}</p>}
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  )
}

function Metric({ icon: Icon, value, label, hint }: { icon: LucideIcon; value: string; label: string; hint: string }) {
  return (
    <div className="min-w-0 bg-surface p-5">
      <span className="grid size-8 place-items-center rounded-lg bg-firuza-50 text-firuza-600"><Icon className="size-4" /></span>
      <div className="num mt-3 text-[26px] leading-none font-semibold text-ink">{value}</div>
      <div className="mt-1.5 text-[13px] font-medium text-ink-2">{label}</div>
      <div className="mt-1 text-[12px] leading-snug text-faint">{hint}</div>
    </div>
  )
}

function Problem({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <Reveal>
      <div className="card h-full p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-terra-50 text-terra-500"><Icon className="size-5" /></span>
        <div className="mt-3.5 text-[16px] font-semibold text-ink">{title}</div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-mute">{text}</p>
      </div>
    </Reveal>
  )
}

function Layer({ icon: Icon, tone, step, title, points }: {
  icon: LucideIcon; tone: 'firuza' | 'indigo'; step: string; title: string; points: string[]
}) {
  const t = tone === 'firuza' ? 'bg-firuza-50 text-firuza-600' : 'bg-indigo-50 text-indigo-600'
  return (
    <div className="card h-full p-6">
      <div className="flex items-center gap-3">
        <span className={cn('grid size-11 place-items-center rounded-xl', t)}><Icon className="size-5" /></span>
        <div>
          <div className="text-[12px] font-semibold tracking-wide text-faint uppercase">{step}</div>
          <div className="text-[17px] font-semibold text-ink">{title}</div>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-2">
            <span className={cn('mt-[7px] size-1.5 shrink-0 rotate-45', tone === 'firuza' ? 'bg-firuza-500' : 'bg-indigo-600')} />{p}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Small({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <Reveal>
      <div className="card flex h-full gap-3.5 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-oltin-50 text-oltin-600"><Icon className="size-4.5" /></span>
        <div className="min-w-0">
          <div className="text-[14.5px] font-semibold text-ink">{title}</div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mute">{text}</p>
        </div>
      </div>
    </Reveal>
  )
}

function Role({ icon: Icon, title, points }: { icon: LucideIcon; title: string; points: string[] }) {
  return (
    <Reveal>
      <div className="card h-full p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="size-4.5" /></span>
          <div className="text-[16px] font-semibold text-ink">{title}</div>
        </div>
        <ul className="mt-3.5 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
              <span className="mt-[7px] size-1.5 shrink-0 rotate-45 bg-firuza-500" />{p}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  )
}
