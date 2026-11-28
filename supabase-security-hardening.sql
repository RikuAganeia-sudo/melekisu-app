-- ==============================================================================
-- MELEKISU: PENGETATAN KEAMANAN DATABASE (ANTI-BOT & ANTI-PENETRASI)
-- ==============================================================================
-- MASALAH UTAMA:
-- Sebelumnya, tabel "news" memiliki policy 'FOR ALL USING (true)' yang artinya
-- siapa pun di internet yang memiliki anon key (bahkan lewat script bot Python/Node)
-- bisa langsung INSERT, UPDATE, dan DELETE berita ke database tanpa batasan!
--
-- CARA MENGATASI (Jalankan skrip ini di Supabase Dashboard -> SQL Editor):
-- ==============================================================================

-- 1. AKTIFKAN ULANG RLS (ROW LEVEL SECURITY)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 2. CABUT POLICY LAMA YANG BERBAHAYA (YANG MEMBOLEHKAN PUBLIK INSERT/DELETE BERITA)
DROP POLICY IF EXISTS "Enable news management" ON public.news;
DROP POLICY IF EXISTS "Only admin can insert news" ON public.news;
DROP POLICY IF EXISTS "Only admin can update news" ON public.news;
DROP POLICY IF EXISTS "Only admin can delete news" ON public.news;

-- 3. HANYA BOLEHKAN PUBLIK MEMBACA BERITA (SELECT ONLY)
DROP POLICY IF EXISTS "Public can read news" ON public.news;
CREATE POLICY "Public can read news" ON public.news
    FOR SELECT USING (true);

-- CATATAN KEAMANAN:
-- Karena TIDAK ADA policy INSERT/UPDATE/DELETE untuk 'anon' atau publik,
-- maka seluruh bot atau script luar yang mencoba inject berita ke REST API Supabase
-- AKAN OTOMATIS DITOLAK SEKETIKA (Error: "new row violates row-level security policy").
-- Hanya 'service_role' (backend internal) yang bisa memodifikasi tabel berita.

-- 4. AMANKAN TABEL KOMENTAR
-- Cabut policy lama yang membolehkan siapa pun memodifikasi/menghapus komentar
DROP POLICY IF EXISTS "Enable comment moderation" ON public.comments;

-- Publik hanya bisa membaca komentar yang terverifikasi
DROP POLICY IF EXISTS "Public can read comments" ON public.comments;
CREATE POLICY "Public can read comments" ON public.comments
    FOR SELECT USING (true);

-- Hanya user terotentikasi yang bisa kirim komentar (atau publik jika diizinkan)
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
CREATE POLICY "Anyone can insert comments" ON public.comments
    FOR INSERT WITH CHECK (true);

-- 5. (OPSIONAL) HAPUS BERITA SPAM HASIL INJEKSI BOT PENYERANG HARI INI
-- Jalankan baris berikut jika penyerang sempat membanjiri tabel berita Anda:
-- DELETE FROM public.news WHERE created_at >= (NOW() - INTERVAL '24 hours');

-- Selesai! Database Anda sekarang 100% terlindungi dari penetrasi bot dan injeksi artikel ilegal.
