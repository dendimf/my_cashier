'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { storesAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { Store, Plus, LogOut, ShoppingCart, MapPin } from 'lucide-react'

export default function SelectStorePage() {
    const router = useRouter()
    const { user, isAuthenticated, logout, setCurrentStore, _hasHydrated } = useAuthStore()
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newStore, setNewStore] = useState({ name: '', address: '' })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (!_hasHydrated) return
        if (!isAuthenticated) { router.push('/login'); return }
        fetchStores()
    }, [_hasHydrated, isAuthenticated])

    const fetchStores = async () => {
        try {
            const res = await storesAPI.list()
            setStores(res.data.data || [])
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Gagal memuat toko'
            toast.error(typeof errorMsg === 'string' ? errorMsg : 'Gagal memuat toko')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectStore = (store) => {
        setCurrentStore(store)
        toast.success(`Membuka ${store.name}`)
        if (user?.role === 'owner' || user?.role === 'admin') {
            router.push('/dashboard')
        } else {
            router.push('/pos')
        }
    }

    const handleCreateStore = async (e) => {
        e.preventDefault()
        setCreating(true)
        try {
            const res = await storesAPI.create(newStore)
            const store = res.data.data
            toast.success('Toko berhasil dibuat!')
            setCurrentStore(store)
            router.push('/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal membuat toko')
        } finally {
            setCreating(false)
        }
    }

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    if (!_hasHydrated) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500 rounded-xl p-2.5">
                            <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">KasirKu</h1>
                            <p className="text-slate-400 text-sm">{user?.full_name}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <LogOut className="w-4 h-4" /> Keluar
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Pilih Toko</h2>
                <p className="text-slate-400 mb-6">Pilih toko yang ingin Anda kelola</p>

                {/* Stores */}
                {loading ? (
                    <div className="text-center text-slate-400 py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                        Memuat toko...
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {stores.map(store => (
                            <button
                                key={store.id}
                                onClick={() => handleSelectStore(store)}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-xl p-5 text-left transition-all duration-200 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-500/20 rounded-xl p-3 group-hover:bg-purple-500/30 transition">
                                        <Store className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-lg">{store.name}</h3>
                                        {store.address && (
                                            <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                                                <MapPin className="w-3 h-3" /> {store.address}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}

                        {/* Create New Store */}
                        {!showCreate ? (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="border-2 border-dashed border-white/20 hover:border-purple-400 rounded-xl p-5 text-center transition-all duration-200 group"
                            >
                                <Plus className="w-6 h-6 text-slate-400 group-hover:text-purple-400 mx-auto mb-2 transition" />
                                <span className="text-slate-400 group-hover:text-purple-400 transition font-medium">Tambah Toko Baru</span>
                            </button>
                        ) : (
                            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5">
                                <h3 className="text-white font-semibold mb-4">Buat Toko Baru</h3>
                                <form onSubmit={handleCreateStore} className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Nama Toko *"
                                        value={newStore.name}
                                        onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                                        required
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Alamat (opsional)"
                                        value={newStore.address}
                                        onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-sm"
                                    />
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-white/20 text-slate-300 py-2.5 rounded-lg text-sm hover:bg-white/10 transition">
                                            Batal
                                        </button>
                                        <button type="submit" disabled={creating} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                                            {creating ? 'Membuat...' : 'Buat Toko'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
