'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { reportsAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Download } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

export default function ReportsPage() {
    const { currentStore } = useAuthStore()
    const [tab, setTab] = useState('monthly')
    const [monthly, setMonthly] = useState([])
    const [products, setProducts] = useState([])
    const [profitLoss, setProfitLoss] = useState(null)
    const [loading, setLoading] = useState(true)
    const [year, setYear] = useState(new Date().getFullYear())

    useEffect(() => {
        if (!currentStore?.id) return
        load()
    }, [currentStore, year])

    const load = async () => {
        setLoading(true)
        try {
            const [mRes, pRes, plRes] = await Promise.all([
                reportsAPI.getMonthly(currentStore.id, { year }),
                reportsAPI.getProducts(currentStore.id, { limit: 10 }),
                reportsAPI.getProfitLoss(currentStore.id)
            ])
            setMonthly(mRes.data.data || [])
            setProducts(pRes.data.data || [])
            setProfitLoss(plRes.data.data)
        } catch { toast.error('Gagal memuat laporan') }
        finally { setLoading(false) }
    }

    const handleExport = async () => {
        try {
            const res = await reportsAPI.exportCSV(currentStore.id)
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a'); a.href = url; a.download = `laporan-${Date.now()}.csv`; a.click()
            URL.revokeObjectURL(url)
        } catch { toast.error('Gagal export') }
    }

    const tabs = [
        { id: 'monthly', label: 'Bulanan' },
        { id: 'products', label: 'Produk Terlaris' },
        { id: 'profitloss', label: 'Laba Rugi' },
    ]

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-white">Laporan</h1>
                <div className="flex gap-2 items-center">
                    <select value={year} onChange={e => setYear(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                        {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
                    </select>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white px-3 py-2 rounded-xl text-sm transition">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {profitLoss && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Pendapatan', value: fmt(profitLoss.total_revenue), color: 'text-purple-400' },
                        { label: 'Total HPP', value: fmt(profitLoss.total_cost), color: 'text-red-400' },
                        { label: 'Laba Kotor', value: fmt(profitLoss.gross_profit), color: 'text-emerald-400' },
                    ].map(item => (
                        <div key={item.label} className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                            <p className="text-slate-500 text-xs mb-1">{item.label}</p>
                            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.id ? 'bg-purple-600 text-white' : 'bg-slate-900 border border-white/10 text-slate-400 hover:bg-slate-800'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                {loading ? (
                    <div className="text-center text-slate-500 py-12">Memuat...</div>
                ) : tab === 'monthly' ? (
                    <>
                        <h2 className="text-white font-semibold mb-4">Penjualan Bulanan {year}</h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={monthly}>
                                <XAxis dataKey="month_name" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => v?.substring(0, 3)} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                                    formatter={(v) => [fmt(v), 'Penjualan']}
                                />
                                <Bar dataKey="total_sales" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </>
                ) : tab === 'products' ? (
                    <>
                        <h2 className="text-white font-semibold mb-4">10 Produk Terlaris</h2>
                        <div className="space-y-3">
                            {products.map((p, i) => (
                                <div key={p.product_id} className="flex items-center gap-4">
                                    <span className="text-slate-600 text-sm w-5 text-right">{i + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-white text-sm">{p.product_name}</span>
                                            <span className="text-purple-400 text-sm font-medium">{fmt(p.total_revenue)}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min(100, (p.total_revenue / (products[0]?.total_revenue || 1)) * 100)}%` }} />
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{p.total_sold} terjual · Profit {fmt(p.total_profit)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-white font-semibold mb-4">Laporan Laba Rugi</h2>
                        {profitLoss && (
                            <div className="space-y-4">
                                <p className="text-slate-500 text-sm">Periode: {profitLoss.period}</p>
                                {[
                                    { label: 'Total Pendapatan (Revenue)', value: profitLoss.total_revenue, color: 'text-white' },
                                    { label: 'Total Harga Pokok (COGS)', value: profitLoss.total_cost, color: 'text-red-400', neg: true },
                                    { label: 'Laba Kotor', value: profitLoss.gross_profit, color: 'text-emerald-400', bold: true },
                                ].map(item => (
                                    <div key={item.label} className={`flex justify-between py-3 border-b border-white/5 ${item.bold ? 'border-0 bg-emerald-500/10 rounded-xl px-4' : ''}`}>
                                        <span className="text-slate-400 text-sm">{item.label}</span>
                                        <span className={`font-semibold text-sm ${item.color}`}>{item.neg ? '-' : ''}{fmt(item.value)}</span>
                                    </div>
                                ))}
                                <div className="bg-slate-800 rounded-xl p-3 flex justify-between">
                                    <span className="text-slate-400 text-sm">Margin Laba</span>
                                    <span className="text-white font-bold">{profitLoss.margin?.toFixed(1)}%</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
