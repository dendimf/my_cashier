'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: { staleTime: 30000, retry: 1 }
        }
    }))

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: { background: '#1e293b', color: '#f8fafc', borderRadius: '10px' }
                }}
            />
        </QueryClientProvider>
    )
}
