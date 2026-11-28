"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
    useEffect(() => {
        try {
            sessionStorage.removeItem("melekisu_admin_session");
            localStorage.removeItem("melekisu_admin_session");
        } catch {}
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-white">
            <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold">Akses Login Admin Ditutup</h2>
            <p className="text-sm text-[#DEC0B3] mt-2 max-w-md">
                Sistem sedang dalam mode isolasi darurat keamanan. Silakan kembali ke beranda.
            </p>
            <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
            >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </Link>
        </div>
    );
}
