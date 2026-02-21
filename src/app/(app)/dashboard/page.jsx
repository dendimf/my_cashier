'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { reportsAPI } from '@/services/api'
import { TrendingUp, ShoppingBag, Package, Users, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function DashboardPage() {
    const { currentStore } = useAuthStore()
    const [data, setData] = useState(null)
    const [weekly, setWeekly] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!currentStore?.id) return
        const load = async () => {
            try {
                const [dashRes, weekRes] = await Promise.all([
                    reportsAPI.getDashboard(currentStore.id),
                    reportsAPI.getWeekly(currentStore.id)
                ])
                setData(dashRes.data.data)
                setWeekly(weekRes.data.data || [])
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        load()
    }, [currentStore])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    const stats = [
        { label: 'Penjualan Hari Ini', value: fmt(data?.today?.revenue || 0), sub: `${data?.today?.transactions || 0} transaksi`, icon: TrendingUp, color: 'from-purple-500 to-purple-700' },
        { label: 'Penjualan Bulan Ini', value: fmt(data?.month?.revenue || 0), sub: `${data?.month?.transactions || 0} transaksi`, icon: ShoppingBag, color: 'from-blue-500 to-blue-700' },
        { label: 'Total Produk', value: data?.total_products || 0, sub: `${data?.low_stock_count || 0} stok rendah`, icon: Package, color: 'from-emerald-500 to-emerald-700' },
        { label: 'Total Pelanggan', value: data?.total_customers || 0, sub: 'pelanggan aktif', icon: Users, color: 'from-orange-500 to-orange-700' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">{currentStore?.name}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`bg-gradient-to-br ${s.color} rounded-xl p-2.5`}>
                                <s.icon className="w-5 h-5 text-white" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                        <div className="text-xs text-slate-400">{s.label}</div>
                        <div className="text-xs text-slate-600 mt-1">{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Weekly Chart */}
            {weekly.length > 0 && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                    <h2 className="text-white font-semibold mb-4">Penjualan 7 Hari Terakhir</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={weekly}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => v?.slice(5)} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                                formatter={(v) => [fmt(v), 'Penjualan']}
                            />
                            <Area type="monotone" dataKey="total_sales" stroke="#a855f7" fill="url(#colorSales)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Transactions */}
                <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-white font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" /> Transaksi Terbaru
                        </h2>
                        <button onClick={() => router.push('/reports')} className="text-xs text-purple-400 hover:text-purple-300 transition">Lihat Semua</button>
                    </div>
                    <div className="space-y-4">
                        {data?.recent_transactions?.length > 0 ? (
                            data.recent_transactions.map(t => (
                                <div key={t.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div>
                                        <p className="text-white text-sm font-bold">{t.invoice_number}</p>
                                        <p className="text-slate-500 text-xs font-medium uppercase mt-0.5">{t.customer_name || 'Guest'} · {t.payment_type}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-emerald-400 font-bold text-sm">{fmt(t.total)}</div>
                                        <p className="text-slate-600 text-[10px]">{new Date(t.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-600 text-sm italic">Belum ada transaksi hari ini</div>
                        )}
                    </div>
                </div>

                {/* Top Selling Products */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                    <h2 className="text-white font-bold mb-6 flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-emerald-500" /> Produk Terlaris
                    </h2>
                    <div className="space-y-4">
                        {data?.top_products?.length > 0 ? (
                            data.top_products.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 overflow-hidden flex items-center justify-center">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-700" />
                                            )}
                                        </div>
                                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-lg flex items-center justify-center shadow-lg border-2 border-slate-900">
                                            {i + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                                        <p className="text-slate-500 text-xs">{p.total_sold} terjual</p>
                                    </div>
                                    <div className="text-emerald-400 font-bold text-xs">{fmt(p.total_revenue)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-600 text-sm italic">Data belum tersedia</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {data?.low_stock_count > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
                    <div>
                        <p className="text-orange-300 text-sm font-bold">Peringatan Stok Rendah!</p>
                        <p className="text-orange-400/80 text-xs">Ada <strong>{data.low_stock_count} produk</strong> yang stoknya hampir habis. Segera cek inventaris Anda.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
