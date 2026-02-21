'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store'
import {
    LayoutDashboard, ShoppingCart, Package, BarChart2,
    BookUser, TrendingUp, Settings, LogOut, Menu, X, Store
} from 'lucide-react'

const ownerLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/pos', icon: ShoppingCart, label: 'Kasir (POS)' },
    { href: '/products', icon: Package, label: 'Produk' },
    { href: '/stock', icon: BarChart2, label: 'Stok' },
    { href: '/customers', icon: BookUser, label: 'Pelanggan' },
    { href: '/reports', icon: TrendingUp, label: 'Laporan' },
    { href: '/settings', icon: Settings, label: 'Pengaturan' },
]

const cashierLinks = [
    { href: '/pos', icon: ShoppingCart, label: 'Kasir (POS)' },
    { href: '/customers', icon: BookUser, label: 'Pelanggan' },
]

export default function AppLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, currentStore, isAuthenticated, logout, _hasHydrated } = useAuthStore()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        if (!_hasHydrated) return
        if (!isAuthenticated) { router.push('/login'); return }
        if (!currentStore) { router.push('/select-store'); return }

        // Role-based protection: Cashiers only access POS and Pelanggan
        if (user?.role === 'cashier') {
            const allowedPaths = ['/pos', '/customers']
            if (!allowedPaths.includes(pathname)) {
                router.push('/pos')
            }
        }
    }, [_hasHydrated, isAuthenticated, currentStore, pathname, user?.role])

    if (!_hasHydrated) return null
    if (!isAuthenticated || !currentStore) return null

    const isOwner = user?.role === 'owner' || user?.role === 'admin'
    const links = isOwner ? ownerLinks : cashierLinks

    const handleLogout = () => {
        logout()
        toast.success('Berhasil keluar')
        router.push('/login')
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-4 py-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500 rounded-xl p-2">
                        <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white text-sm">KasirKu</h1>
                        <p className="text-slate-400 text-xs truncate max-w-[140px]">{currentStore?.name}</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {links.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {label}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom */}
            <div className="px-3 py-4 border-t border-white/10 space-y-1">
                <button
                    onClick={() => { router.push('/select-store'); setSidebarOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                    <Store className="w-5 h-5" /> Ganti Toko
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                >
                    <LogOut className="w-5 h-5" /> Keluar
                </button>
                <div className="px-3 pt-2">
                    <p className="text-xs text-slate-500">{user?.full_name}</p>
                    <p className="text-xs text-slate-600">{user?.role}</p>
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-56 bg-slate-900 border-r border-white/10 flex-col fixed h-full z-30">
                <SidebarContent />
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-56 h-full bg-slate-900 flex flex-col">
                        <SidebarContent />
                    </aside>
                </div>
            )}

            {/* Main */}
            <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10 sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <div className="bg-purple-500 rounded-lg p-1.5">
                            <ShoppingCart className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold text-sm">KasirKu</span>
                    </div>
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white transition">
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
