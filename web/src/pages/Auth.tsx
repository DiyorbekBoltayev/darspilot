import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import {
  ArrowLeft, Camera, CircleAlert, Eye, EyeOff, GraduationCap, Lock, Mail, MessageSquareHeart,
  Route, School, ShieldCheck, Sparkles, User, Users, type LucideIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { roleKey, setUser, type AuthUser } from '@/lib/auth-store'
import { ROLE_HOME } from '@/components/session-context'
import { BrandMark } from '@/components/Brand'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const DEMO = { email: 'demo@darspilot.uz', password: 'demo1234' }

/** Backend rol nomlarini aynan shu ko'rinishda saqlaydi. */
const ROLES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "o'qituvchi", label: "O'qituvchi", icon: GraduationCap },
  { value: 'direktor', label: 'Direktor', icon: ShieldCheck },
  { value: 'ota-ona', label: 'Ota-ona', icon: Users },
]

const WHAT: { icon: LucideIcon; text: ReactNode }[] = [
  { icon: Route, text: <>Dars konveyeri: reja, diagnostika va tahlil — bitta oqimda, har bir dars uchun.</> },
  { icon: Camera, text: <>Qog'ozli ishni telefonda suratga olasiz, AI javoblarni o'zi o'qib baholaydi.</> },
  { icon: MessageSquareHeart, text: <>Har bir o'quvchiga shaxsiy o'zbekcha feedback — siz faqat tasdiqlaysiz.</> },
]

const FACTS = ['1 A4 = 4 kartochka', "~99% o'qish aniqligi", '10 kartochka — 1 surat']

const inputCls = 'h-11 w-full rounded-xl bg-surface pl-10 text-[15px] text-ink ring-1 ring-line-strong outline-none transition placeholder:text-faint focus:ring-2 focus:ring-firuza-500'

function Field({ id, label, icon: Icon, hint, children }: {
  id: string; label: string; icon: LucideIcon; hint?: ReactNode; children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink-2">
        {label}
        {hint && <span className="text-[12px] font-normal text-faint">{hint}</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-faint" />
        {children}
      </div>
    </div>
  )
}

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const royxat = params.get('rejim') === 'royxat'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState(ROLES[0].value)
  const [school, setSchool] = useState('')
  const [ochiq, setOchiq] = useState(false)
  const [xato, setXato] = useState<string | null>(null)
  const [band, setBand] = useState<'forma' | 'demo' | null>(null)

  function rejimga(next: boolean) {
    setXato(null)
    setParams(next ? { rejim: 'royxat' } : {}, { replace: true })
  }

  async function kir(kim: 'forma' | 'demo', sorov: () => Promise<AuthUser>) {
    setXato(null)
    setBand(kim)
    try {
      const user = await sorov()
      setUser(user)
      navigate(ROLE_HOME[roleKey(user.role)], { replace: true })
    } catch (e) {
      setXato(e instanceof Error ? e.message : 'Kirishda xatolik yuz berdi')
      setBand(null)
    }
  }

  function yubor(e: FormEvent) {
    e.preventDefault()
    if (band) return
    if (royxat) {
      if (fullName.trim().length < 3) return setXato("To'liq ismingizni kiriting")
      if (password.length < 6) return setXato("Parol kamida 6 belgidan iborat bo'lsin")
      return void kir('forma', () => api.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        school: school.trim() || undefined,
      }))
    }
    return void kir('forma', () => api.login({ email: email.trim(), password }))
  }

  function demoga() {
    if (band) return
    setEmail(DEMO.email)
    setPassword(DEMO.password)
    void kir('demo', () => api.login(DEMO))
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-paper">
      {/* Brend paneli — faqat kattaroq ekranlarda */}
      <aside className="girih-dark relative hidden w-[44%] max-w-[560px] flex-col justify-between bg-indigo-700 p-10 lg:flex xl:p-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-700/30 via-indigo-700/70 to-indigo-800" />
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <BrandMark light />
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-white xl:text-[30px]">
            Dars tayyorlashdan baholashgacha — bir oqimda
          </h2>
          <ul className="mt-6 space-y-4">
            {WHAT.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-white/10 text-firuza-300 ring-1 ring-white/15">
                  <Icon className="size-[17px]" />
                </span>
                <p className="text-[14.5px] leading-relaxed text-indigo-100/90">{text}</p>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="relative flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          {FACTS.map((f) => (
            <span key={f} className="num rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-indigo-50 ring-1 ring-white/15">
              {f}
            </span>
          ))}
        </motion.div>
      </aside>

      {/* Forma */}
      <main className="flex min-w-0 flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mute transition-colors hover:text-firuza-600">
              <ArrowLeft className="size-4" />
              Bosh sahifaga
            </Link>
            <BrandMark className="lg:hidden" />
          </div>

          <motion.div
            className="flex flex-1 flex-col justify-center py-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow">{royxat ? 'Yangi hisob' : 'Xush kelibsiz'}</div>
            <h1 className="mt-2 font-display text-[26px] leading-tight font-semibold tracking-tight text-ink sm:text-[30px]">
              {royxat ? "DarsPilot'ga qo'shiling" : 'Hisobingizga kiring'}
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-mute">
              {royxat
                ? "Bir necha soniya — va birinchi darsingiz konveyerga tushadi."
                : 'Darslar konveyeri, diagnostika va hisobotlar sizni kutmoqda.'}
            </p>

            {/* Rejim almashtirgich */}
            <div className="mt-6 inline-flex w-full gap-1 rounded-xl bg-sunken p-1 ring-1 ring-line">
              {([false, true] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => rejimga(v)}
                  className={cn(
                    'h-9 flex-1 rounded-lg text-[13.5px] font-medium transition-colors',
                    royxat === v ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-mute hover:text-ink',
                  )}
                >
                  {v ? "Ro'yxatdan o'tish" : 'Kirish'}
                </button>
              ))}
            </div>

            {xato && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-start gap-2 rounded-xl bg-terra-50 px-3 py-2.5 text-[13.5px] text-terra-600 ring-1 ring-terra-100"
                role="alert"
              >
                <CircleAlert className="mt-px size-4 shrink-0" />
                <span>{xato}</span>
              </motion.div>
            )}

            <form onSubmit={yubor} className="mt-5 grid grid-cols-1 gap-4">
              {royxat && (
                <Field id="ism" label="To'liq ism" icon={User}>
                  <input
                    id="ism"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    placeholder="Dilnoza Rahimova"
                    className={cn(inputCls, 'pr-3')}
                  />
                </Field>
              )}

              <Field id="email" label="Email" icon={Mail}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="siz@maktab.uz"
                  required
                  className={cn(inputCls, 'pr-3')}
                />
              </Field>

              <Field id="parol" label="Parol" icon={Lock} hint={royxat ? 'kamida 6 belgi' : undefined}>
                <input
                  id="parol"
                  type={ochiq ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={royxat ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  required
                  className={cn(inputCls, 'pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setOchiq((v) => !v)}
                  aria-label={ochiq ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-faint transition-colors hover:bg-sunken hover:text-ink-2"
                >
                  {ochiq ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </Field>

              {royxat && (
                <>
                  <div>
                    <div className="mb-1.5 text-[13px] font-medium text-ink-2">Rolingiz</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {ROLES.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value)}
                          aria-pressed={role === r.value}
                          className={cn(
                            'flex h-11 items-center justify-center gap-2 rounded-xl text-[13.5px] font-medium transition-colors sm:h-[70px] sm:flex-col sm:gap-1.5',
                            role === r.value
                              ? 'bg-firuza-50 text-firuza-700 ring-2 ring-firuza-500'
                              : 'bg-surface text-ink-2 ring-1 ring-line-strong hover:bg-sunken',
                          )}
                        >
                          <r.icon className="size-[18px]" />
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field id="maktab" label="Maktab" icon={School} hint="ixtiyoriy">
                    <input
                      id="maktab"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      autoComplete="organization"
                      placeholder="Xorazm, 15-maktab"
                      className={cn(inputCls, 'pr-3')}
                    />
                  </Field>
                </>
              )}

              <Button type="submit" variant="primary" loading={band === 'forma'} className="h-11 w-full text-[15px]">
                {royxat ? "Ro'yxatdan o'tish" : 'Kirish'}
              </Button>
            </form>

            {/* Hakamlar uchun: bir bosishda demo hisob */}
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[12px] font-medium text-faint">yoki</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button
                type="button"
                onClick={demoga}
                variant="secondary"
                icon={Sparkles}
                loading={band === 'demo'}
                className="mt-4 h-11 w-full text-[15px]"
              >
                Demo bilan kirish
              </Button>
              <p className="num mt-2 text-center text-[12px] text-faint">
                {DEMO.email} · {DEMO.password}
              </p>
            </div>

            <p className="mt-8 text-center text-[13px] text-mute">
              {royxat ? 'Hisobingiz bormi? ' : "Hisobingiz yo'qmi? "}
              <button type="button" onClick={() => rejimga(!royxat)} className="font-medium text-firuza-600 hover:text-firuza-700">
                {royxat ? 'Kirish' : "Ro'yxatdan o'tish"}
              </button>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
