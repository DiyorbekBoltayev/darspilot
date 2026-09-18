import { createContext, useContext } from 'react'
import type { SwarmKind } from './fx/swarmScene'

export interface Ctx {
  run: <T>(kind: SwarmKind, fn: () => Promise<T>) => Promise<T>
  toast: (text: string, tone?: 'good' | 'bad') => void
  busy: boolean
}

export const AiContext = createContext<Ctx | null>(null)

export function useAi() {
  const ctx = useContext(AiContext)
  if (!ctx) throw new Error('AiProvider topilmadi')
  return ctx
}
