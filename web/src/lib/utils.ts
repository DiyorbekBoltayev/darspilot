import clsx, { type ClassValue } from 'clsx'

export const cn = (...args: ClassValue[]) => clsx(args)

/** O'zlashtirish darajasi → brend rangi: firuza (yaxshi), oltin (o'rta), terrakota (yordam kerak). */
export function tone(v: number | null | undefined): 'good' | 'mid' | 'low' | 'none' {
  if (v == null) return 'none'
  if (v < 0.5) return 'low'
  if (v < 0.75) return 'mid'
  return 'good'
}

export const TONE_HEX = { good: '#0A8A91', mid: '#D9A21B', low: '#C4572E', none: '#97A5AB' } as const

export const toneText: Record<ReturnType<typeof tone>, string> = {
  good: 'text-firuza-600', mid: 'text-oltin-600', low: 'text-terra-500', none: 'text-faint',
}

export const toneChip: Record<ReturnType<typeof tone>, string> = {
  good: 'bg-firuza-50 text-firuza-700 ring-firuza-200',
  mid: 'bg-oltin-50 text-oltin-600 ring-oltin-100',
  low: 'bg-terra-50 text-terra-600 ring-terra-100',
  none: 'bg-sunken text-mute ring-line',
}

export const LEVEL_NAMES: Record<string, string> = { B1: 'Tayanch', B2: 'Asosiy', B3: 'Mustahkam', B4: "Ilg'or" }

export const STATUS: Record<string, { label: string; cls: string }> = {
  yaratildi: { label: 'Yaratildi', cls: 'bg-sunken text-ink-2 ring-line' },
  skanerlandi: { label: 'Skanerlandi', cls: 'bg-oltin-50 text-oltin-600 ring-oltin-100' },
  baholandi: { label: 'Baholandi', cls: 'bg-firuza-50 text-firuza-700 ring-firuza-200' },
}

export const ROLE_LABEL: Record<string, string> = {
  murabbiy: 'Murabbiy', tekshiruvchi: 'Tekshiruvchi', hisobchi: 'Hisobchi', taqdimotchi: 'Taqdimotchi', "a'zo": "A'zo",
}

/** Distraktor ortidagi xato turining qisqa nomi (to'liq matn — backend ERRORS). */
export const ERROR_SHORT: Record<string, string> = {
  tushunish: "so'ralgan", malumot: "ma'lumot", model_obyekt: 'bitta obyekt', model_yonalish: "yo'nalish",
  model_amal: "amal ma'nosi", model_kechikish: 'kechikish', hisoblash: 'hisob', talqin_vaqt: 'soat ↔ minut',
  talqin: 'talqin', tayanch_vaqt: 'vaqt birligi', javob_yoq: "javob yo'q",
}

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('')
}

/** Backenddagi curriculum.level_for_score bilan bir xil chegaralar. */
export function levelFor(avg: number): 'B1' | 'B2' | 'B3' | 'B4' {
  if (avg < 0.4) return 'B1'
  if (avg < 0.65) return 'B2'
  if (avg < 0.85) return 'B3'
  return 'B4'
}

export const todayLabel = () => new Intl.DateTimeFormat('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
