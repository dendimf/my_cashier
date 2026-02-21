import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
    title: 'KasirKu - Aplikasi POS Modern',
    description: 'Sistem Kasir Point of Sale untuk bisnis Anda',
}

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <body className={geist.className}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
