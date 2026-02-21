'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'

export default function Home() {
    const router = useRouter()
    const { isAuthenticated, _hasHydrated } = useAuthStore()

    useEffect(() => {
        if (!_hasHydrated) return

        if (isAuthenticated) {
            router.replace('/select-store')
        } else {
            router.replace('/login')
        }
    }, [_hasHydrated, isAuthenticated, router])

    return null
}
