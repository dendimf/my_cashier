'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { stockAPI, productsAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, AlertTriangle, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function StockPage() {
    const { currentStore } = useAuthStore()
    const [movements, setMovements] = useState([])
    const [lowStock, setLowStock] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formType, setFormType] = useState('in')
    const [form, setForm] = useState({ product_id: '', quantity: '', notes: '' })
    const [saving, setSaving] = useState(false)
    const [tab, setTab] = useState('movements')

    useEffect(() => {
        if (!currentStore?.id) return
        load()
    }, [currentStore])

    const load = async () => {
        setLoading(true)
        try {
            const [mRes, lRes, pRes] = await Promise.all([
                stockAPI.list(currentStore.id, { per_page: 50 }),
                stockAPI.getLowStock(currentStore.id),
                productsAPI.list(currentStore.id, { per_page: 200 })
            ])
            setMovements(mRes.data.data || [])
            setLowStock(lRes.data.data || [])
            setProducts(pRes.data.data || [])
        } catch { toast.error('Gagal memuat stok') }
        finally { setLoading(false) }
    }

    const handleStock = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            const payload = { product_id: form.product_id, quantity: parseInt(form.quantity), notes: form.notes }
            if (formType === 'in') await stockAPI.stockIn(currentStore.id, payload)
            else await stockAPI.stockOut(currentStore.id, payload)
            toast.success(`Stok berhasil di${formType === 'in' ? 'tambah' : 'kurang'}`)
            setShowForm(false); setForm({ product_id: '', quantity: '', notes: '' }); load()
        } catch (err) { toast.error(err.response?.data?.error || 'Gagal') }
        finally { setSaving(false) }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Manajemen Stok</h1>
                <div className="flex gap-2">
                    <button onClick={() => { setFormType('in'); setShowForm(true) }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm transition">
                        <ArrowDown className="w-4 h-4" /> Stok Masuk
                    </button>
                    <button onClick={() => { setFormType('out'); setShowForm(true) }} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl text-sm transition">
                        <ArrowUp className="w-4 h-4" /> Stok Keluar
                    </button>
                </div>
            </div>

            {lowStock.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        <span className="text-orange-400 font-medium">Stok Rendah ({lowStock.length} produk)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {lowStock.map(p => (
                            <div key={p.id} className="bg-orange-500/10 rounded-lg px-3 py-2 flex justify-between items-center">
                                <span className="text-orange-300 text-sm">{p.name}</span>
                                <span className="text-orange-400 font-bold text-sm">{p.stock}/{p.min_stock}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                {['movements', 'products'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-white/10 hover:bg-slate-800'}`}>
                        {t === 'movements' ? 'Riwayat Pergerakan' : 'Status Stok Produk'}
                    </button>
                ))}
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="text-center text-slate-500 py-12">Memuat...</div>
                ) : tab === 'movements' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-white/10">
                                {['Produk', 'Tipe', 'Qty', 'Sebelum', 'Sesudah', 'Keterangan', 'Waktu'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {movements.map(m => (
                                    <tr key={m.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 text-white text-sm">{m.product_name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${m.type === 'in' || m.type === 'return' ? 'bg-emerald-500/20 text-emerald-400' : m.type === 'sale' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {m.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white text-sm">{m.quantity}</td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{m.stock_before}</td>
                                        <td className="px-4 py-3 text-white text-sm font-medium">{m.stock_after}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{m.notes || '-'}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{m.created_at ? format(new Date(m.created_at), 'dd/MM HH:mm') : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-white/10">
                                {['Produk', 'Kategori', 'Stok', 'Stok Min', 'Status'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 text-white text-sm">{p.name}</td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{p.category_name || '-'}</td>
                                        <td className="px-4 py-3"><span className={`font-bold text-sm ${p.stock <= p.min_stock ? 'text-orange-400' : 'text-white'}`}>{p.stock}</span></td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{p.min_stock}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${p.stock <= p.min_stock ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {p.stock <= p.min_stock ? 'Rendah' : 'Normal'}
                                            </span>
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
                            <h3 className="text-white font-semibold">{formType === 'in' ? 'Stok Masuk' : 'Stok Keluar'}</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleStock} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Produk</label>
                                <select required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400">
                                    <option value="">Pilih produk</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Jumlah</label>
                                <input required type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Keterangan</label>
                                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opsional"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-white/20 text-slate-300 py-2.5 rounded-xl text-sm hover:bg-white/5 transition">Batal</button>
                                <button type="submit" disabled={saving} className={`flex-1 ${formType === 'in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50`}>
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
