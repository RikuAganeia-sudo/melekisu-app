import { NextResponse } from "next/server";
import { EXTERNAL_NEWS_SOURCES, fetchExternalLiveNews, LiveExternalNewsItem } from "@/lib/externalNewsApi";
import { POST as handleAutoNews } from "@/app/api/auto-news/route";
import { createClient } from "@supabase/supabase-js";
import { POLICY_DATASETS } from "@/lib/policyDatasets";
import { isNewsAlreadyPublished, generateSlug } from "@/lib/newsDeduplication";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        
        // 1. Validasi Keamanan Wajib CRON_SECRET: Cegah Bot Menerbitkan Berita Liar
        const authHeader = req.headers.get("authorization");
        const querySecret = url.searchParams.get("secret");
        const cronSecret = process.env.CRON_SECRET;

        // Jika mode penguncian darurat aktif, tolak seluruh otomatisasi
        if (process.env.ADMIN_ACCESS_BLOCKED === "true") {
            return NextResponse.json(
                { success: false, message: "Akses diblokir: Sistem sedang dalam Emergency Security Lockdown." },
                { status: 403 }
            );
        }

        // Jika CRON_SECRET belum disetel atau kredensial yang dikirim salah, tolak tegas (401 Unauthorized)
        const isAuthorized = cronSecret && (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);
        if (!isAuthorized) {
            return NextResponse.json(
                { 
                    success: false, 
                    message: "Akses ditolak: Endpoint ini diproteksi. Sertakan CRON_SECRET yang valid untuk menjalankan worker." 
                },
                { status: 401 }
            );
        }

        // 2. Ambil riwayat berita dan sumber media terakhir untuk rotasi yang adil dan beragam
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        let dbNewsList: { id?: string; title: string; slug?: string; source?: string }[] = [];

        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { data: dbNews } = await supabase
                    .from("news")
                    .select("id, title, slug, source")
                    .order("created_at", { ascending: false })
                    .limit(500);

                if (dbNews) {
                    dbNewsList = dbNews;
                }
            } catch (err) {
                console.warn("Gagal membaca riwayat berita untuk deduplikasi:", err);
            }
        }

        // Helper cek apakah artikel atau topiknya sudah pernah diterbitkan sebelumnya (menggunakan deduplikasi komprehensif)
        const isAlreadyPublished = (rawTitle: string): boolean => {
            if (!rawTitle) return false;
            return isNewsAlreadyPublished(
                { title: rawTitle, slug: generateSlug(rawTitle) },
                dbNewsList
            );
        };

        // 3. Rotasi Media Cerdas & Adil:
        // Hitung jarak kemunculan terakhir tiap media (semakin lama tidak terbit / belum pernah terbit = prioritas paling tinggi).
        // Antara News tidak akan diprioritaskan lagi jika media lain (CNN Indonesia, CNBC Indonesia, Tempo, Republika, Sindonews, Katadata) belum terbit.
        const prioritizedSources = [...EXTERNAL_NEWS_SOURCES].sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            // Temukan index kemunculan terakhir di dbNews (0 = baru saja terbit, 1 = terbit sebelumnya, dst)
            const aLastIndex = dbNewsList.findIndex((n: any) => {
                const s = (n.source || "").toLowerCase();
                return s.includes(aName) || aName.includes(s);
            });
            const bLastIndex = dbNewsList.findIndex((n: any) => {
                const s = (n.source || "").toLowerCase();
                return s.includes(bName) || bName.includes(s);
            });

            // Jika belum pernah terbit di 60 artikel terakhir, berikan jarak terjauh (999)
            const aScore = aLastIndex === -1 ? 999 : aLastIndex;
            const bScore = bLastIndex === -1 ? 999 : bLastIndex;

            // Media dengan skor lebih tinggi (lebih lama / belum pernah terbit) mendapat prioritas terdepan
            if (bScore !== aScore) {
                return bScore - aScore;
            }

            // Jika sama (misal sama-sama belum pernah terbit), acak secara adil
            return Math.random() - 0.5;
        });

        let chosenArticle: LiveExternalNewsItem | null = null;
        let chosenSourceId: string = "";

        for (const source of prioritizedSources) {
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
