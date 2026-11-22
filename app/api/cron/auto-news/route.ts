import { NextResponse } from "next/server";
import { EXTERNAL_NEWS_SOURCES, fetchExternalLiveNews, LiveExternalNewsItem } from "@/lib/externalNewsApi";
import { POST as handleAutoNews } from "@/app/api/auto-news/route";
import { createClient } from "@supabase/supabase-js";
import { POLICY_DATASETS } from "@/lib/policyDatasets";

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

        // 2. Ambil riwayat berita yang sudah ada di Supabase untuk pencegahan duplikasi (Deduplikasi)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        const existingTitles: string[] = [];
        const existingSlugs: string[] = [];

        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { data: dbNews } = await supabase
                    .from("news")
                    .select("title, slug")
                    .order("created_at", { ascending: false })
                    .limit(60);

                if (dbNews) {
                    dbNews.forEach((n) => {
                        if (n.title) existingTitles.push(n.title.toLowerCase().trim());
                        if (n.slug) existingSlugs.push(n.slug.toLowerCase().trim());
                    });
                }
            } catch (err) {
                console.warn("Gagal membaca riwayat berita untuk deduplikasi:", err);
            }
        }

        // Helper cek apakah artikel atau topiknya sudah pernah diterbitkan sebelumnya
        const isAlreadyPublished = (rawTitle: string): boolean => {
            const cleanTitle = rawTitle.toLowerCase().trim();
            // Bersihkan tanda baca untuk perbandingan akurat
            const simplified = cleanTitle.replace(/[^a-z0-9]/g, "");
            return existingTitles.some((t) => {
                const simplifiedTarget = t.replace(/[^a-z0-9]/g, "");
                if (simplified === simplifiedTarget) return true;
                if (simplified.length > 15 && simplifiedTarget.includes(simplified.slice(0, 20))) return true;
                if (simplifiedTarget.length > 15 && simplified.includes(simplifiedTarget.slice(0, 20))) return true;
                return false;
            });
        };

        // 3. Rotasi dan acak sumber berita agar topik yang diterbitkan selalu bervariasi
        const shuffledSources = [...EXTERNAL_NEWS_SOURCES].sort(() => Math.random() - 0.5);
        let chosenArticle: LiveExternalNewsItem | null = null;
        let chosenSourceId: string = "";

        for (const source of shuffledSources) {
            const liveArticles = await fetchExternalLiveNews(source.id, 10);
            for (const article of liveArticles) {
                if (!isAlreadyPublished(article.title)) {
                    chosenArticle = article;
                    chosenSourceId = source.id;
                    break;
                }
            }
            if (chosenArticle) break;
        }

        // 4. Jika seluruh artikel RSS saat ini sudah pernah terbit, ambil dari dataset kebijakan yang belum pernah terbit
        if (!chosenArticle) {
            for (const ds of POLICY_DATASETS) {
                if (!isAlreadyPublished(ds.title)) {
                    const internalReq = new Request("https://melekisu.internal/api/auto-news", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            datasetId: ds.id,
                            autoPublish: true,
                        }),
                    });

                    const autoNewsRes = await handleAutoNews(internalReq);
                    const result = await autoNewsRes.json();

                    return NextResponse.json({
                        success: true,
                        cronTriggeredAt: new Date().toISOString(),
                        source: `Dataset Kebijakan (${ds.source})`,
                        originalTitle: ds.title,
                        publishedData: result,
                        note: "Seluruh headline live RSS sudah terbit, beralih ke analisis dataset kebijakan baru."
                    });
                }
            }

            return NextResponse.json({
                success: true,
                message: "Seluruh berita terkini dari seluruh kantor berita sudah terbit di portal. Sistem menunggu headline baru agar tidak ada berita duplikat.",
                skippedDeduplication: true,
            });
        }

        // 5. Proses AI & simpan otomatis ke Supabase secara langsung in-process
        const internalReq = new Request("https://melekisu.internal/api/auto-news", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                liveSourceId: chosenSourceId,
                liveArticle: chosenArticle,
                autoPublish: true,
            }),
        });

        const autoNewsRes = await handleAutoNews(internalReq);
        const result = await autoNewsRes.json();

        return NextResponse.json({
            success: true,
            cronTriggeredAt: new Date().toISOString(),
            source: chosenArticle.sourceName,
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
