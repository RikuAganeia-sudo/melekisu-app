import { NextResponse } from "next/server";
import { EXTERNAL_NEWS_SOURCES, fetchExternalLiveNews } from "@/lib/externalNewsApi";
import { POST as handleAutoNews } from "@/app/api/auto-news/route";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        
        // 1. Validasi opsional CRON_SECRET jika dikonfigurasi di environment
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            const querySecret = url.searchParams.get("secret");
            if (querySecret !== cronSecret) {
                return NextResponse.json(
                    { success: false, message: "Akses ditolak: CRON_SECRET tidak cocok." },
                    { status: 401 }
                );
            }
        }

        // 2. Pilih sumber berita secara acak atau berdasarkan parameter
        const querySourceId = url.searchParams.get("sourceId");
        const selectedSource = querySourceId
            ? EXTERNAL_NEWS_SOURCES.find((s) => s.id === querySourceId) || EXTERNAL_NEWS_SOURCES[0]
            : EXTERNAL_NEWS_SOURCES[Math.floor(Math.random() * EXTERNAL_NEWS_SOURCES.length)];

        // 3. Ambil berita live terkini dari RSS feed kantor berita
        const liveArticles = await fetchExternalLiveNews(selectedSource.id, 5);
        if (!liveArticles || liveArticles.length === 0) {
            return NextResponse.json({
                success: false,
                message: `Tidak dapat mengambil feed berita live dari sumber: ${selectedSource.name}`
            }, { status: 502 });
        }

        // Pilih artikel pertama / teratas yang paling baru
        const chosenArticle = liveArticles[0];

        // 4. Proses AI & simpan otomatis ke Supabase secara langsung in-process (aman & cepat di serverless Vercel)
        const internalReq = new Request("https://melekisu.internal/api/auto-news", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                liveSourceId: selectedSource.id,
                liveArticle: chosenArticle,
                autoPublish: true,
            }),
        });

        const autoNewsRes = await handleAutoNews(internalReq);
        const result = await autoNewsRes.json();

        return NextResponse.json({
            success: true,
            cronTriggeredAt: new Date().toISOString(),
            source: selectedSource.name,
            originalTitle: chosenArticle.title,
            publishedData: result,
        });
    } catch (error: any) {
        console.error("Cron auto-news error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Gagal memproses cron berita otomatis." },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    return GET(req);
}
