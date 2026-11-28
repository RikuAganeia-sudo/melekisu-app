/**
 * MelekIsu - Emergency User Purge CLI
 * 
 * Penggunaan:
 * node scripts/emergency-purge.mjs <SUPABASE_SERVICE_ROLE_KEY>
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://henxsxlsmmtpxfvyssqx.supabase.co";
const serviceRoleKey = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error("❌ Mohon sertakan SUPABASE_SERVICE_ROLE_KEY!");
    console.error("Contoh: node scripts/emergency-purge.mjs eyJhbGciOi...");
    console.error("Atau jalankan skrip SQL di Supabase SQL Editor (supabase-emergency-purge.sql)");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runPurge() {
    console.log("🚨 Memulai Emergency Purge seluruh akun pengguna...");

    try {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error("❌ Gagal mengambil daftar pengguna:", listError.message);
            return;
        }

        console.log(`Ditemukan ${users.length} akun terdaftar.`);

        for (const user of users) {
            console.log(`Menghapus akun: ${user.email} (ID: ${user.id})...`);
            const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
            if (delError) {
                console.error(`  - Gagal menghapus ${user.email}:`, delError.message);
            } else {
                console.log(`  ✓ Berhasil dihapus.`);
            }
        }

        console.log("✅ Seluruh akun berhasil dibersihkan dari database.");
    } catch (err) {
        console.error("❌ Terjadi kesalahan:", err);
    }
}

runPurge();
