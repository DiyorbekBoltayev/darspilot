export type Level = 'B1' | 'B2' | 'B3' | 'B4'
export type Role = 'teacher' | 'director' | 'parent'
export type StepKey = 'tayyorlash' | 'darsda' | 'tekshirish' | 'tahlil' | 'keyingi'

export interface ClassInfo {
  id: number
  name: string
  grade: number
  subject: string
  teacher: string | null
  students: number
  diag_every: number
  neglected: number
  schedule: { weekday: string; hour: number }[]
}

export interface Step { key: StepKey; label: string; done: boolean; hint: string }
export interface QuickCheck { green: number; yellow: number; red: number; struggled: number[]; note: string; at: string }

export type LessonKind = 'dars' | 'bsb' | 'chsb' | 'tahlil' | 'muammoli'

export interface LessonBrief {
  id: number
  class_id: number
  class_name: string
  date: string
  iso: string
  weekday: string
  kind: LessonKind
  lesson_no: number | null
  chapter: string | null
  textbook: string | null
  workbook: string | null
  points: number | null
  hour: number | null
  seq: number | null
  topic: string | null
  diagnostic_day: boolean
  group_work: boolean
  template: string | null
  conducted: boolean
  when: 'bugun' | "o'tgan" | 'kelgusi'
  quick_check: QuickCheck | null
  steps: Step[]
  current: StepKey
  plan_id: number | null
  plan_status: 'qoralama' | 'tasdiqlangan' | null
  plan_outdated: boolean
  diagnostic_id: number | null
  responses: number
  graded: number
  avg_pct: number | null
  next_lesson_id: number | null
  students: number
  neglected?: number
}

export interface LessonDetail extends LessonBrief {
  plan: LessonPlan | null
  diagnostic: null | { id: number; status: string; responses: number; flagged: number; graded: number; title: string; pdf: { varaqlar: string; kalit: string } }
  attended: { id: number; code: string }[]
  groups_note: string | null
  next: LessonBrief | null
  gap_alert: number
}

export interface UpcomingDiagnostic {
  lesson_id: number
  class_id: number
  class_name: string
  date: string
  iso: string
  weekday: string
  topic: string | null
  ready: boolean
  sheets: number
  cards: number
  total: number
}

export interface TodayView {
  label: string
  date: string
  iso: string
  weekday: string
  teacher: string | null
  lessons: LessonBrief[]
  gap_alert: number
  upcoming_diagnostics: UpcomingDiagnostic[]
  paper: { since: string; paper_lessons: number; quick_lessons: number; sheets_used: number; sheets_if_every_lesson: number; sheets_saved: number }
}

export interface StudentRow {
  id: number
  code: string
  name: string
  journal_no: number
  skills: Record<string, number | null>
  avg: number
  gap: number
  alert: boolean
  level: Level
}

export interface Overview {
  class: { id: number; name: string; subject: string; grade: number }
  skills: { key: string; name: string }[]
  students: StudentRow[]
  kpi: { students: number; avg: number; neglected: number; minutes_saved: number }
  diagnostics: { id: number; title: string; date: string; status: string }[]
  summary: null | { diagnostic_id: number; title: string; source: string; xulosa: string[]; keyingi_dars: string[] }
  last_plan: null | { id: number; topic: string; created_at: string }
  gap_alert: number
}

export interface Option { letter: string; text: string; correct: boolean; error: string | null }
export interface Question {
  key: string
  text: string
  options?: Option[]
  answer?: string
  unit?: string
}
export interface ProblemSpec {
  template: string
  level: Level
  story: string
  ask: string
  story_source: 'gpt' | 'shablon'
  answer: string
  unit: string
  questions: Question[]
}

export interface DiagnosticRow {
  id: number
  code: string
  name: string
  journal_no: number
  level: Level
  marks: Record<string, string | null> | null
  flags: Record<string, string>
  source: string | null
  confidence: number | null
  corrected: number
  solution: string | null
  graded: boolean
}

export interface DiagnosticDetail {
  id: number
  title: string
  template: string
  date: string
  status: string
  lesson_id: number | null
  class_id: number
  counts: Record<Level, number>
  levels: { level: Level; name: string; spec: ProblemSpec }[]
  question_steps: Record<string, string>
  errors: Record<string, string>
  rows: DiagnosticRow[]
  responses: number
  flagged: number
  graded: number
  scans: { id: number; url: string; original: string; strips: number }[]
  pdf: { varaqlar: string; kalit: string }
  sheets: number
  kind: string
  max_points: number
  quality: ScanQuality
}

export interface ScanQuality {
  students: number
  cells: number
  scanned: number
  manual: number
  unsure: number
  corrected: number
  auto_pct: number | null
  accuracy_pct: number | null
  confidence_pct: number | null
  open_graded: number
  open_confirmed: number
  open_changed: number
  open_ai: number
  feedback_total: number
  feedback_edited: number
  feedback_up: number
  feedback_down: number
  feedback_kept_pct: number | null
}

export interface OpenAnswer {
  score: number | null
  max: number | null
  comment: string | null
  source: string | null
  confirmed: boolean
  criteria: { key: string; nom: string; ball: number; max: number; izoh: string }[]
  empty: boolean
  image: string | null
}

export interface ResultStudent {
  id: number
  code: string
  name: string
  journal_no: number
  level: Level
  gap: number
  correct: number
  total: number
  primary_error: string | null
  primary_text: string
  root_cause_note: string | null
  steps: { key: string; step: string; ok: boolean; error: string | null; error_text: string | null }[]
  feedback: { student: string; parent: string; teacher: string }
  feedback_source: string
  feedback_rating: number | null
  feedback_edited: boolean
  open: OpenAnswer | null
}

export interface Results {
  id: number
  title: string
  date: string
  lesson_id: number | null
  class_id: number
  graded: number
  avg_pct: number | null
  minutes_saved: number
  summary: null | { xulosa: string[]; keyingi_dars: string[] }
  summary_source: string | null
  seconds: number | null
  steps: { name: string; pct: number }[]
  errors: { name: string; count: number }[]
  students: ResultStudent[]
  quality: ScanQuality
  open_max: number
  rubric: { key: string; nom: string; max: number }[]
  kind: string
  max_points: number
}

export interface HomeworkTask {
  nom: string
  togri: boolean
  xato: string | null
  izoh: string
}

export interface HomeworkStudent {
  id: number
  code: string
  name: string
  journal_no: number
  homework: null | {
    id: number
    correct: number
    total: number
    tasks: HomeworkTask[]
    comment: string | null
    source: string
    confirmed: boolean
    image: string | null
  }
}

export interface HomeworkView {
  lesson_id: number
  class_id: number
  date: string
  topic: string | null
  reference: string | null
  students: HomeworkStudent[]
  checked: number
  avg_pct: number | null
  minutes_saved: number
  top_errors: { name: string; count: number }[]
}

export interface ImpactStats {
  since: string
  graded_works: number
  homework_checked: number
  open_graded: number
  cells_read: number
  cells_corrected: number
  accuracy_pct: number | null
  minutes_saved: number
  hours_saved: number
  feedback_written: number
  feedback_kept_pct: number | null
  sheets_used: number
  sheets_if_every_lesson: number
  sheets_saved: number
  paper_lessons: number
  quick_lessons: number
}

export interface Method {
  id: string
  name: string
  stages: string[]
  short: string
  form: string
  minutes: string
  steps: string[]
  custom?: boolean
  chosen?: number
}
export interface Stage { key: string; name: string; minutes: number; goal: string }

export interface PlanStage {
  key: string
  name: string
  minutes: number
  start: number
  candidates: { id: string; name: string; short: string; custom: boolean }[]
  method: { id: string; name: string; short: string; form: string; steps: string[] }
  teacher: string[]
  students: string[]
  targeted: { code: string; name: string; task: string; reason: string }[]
  why: string
}

export interface PlanGroup { n: number; members: { code: string; name: string; role: string; part: string; avg: number }[] }

export interface PlanRefs { textbook?: string; workbook?: string; chapter?: string; lesson_no?: number; kind?: string; points?: number }

export interface LessonPlan {
  id: number
  topic: string
  refs?: PlanRefs
  source: 'gpt' | 'shablon'
  diagnostic_id: number | null
  lesson_id: number
  class_id: number
  created_at: string
  status: 'qoralama' | 'tasdiqlangan'
  attended_today: string[]
  total_minutes?: number
  edited?: boolean
  format: { diagnostika_kuni: boolean; guruh_ishi: boolean }
  groups_formed?: string
  goal: { talimiy: string; tarbiyaviy: string; rivojlantiruvchi: string; mezonlar: string[] }
  stages: PlanStage[]
  alerts: { code: string; name: string; gap: number; reason: string; mandatory: boolean }[]
  groups: PlanGroup[]
  group_problem: null | { text: string; parts: { id: string; text: string; answer: string; skill: string; difficulty: number }[] }
  focus: { eng_zaif_bosqich?: string; togri_foiz?: number; asosiy_xato?: string | null; tavsiya?: string | null; ortacha_foiz?: number }
  homework: { asosiy: string; tanlov: string[] }
}

export interface StudentDetail {
  id: number
  code: string
  name: string
  journal_no: number
  skills: { key: string; name: string; score: number | null }[]
  avg: number
  gap: number
  gap_alert: number
  history: {
    diagnostic_id: number
    title: string
    date: string
    level: Level
    correct: number
    total: number
    primary_text: string
    steps: { step: string; ok: boolean }[]
    feedback: { student: string; parent: string; teacher: string }
  }[]
  attention: { date: string; topic: string | null }[]
}

export interface AttentionStudent { id: number; code: string; name: string; journal_no: number; today: boolean; gap: number }
export interface AttentionView {
  class: string
  class_id: number
  gap_alert: number
  lesson: { id: number; date: string; topic: string | null }
  students: AttentionStudent[]
}

export interface HeardNames {
  transcript: string
  matches: { id: number; code: string; name: string; heard: string }[]
  ambiguous: { heard: string; options: { id: number; code: string; name: string }[] }[]
}

export interface AiLog {
  totals: { calls: number; prompt_tokens: number; completion_tokens: number; avg_seconds: number }
  calls: { id: number; at: string; purpose: string; ok: boolean; seconds: number; prompt_tokens: number | null; completion_tokens: number | null; error: string | null }[]
}

export interface MethodCard { name: string; short: string; stages: string[]; form: string; minutes: string; steps: string[] }

export interface WeeklyReport {
  id: number
  class_id: number
  period: string
  source: string
  created_at: string
  sarlavha: string
  bandlar: string[]
  keyingi_hafta: string[]
  stats: { davr: string; darslar: number; etibor_qamrovi_foiz: number; diagnostikalar: number; etiborsizlar: number }
}

export interface DirectorClass {
  id: number
  name: string
  teacher: string | null
  students: number
  avg: number
  skills: Record<string, number>
  neglected: number
  coverage: number
  formative: number
  formative_expected: number
  lessons_quarter: number
  plan_share: number | null
  last_diag: { date: string; title: string; avg: number } | null
  consent: number
}

export interface DirectorPanel {
  school: { classes: number; students: number; teachers: number; avg: number; neglected: number; formative: number; quarter_start: string; weeks: number }
  skills: { key: string; name: string }[]
  skill_school: Record<string, number>
  classes: DirectorClass[]
  trend: { class: string; points: { date: string; title: string; avg: number }[] }[]
  alerts: string[]
  insight: string
  gap_alert: number
}

export interface ParentReport {
  student: { id: number; name: string; code: string }
  skills: { name: string; score: number | null; word: string }[]
  text: string
  channel: string
  consent: boolean
  token: string
}

export interface ParentLink { id: number; code: string; name: string; token: string; consent: boolean }

export interface ParentPortal {
  student: { first_name: string; name: string; code: string }
  class: { name: string; teacher: string | null; subject: string }
  consent: boolean
  skills: { name: string; score: number | null; word: string }[]
  good: string[]
  weak: string[]
  history: { title: string; date: string; correct: number; total: number; pct: number; parent: string; student: string; steps: { step: string; ok: boolean }[] }[]
  upcoming: { topic: string | null; date: string | null; diagnostic: string | null; textbook: string | null; workbook: string | null; assessment: string | null }
  tip: string
}

export interface GradeCell { points: number; max: number; kind: string; source: string }

export interface GradesView {
  class: string
  class_id: number
  quarter: number
  lessons: { lesson_id: number; date: string; short: string; topic: string | null; kind: 'formativ' | 'bsb' | 'chsb'; max: number; lesson_no: number | null; diagnostic_day: boolean }[]
  students: { id: number; code: string; name: string; journal_no: number; grades: Record<string, GradeCell>; avg: number | null }[]
}

export interface CurriculumTopic {
  id?: number
  order?: number
  week: number | null
  title: string
  hours: number
  skills: string[]
  prerequisites: string[]
  template?: string | null
  source?: string
  passed?: boolean
  quarter?: number | null
  chapter?: number | null
  chapter_title?: string | null
  kind?: LessonKind
  points?: number | null
  textbook?: string | null
  workbook?: string | null
  lesson_no?: number | null
}

export interface SchoolCalendar {
  year: string
  current_quarter: number
  quarters: { no: number; start: string; end: string; lessons: string }[]
  breaks: { start: string; end: string }[]
  holidays: { date: string; name: string }[]
  source: { textbook: string; workbook: string; plan: string; note: string }
}

export interface Curriculum {
  class: string
  class_id: number
  skills: { key: string; name: string }[]
  templates: { key: string; title: string }[]
  calendar: SchoolCalendar
  current_topic_id: number | null
  topics: CurriculumTopic[]
}
