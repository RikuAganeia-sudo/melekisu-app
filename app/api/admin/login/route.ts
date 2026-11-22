import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: "Email dan kata sandi wajib diisi." },
                { status: 400 }
            );
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const inputPassword = String(password);

        // 1. Kredensial Super Admin Khusus dari Environment (.env.local)
        // Diambil dari sisi server sehingga aman dan tidak bocor ke client-side JavaScript bundle
        const configuredEmail = (process.env.ADMIN_EMAIL || "admin.khusus@melekisu.id").trim().toLowerCase();
        const configuredPassword = process.env.ADMIN_PASSWORD || "MelekIsu#Rahasia2026";
        const configuredName = process.env.ADMIN_NAME || "Administrator Utama";

        if (cleanEmail === configuredEmail && inputPassword === configuredPassword) {
            const sessionPayload = {
                id: "admin-master-exclusive",
                email: cleanEmail,
                name: configuredName,
                role: "Super Admin",
                loginAt: new Date().toISOString(),
            };

            return NextResponse.json({
                success: true,
                session: sessionPayload,
            });
        }

        // 2. Opsi: Jika ada akun admin terdaftar resmi di Supabase Auth
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: inputPassword,
                });

                if (!error && data?.user) {
                    const userRole = data.user.user_metadata?.role;
                    if (userRole === "admin" || userRole === "superadmin") {
                        return NextResponse.json({
                            success: true,
                            session: {
                                id: data.user.id,
                                email: data.user.email || cleanEmail,
                                name: data.user.user_metadata?.full_name || "Administrator MelekIsu",
                                role: "Admin Redaksi",
                                loginAt: new Date().toISOString(),
                            },
                        });
                    }
                }
            } catch (dbErr) {
                // Abaikan jika Supabase tidak merespons
            }
        }

        return NextResponse.json(
            { success: false, message: "Kredensial tidak valid atau akun Anda belum memiliki izin Administrator." },
            { status: 401 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: "Terjadi kesalahan internal pada server saat verifikasi admin." },
            { status: 500 }
        );
    }
}
