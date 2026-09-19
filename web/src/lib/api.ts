import type {
  AiLog, AttentionView, ClassInfo, Curriculum, CurriculumTopic, DiagnosticDetail, DirectorPanel, HeardNames, LessonBrief, LessonDebrief, LessonDetail, LessonPlan,
  GradesView, HomeworkTask, HomeworkView, ImpactStats, Method, MethodCard, Overview, ParentLink, ParentPortal, ParentReport, Results,
  Stage, StudentDetail, TodayView, WeeklyReport, WorkbookPages,
} from './types'
import { getToken, type AuthUser } from './auth-store'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(path, token ? { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } } : init)
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* JSON bo'lmagan javob */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return res.json() as Promise<T>
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

const q = (classId?: number | null) => (classId ? `?class_id=${classId}` : '')

function upload<T>(path: string, file: File | Blob, name?: string) {
  const fd = new FormData()
  fd.append('file', file, name ?? (file instanceof File ? file.name : 'fayl'))
  return request<T>(path, { method: 'POST', body: fd })
}

type PlanEditBody = { status?: string; stages: { key: string; method_id?: string; minutes?: number; removed_codes?: string[] }[] }
type Added = { added: { id: number; code: string; name: string }[] }

export const api = {
  // kirish va landing chatboti
  register: (body: { email: string; password: string; full_name: string; role?: string; school?: string }) =>
    request<AuthUser>('/api/auth/register', json('POST', body)),
  login: (body: { email: string; password: string }) => request<AuthUser>('/api/auth/login', json('POST', body)),
  me: () => request<AuthUser>('/api/auth/me'),
  chat: (question: string, history: { role: string; text: string }[]) =>
    request<{ javob: string; manba: string; takliflar: string[] }>('/api/chat', json('POST', { question, history })),
  chatSuggestions: () => request<{ takliflar: string[]; ai: boolean }>('/api/chat/suggestions'),

  // sinflar va konveyer
  classes: () => request<ClassInfo[]>('/api/classes'),
  updateClass: (id: number, diag_every: number) => request<ClassInfo[]>(`/api/classes/${id}`, json('PUT', { diag_every })),
  today: () => request<TodayView>('/api/today'),
  classLessons: (id: number) => request<{ class: { id: number; name: string; diag_every: number }; lessons: LessonBrief[] }>(`/api/classes/${id}/lessons`),
  lesson: (id: number) => request<LessonDetail>(`/api/lessons/${id}`),
  lessonFormat: (id: number, body: { diagnostic_day?: boolean; group_work?: boolean }) => request<LessonDetail>(`/api/lessons/${id}`, json('PATCH', body)),
  preparePlan: (id: number, regroup = false) => request<LessonDetail>(`/api/lessons/${id}/plan`, json('POST', { regroup })),
  prepareDiagnostic: (id: number) => request<LessonDetail>(`/api/lessons/${id}/diagnostic`, json('POST')),
  conduct: (id: number) => request<LessonDetail>(`/api/lessons/${id}/conduct`, json('POST')),
  quickCheck: (id: number, body: { green: number; yellow: number; red: number; struggled: number[]; note?: string }) =>
    request<LessonDetail>(`/api/lessons/${id}/quick-check`, json('POST', body)),
  prepareNext: (id: number) => request<{ next_lesson_id: number; lesson: LessonDetail }>(`/api/lessons/${id}/next`, json('POST')),
  grades: (classId: number) => request<GradesView>(`/api/classes/${classId}/grades`),
  saveGrades: (lessonId: number, marks: Record<number, number | null>, kind = 'formativ') =>
    request<GradesView>(`/api/lessons/${lessonId}/grades`, json('PUT', { marks, kind })),
  lessonAttention: (id: number) => request<AttentionView>(`/api/lessons/${id}/attention`),
  saveLessonAttention: (id: number, student_ids: number[]) => request<AttentionView>(`/api/lessons/${id}/attention`, json('PUT', { student_ids })),
  markAttention: (id: number, student_ids: number[]) => request<AttentionView>(`/api/lessons/${id}/attention/mark`, json('POST', { student_ids })),
  attentionText: (id: number, text: string) => request<HeardNames>(`/api/lessons/${id}/attention/text`, json('POST', { text })),
  attentionVoice: (id: number, audio: Blob, name: string) => upload<HeardNames>(`/api/lessons/${id}/attention/voice`, audio, name),
  toggleAttention: (code: string, on: boolean, lesson_id: number) => request<{ ok: boolean }>('/api/attention/toggle', json('POST', { code, on, lesson_id })),

  // ovozli dars tahlili
  debriefVoice: (id: number, audio: Blob, name: string) => upload<LessonDebrief>(`/api/lessons/${id}/debrief/voice`, audio, name),
  debriefText: (id: number, text: string) => request<LessonDebrief>(`/api/lessons/${id}/debrief/text`, json('POST', { text })),
  clearDebrief: (id: number) => request<{ ok: boolean }>(`/api/lessons/${id}/debrief`, { method: 'DELETE' }),

  // ssenariy
  plan: (id: number) => request<LessonPlan>(`/api/plans/${id}`),
  editPlan: (id: number, body: PlanEditBody) => request<LessonPlan>(`/api/plans/${id}`, json('PUT', body)),

  // sinf, o'quvchilar
  overview: (classId: number | null) => request<Overview>(`/api/overview${q(classId)}`),
  student: (id: number) => request<StudentDetail>(`/api/students/${id}`),
  addStudents: (names: string[], classId: number | null) => request<Added>(`/api/students${q(classId)}`, json('POST', { names })),
  importStudents: (file: File, classId: number | null) => upload<Added>(`/api/students/import${q(classId)}`, file),
  settings: () => request<{ gap_alert: number }>('/api/settings'),
  saveSettings: (gap_alert: number) => request<{ gap_alert: number }>('/api/settings', json('PUT', { gap_alert })),

  // diagnostika
  templates: () => request<{ key: string; title: string }[]>('/api/templates'),
  diagnostic: (id: number) => request<DiagnosticDetail>(`/api/diagnostics/${id}`),
  scan: (id: number, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    return request<{ found: number; matched: number; flagged: number; errors: string[]; annotated: string[] }>(
      `/api/diagnostics/${id}/scan`, { method: 'POST', body: fd })
  },
  demoPhoto: (id: number) => request<{ found: number; matched: number; flagged: number; annotated: string }>(
    `/api/diagnostics/${id}/demo-photo`, json('POST')),
  saveResponse: (id: number, sid: number, marks: Record<string, string | null>) =>
    request<{ ok: boolean }>(`/api/diagnostics/${id}/responses/${sid}`, json('PUT', marks)),
  uploadPhotos: (id: number, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f, f.name))
    return request<DiagnosticDetail>(`/api/diagnostics/${id}/photos`, { method: 'POST', body: fd })
  },
  scanPending: (id: number) =>
    request<{ photos: number; found: number; matched: number; flagged: number; unknown: number[]; errors: string[] }>(
      `/api/diagnostics/${id}/scan-pending`, json('POST')),
  deleteScan: (did: number, scanId: number) => request<DiagnosticDetail>(`/api/diagnostics/${did}/scans/${scanId}`, { method: 'DELETE' }),
  confirmResponse: (did: number, sid: number) => request<{ ok: boolean }>(`/api/diagnostics/${did}/responses/${sid}/confirm`, json('POST')),
  grade: (id: number) => request<{ graded: number; feedback_source: string; summary_source: string }>(`/api/diagnostics/${id}/grade`, json('POST')),
  results: (id: number) => request<Results>(`/api/diagnostics/${id}/results`),
  rateFeedback: (did: number, sid: number, body: { rating?: number; text?: string }) =>
    request<Results>(`/api/diagnostics/${did}/results/${sid}/feedback`, json('PUT', body)),
  // uy vazifasi: mashq daftari sahifasi surati → AI tekshiruvi
  homework: (lessonId: number) => request<HomeworkView>(`/api/lessons/${lessonId}/homework`),
  uploadHomework: (lessonId: number, studentId: number, files: File[], analyze = false) => {
    const fd = new FormData()
    fd.append('student_id', String(studentId))
    files.forEach((f) => fd.append('files', f, f.name))
    return request<HomeworkView>(`/api/lessons/${lessonId}/homework?analyze=${analyze}`, { method: 'POST', body: fd })
  },
  analyzeHomework: (lessonId: number, studentId: number) =>
    request<HomeworkView>(`/api/lessons/${lessonId}/homework/${studentId}/analyze`, json('POST')),
  lessonWorkbook: (lessonId: number) => request<WorkbookPages & { lesson_id: number; topic: string | null }>(`/api/lessons/${lessonId}/workbook`),
  demoHomework: (lessonId: number, studentId?: number) =>
    request<HomeworkView & { demo_student_id?: number; error?: string }>(
      `/api/lessons/${lessonId}/homework/demo${studentId ? `?student_id=${studentId}` : ''}`, json('POST')),
  confirmHomework: (lessonId: number, sid: number, body: { tasks?: HomeworkTask[]; confirmed?: boolean }) =>
    request<HomeworkView>(`/api/lessons/${lessonId}/homework/${sid}`, json('PUT', body)),
  impact: (classId?: number | null) => request<ImpactStats>(`/api/impact${q(classId)}`),

  // kutubxona
  methods: () => request<{ stages: Stage[]; methods: Method[] }>('/api/methods'),
  methodDraft: (text: string) => request<{ card: MethodCard; source: string }>('/api/methods/draft', json('POST', { text })),
  saveMethod: (card: MethodCard, source_text: string) => request<Method>('/api/methods', json('POST', { card, source_text })),
  curriculum: (classId: number | null) => request<Curriculum>(`/api/curriculum${q(classId)}`),
  importCurriculum: (file: File) => upload<{ topics: CurriculumTopic[]; source: string; chars: number }>('/api/curriculum/import', file),
  confirmCurriculum: (topics: CurriculumTopic[], classId: number | null) => request<Curriculum>(`/api/curriculum/confirm${q(classId)}`, json('POST', { topics })),
  resetCurriculum: (classId: number | null) => request<Curriculum>(`/api/curriculum/reset${q(classId)}`, json('POST')),

  // hisobotlar: o'qituvchi, direktor, ota-ona
  weekly: (classId: number | null) => request<{ report: WeeklyReport | null }>(`/api/reports/weekly${q(classId)}`),
  createWeekly: (classId: number | null) => request<{ report: WeeklyReport }>(`/api/reports/weekly${q(classId)}`, json('POST')),
  director: () => request<DirectorPanel>('/api/reports/director'),
  parentLinks: (classId: number | null) => request<ParentLink[]>(`/api/reports/parents${q(classId)}`),
  parentReport: (sid: number) => request<ParentReport>(`/api/students/${sid}/parent-report`),
  parentPortal: (token: string) => request<ParentPortal>(`/api/parent/${token}`),
  parentConsent: (token: string, consent: boolean) => request<ParentPortal>(`/api/parent/${token}/consent`, json('PUT', { consent })),

  aiLog: () => request<AiLog>('/api/ai-log'),
  demoReset: () => request<{ ok: boolean }>('/api/demo/reset', json('POST')),
}
