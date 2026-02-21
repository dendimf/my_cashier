'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            currentStore: null,
            isAuthenticated: false,

            setAuth: (user, token) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token)
                }
                set({ user, token, isAuthenticated: true })
            },

            setCurrentStore: (store) => set({ currentStore: store }),

            logout: () => {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token')
                }
                set({ user: null, token: null, currentStore: null, isAuthenticated: false })
            },

            updateUser: (user) => set({ user }),
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'kasirku-auth',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            },
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                currentStore: state.currentStore,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)
