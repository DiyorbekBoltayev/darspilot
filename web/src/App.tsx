import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { api } from '@/lib/api'
import { lessonHref } from '@/lib/conveyor'
import Layout from '@/components/Layout'
import { Empty, PageSkeleton } from '@/components/ui'
import Today from '@/pages/Today'
import Landing from '@/pages/Landing'

const Lessons = lazy(() => import('@/pages/Lessons'))
const Lesson = lazy(() => import('@/pages/Lesson'))
const ClassMap = lazy(() => import('@/pages/ClassMap'))
const Grades = lazy(() => import('@/pages/Grades'))
const DiagnosticDetail = lazy(() => import('@/pages/DiagnosticDetail'))
const Results = lazy(() => import('@/pages/Results'))
const Student = lazy(() => import('@/pages/Student'))
const Methods = lazy(() => import('@/pages/Methods'))
const AiLog = lazy(() => import('@/pages/AiLog'))
const Curriculum = lazy(() => import('@/pages/Curriculum'))
const Reports = lazy(() => import('@/pages/Reports'))
const Director = lazy(() => import('@/pages/Director'))
const ParentPicker = lazy(() => import('@/pages/ParentPicker'))
const ParentPortal = lazy(() => import('@/pages/ParentPortal'))
const Auth = lazy(() => import('@/pages/Auth'))

const page = (el: ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>

/** Eski havolalar: /ssenariy/:id → ssenariy tegishli bo'lgan dars. */
function PlanRedirect() {
  const id = Number(useParams().id)
  const { data, error } = useQuery({ queryKey: ['plan', id], queryFn: () => api.plan(id) })
  if (error) return <Navigate to="/darslar" replace />
  if (!data) return <PageSkeleton />
  return <Navigate to={lessonHref(data.lesson_id, 'tayyorlash')} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="kirish" element={page(<Auth />)} />
        <Route path="ota-ona/:token" element={page(<ParentPortal />)} />
        <Route element={<Layout />}>
          <Route path="bugun" element={<Today />} />
          <Route path="darslar" element={page(<Lessons />)} />
          <Route path="dars/:id" element={page(<Lesson />)} />
          <Route path="sinf" element={page(<ClassMap />)} />
          <Route path="baholar" element={page(<Grades />)} />
          <Route path="oquvchi/:id" element={page(<Student />)} />
          <Route path="diagnostika/:id" element={page(<DiagnosticDetail />)} />
          <Route path="diagnostika/:id/natijalar" element={page(<Results />)} />
          <Route path="metodlar" element={page(<Methods />)} />
          <Route path="dastur" element={page(<Curriculum />)} />
          <Route path="hisobotlar" element={page(<Reports />)} />
          <Route path="direktor" element={page(<Director />)} />
          <Route path="ota-ona" element={page(<ParentPicker />)} />
          <Route path="ai" element={page(<AiLog />)} />
          <Route path="ssenariy/:id" element={<PlanRedirect />} />
          <Route path="ssenariy" element={<Navigate to="/darslar" replace />} />
          <Route path="diagnostika" element={<Navigate to="/darslar" replace />} />
          <Route path="etibor" element={<Navigate to="/sinf" replace />} />
          <Route
            path="*"
            element={<Empty icon={Compass} title="Sahifa topilmadi" action={<Link to="/" className="text-firuza-700">Bosh sahifaga</Link>} />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
