/**
 * Utility Deduplikasi Berita Otomatis MelekIsu
 * Mencegah duplikasi rilis berita baik pada level CRON feeder, AI auto-news API, maupun manual insert.
 */

export const NEWS_STOPWORDS = new Set([
    "yang", "dan", "di", "ke", "dari", "ini", "itu", "untuk", "pada", "dengan",
    "dalam", "adalah", "bahwa", "oleh", "sebagai", "atas", "usai", "agar", "demi",
    "jadi", "ada", "tak", "tidak", "terus", "lagi", "resmi", "gelar", "bakal",
    "siap", "kata", "hingga", "capai", "raih", "sasar", "dorong", "perkuat",
    "ungkap", "soroti", "sebut", "hadapi", "terkait", "tentang", "bikin", "soal",
    "bisa", "akan", "lebih", "sudah", "telah", "saat", "para", "juga", "atau",
    "karena", "bukan", "bagi", "antara", "oleh", "kepada", "namun", "serta",
    "presiden", "wakil", "menteri", "pemerintah", "kementerian", "negara", "publik",
    "indonesia", "nasional", "daerah", "warga", "rakyat", "tahun", "2026", "2025", "2024"
]);

export function cleanTextForDeduplication(text: string): string {
    return (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

export function generateSlug(title: string): string {
    return (title || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

export function getSignificantWords(text: string): string[] {
    return (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !NEWS_STOPWORDS.has(w));
}

export function extractBaseSlug(slug: string): string {
    return (slug || "")
        .toLowerCase()
        .trim()
        .replace(/-\d{4,}$/, "");
}

/**
 * Memeriksa apakah dua judul / slug berita merujuk pada peristiwa atau isu yang sama (duplikat).
 */
export function areArticlesDuplicate(
    candidateTitle: string,
    existingTitle: string,
    candidateSlug?: string,
    existingSlug?: string
): boolean {
    if (!candidateTitle || !existingTitle) return false;

    // 1. Cek kecocokan base slug jika tersedia
    if (candidateSlug && existingSlug) {
        const baseCandidate = extractBaseSlug(candidateSlug);
        const baseExisting = extractBaseSlug(existingSlug);
        if (baseCandidate && baseCandidate === baseExisting) {
            return true;
        }
    }

    // 2. Cek kecocokan teks normalisasi secara utuh atau inklusi langsung
    const normA = cleanTextForDeduplication(candidateTitle);
    const normB = cleanTextForDeduplication(existingTitle);

    if (normA && normA === normB) {
        return true;
    }

    if (normA.length > 20 && normB.includes(normA)) return true;
    if (normB.length > 20 && normA.includes(normB)) return true;

    // 3. Analisis tumpang-tindih kata kunci signifikan (content words)
    const wordsA = getSignificantWords(candidateTitle);
    const wordsB = getSignificantWords(existingTitle);

    if (wordsA.length === 0 || wordsB.length === 0) return false;

    const setB = new Set(wordsB);
    const sharedWords = wordsA.filter((w) => setB.has(w));

    // Jika berbagi 3 atau lebih kata signifikan spesifik (misal: "spesies", "kepiting", "papua")
    if (sharedWords.length >= 3) {
        return true;
    }

    // Jika berbagi 2 kata dan mencakup minimal 50% dari bobot kata salah satu judul
    if (
        sharedWords.length >= 2 &&
        (sharedWords.length / wordsA.length >= 0.5 || sharedWords.length / wordsB.length >= 0.5)
    ) {
        return true;
    }

    return false;
}

/**
 * Memeriksa apakah kandidat berita sudah pernah terbit dalam daftar riwayat berita database.
 */
export function isNewsAlreadyPublished(
    candidate: { title: string; slug?: string },
    existingNewsList: { title: string; slug?: string }[]
): boolean {
    if (!candidate.title) return false;

    const candidateSlug = candidate.slug || "";

    for (const item of existingNewsList) {
        if (areArticlesDuplicate(candidate.title, item.title, candidateSlug, item.slug)) {
            return true;
        }
    }

    return false;
}
