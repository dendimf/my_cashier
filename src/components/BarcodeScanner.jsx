'use client'
import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera, RefreshCw } from 'lucide-react'

export default function BarcodeScanner({ onScan, onClose }) {
    const scannerRef = useRef(null)
    const [isStarted, setIsStarted] = useState(false)

    useEffect(() => {
        const formatsToSupport = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
        ];

        const scanner = new Html5QrcodeScanner('reader', {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            formatsToSupport: formatsToSupport,
            showTorchButtonIfSupported: true,
        }, false);

        scanner.render((decodedText) => {
            scanner.clear()
            onScan(decodedText)
        }, (error) => {
            // Silence errors as they happen constantly during scanning
        });

        setIsStarted(true)

        return () => {
            scanner.clear().catch(err => console.error('Failed to clear scanner', err));
        }
    }, [onScan])

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Camera className="w-4 h-4 text-purple-400" /> Scan Barcode
                    </h3>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div id="reader" className="w-full aspect-square bg-black overflow-hidden relative">
                    {!isStarted && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin" /> Starting camera...
                        </div>
                    )}
                </div>

                <div className="p-6 text-center text-slate-400 text-sm">
                    Arahkan kamera ke barcode produk
                </div>
            </div>
        </div>
    )
}
