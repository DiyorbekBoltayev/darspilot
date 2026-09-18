import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Role } from '@/lib/types'
import { SessionContext } from './session-context'

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* saqlash imkoni yo'q — sessiya ichida ishlayveradi */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: api.classes })
  const [picked, setPicked] = useState<number | null>(() => Number(read('dp.class')) || null)
  const [role, setRoleState] = useState<Role>(() => (read('dp.role') as Role) || 'teacher')

  const current = classes.find((c) => c.id === picked) ?? classes[0] ?? null
  const setClassId = useCallback((id: number) => {
    setPicked(id)
    write('dp.class', String(id))
  }, [])
  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    write('dp.role', r)
  }, [])

  const value = useMemo(() => ({ classes, classId: current?.id ?? null, current, setClassId, role, setRole }), [classes, current, setClassId, role, setRole])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
