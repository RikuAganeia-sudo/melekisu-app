import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { 
    POLICY_DATASETS, 
    getCategoryCoverImage, 
    PolicyTopicDataset,
    POLICY_CATEGORIES,
    classifyPolicyCategory
} from "@/lib/policyDatasets";
import { 
    EXTERNAL_NEWS_SOURCES, 
    fetchExternalLiveNews, 
    LiveExternalNewsItem 
} from "@/lib/externalNewsApi";
import {
    isNewsAlreadyPublished,
    generateSlug
} from "@/lib/newsDeduplication";

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

export async function POST(req: Request) {
    try {
        let body: any = {};
        try {
            body = await req.json();
        } catch {
            body = {};
        }

        const {
            topic,
            category: customCategory,
            source: customSource,
            datasetId,
            liveSourceId,
            liveArticle,
            autoPublish = true,
        } = body;

        let selectedDataset: PolicyTopicDataset | null = null;
        let selectedLiveItem: LiveExternalNewsItem | null = liveArticle || null;
        let liveSourceName = "";

        // 1. Jika pengguna meminta dari API Website Berita Luar (Live News Feed)
        if (liveSourceId && !selectedLiveItem) {
            const liveItems = await fetchExternalLiveNews(liveSourceId, 5);
            if (liveItems.length > 0) {
                selectedLiveItem = liveItems[0];
                liveSourceName = selectedLiveItem.sourceName;
            }
        } else if (selectedLiveItem) {
            liveSourceName = selectedLiveItem.sourceName;
        }

        // 2. Jika bukan dari Live Feed, gunakan Dataset Kebijakan atau Topik Kustom
        if (!selectedLiveItem) {
            if (datasetId) {
                selectedDataset = POLICY_DATASETS.find((d) => d.id === datasetId) || null;
            }

            if (!selectedDataset && !topic) {
                // Ambil acak dari kumpulan dataset kebijakan
                const randomIndex = Math.floor(Math.random() * POLICY_DATASETS.length);
                selectedDataset = POLICY_DATASETS[randomIndex];
            }
        }

        // Tentukan metadata artikel
        const topicTitle = selectedLiveItem?.title || topic || selectedDataset?.title || "Evaluasi Transparansi Kebijakan Publik Nasional";
        const initialSourceCategory = selectedLiveItem?.category || (selectedDataset ? selectedDataset.category : undefined);
        const topicCategory = customCategory || classifyPolicyCategory(topicTitle, selectedLiveItem?.description, initialSourceCategory);
        const topicSource = selectedLiveItem ? selectedLiveItem.sourceName : (customSource || selectedDataset?.source || "Redaksi Riset MelekIsu");
        const datasetOrigin = selectedLiveItem ? `Live API Feed (${selectedLiveItem.sourceName})` : (selectedDataset?.datasetOrigin || "Portal Data Terbuka");
        
        const keyPointsText = selectedLiveItem
            ? `- Berita Terkini dari ${selectedLiveItem.sourceName}: ${selectedLiveItem.description}\n- Tautan Asli: ${selectedLiveItem.link}`
            : (selectedDataset?.keyPoints?.map((p) => `- ${p}`).join("\n") || "- Fokus pada transparansi, efisiensi anggaran, dan dampak langsung bagi masyarakat.");

        const initialCoverImage = selectedLiveItem?.imageUrl || selectedDataset?.defaultImage || getCategoryCoverImage(topicCategory);

        const supabase = getSupabaseClient();

        // Pre-check deduplikasi: Cek apakah topik/berita sumber ini sudah pernah diterbitkan di portal
        if (autoPublish && supabase) {
            try {
                const { data: recentNews } = await supabase
                    .from("news")
                    .select("id, title, slug")
                    .order("created_at", { ascending: false })
                    .limit(500);

                if (recentNews && isNewsAlreadyPublished({ title: topicTitle, slug: generateSlug(topicTitle) }, recentNews)) {
                    console.log(`[AutoNews] Pre-check: Topik "${topicTitle}" sudah pernah terbit di portal. Melewati pembuatan duplikat.`);
                    return NextResponse.json({
                        success: true,
                        published: false,
                        skippedDuplicate: true,
                        sourceName: topicSource,
                        message: `Topik "${topicTitle}" sudah pernah diterbitkan di portal MelekIsu. Melewati penerbitan duplikat.`
                    });
                }
            } catch (preCheckErr) {
                console.warn("[AutoNews] Peringatan saat pre-check duplikasi:", preCheckErr);
            }
        }

        const apiKey = process.env.GEMINI_API_KEY || "";
        const hasApiKey = Boolean(apiKey && apiKey.length > 20 && apiKey !== "masukkan_api_key_gemini_anda_di_sini");

        const currentDateStr = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        let generatedArticle: {
            title: string;
            slug: string;
            category: string;
            source: string;
            excerpt: string;
            content: string;
            duration: string;
            image: string;
            date: string;
            likes: number;
        } | null = null;

        if (hasApiKey) {
            const systemPrompt = `Anda adalah Jurnalis Kebijakan Publik & Asisten Redaksi Senior untuk platform jurnalisme warga "MelekIsu".
Tugas Anda adalah memproduksi atau mentransformasikan rilis berita/dataset kebijakan menjadi artikel analisis kebijakan publik yang mendalam, berimbang, berbasis data, dan mudah dipahami oleh masyarakat umum.

Kaidah Penulisan MelekIsu:
1. JUDUL: Tajam, informatif, menarik, dan berbobot (gaya jurnalisme kebijakan terpercaya, tidak sensasional atau clickbait).
2. RINGKASAN (EXCERPT): 1-2 kalimat padat yang merangkum esensi utama kebijakan dan dampaknya bagi masyarakat.
3. ISI ARTIKEL (CONTENT):
   - Terdiri dari 3 sampai 4 paragraf komprehensif.
   - Paragraf 1: Latar belakang dan fakta peristiwa/kebijakan terbaru yang dilaporkan.
   - Paragraf 2: Rincian data, mekanisme implementasi, alokasi anggaran, atau konteks regulasi di lapangan.
   - Paragraf 3: Dampak nyata bagi kesejahteraan masyarakat, pelayanan publik, atau perekonomian rakyat.
   - Paragraf 4: Poin refleksi pentingnya pengawasan partisipatif warga untuk memastikan keterbukaan informasi.
   - Gunakan gaya bahasa Indonesia yang lugas, baku, dan inspiratif.
4. KATEGORI: Wajib tentukan SATU kategori yang PALING TEPAT dan RELEVAN dari 9 kategori resmi MelekIsu berikut:
   - "Politik & Pemerintahan" (kebijakan presiden, kabinet, parpol, pemda, dpr, birokrasi, pemilu, tata kelola)
   - "Hukum & Regulasi" (penegakan hukum, polri, kpk, kejaksaan, pengadilan, uu, regulasi, agraria/tanah, peradilan)
   - "Ekonomi & Bisnis" (fiskal, perbankan, investasi, pasar, bumn, umkm, pajak, apbn, devisa, inflasi, industri)
   - "Ketahanan Pangan" (pertanian, sembako, beras, pupuk, perikanan, petani, nelayan, pangan lokal)
   - "Infrastruktur & Transportasi" (jalan tol, transportasi massal, krl, mrt, kcic, pelabuhan, bandara, tata kota)
   - "Energi & Lingkungan" (transisi energi, iklim, pln, bbm, amdal, polusi, limbah, kehutanan, konservasi)
   - "Pendidikan & Riset" (sekolah, kurikulum, guru, universitas, vokasi, beasiswa, riset teknologi)
   - "Kesehatan & Kesejahteraan" (layanan kesehatan, bpjs, rumah sakit, bansos, kemiskinan, upah, tenaga kerja)
   - "Internasional & Pertahanan" (geopolitik, pertahanan, tni, militer, diplomasi luar negeri, perang/konflik dunia)
5. FORMAT OUTPUT: Wajib HANYA berupa JSON murni tanpa pembungkus markdown (tanpa \`\`\`json).
6. TANPA EMOJI: DILARANG KERAS menggunakan emoji atau simbol berlebihan (seperti 🚀, 🔥, ⚡, 🎉, ✨, dll) pada judul, ringkasan, maupun isi berita. Tulisan harus bergaya jurnalisme kebijakan yang bersih, serius, dan kredibel.

Format JSON yang wajib dihasilkan:
{
  "title": "Judul berita lengkap dan profesional",
  "category": "Pilih salah satu dari 9 kategori resmi di atas",
  "source": "${topicSource}",
  "excerpt": "Ringkasan tajam 1-2 kalimat.",
  "content": "Isi lengkap artikel kebijakan dalam 3-4 paragraf yang terhubung rapi.",
  "duration": "4 Menit Baca"
}`;

            const userPrompt = `Tolong kembangkan dan susun artikel kebijakan publik berkualitas tinggi berdasarkan rujukan data berikut:

Sumber / Kantor Berita: ${topicSource}
Basis Masukan: ${datasetOrigin}
Judul Berita Awal: ${topicTitle}
Konteks & Ringkasan Peristiwa:
${keyPointsText}

Buatkan artikel lengkap siap terbit ke portal publik MelekIsu.`;

            const candidateModels = [
                "gemini-3.5-flash-lite",
                "gemini-3.5-flash",
                "gemini-3.8-flash"
            ];

            for (const model of candidateModels) {
                try {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            signal: AbortSignal.timeout(7000),
                            body: JSON.stringify({
                                systemInstruction: { parts: [{ text: systemPrompt }] },
                                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                                generationConfig: {
                                    temperature: 0.3,
                                    maxOutputTokens: 1500
                                }
                            })
                        }
                    );

                    if (!response.ok) continue;

                    const data = await response.json();
                    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!rawText) continue;

                    const cleanedJson = rawText
                        .replace(/```json/gi, "")
                        .replace(/```/g, "")
                        .trim();

                    const parsed = JSON.parse(cleanedJson);
                    if (parsed.title && parsed.content) {
                        const finalTitle = parsed.title.trim();
                        const baseSlug = generateSlug(finalTitle);

                        const standardCategories = POLICY_CATEGORIES.filter(c => c !== "Semua");
                        const rawCat = (parsed.category || topicCategory || "").trim();
                        const matchedCat = standardCategories.find(c => c.toLowerCase() === rawCat.toLowerCase());
                        const resolvedCategory = matchedCat || classifyPolicyCategory(finalTitle, parsed.excerpt || parsed.content, topicCategory);
                        const resolvedImage = selectedLiveItem?.imageUrl || getCategoryCoverImage(resolvedCategory);

                        generatedArticle = {
                            title: finalTitle,
                            slug: baseSlug,
                            category: resolvedCategory,
                            source: parsed.source || topicSource,
                            excerpt: parsed.excerpt || parsed.content.slice(0, 160) + "...",
                            content: parsed.content,
                            duration: parsed.duration || "4 Menit Baca",
                            image: resolvedImage,
                            date: currentDateStr,
                            likes: 0
                        };
                        break;
                    }
                } catch (err) {
                    console.warn(`Model ${model} error or timeout saat generate berita:`, err);
                }
            }
        }

        // Fallback jika API key tidak tersedia atau model gagal
        if (!generatedArticle) {
            const fallbackTitle = topicTitle;
            const fallbackSlug = generateSlug(fallbackTitle);
            const fallbackCategory = classifyPolicyCategory(fallbackTitle, selectedLiveItem?.description || "", topicCategory);
            const fallbackImage = selectedLiveItem?.imageUrl || getCategoryCoverImage(fallbackCategory);
            const fallbackContent = `Pemerintah bersama ${topicSource} terus memperkuat keterbukaan dan efektivitas implementasi kebijakan ${topicTitle}. Langkah ini menjadi bagian penting dalam memastikan pelayanan publik dapat diakses secara merata oleh masyarakat.\n\nBerdasarkan data dan rilis pemantauan berkala, sinergi antarsektor serta transparansi pengawasan digital terus ditingkatkan. Keterlibatan masyarakat melalui pemberian aspirasi, masukan solutif, serta pemantauan independen dinilai menjadi fondasi utama dalam menjaga akuntabilitas setiap kebijakan publik.\n\nMelalui publikasi berkala pada platform MelekIsu, warga diimbau untuk terus mengawal pelaksanaan program ini secara kritis dan konstruktif.`;

            generatedArticle = {
                title: fallbackTitle,
                slug: fallbackSlug,
                category: fallbackCategory,
                source: topicSource,
                excerpt: selectedLiveItem?.description || `Laporan perkembangan terbaru kebijakan ${topicTitle} bersama ${topicSource} untuk meningkatkan transparansi publik.`,
                content: fallbackContent,
                duration: "3 Menit Baca",
                image: fallbackImage,
                date: currentDateStr,
                likes: 0
            };
        }

        // 3. Simpan Otomatis ke Database Supabase jika autoPublish disetel true
        let supabaseSaved = false;

        if (autoPublish && supabase) {
            try {
                // Ambil riwayat berita terbaru untuk memastikan judul & slug baru tidak duplikat
                const { data: recentNews } = await supabase
                    .from("news")
                    .select("id, title, slug")
                    .order("created_at", { ascending: false })
                    .limit(500);

                const isDuplicate = recentNews && isNewsAlreadyPublished(
                    { title: generatedArticle.title, slug: generatedArticle.slug },
                    recentNews
                );

                if (isDuplicate) {
                    console.warn(`[AutoNews] Artikel "${generatedArticle.title}" (slug: ${generatedArticle.slug}) terdeteksi duplikat saat akan disimpan. Melewati publikasi.`);
                    return NextResponse.json({
                        success: true,
                        published: false,
                        skippedDuplicate: true,
                        sourceType: selectedLiveItem ? "live_news_api" : (selectedDataset ? "dataset" : "custom"),
                        sourceName: topicSource,
                        news: generatedArticle,
                        message: `Artikel "${generatedArticle.title}" sudah pernah diterbitkan sebelumnya di portal. Publikasi otomatis dilewati demi mencegah duplikasi.`
                    });
                }

                const insertPayload = {
                    title: generatedArticle.title,
                    slug: generatedArticle.slug,
                    category: generatedArticle.category,
                    source: generatedArticle.source,
                    excerpt: generatedArticle.excerpt,
                    content: generatedArticle.content,
                    date: generatedArticle.date,
                    duration: generatedArticle.duration,
                    image: generatedArticle.image,
                    likes: 0
                };

                const { data: inserted, error: insertError } = await supabase
                    .from("news")
                    .insert([insertPayload])
                    .select();

                if (!insertError && inserted && inserted.length > 0) {
                    supabaseSaved = true;
                } else if (insertError) {
                    console.error("Gagal menyimpan berita otomatis ke Supabase:", insertError);
                }
            } catch (dbErr) {
                console.error("Supabase exception saat auto-publish berita:", dbErr);
            }
        }

        return NextResponse.json({
            success: true,
            published: supabaseSaved,
            sourceType: selectedLiveItem ? "live_news_api" : (selectedDataset ? "dataset" : "custom"),
            sourceName: topicSource,
            news: generatedArticle,
            message: supabaseSaved
                ? `Berita dari ${topicSource} berhasil dianalisis AI dan langsung diterbitkan ke Supabase Cloud!`
                : `Draf berita dari ${topicSource} berhasil diproduksi AI dan siap ditinjau.`
        });

    } catch (error: any) {
        console.error("Gagal menjalankan AI Auto-News:", error);
        return NextResponse.json({
            success: false,
            message: "Terjadi kendala saat memproduksi berita otomatis AI: " + (error?.message || error)
        }, { status: 500 });
    }
}

// Handler GET: Mendukung fetching live RSS feeds dan webhook cron
export async function GET(req: Request) {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Jika dipanggil dengan action=feed, kembalikan daftar headline live dari website berita luar
    if (action === "feed") {
        const sourceId = url.searchParams.get("sourceId") || EXTERNAL_NEWS_SOURCES[0]?.id || "cnn-nasional";
        const items = await fetchExternalLiveNews(sourceId, 8);
        return NextResponse.json({
            success: true,
            sources: EXTERNAL_NEWS_SOURCES,
            activeSourceId: sourceId,
            items: items
        });
    }

    // Default: Webhook trigger
    const datasetId = url.searchParams.get("datasetId") || undefined;
    const topic = url.searchParams.get("topic") || undefined;
    const liveSourceId = url.searchParams.get("liveSourceId") || undefined;

    const fakeReq = new Request(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId, topic, liveSourceId, autoPublish: true })
    });

    return POST(fakeReq);
}
