'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { storesAPI, authAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { Store, User, Key, Users, Plus, ShieldCheck } from 'lucide-react'

export default function SettingsPage() {
    const { currentStore, setCurrentStore, user, updateUser } = useAuthStore()
    const [tab, setTab] = useState('store')

    // Staff state
    const [staff, setStaff] = useState([])
    const [loadingStaff, setLoadingStaff] = useState(false)
    const [showStaffModal, setShowStaffModal] = useState(false)
    const [staffForm, setStaffForm] = useState({ full_name: '', email: '', password: '', role: 'cashier' })
    const [addingStaff, setAddingStaff] = useState(false)

    // Store form
    const [storeForm, setStoreForm] = useState({ name: '', address: '', phone: '', email: '', tax_rate: 0, currency: 'IDR', whatsapp_provider: 'fonnte', whatsapp_api_key: '' })
    const [savingStore, setSavingStore] = useState(false)

    // Profile form
    const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
    const [savingProfile, setSavingProfile] = useState(false)

    // Password form
    const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm: '' })
    const [savingPass, setSavingPass] = useState(false)

    useEffect(() => {
        if (currentStore) {
            setStoreForm({
                name: currentStore.name || '',
                address: currentStore.address || '',
                phone: currentStore.phone || '',
                email: currentStore.email || '',
                tax_rate: currentStore.tax_rate || 0,
                currency: currentStore.currency || 'IDR',
                whatsapp_provider: currentStore.whatsapp_provider || 'fonnte',
                whatsapp_api_key: currentStore.whatsapp_api_key || ''
            })
            if (tab === 'staff') fetchStaff()
        }
        if (user) {
            setProfileForm({ full_name: user.full_name || '', phone: user.phone || '' })
        }
    }, [currentStore, user, tab])

    const fetchStaff = async () => {
        setLoadingStaff(true)
        try {
            const res = await storesAPI.listStaff(currentStore.id)
            setStaff(res.data.data || [])
        } catch { toast.error('Gagal memuat daftar karyawan') }
        finally { setLoadingStaff(false) }
    }

    const handleAddStaff = async (e) => {
        e.preventDefault(); setAddingStaff(true)
        try {
            await storesAPI.createStaff(currentStore.id, staffForm)
            toast.success('Karyawan berhasil ditambahkan')
            setShowStaffModal(false)
            setStaffForm({ full_name: '', email: '', password: '', role: 'cashier' })
            fetchStaff()
        } catch (err) { toast.error(err.response?.data?.error || 'Gagal menambah karyawan') }
        finally { setAddingStaff(false) }
    }

    const handleSaveStore = async (e) => {
        e.preventDefault(); setSavingStore(true)
        try {
            const res = await storesAPI.update(currentStore.id, { ...storeForm, tax_rate: parseFloat(storeForm.tax_rate) })
            setCurrentStore(res.data.data)
            toast.success('Pengaturan toko disimpan')
        } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
        finally { setSavingStore(false) }
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault(); setSavingProfile(true)
        try {
            const res = await authAPI.updateProfile(profileForm)
            updateUser(res.data.data)
            toast.success('Profil diperbarui')
        } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
        finally { setSavingProfile(false) }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (passForm.new_password !== passForm.confirm) { toast.error('Konfirmasi password tidak cocok'); return }
        if (passForm.new_password.length < 8) { toast.error('Password minimal 8 karakter'); return }
        setSavingPass(true)
        try {
            await authAPI.changePassword({ current_password: passForm.current_password, new_password: passForm.new_password })
            toast.success('Password berhasil diubah')
            setPassForm({ current_password: '', new_password: '', confirm: '' })
        } catch (err) { toast.error(err.response?.data?.error || 'Gagal mengubah password') }
        finally { setSavingPass(false) }
    }

    const tabs = [
        { id: 'store', label: 'Toko', icon: Store },
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'staff', label: 'Karyawan', icon: Users },
        { id: 'password', label: 'Password', icon: Key },
    ]

    const inputClass = "w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400"

    return (
        <div className="space-y-5 max-w-2xl">
            <h1 className="text-2xl font-bold text-white">Pengaturan</h1>

            <div className="flex flex-wrap gap-2">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === id ? 'bg-purple-600 text-white' : 'bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-800'}`}>
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {tab === 'store' && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-white font-semibold mb-5">Informasi Toko</h2>
                    <form onSubmit={handleSaveStore} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: 'Nama Toko *', key: 'name', required: true },
                                { label: 'Telepon', key: 'phone' },
                                { label: 'Email', key: 'email', type: 'email' },
                                { label: 'Pajak (%)', key: 'tax_rate', type: 'number', step: '0.1' },
                            ].map(({ label, key, required, type = 'text', step }) => (
                                <div key={key}>
                                    <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
                                    <input type={type} step={step} required={required} value={storeForm[key]} onChange={e => setStoreForm({ ...storeForm, [key]: e.target.value })} className={inputClass} />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1.5">Alamat</label>
                            <textarea value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} rows={2}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400 resize-none" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Provider WhatsApp</label>
                                <select value={storeForm.whatsapp_provider} onChange={e => setStoreForm({ ...storeForm, whatsapp_provider: e.target.value })} className={inputClass}>
                                    <option value="fonnte">Fonnte</option>
                                    <option value="wablas">Wablas</option>
                                    <option value="none">Tidak Pakai</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">API Key WhatsApp</label>
                                <input type="text" value={storeForm.whatsapp_api_key} onChange={e => setStoreForm({ ...storeForm, whatsapp_api_key: e.target.value })} placeholder="Token API" className={inputClass} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={savingStore} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                {savingStore ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {tab === 'profile' && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-white font-semibold mb-5">Profil Saya</h2>
                    <div className="mb-4 p-3 bg-slate-800 rounded-xl">
                        <p className="text-slate-500 text-xs">Email</p>
                        <p className="text-white text-sm">{user?.email}</p>
                    </div>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1.5">Nama Lengkap</label>
                            <input type="text" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1.5">No. HP</label>
                            <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className={inputClass} />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={savingProfile} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {tab === 'staff' && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-white font-semibold">Daftar Karyawan</h2>
                            <p className="text-xs text-slate-500">Karyawan hanya bisa mengakses menu POS & Pelanggan</p>
                        </div>
                        <button onClick={() => setShowStaffModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                            <Plus className="w-4 h-4" /> Tambah Karyawan
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-white/5">
                                {['Nama', 'Email', 'Role', 'Status'].map(h => <th key={h} className="text-left px-6 py-3 text-xs text-slate-500 uppercase">{h}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingStaff ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">Memuat...</td></tr>
                                ) : staff.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">Belum ada karyawan</td></tr>
                                ) : (
                                    staff.map(s => (
                                        <tr key={s.id} className="hover:bg-white/5">
                                            <td className="px-6 py-4 text-white text-sm font-medium">{s.full_name}</td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">{s.email}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-500/20 text-blue-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                                    {s.staff_role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'password' && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-white font-semibold mb-5">Ubah Password</h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {[
                            { label: 'Password Saat Ini', key: 'current_password' },
                            { label: 'Password Baru (min. 8 karakter)', key: 'new_password' },
                            { label: 'Konfirmasi Password Baru', key: 'confirm' },
                        ].map(({ label, key }) => (
                            <div key={key}>
                                <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
                                <input type="password" value={passForm[key]} onChange={e => setPassForm({ ...passForm, [key]: e.target.value })} required className={inputClass} />
                            </div>
                        ))}
                        <div className="flex justify-end">
                            <button type="submit" disabled={savingPass} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                {savingPass ? 'Mengubah...' : 'Ubah Password'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showStaffModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-600 p-2 rounded-xl">
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-white font-bold">Tambah Karyawan Baru</h3>
                            </div>
                            <button onClick={() => setShowStaffModal(false)} className="text-slate-500 hover:text-white transition">✕</button>
                        </div>
                        <form onSubmit={handleAddStaff} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Nama Lengkap</label>
                                <input type="text" required value={staffForm.full_name} onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })} placeholder="Dendy" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Email Karyawan</label>
                                <input type="email" required value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="email@karyawan.com" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Password</label>
                                <input type="password" required minLength={8} value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="Minimal 8 karakter" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Role / Hak Akses</label>
                                <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })} className={inputClass}>
                                    <option value="cashier">Kasir (Hanya POS & Pelanggan)</option>
                                    <option value="manager">Manajer (Akses Terbatas)</option>
                                </select>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setShowStaffModal(false)} className="flex-1 bg-white/5 border border-white/10 text-slate-300 font-semibold py-3 rounded-2xl hover:bg-white/10 transition">Batal</button>
                                <button type="submit" disabled={addingStaff} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-purple-600/20 disabled:opacity-50 transition">
                                    {addingStaff ? 'Memproses...' : 'Tambah Karyawan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
