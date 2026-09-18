/** Kirgan foydalanuvchi: token brauzerda saqlanadi, o'zgarishni komponentlar kuzatadi. */
import { useSyncExternalStore } from 'react'

export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: string
  school: string | null
  token?: string
}

const KEY = 'darspilot.user'
const listeners = new Set<() => void>()
let cache: AuthUser | null | undefined

function read(): AuthUser | null {
  if (cache !== undefined) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    cache = null
  }
  return cache
}

export function setUser(user: AuthUser | null) {
  cache = user
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user))
    else localStorage.removeItem(KEY)
  } catch {
    /* brauzer xotirasi yopiq bo'lsa ham ilova ishlashda davom etadi */
  }
  listeners.forEach((fn) => fn())
}

export function getUser(): AuthUser | null {
  return read()
}

export function getToken(): string | null {
  return read()?.token ?? null
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useUser(): AuthUser | null {
  return useSyncExternalStore(subscribe, read, () => null)
}

/** Rol nomi (backend o'zbekcha saqlaydi) → ilovadagi rol kaliti. */
export function roleKey(role?: string): 'teacher' | 'director' | 'parent' {
  if (role === 'direktor') return 'director'
  if (role === 'ota-ona') return 'parent'
  return 'teacher'
}
