'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import { productsAPI, categoriesAPI, storesAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { Plus, Search, Edit, Trash2, Package, Image as ImageIcon, Upload, X } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

export default function ProductsPage() {
    const router = useRouter()
    const { currentStore } = useAuthStore()
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCat, setSelectedCat] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editProduct, setEditProduct] = useState(null)
    const [form, setForm] = useState({ name: '', price: '', cost: '', stock: '', min_stock: '5', unit: 'pcs', category_id: '', barcode: '', description: '', track_stock: true, image_url: '' })
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        if (!currentStore?.id) return
        load()
    }, [currentStore, search, selectedCat])

    const load = async () => {
        setLoading(true)
        try {
            const params = {}
            if (search) params.search = search
            if (selectedCat) params.category_id = selectedCat
            const [pRes, cRes] = await Promise.all([
                productsAPI.list(currentStore.id, params),
                categoriesAPI.list(currentStore.id)
            ])
            setProducts(pRes.data.data || [])
            setCategories(cRes.data.data || [])
        } catch { toast.error('Gagal memuat produk') }
        finally { setLoading(false) }
    }

    const openCreate = () => { setEditProduct(null); setForm({ name: '', price: '', cost: '', stock: '', min_stock: '5', unit: 'pcs', category_id: '', barcode: '', description: '', track_stock: true, image_url: '' }); setShowForm(true) }
    const openEdit = (p) => { setEditProduct(p); setForm({ name: p.name, price: p.price, cost: p.cost, stock: p.stock, min_stock: p.min_stock, unit: p.unit, category_id: p.category_id || '', barcode: p.barcode || '', description: p.description || '', track_stock: p.track_stock, image_url: p.image_url || '' }); setShowForm(true) }

    const handleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) return toast.error('Ukuran gambar maksimal 2MB')

        const formData = new FormData()
        formData.append('image', file)

        setUploading(true)
        try {
            const uploadRes = await storesAPI.uploadImage(currentStore.id, formData)
            setForm(prev => ({ ...prev, image_url: uploadRes.data.url }))
            toast.success('Gambar berhasil diunggah')
        } catch (err) {
            toast.error('Gagal mengunggah gambar')
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true)
        try {
            const payload = { ...form, price: parseFloat(form.price), cost: parseFloat(form.cost) || 0, stock: parseInt(form.stock) || 0, min_stock: parseInt(form.min_stock) || 5, category_id: form.category_id || null }
            if (editProduct) {
                await productsAPI.update(currentStore.id, editProduct.id, payload)
                toast.success('Produk diperbarui')
            } else {
                await productsAPI.create(currentStore.id, payload)
                toast.success('Produk ditambahkan')
            }
            setShowForm(false); load()
        } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Hapus produk ini?')) return
        try { await productsAPI.delete(currentStore.id, id); toast.success('Produk dihapus'); load() }
        catch { toast.error('Gagal menghapus') }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-white">Produk</h1>
                <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
                    <Plus className="w-4 h-4" /> Tambah Produk
                </button>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..."
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400">
                    <option value="">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="text-center text-slate-500 py-12">Memuat...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">Belum ada produk</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-white/10">
                                {['Produk', 'Kategori', 'Harga', 'HPP', 'Stok', 'Status', 'Aksi'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-slate-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-white text-sm font-medium">{p.name}</div>
                                                    <div className="text-slate-500 text-xs">{p.barcode}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{p.category_name || '-'}</td>
                                        <td className="px-4 py-3 text-purple-400 text-sm font-medium">{fmt(p.price)}</td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{fmt(p.cost)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-medium ${p.stock <= p.min_stock ? 'text-orange-400' : 'text-white'}`}>{p.stock}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {p.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-purple-400 transition"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-slate-900/80 backdrop-blur-md z-10">
                            <h3 className="text-white font-bold text-lg">{editProduct ? 'Edit Produk' : 'Tambah Produk'}</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {/* Image Upload */}
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-2xl bg-slate-800 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden hover:border-purple-500/50 transition-colors">
                                        {uploading ? (
                                            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                                        ) : form.image_url ? (
                                            <>
                                                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center justify-center p-4 text-center">
                                                <ImageIcon className="w-8 h-8 text-slate-500 mb-2" />
                                                <span className="text-[10px] text-slate-500 font-medium">Klik untuk upload foto</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                                            </label>
                                        )}
                                    </div>
                                    {!form.image_url && !uploading && (
                                        <div className="absolute -bottom-2 -right-2 bg-purple-600 p-2 rounded-xl shadow-lg border-2 border-slate-900">
                                            <Upload className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Nama Produk *</label>
                                    <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Kopi Susu Gula Aren"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Harga Jual *</label>
                                    <input type="number" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Harga Pokok (HPP)</label>
                                    <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Stok Awal</label>
                                    <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Stok Minimum</label>
                                    <input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} placeholder="5"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Barcode / SKU</label>
                                    <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Scan atau input barcode"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Kategori</label>
                                    <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                        <option value="">Tanpa Kategori</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Satuan</label>
                                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                        {['pcs', 'kg', 'liter', 'box', 'pack', 'lusin'].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label htmlFor="track_stock" className="text-white text-sm font-medium">Lacak Stok</label>
                                        <p className="text-[10px] text-slate-500">Otomatis kurangi stok saat ada transaksi</p>
                                    </div>
                                    <input type="checkbox" id="track_stock" checked={form.track_stock} onChange={e => setForm({ ...form, track_stock: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-white/10 bg-slate-800 text-purple-600 focus:ring-purple-500/50" />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 bg-white/5 border border-white/10 text-slate-300 py-3.5 rounded-2xl text-sm font-semibold hover:bg-white/10 transition-colors">Batal</button>
                                <button type="submit" disabled={saving || uploading}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:translate-y-0 active:translate-y-0.5">
                                    {saving ? 'Menyimpan...' : 'Simpan Produk'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
