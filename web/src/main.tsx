import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { AiProvider } from '@/components/AiTask'
import { SessionProvider } from '@/components/Session'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AiProvider>
          <App />
        </AiProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
