/**
 * MelekIsu - Background Auto-News Worker
 * Script mandiri untuk mengunggah berita otomatis secara berkala tanpa campur tangan admin.
 *
 * Cara penggunaan:
 * 1. Jalankan sekali: node scripts/auto-news-worker.mjs --once
 * 2. Jalankan background berkala (default tiap 60 menit): node scripts/auto-news-worker.mjs
 */

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES || "60", 10);
const isOnce = process.argv.includes("--once");

async function triggerAutoUpload() {
    const timestamp = new Date().toLocaleTimeString("id-ID");
    console.log(`[${timestamp}] 🚀 Memulai penarikan & publikasi berita otomatis...`);

    try {
        const cronSecret = process.env.CRON_SECRET || "SECURE_CRON_TOKEN_7728a49c9f0b1e32d847";
        const response = await fetch(`${APP_URL}/api/cron/auto-news`, {
            method: "GET",
            headers: {
                "User-Agent": "MelekIsu-AutoWorker/1.0",
                "Authorization": `Bearer ${cronSecret}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${timestamp}] ❌ Gagal (Status ${response.status}):`, errorText);
            return;
        }

        const data = await response.json();
        if (data.success) {
            if (data.skippedDeduplication) {
                console.log(`[${timestamp}] ℹ️ Tidak ada rilis baru: ${data.message}`);
            } else if (data.publishedData?.skippedDuplicate) {
                console.log(`[${timestamp}] ℹ️ Duplikasi Dicegah: ${data.publishedData.message}`);
            } else {
                console.log(`[${timestamp}] ✅ Berita Berhasil Diterbitkan Otomatis!`);
                console.log(`   - Sumber: ${data.source}`);
                console.log(`   - Judul Asli: ${data.originalTitle}`);
                if (data.publishedData?.news?.title) {
                    console.log(`   - Judul Terbit: ${data.publishedData.news.title}`);
                    console.log(`   - Kategori: ${data.publishedData.news.category}`);
                }
            }
        } else {
            console.warn(`[${timestamp}] ⚠️ Respons gagal:`, data.message);
        }
    } catch (err) {
        console.error(`[${timestamp}] ❌ Terjadi kesalahan koneksi ke server aplikasi (${APP_URL}):`, err.message);
        console.log("   Pastikan server lokal sedang aktif (misalnya: npm run dev)");
    }
}

async function start() {
    console.log("====================================================");
    console.log("🤖 MelekIsu Automated News Bot Worker");
    console.log(`📡 Server Target: ${APP_URL}`);
    console.log("====================================================");

    // Jalankan pertama kali saat script dimulai
    await triggerAutoUpload();

    if (isOnce) {
        process.exit(0);
    }

    console.log(`\n⏳ Menunggu siklus berikutnya dalam ${INTERVAL_MINUTES} menit... (Tekan Ctrl+C untuk berhenti)\n`);

    setInterval(async () => {
        await triggerAutoUpload();
        console.log(`\n⏳ Siklus selesai. Menunggu ${INTERVAL_MINUTES} menit berikutnya...\n`);
    }, INTERVAL_MINUTES * 60 * 1000);
}

start();
