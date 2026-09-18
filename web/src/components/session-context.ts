import { createContext, useContext } from 'react'
import type { ClassInfo, Role } from '@/lib/types'

export interface Session {
  classes: ClassInfo[]
  classId: number | null
  current: ClassInfo | null
  setClassId: (id: number) => void
  role: Role
  setRole: (role: Role) => void
}

export const SessionContext = createContext<Session | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('SessionProvider topilmadi')
  return ctx
}

export const ROLE_HOME: Record<Role, string> = { teacher: '/bugun', director: '/direktor', parent: '/ota-ona' }
