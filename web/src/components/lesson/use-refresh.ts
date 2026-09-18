import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LessonDetail } from '@/lib/types'

/** Konveyer amalidan keyin bog'liq ko'rinishlarni yangilaydi: dars, bugun, sinf darslari, sinf paneli. */
export function useLessonRefresh(id: number) {
  const qc = useQueryClient()
  return useCallback((detail?: LessonDetail) => {
    if (detail && detail.id === id) qc.setQueryData(['lesson', id], detail)
    for (const key of ['lesson', 'today', 'class-lessons', 'classes', 'overview', 'attention', 'director', 'diagnostic', 'results']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }, [qc, id])
}
