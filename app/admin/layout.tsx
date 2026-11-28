"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, Lock, ArrowLeft, AlertTriangle } from "lucide-react";

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
    useEffect(() => {
        // Hapus paksa semua sesi admin yang tersisa di browser
        try {
            sessionStorage.removeItem("melekisu_admin_session");
            localStorage.removeItem("melekisu_admin_session");
        } catch {
            // Abaikan jika storage dibatasi
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#140B06] text-[#FFF8F5] flex flex-col justify-between selection:bg-red-500/30">
            {/* Header Lockdown */}
            <header className="py-6 px-8 flex items-center justify-between border-b border-red-900/40 bg-red-950/20">
                <div className="flex items-center gap-3">
                    <img
                        src="/images/logo-white.png"
                        alt="Logo MelekIsu"
                        className="w-8 h-8 object-contain"
                    />
                    <div className="flex flex-col">
                        <span className="font-extrabold text-base tracking-tight text-white">
                            Melek<span className="text-[#FDB659]">Isu</span>
                        </span>
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                            Status: Emergency Security Lockdown
                        </span>
                    </div>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs text-[#DEC0B3] hover:text-white font-semibold transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Web Utama
                </Link>
            </header>

            {/* Konten Pemblokiran Akses Admin */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-lg bg-[#1E100A] border-2 border-red-600/60 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9B4000]/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center mb-6 shadow-lg shadow-red-900/30">
                        <ShieldAlert className="w-8 h-8 text-red-400" />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 mb-4">
                        <Lock className="w-3.5 h-3.5" /> AKSES ADMIN DIBLOKIR SEMENTARA
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                        Portal Admin Dinonaktifkan
                    </h1>

                    <p className="text-sm text-[#DEC0B3] leading-relaxed mb-6">
                        Demi keselamatan data dan pencegahan terhadap indikasi serangan siber yang terdeteksi, seluruh portal manajemen admin telah dikunci secara otomatis. Seluruh sesi aktif telah diputus.
                    </p>

                    <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/40 text-left text-xs text-red-200/90 space-y-2 mb-6">
                        <div className="flex items-center gap-2 font-bold text-red-300">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Tindakan Pengamanan Aktif:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-red-200/80 pl-1">
                            <li>Endpoint otentikasi admin ditolak (<code className="text-red-300">403 Forbidden</code>).</li>
                            <li>Penyimpanan sesi lokal dan browser dihapus seketika.</li>
                            <li>Akses ke dashboard dan kurasi berita diisolasi.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs tracking-wide transition-all border border-white/10"
                        >
                            Kembali ke Halaman Beranda
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="py-4 px-8 text-center text-xs text-[#8B7266] border-t border-red-900/20">
                Sistem Keamanan MelekIsu • Mode Darurat Diaktifkan
            </footer>
        </div>
    );
}
