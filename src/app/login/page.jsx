'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { Eye, EyeOff, ShoppingCart } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const { setAuth, isAuthenticated, _hasHydrated } = useAuthStore()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (_hasHydrated && isAuthenticated) {
            router.replace('/select-store')
        }
    }, [_hasHydrated, isAuthenticated, router])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await authAPI.login(form)
            const { access_token, user } = res.data.data
            setAuth(user, access_token)
            toast.success(`Selamat datang, ${user.full_name}!`)
            router.push('/select-store')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login gagal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="bg-purple-500 rounded-xl p-3 mr-3">
                            <ShoppingCart className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">KasirKu</h1>
                    </div>

                    <h2 className="text-xl font-semibold text-white text-center mb-2">Masuk ke Akun</h2>
                    <p className="text-slate-400 text-center text-sm mb-8">Kelola bisnis Anda dengan mudah</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-300 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="email@example.com"
                                required
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition">
                                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? 'Masuk...' : 'Masuk'}
                        </button>
                    </form>

                    <p className="text-center text-slate-400 text-sm mt-6">
                        Belum punya akun?{' '}
                        <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
