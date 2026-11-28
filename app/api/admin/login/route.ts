import { NextResponse } from "next/server";

export async function POST() {
    // KEAMANAN DARURAT: Akses Admin Dinonaktifkan Total karena Serangan
    return NextResponse.json(
        {
            success: false,
            message: "AKSES DIBLOKIR: Panel administrator saat ini dinonaktifkan sementara demi keamanan sistem (Emergency Lockdown). Hubungi penanggung jawab keamanan jika membutuhkan akses darurat.",
        },
        { status: 403 }
    );
}

export async function GET() {
    return NextResponse.json(
        {
            success: false,
            message: "Akses Admin sedang diblokir.",
        },
        { status: 403 }
    );
}
