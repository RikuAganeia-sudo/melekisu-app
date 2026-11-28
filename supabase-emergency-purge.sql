-- ==============================================================================
-- MELEKISU: DARURAT KEAMANAN (EMERGENCY PURGE & GLOBAL FORCE LOGOUT)
-- ==============================================================================
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard Anda: https://supabase.com/dashboard
-- 2. Pilih project MelekIsu Anda (ID: henxsxlsmmtpxfvyssqx)
-- 3. Di menu sebelah kiri, klik "SQL Editor"
-- 4. Klik "+ New query"
-- 5. Salin dan tempel SEMUA isi query di bawah ini, lalu klik tombol "RUN" (hijau)
-- ==============================================================================

-- 1. PUTUS SEMUA SESI AKTIF DI SEMUA PERANGKAT (GLOBAL FORCE LOGOUT)
-- Menghapus token refresh dan seluruh sesi yang sedang berjalan di HP/Laptop mana pun
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;

-- 2. HAPUS IDENTITAS AUTHENTICATION TERDAFTAR
DELETE FROM auth.identities;

-- 3. HAPUS SEMUA AKUN PENGGUNA TERDAFTAR (AUTH.USERS)
-- Menghapus seluruh akun dari database Supabase Auth
DELETE FROM auth.users;

-- 4. (OPSIONAL) Bersihkan tabel komentar jika ada serangan komentar spam
-- Uncomment (hapus tanda --) baris di bawah ini jika ingin mengosongkan komentar spam:
-- DELETE FROM public.comments;

-- Selesai! Seluruh akun telah terhapus dan tidak ada sesi yang tersisa di perangkat mana pun.
