import { Brain, ClipboardCheck, NotebookPen, Presentation, SkipForward, type LucideIcon } from 'lucide-react'
import type { LessonBrief, StepKey } from './types'

export const STEP_ICON: Record<StepKey, LucideIcon> = {
  tayyorlash: NotebookPen,
  darsda: Presentation,
  tekshirish: ClipboardCheck,
  tahlil: Brain,
  keyingi: SkipForward,
}

export const STEP_ORDER: StepKey[] = ['tayyorlash', 'darsda', 'tekshirish', 'tahlil', 'keyingi']

/** Konveyerdagi joriy qadam uchun asosiy tugma matni. */
export function stepCta(l: Pick<LessonBrief, 'current' | 'diagnostic_day' | 'steps'>): string {
  if (l.steps.every((s) => s.done)) return 'Ochish'
  switch (l.current) {
    case 'tayyorlash': return 'Tayyorlash'
    case 'darsda': return 'Darsni boshlash'
    case 'tekshirish': return l.diagnostic_day ? 'Skanerlash' : 'Tezkor tekshiruv'
    case 'tahlil': return l.diagnostic_day ? 'Baholash' : 'Tahlil'
    default: return 'Keyingi darsni tayyorlash'
  }
}

export const lessonHref = (id: number, step?: StepKey) => `/dars/${id}${step ? `?qadam=${step}` : ''}`

/** Dars bosqichlari davomiyligi (backend scenario.MINUTES bilan bir xil): diagnostika kunida 8 daqiqa varaqqa ketadi. */
export const STAGE_MINUTES = { diag: [2, 5, 3, 4, 12, 9, 8, 2], quick: [2, 5, 3, 4, 12, 13, 4, 2] }
export const STAGE_SHORT = ['Motivatsiya', 'Takrorlash', 'Uy vazifasi', 'Kirish', 'Yangi mavzu', 'Mustahkamlash', 'Tekshiruv', 'Refleksiya']

export const STAGE_COLORS = ['#0A8A91', '#23328C', '#74C0C3', '#3444A8', '#0A8A91', '#23328C', '#D9A21B', '#74C0C3']

export const ROLE_STYLE: Record<string, string> = {
  murabbiy: 'bg-firuza-50 text-firuza-700 ring-firuza-200',
  tekshiruvchi: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  hisobchi: 'bg-sunken text-ink-2 ring-line',
  taqdimotchi: 'bg-oltin-50 text-oltin-600 ring-oltin-100',
  "a'zo": 'bg-sunken text-mute ring-line',
}
