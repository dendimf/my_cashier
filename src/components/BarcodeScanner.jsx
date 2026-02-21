'use client'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera, RefreshCw } from 'lucide-react'

export default function BarcodeScanner({ onScan, onClose }) {
    const [isStarted, setIsStarted] = useState(false)
    const scannerRef = useRef(null)
    const containerId = 'barcode-reader-container'

    useEffect(() => {
        // Create instance
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
        };

        const formatsToSupport = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
        ];

        // Start scanning
        html5QrCode.start(
            { facingMode: "environment" },
            { ...config, formatsToSupport },
            (decodedText) => {
                stopScanner().then(() => onScan(decodedText));
            },
            (errorMessage) => {
                // Ignore errors
            }
        ).then(() => {
            setIsStarted(true);
        }).catch(err => {
            console.error("Unable to start scanning", err);
        });

        async function stopScanner() {
            if (scannerRef.current && scannerRef.current.isScanning) {
                try {
                    await scannerRef.current.stop();
                } catch (err) {
                    console.error("Failed to stop scanner", err);
                }
            }
        }

        return () => {
            stopScanner();
        };
    }, []);

    const handleClose = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            await scannerRef.current.stop();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Camera className="w-4 h-4 text-purple-400" /> Scan Barcode
                    </h3>
                    <button onClick={handleClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative aspect-square bg-black overflow-hidden">
                    <div id={containerId} className="w-full h-full"></div>

                    {!isStarted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-900">
                            <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                            <span className="text-sm font-medium">Initializing camera...</span>
                        </div>
                    )}

                    {isStarted && (
                        <div className="absolute inset-0 border-2 border-purple-500/30 pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 text-center">
                    <p className="text-slate-300 text-sm font-medium mb-1">Arahkan kamera ke barcode</p>
                    <p className="text-slate-500 text-[11px]">Pastikan pencahayaan cukup dan barcode terlihat jelas</p>
                </div>
            </div>
        </div>
    )
}
