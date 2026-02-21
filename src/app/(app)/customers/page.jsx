'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { customersAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { Plus, Search, Edit, Trash2, BookUser } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

export default function CustomersPage() {
    const { currentStore } = useAuthStore()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!currentStore?.id) return
        load()
    }, [currentStore, search])

    const load = async () => {
        setLoading(true)
        try {
            const res = await customersAPI.list(currentStore.id, { search, per_page: 50 })
            setCustomers(res.data.data || [])
        } catch { toast.error('Gagal memuat pelanggan') }
        finally { setLoading(false) }
    }

    const openCreate = () => { setEditItem(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setShowForm(true) }
    const openEdit = (c) => { setEditItem(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setShowForm(true) }

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editItem) { await customersAPI.update(currentStore.id, editItem.id, form); toast.success('Pelanggan diperbarui') }
            else { await customersAPI.create(currentStore.id, form); toast.success('Pelanggan ditambahkan') }
            setShowForm(false); load()
        } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Hapus pelanggan ini?')) return
        try { await customersAPI.delete(currentStore.id, id); toast.success('Pelanggan dihapus'); load() }
        catch { toast.error('Gagal menghapus') }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-white">Pelanggan</h1>
                <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
                    <Plus className="w-4 h-4" /> Tambah Pelanggan
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, HP, atau email..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400" />
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="text-center text-slate-500 py-12">Memuat...</div>
                ) : customers.length === 0 ? (
                    <div className="text-center py-12">
                        <BookUser className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">Belum ada pelanggan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-white/10">
                                {['Nama', 'No. HP', 'Email', 'Total Belanja', 'Transaksi', 'Aksi'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {customers.map(c => (
                                    <tr key={c.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 text-white text-sm font-medium">{c.name}</td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{c.phone || '-'}</td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{c.email || '-'}</td>
                                        <td className="px-4 py-3 text-purple-400 text-sm">{fmt(c.total_spent)}</td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{c.total_transactions}</td>
                                        <td className="px-4 py-3 flex gap-2">
                                            <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-purple-400 transition"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-white/10">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h3 className="text-white font-semibold">{editItem ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-3">
                            {[
                                { label: 'Nama *', key: 'name', required: true, placeholder: 'Nama pelanggan' },
                                { label: 'No. HP', key: 'phone', placeholder: '08xxx' },
                                { label: 'Email', key: 'email', placeholder: 'email@example.com' },
                                { label: 'Alamat', key: 'address', placeholder: 'Alamat' },
                                { label: 'Catatan', key: 'notes', placeholder: 'Catatan opsional' },
                            ].map(({ label, key, required, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-sm text-slate-400 mb-1">{label}</label>
                                    <input type="text" required={required} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400" />
                                </div>
                            ))}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-white/20 text-slate-300 py-2.5 rounded-xl text-sm hover:bg-white/5 transition">Batal</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
