'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { Eye, EyeOff, ShoppingCart } from 'lucide-react'

export default function RegisterPage() {
    const router = useRouter()
    const setAuth = useAuthStore((s) => s.setAuth)
    const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.password.length < 8) {
            toast.error('Password minimal 8 karakter')
            return
        }
        setLoading(true)
        try {
            const res = await authAPI.register(form)
            const { access_token, user } = res.data.data
            setAuth(user, access_token)
            toast.success('Akun berhasil dibuat!')
            router.push('/select-store')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registrasi gagal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                    <div className="flex items-center justify-center mb-8">
                        <div className="bg-purple-500 rounded-xl p-3 mr-3">
                            <ShoppingCart className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">KasirKu</h1>
                    </div>

                    <h2 className="text-xl font-semibold text-white text-center mb-2">Buat Akun Baru</h2>
                    <p className="text-slate-400 text-center text-sm mb-8">Mulai kelola bisnis Anda</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-300 mb-1.5">Nama Lengkap</label>
                            <input
                                type="text"
                                value={form.full_name}
                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                placeholder="Nama lengkap"
                                required
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition"
                            />
                        </div>
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
                            <label className="block text-sm text-slate-300 mb-1.5">No. HP (opsional)</label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="08xxxxxxxxxx"
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
                                    placeholder="Min. 8 karakter"
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
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                        </button>
                    </form>

                    <p className="text-center text-slate-400 text-sm mt-6">
                        Sudah punya akun?{' '}
                        <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                            Masuk
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
