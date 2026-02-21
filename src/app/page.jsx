'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'

export default function Home() {
    const router = useRouter()
    const { isAuthenticated } = useAuthStore()

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/select-store')
        } else {
            router.replace('/login')
        }
    }, [isAuthenticated, router])

    return null
}
