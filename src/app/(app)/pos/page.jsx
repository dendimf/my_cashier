'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store'
import { productsAPI, categoriesAPI, transactionsAPI, customersAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { Search, Plus, Minus, Trash2, ShoppingCart, X, User, CreditCard, Scan } from 'lucide-react'
import BarcodeScanner from '@/components/BarcodeScanner'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

export default function POSPage() {
    const { currentStore } = useAuthStore()
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [cart, setCart] = useState([])
    const [search, setSearch] = useState('')
    const [selectedCat, setSelectedCat] = useState('')
    const [customer, setCustomer] = useState(null)
    const [customerSearch, setCustomerSearch] = useState('')
    const [customers, setCustomers] = useState([])
    const [paymentType, setPaymentType] = useState('cash')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [showCheckout, setShowCheckout] = useState(false)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showScanner, setShowScanner] = useState(false)

    useEffect(() => {
        if (!currentStore?.id) return
        const load = async () => {
            setLoading(true)
            try {
                const [pRes, cRes] = await Promise.all([
                    productsAPI.list(currentStore.id, { is_active: true, per_page: 200 }),
                    categoriesAPI.list(currentStore.id)
                ])
                setProducts(pRes.data.data || [])
                setCategories(cRes.data.data || [])
            } catch { toast.error('Gagal memuat produk') }
            finally { setLoading(false) }
        }
        load()
    }, [currentStore])

    useEffect(() => {
        if (customerSearch.length < 2) { setCustomers([]); return }
        const t = setTimeout(async () => {
            try {
                const res = await customersAPI.list(currentStore.id, { search: customerSearch })
                setCustomers(res.data.data || [])
            } catch { }
        }, 400)
        return () => clearTimeout(t)
    }, [customerSearch])

    const filtered = products.filter(p =>
        (selectedCat ? p.category_id === selectedCat : true) &&
        (search ? p.name.toLowerCase().includes(search.toLowerCase()) : true)
    )

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id)
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
            return [...prev, { ...product, qty: 1, discount: 0 }]
        })
    }

    const handleBarcodeScan = (code) => {
        setShowScanner(false)
        const product = products.find(p => p.barcode === code)
        if (product) {
            addToCart(product)
            toast.success(`${product.name} ditambahkan`)
        } else {
            toast.error(`Produk dengan barcode ${code} tidak ditemukan`)
        }
    }

    const updateQty = (id, qty) => {
        if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return }
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
    }

    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty - i.discount), 0)
    const tax = subtotal * ((currentStore?.tax_rate || 0) / 100)
    const total = subtotal + tax
    const change = (parseFloat(paymentAmount) || 0) - total

    const handleCheckout = async () => {
        if (cart.length === 0) { toast.error('Keranjang kosong'); return }
        if (!paymentAmount || parseFloat(paymentAmount) < total) {
            toast.error('Jumlah pembayaran kurang'); return
        }
        setSubmitting(true)
        try {
            const res = await transactionsAPI.create(currentStore.id, {
                customer_id: customer?.id || null,
                items: cart.map(i => ({ product_id: i.id, quantity: i.qty, discount_amount: i.discount || 0 })),
                payment_amount: parseFloat(paymentAmount),
                payment_type: paymentType,
            })
            toast.success(`Transaksi berhasil! Kembalian: ${fmt(change)}`)
            setCart([]); setPaymentAmount(''); setCustomer(null); setShowCheckout(false)
            // Reload products to get updated stock
            const pRes = await productsAPI.list(currentStore.id, { is_active: true, per_page: 200 })
            setProducts(pRes.data.data || [])
        } catch (err) {
            toast.error(err.response?.data?.error || 'Transaksi gagal')
        } finally { setSubmitting(false) }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
            {/* Products Panel */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari produk..."
                                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm font-medium"
                        >
                            <Scan className="w-4 h-4" /> Scan
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setSelectedCat('')} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${!selectedCat ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            Semua
                        </button>
                        {categories.map(c => (
                            <button key={c.id} onClick={() => setSelectedCat(c.id === selectedCat ? '' : c.id)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${selectedCat === c.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1">
                    {loading ? (
                        <div className="col-span-4 text-center text-slate-500 py-8">Memuat...</div>
                    ) : filtered.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)}
                            disabled={p.track_stock && p.stock <= 0}
                            className={`bg-slate-900 border rounded-2xl p-0 text-left transition-all hover:border-purple-400/50 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden flex flex-col ${cart.find(i => i.id === p.id) ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/10'
                                }`}>
                            {/* Product Image */}
                            <div className="aspect-square w-full bg-slate-800 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <Package className="w-10 h-10 text-slate-700" />
                                )}
                                {p.track_stock && p.stock <= 5 && (
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                        Stok {p.stock}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 flex flex-col flex-1 justify-between">
                                <div className="text-white text-xs font-semibold line-clamp-2 mb-1 group-hover:text-purple-400 transition-colors">{p.name}</div>
                                <div className="text-purple-400 font-bold text-sm">{fmt(p.price)}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart Panel */}
            <div className="lg:w-80 bg-slate-900 border border-white/10 rounded-2xl flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" /> Keranjang
                    </h2>
                    {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-300">Hapus semua</button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {cart.length === 0 ? (
                        <div className="text-center text-slate-600 py-8 text-sm">Keranjang kosong</div>
                    ) : cart.map(item => (
                        <div key={item.id} className="bg-slate-800 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-white text-xs font-medium line-clamp-2 flex-1">{item.name}</p>
                                <button onClick={() => updateQty(item.id, 0)} className="text-slate-500 hover:text-red-400 transition flex-shrink-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition">
                                        <Minus className="w-3 h-3 text-white" />
                                    </button>
                                    <span className="text-white text-sm w-6 text-center">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition">
                                        <Plus className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                                <span className="text-purple-400 text-sm font-bold">{fmt(item.price * item.qty)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-white/10 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-white">{fmt(subtotal)}</span>
                    </div>
                    {tax > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Pajak ({currentStore?.tax_rate}%)</span>
                            <span className="text-white">{fmt(tax)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-purple-400 text-lg">{fmt(total)}</span>
                    </div>
                    <button
                        onClick={() => setShowCheckout(true)}
                        disabled={cart.length === 0}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-4 h-4" /> Bayar
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-white/10">
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <h3 className="text-white font-semibold text-lg">Pembayaran</h3>
                            <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Customer search */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Pelanggan</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    <input
                                        value={customer ? customer.name : customerSearch}
                                        onChange={e => { setCustomerSearch(e.target.value); setCustomer(null) }}
                                        placeholder="Cari pelanggan..."
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400"
                                    />
                                    {customers.length > 0 && !customer && (
                                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl overflow-hidden">
                                            {customers.slice(0, 4).map(c => (
                                                <button key={c.id} onClick={() => { setCustomer(c); setCustomers([]) }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700 transition">
                                                    {c.name} {c.phone && <span className="text-slate-500">· {c.phone}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Type */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Metode Bayar</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['cash', 'qris', 'transfer', 'debit', 'dana', 'gopay'].map(t => (
                                        <button key={t} onClick={() => setPaymentType(t)}
                                            className={`py-2 rounded-xl text-xs font-medium capitalize transition ${paymentType === t ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-800 rounded-xl p-3 text-sm">
                                <div className="flex justify-between text-slate-400"><span>Total</span><span className="text-white font-bold text-base">{fmt(total)}</span></div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Jumlah Bayar</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    placeholder={total.toString()}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400"
                                />
                            </div>

                            {paymentAmount && parseFloat(paymentAmount) >= total && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex justify-between">
                                    <span className="text-emerald-400 text-sm">Kembalian</span>
                                    <span className="text-emerald-400 font-bold">{fmt(change)}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowCheckout(false)} className="flex-1 border border-white/20 text-slate-300 py-3 rounded-xl text-sm hover:bg-white/5 transition">Batal</button>
                                <button onClick={handleCheckout} disabled={submitting} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                                    {submitting ? 'Memproses...' : 'Konfirmasi Bayar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Barcode Scanner */}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    )
}
