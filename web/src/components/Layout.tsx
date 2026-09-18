import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  BookOpen, Building2, CalendarCheck, ChartNoAxesColumn, Check, ChevronsUpDown, ClipboardList, Cpu, Grid3x3, GraduationCap, Heart, Library, ListOrdered, LogOut, Menu, UserRound, X,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/types'
import { roleKey, setUser, useUser } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { BrandMark, StarLogo } from './Brand'
import { ROLE_HOME, useSession } from './session-context'

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: 'neglected' }
type Group = { title: string; items: Item[] }

const NAV: Record<Role, Group[]> = {
  teacher: [
    { title: 'Ish kuni', items: [
      { to: '/bugun', label: 'Bugun', icon: CalendarCheck, end: true },
      { to: '/darslar', label: 'Darslar konveyeri', icon: ListOrdered },
    ] },
    { title: 'Sinf', items: [
      { to: '/sinf', label: 'Sinf xaritasi', icon: Grid3x3, badge: 'neglected' },
      { to: '/baholar', label: 'Baholar jurnali', icon: ClipboardList },
      { to: '/hisobotlar', label: 'Hisobotlar', icon: ChartNoAxesColumn },
    ] },
    { title: 'Kutubxona', items: [
      { to: '/dastur', label: "O'quv dasturi", icon: Library },
      { to: '/metodlar', label: 'Metodlar', icon: BookOpen },
    ] },
    { title: 'Tizim', items: [{ to: '/ai', label: 'AI jurnali', icon: Cpu }] },
  ],
  director: [
    { title: 'Maktab', items: [
      { to: '/direktor', label: 'Maktab paneli', icon: Building2 },
      { to: '/sinf', label: 'Sinf xaritasi', icon: Grid3x3 },
      { to: '/hisobotlar', label: 'Haftalik hisobotlar', icon: ChartNoAxesColumn },
    ] },
    { title: 'Tizim', items: [{ to: '/ai', label: 'AI jurnali', icon: Cpu }] },
  ],
  parent: [
    { title: 'Ota-ona', items: [{ to: '/ota-ona', label: 'Farzandim', icon: Heart }] },
  ],
}

const ROLES: { key: Role; label: string; icon: LucideIcon }[] = [
  { key: 'teacher', label: "O'qituvchi", icon: GraduationCap },
  { key: 'director', label: 'Direktor', icon: Building2 },
  { key: 'parent', label: 'Ota-ona', icon: UserRound },
]

function RoleSwitch({ onNavigate }: { onNavigate?: () => void }) {
  const { role, setRole } = useSession()
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.07] p-1 ring-1 ring-white/10" role="radiogroup" aria-label="Rol">
      {ROLES.map((r) => (
        <button key={r.key} role="radio" aria-checked={role === r.key}
          onClick={() => { setRole(r.key); navigate(ROLE_HOME[r.key]); onNavigate?.() }}
          className={cn('flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10.5px] font-medium transition-colors',
            role === r.key ? 'bg-white text-indigo-700' : 'text-indigo-100/70 hover:text-white')}>
          <r.icon className="size-3.5" />{r.label}
        </button>
      ))}
    </div>
  )
}

export function ClassSelect({ dark, className }: { dark?: boolean; className?: string }) {
  const { classes, current, setClassId } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  if (!current) return <div className={cn('skeleton h-14', className)} />
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
        className={cn('flex w-full items-center gap-3 rounded-xl p-2 text-left ring-1 transition-colors',
          dark ? 'bg-white/[0.07] ring-white/10 hover:bg-white/[0.11]' : 'bg-surface ring-line-strong hover:ring-firuza-300')}>
        <span className="num grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-firuza-500 text-sm font-semibold text-white">{current.name}</span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[13px] font-semibold', dark ? 'text-white' : 'text-ink')}>{current.subject}</span>
          <span className={cn('block truncate text-xs', dark ? 'text-indigo-100/70' : 'text-mute')}>{current.students} o'quvchi · {classes.length} ta sinfdan</span>
        </span>
        <ChevronsUpDown className={cn('size-4 shrink-0', dark ? 'text-indigo-100/60' : 'text-faint')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl bg-surface p-1 shadow-lift ring-1 ring-line">
            {classes.map((c) => (
              <li key={c.id}>
                <button role="option" aria-selected={c.id === current.id} onClick={() => { setClassId(c.id); setOpen(false) }}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm', c.id === current.id ? 'bg-firuza-50' : 'hover:bg-sunken')}>
                  <span className="num grid h-8 w-10 place-items-center rounded-md bg-indigo-600 text-xs font-semibold text-white">{c.name}</span>
                  <span className="flex-1">
                    <span className="block font-medium text-ink">{c.students} o'quvchi</span>
                    <span className="block text-xs text-mute">har {c.diag_every} darsda diagnostika</span>
                  </span>
                  {c.neglected > 0 && <span className="num rounded-md bg-terra-50 px-1.5 text-[11px] font-semibold text-terra-600 ring-1 ring-terra-100">{c.neglected}</span>}
                  {c.id === current.id && <Check className="size-4 text-firuza-600" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { role, current } = useSession()
  return (
    <nav className="space-y-5">
      {NAV[role].map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.16em] text-indigo-100/50 uppercase">{g.title}</div>
          <div className="space-y-0.5">
            {g.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
                className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors',
                  isActive ? 'bg-white text-indigo-700 shadow-[0_1px_0_rgb(0_0_0/0.08)]' : 'text-indigo-50/80 hover:bg-white/8 hover:text-white')}>
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('size-[18px]', isActive ? 'text-firuza-500' : 'text-indigo-100/60')} />
                    <span>{item.label}</span>
                    {item.badge === 'neglected' && current && current.neglected > 0 && (
                      <span className={cn('ml-auto rounded-md px-1.5 text-[11px] font-bold', isActive ? 'bg-terra-50 text-terra-500' : 'bg-terra-500 text-white')}>{current.neglected}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role, current } = useSession()
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-indigo-700 px-3 py-5">
      <div className="girih-dark pointer-events-none absolute inset-x-0 bottom-0 h-56 opacity-[0.09] [mask-image:linear-gradient(to_top,black,transparent)]" />
      <div className="relative px-2"><BrandMark light /></div>
      <div className="relative mt-6"><RoleSwitch onNavigate={onNavigate} /></div>
      {role !== 'director' && <div className="relative mt-3"><ClassSelect dark /></div>}
      <div className="relative mt-6 flex-1 overflow-y-auto"><Nav onNavigate={onNavigate} /></div>
      <AccountBox role={role} teacher={current?.teacher ?? null} />
    </div>
  )
}

/** Kirgan foydalanuvchi va chiqish tugmasi (kirmagan bo'lsa — demo sinf o'qituvchisi ko'rsatiladi). */
function AccountBox({ role, teacher }: { role: Role; teacher: string | null }) {
  const user = useUser()
  const navigate = useNavigate()
  const name = user?.full_name ?? teacher
  if (!name) return null
  const subtitle = user
    ? (user.school ?? { teacher: "O'qituvchi", director: 'Direktor', parent: 'Ota-ona' }[roleKey(user.role)])
    : { teacher: "Matematika o'qituvchisi", director: 'Maktab rahbari', parent: 'Ota-ona' }[role]
  return (
    <div className="relative mt-4 flex items-center gap-3 rounded-xl px-2 py-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/15">
        {name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-medium text-white">{name}</span>
        <span className="block truncate text-[11px] text-indigo-100/60">{subtitle}</span>
      </span>
      {user && (
        <button onClick={() => { setUser(null); navigate('/') }} title="Chiqish"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-indigo-100/70 transition-colors hover:bg-white/10 hover:text-white">
          <LogOut className="size-4" />
        </button>
      )}
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { role } = useSession()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] lg:block"><Sidebar /></aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <StarLogo className="size-9 shrink-0" />
        {role !== 'director' && <ClassSelect className="ml-auto w-52" />}
        <button onClick={() => setOpen(true)} className={cn('grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-line', role === 'director' && 'ml-auto')} aria-label="Menyu"><Menu className="size-5" /></button>
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden" initial={{ x: -290 }} animate={{ x: 0 }} exit={{ x: -290 }} transition={{ type: 'spring', bounce: 0, duration: 0.3 }}>
              <Sidebar onNavigate={() => setOpen(false)} />
              <button onClick={() => setOpen(false)} className="absolute top-5 right-3 text-white/70" aria-label="Yopish"><X className="size-5" /></button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="lg:pl-[256px]">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
