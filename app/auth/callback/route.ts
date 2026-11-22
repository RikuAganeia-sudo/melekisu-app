import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/ubah-sandi";

    if (code) {
        try {
            const supabase = await createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
                return NextResponse.redirect(`${origin}${next}`);
            }
            console.error("Auth callback exchangeCodeForSession error:", error);
        } catch (err) {
            console.error("Auth callback exception:", err);
        }
    }

    // Fallback: alihkan ke ubah-sandi jika client ingin memproses hash fragment secara mandiri
    return NextResponse.redirect(`${origin}${next}`);
}
