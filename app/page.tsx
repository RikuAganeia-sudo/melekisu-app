"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  getCombinedNews,
  getCommentsForSlug,
  sendComment,
  isTextViolating,
} from "@/lib/newsService";
import { NewsItem } from "@/data/news";
import { getCategoryCoverImage, POLICY_CATEGORIES } from "@/lib/policyDatasets";
import { createClient } from "@/lib/supabase/client";
import {
  Lightbulb,
  MessageSquare,
  ThumbsUp,
  ArrowRight,
  ArrowDown,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Bot,
  Search,
  X,
  Newspaper,
} from "lucide-react";

function matchCategory(itemCategory: any, selected: string): boolean {
  if (selected === "Semua") return true;
  if (!itemCategory) return false;
  const cat = (
    typeof itemCategory === "object" ? itemCategory?.name || "" : String(itemCategory)
  )
    .toLowerCase()
    .trim();
  const sel = selected.toLowerCase().trim();
  if (cat === sel) return true;

  // 1. Politik & Pemerintahan
  if (
    (sel.includes("politik") || sel.includes("pemerintah") || sel.includes("kelola")) &&
    (cat.includes("politik") ||
      cat.includes("pemerintah") ||
      cat.includes("tata kelola") ||
      cat.includes("kebijakan"))
  ) {
    return true;
  }

  // 2. Hukum & Regulasi
  if (
    (sel.includes("hukum") || sel.includes("regulasi") || sel.includes("aturan")) &&
    (cat.includes("hukum") || cat.includes("regulasi") || cat.includes("peradilan"))
  ) {
    return true;
  }

  // 3. Ekonomi & Bisnis
  if (
    (sel.includes("ekonomi") || sel.includes("bisnis") || sel.includes("keuangan")) &&
    (cat.includes("ekonomi") ||
      cat.includes("bisnis") ||
      cat.includes("keuangan") ||
      cat.includes("fiskal"))
  ) {
    return true;
  }

  // 4. Ketahanan Pangan
  if (sel.includes("pangan") && cat.includes("pangan")) return true;

  // 5. Infrastruktur & Transportasi
  if (
    (sel.includes("infrastruktur") || sel.includes("transportasi")) &&
    (cat.includes("infrastruktur") || cat.includes("transportasi"))
  ) {
    return true;
  }

  // 6. Energi & Lingkungan
  if (
    (sel.includes("energi") || sel.includes("lingkungan") || sel.includes("iklim")) &&
    (cat.includes("energi") || cat.includes("lingkungan") || cat.includes("iklim"))
  ) {
    return true;
  }

  // 7. Pendidikan & Riset
  if (
    (sel.includes("pendidikan") ||
      sel.includes("riset") ||
      sel.includes("talenta") ||
      sel.includes("sdm")) &&
    (cat.includes("pendidikan") ||
      cat.includes("riset") ||
      cat.includes("talenta") ||
      cat.includes("sdm"))
  ) {
    return true;
  }

  // 8. Kesehatan & Kesejahteraan
  if (
    (sel.includes("kesehatan") || sel.includes("sosial") || sel.includes("sejahtera")) &&
    (cat.includes("kesehatan") || cat.includes("sosial") || cat.includes("sejahtera"))
  ) {
    return true;
  }

  // 9. Internasional & Pertahanan
  if (
    (sel.includes("internasional") ||
      sel.includes("pertahanan") ||
      sel.includes("militer") ||
      sel.includes("global")) &&
    (cat.includes("internasional") ||
      cat.includes("pertahanan") ||
      cat.includes("militer") ||
      cat.includes("global"))
  ) {
    return true;
  }

  return cat.includes(sel) || sel.includes(cat);
}

function parseNewsTimestamp(item: any): number {
  if (item.createdAt) {
    const time = new Date(item.createdAt).getTime();
    if (!isNaN(time)) return time;
  }
  if (item.date) {
    const str = item.date.trim();
    const parts = str.split(/\s+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      const months: Record<string, number> = {
        januari: 0,
        februari: 1,
        maret: 2,
        april: 3,
        mei: 4,
        juni: 5,
        juli: 6,
        agustus: 7,
        september: 8,
        oktober: 9,
        november: 10,
        desember: 11,
      };
      if (!isNaN(day) && !isNaN(year) && months[monthStr] !== undefined) {
        return new Date(year, months[monthStr], day).getTime();
      }
    }
    const time = new Date(str).getTime();
    if (!isNaN(time)) return time;
  }
  const numId = parseInt(item.id, 10);
  return !isNaN(numId) ? numId : 0;
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Interaktif untuk Like & Komentar Fungsional
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSubmissionCount, setUserSubmissionCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userAlert, setUserAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "error" | "success";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });
  const [moderationFeedback, setModerationFeedback] = useState<{
    approved: boolean;
    status: string;
    reason: string;
    sentiment?: string;
  } | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");

  // 1. Ambil seluruh berita (Supabase & fallback), diurutkan kronologis terbaru
  useEffect(() => {
    const loadNews = async () => {
      try {
        const all = await getCombinedNews();
        const sorted = [...all].sort(
          (a, b) => parseNewsTimestamp(b) - parseNewsTimestamp(a)
        );
        setNewsList(sorted);
      } catch (e) {
        console.error("Gagal memuat berita beranda:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  }, []);

  const availableCategories = useMemo(() => {
    const base = [...POLICY_CATEGORIES] as string[];
    newsList.forEach((item) => {
      const cat =
        typeof item.category === "object"
          ? (item.category as any)?.name
          : item.category;
      if (cat && !base.some((b) => matchCategory(cat, b))) {
        base.push(cat);
      }
    });
    return base;
  }, [newsList]);

  const filteredNews = useMemo(() => {
    const q = searchKeyword.toLowerCase().trim();
    return newsList.filter((item) => {
      const matchesCategory = matchCategory(item.category, selectedCategory);
      if (!q) return matchesCategory;

      const catName =
        typeof item.category === "object"
          ? (item.category as any)?.name || ""
          : String(item.category || "");
      const matchesSearch =
        (item.title || "").toLowerCase().includes(q) ||
        (item.excerpt || "").toLowerCase().includes(q) ||
        (item.content || "").toLowerCase().includes(q) ||
        (item.source || "").toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [newsList, selectedCategory, searchKeyword]);

  const HOMEPAGE_NEWS_LIMIT = 6;

  const featuredNews = filteredNews[0] || newsList[0];

  const allLatestNews = useMemo(() => {
    return selectedCategory === "Semua" ? filteredNews.slice(1) : filteredNews;
  }, [filteredNews, selectedCategory]);

  const latestNews = useMemo(() => {
    return allLatestNews.slice(0, HOMEPAGE_NEWS_LIMIT);
  }, [allLatestNews]);

  const hasMoreNews = allLatestNews.length > HOMEPAGE_NEWS_LIMIT;

  // 2. Sinkronisasi data interaktif berita featured saat berita berubah
  useEffect(() => {
    if (!featuredNews) return;

    const syncInteractiveData = async () => {
      const activeUser = localStorage.getItem("current_user");
      let parsedUser = null;
      if (activeUser) {
        try {
          parsedUser = JSON.parse(activeUser);
          setCurrentUser(parsedUser);
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }

      const userKey = parsedUser
        ? parsedUser.emailOrPhone || parsedUser.id || "guest"
        : "guest";
      let likedList: string[] = [];
      try {
        const raw = localStorage.getItem(`melekisu_liked_articles_${userKey}`);
        if (raw) likedList = JSON.parse(raw);
      } catch { }

      setHasLiked(
        likedList.includes(featuredNews.slug) ||
        likedList.includes(featuredNews.id)
      );
      setLikesCount(featuredNews.likes || 0);

      const comments = await getCommentsForSlug(featuredNews.slug);
      setCommentsList(comments);

      if (parsedUser) {
        const hasCommented = comments.some(
          (c: any) =>
            c.status === "Terverifikasi" &&
            !isTextViolating(c.text || "").violated &&
            ((parsedUser.emailOrPhone &&
              c.authorEmail === parsedUser.emailOrPhone) ||
              (parsedUser.fullName && c.author === parsedUser.fullName))
        );
        setUserSubmissionCount(hasCommented ? 1 : 0);
      } else {
        setUserSubmissionCount(0);
      }
    };

    syncInteractiveData();
  }, [featuredNews?.slug]);

  const isAuthorOfComment = (c: any) => {
    if (!currentUser) return false;
    const authorName = c.author || c.user;
    if (
      currentUser.emailOrPhone &&
      c.authorEmail &&
      c.authorEmail.toLowerCase() === currentUser.emailOrPhone.toLowerCase()
    )
      return true;
    if (
      currentUser.fullName &&
      authorName &&
      authorName.toLowerCase() === currentUser.fullName.toLowerCase()
    )
      return true;
    return false;
  };

  const visibleHeroComments = commentsList.filter((c) => {
    if (c.status === "Ditolak" || isTextViolating(c.text || "").violated)
      return false;
    if (c.status === "Terverifikasi") return true;
    if (isAuthorOfComment(c)) return true;
    return false;
  });

  const handleLikeClick = async () => {
    if (!featuredNews) return;
    const userKey = currentUser
      ? currentUser.emailOrPhone || currentUser.id || "guest"
      : "guest";
    const storageKey = `melekisu_liked_articles_${userKey}`;
    let likedList: string[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) likedList = JSON.parse(raw);
    } catch { }

    const newLiked = !hasLiked;
    const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setHasLiked(newLiked);
    setLikesCount(newCount);

    if (newLiked) {
      if (!likedList.includes(featuredNews.slug))
        likedList.push(featuredNews.slug);
    } else {
      likedList = likedList.filter(
        (s) => s !== featuredNews.slug && s !== featuredNews.id
      );
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(likedList));
      const supabase = createClient();
      await supabase
        .from("news")
        .update({ likes: newCount })
        .eq("slug", featuredNews.slug);
    } catch { }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setUserAlert({
        isOpen: true,
        title: "Akses Masuk Diperlukan",
        message:
          "Silakan Masuk atau Daftar terlebih dahulu untuk mengirim tanggapan warga.",
        type: "info",
      });
      return;
    }

    if (!newComment.trim()) return;

    if (userSubmissionCount >= 1) {
      setUserAlert({
        isOpen: true,
        title: "Batas Kuota Tercapai",
        message:
          "Anda sudah mengirimkan 1 tanggapan pada artikel berita ini. Kuota dibatasi 1 per artikel agar ruang diskusi tetap berimbang.",
        type: "info",
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!currentUser || !featuredNews) return;

    setShowConfirmModal(false);
    setIsSending(true);

    try {
      const newCommentItem = await sendComment(
        featuredNews.slug,
        currentUser.fullName,
        currentUser.emailOrPhone || "",
        newComment.trim(),
        featuredNews.title,
        featuredNews.excerpt
      );

      const mod = (newCommentItem as any).moderation;
      const isApproved = newCommentItem.status === "Terverifikasi";

      setModerationFeedback(
        mod || {
          approved: isApproved,
          status: newCommentItem.status || "Terverifikasi",
          reason:
            newCommentItem.aiReason || "Tanggapan telah diproses sistem.",
        }
      );

      if (isApproved || newCommentItem.status === "Menunggu Verifikasi") {
        setCommentsList((prev) => [...prev, newCommentItem]);
        setUserSubmissionCount(1);
        setNewComment("");
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error("Gagal mengirim tanggapan:", err);
      setUserAlert({
        isOpen: true,
        title: "Kendala Pengiriman",
        message:
          "Terjadi kendala saat mengirim tanggapan. Silakan coba kembali dalam beberapa saat.",
        type: "error",
      });
    } finally {
      setIsSending(false);
    }
  };

  const getCategoryName = (item: any) => {
    if (!item) return "Kebijakan Publik";
    if (typeof item.category === "object")
      return item.category?.name || "Kebijakan Publik";
    return String(item.category || "Kebijakan Publik");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] text-[#28180C] selection:bg-[#FDB659]/30">
      {/* ================= HERO PENGANTAR (GRADASI KANAN & MENYATU DENGAN NAVBAR #FFF8F5) ================= */}
      <section className="relative min-h-[78vh] w-full flex flex-col justify-between overflow-hidden bg-[#FFF8F5] border-b border-[#DEC0B3]/30">
        {/* Foto Senja Jakarta di Sisi Kanan dengan Gradasi Memudar ke Kiri */}
        <div
          className="
            pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[74%] lg:w-[66%]
            bg-cover bg-center bg-no-repeat opacity-95
            [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.35)_24%,rgba(0,0,0,0.85)_52%,black_100%)]
            [-webkit-mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.35)_24%,rgba(0,0,0,0.85)_52%,black_100%)]
          "
          style={{
            backgroundImage: "url('/images/jakarta.jpg')",
          }}
        />

        {/* Gradasi Warna #FFF8F5 agar Menyatu Halus dengan Navbar & Bagian Bawah */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #FFF8F5 0%, #FFF8F5 36%, rgba(255,248,245,0.72) 56%, rgba(255,248,245,0.18) 80%, rgba(255,248,245,0.04) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,248,245,0.92) 0%, rgba(255,248,245,0.06) 24%, rgba(255,248,245,0.14) 76%, #FFF8F5 100%)",
          }}
        />

        {/* Konten Pengantar Singkat & Ajakan Membaca Berita di Sisi Kiri */}
        <div className="relative z-10 max-w-[1360px] w-full mx-auto px-6 my-auto py-10">
          <div className="max-w-xl space-y-4">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.12] tracking-tight text-[#28180C]">
              Mengurai Isu{" "}
              <span className="text-[#9B4000] font-normal italic">
                Menyuarakan Gagasan.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#574238] leading-relaxed max-w-lg">
              <strong className="font-bold text-[#28180C]">MelekIsu</strong>{" "}
              hadir untuk membedah kebijakan, menyajikan data, dan mendorong
              transparansi kepada warga. Temukan fakta di balik isu terkini dan mulai baca
              kajian untuk mengambil peran dalam diskursus warga.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollToSection("sorotan-utama")}
                className="px-6 py-3 rounded-full bg-[#9B4000] hover:bg-[#823600] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Mulai Membaca</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/berita"
                className="px-5 py-3 rounded-full bg-white/85 hover:bg-white text-[#28180C] border border-[#DEC0B3]/80 text-xs sm:text-sm font-semibold transition-all shadow-2xs"
              >
                Baca Berita Terkini
              </Link>
            </div>
          </div>
        </div>

        {/* Indikator Scroll ke Bawah */}
        <div className="relative z-10 pb-5 flex flex-col items-center justify-center text-[#574238]">
          <button
            type="button"
            onClick={() => scrollToSection("sorotan-utama")}
            aria-label="Scroll ke berita dan kajian"
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-7 h-10 rounded-full border border-[#DEC0B3] bg-white/75 flex items-center justify-center group-hover:border-[#9B4000] transition-colors">
              <ArrowDown className="w-3.5 h-3.5 text-[#9B4000] animate-bounce" />
            </div>
            <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-[#8B7266]">
              Scroll to Explore
            </span>
          </button>
        </div>
      </section>

      {/* Main Container */}
      <main
        id="sorotan-utama"
        className="max-w-[1360px] mx-auto px-6 py-12 flex flex-col gap-12"
      >
        {/* Hero Spotlight Section (Sorotan Utama Redaksi Berita Terbaru) */}
        {isLoading ? (
          <div className="py-20 text-center text-[#9B4000] flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-[#9B4000] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold uppercase tracking-wider">
              Memuat Berita Sorotan Terkini...
            </span>
          </div>
        ) : featuredNews ? (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch reveal-on-scroll">
            {/* Left Visual Banner */}
            <div className="lg:col-span-7 relative group rounded-3xl overflow-hidden shadow-md flex flex-col justify-between p-6 sm:p-8 min-h-[360px] sm:min-h-[420px] transition-all duration-500 border border-[#DEC0B3]/40 bg-[#28180C]">
              {featuredNews.image ? (
                <>
                  <img
                    src={featuredNews.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = getCategoryCoverImage(
                        getCategoryName(featuredNews)
                      );
                    }}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/45"></div>
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#402010] to-[#1a0c06]" />
              )}

              <div className="flex flex-col gap-6 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="bg-[#FDB659] text-[#28180C] px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
                    Sorotan Utama Redaksi
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold tracking-widest text-[#FFDDC9] uppercase drop-shadow-sm">
                    {getCategoryName(featuredNews)}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug text-white group-hover:text-[#FFDDC9] transition-colors drop-shadow-md">
                    {featuredNews.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#FFF1E9] leading-relaxed line-clamp-3 drop-shadow-sm font-normal">
                    {featuredNews.excerpt}
                  </p>
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-white/20 flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#FFDDC9] uppercase tracking-wider font-semibold">
                    Sumber Rujukan
                  </span>
                  <span className="text-xs font-bold text-white">
                    {featuredNews.source}
                  </span>
                </div>
                <Link
                  href={`/berita/${featuredNews.slug}`}
                  className="px-5 py-2.5 bg-white text-[#9B4000] hover:bg-[#FFF8F5] text-xs font-bold rounded-xl shadow-md transition-all duration-300 flex items-center gap-2 group-hover:scale-105 cursor-pointer"
                >
                  <span>Analisis Kebijakan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Interactive Card */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-[#DEC0B3]/40 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-[#FFE3D1] text-[#9B4000] text-[11px] font-extrabold px-3 py-1 rounded-full tracking-wide uppercase">
                    {getCategoryName(featuredNews)}
                  </span>
                  <span className="text-[11px] font-medium text-[#8B7266]">
                    {featuredNews.duration || "5 Menit Baca"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#28180C] hover:text-[#9B4000] transition-colors leading-snug line-clamp-2">
                  {featuredNews.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#574238] leading-relaxed line-clamp-2">
                  {featuredNews.excerpt}
                </p>

                {/* Key Insights Box */}
                <div className="bg-[#FFF8F5] p-3.5 rounded-2xl border border-[#DEC0B3]/30 space-y-1.5">
                  <span className="text-[11px] font-bold text-[#9B4000] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[#9B4000]" />
                    <span>Ringkasan Fakta & Dampak Langsung:</span>
                  </span>
                  <ul className="text-[11px] text-[#574238] space-y-1 pl-4 list-disc">
                    <li>
                      Transparansi data real-time & akuntabilitas kebijakan
                      publik.
                    </li>
                    <li>
                      Partisipasi aktif warga melalui kanal kuota esai
                      berbobot.
                    </li>
                  </ul>
                </div>

                {/* Kotak Komentar Interaktif */}
                {showCommentBox && (
                  <div className="bg-[#FFF1E9] p-4 rounded-2xl border border-[#DEC0B3]/50 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#9B4000]">
                      <span>Tanggapan Warga ({commentsList.length})</span>
                      <button
                        onClick={() => setShowCommentBox(false)}
                        className="text-[10px] text-[#8B7266] hover:text-[#28180C] cursor-pointer font-bold"
                      >
                        Tutup
                      </button>
                    </div>

                    {!currentUser ? (
                      <div className="text-xs text-[#9B4000] bg-white p-3 rounded-xl border border-[#DEC0B3]/60 text-center font-bold">
                        Silakan{" "}
                        <Link
                          href="/masuk"
                          className="underline hover:text-[#8C4A1E]"
                        >
                          Masuk
                        </Link>{" "}
                        terlebih dahulu untuk mengirimkan tanggapan warga.
                      </div>
                    ) : userSubmissionCount >= 1 ? (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                        <span>
                          Anda telah menggunakan kuota 1 tanggapan pada berita
                          ini. Komentar Anda sedang dalam peninjauan sistem.
                        </span>
                      </div>
                    ) : (
                      <form onSubmit={handleInitialSubmit} className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Tuliskan pandangan konstruktif Anda..."
                          className="flex-1 bg-white px-3 py-2 text-xs rounded-xl border border-[#DEC0B3] focus:outline-none focus:ring-1 focus:ring-[#9B4000]"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#9B4000] text-white text-xs font-bold rounded-xl hover:bg-[#8C4A1E] cursor-pointer flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim</span>
                        </button>
                      </form>
                    )}

                    {/* List Komentar Interaktif */}
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {visibleHeroComments.length === 0 ? (
                        <p className="text-[11px] text-[#8B7266] italic text-center py-2">
                          Belum ada tanggapan untuk sorotan berita ini.
                        </p>
                      ) : (
                        visibleHeroComments.map((c) => {
                          const isPending = c.status === "Menunggu Verifikasi";
                          return (
                            <div
                              key={c.id}
                              className="bg-white p-2.5 rounded-xl border border-[#DEC0B3]/40 text-xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-[#28180C] text-[11px]">
                                  {c.author || c.user}
                                </span>
                                {isPending ? (
                                  <span
                                    className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0"
                                    title="Komentar hanya terlihat oleh Anda sampai disetujui admin"
                                  >
                                    <Clock className="w-2.5 h-2.5 text-amber-700 animate-pulse" />
                                    <span>Menunggu Verifikasi (Hanya Anda)</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                    <span>Terverifikasi</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[#574238] text-[11px] leading-relaxed">
                                {c.text}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tombol Aksi Fungsional: Like & Komentar */}
              <div className="pt-5 mt-5 border-t border-[#DEC0B3]/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCommentBox(!showCommentBox)}
                    className="flex items-center gap-1.5 font-semibold text-[#574238] hover:text-[#9B4000] cursor-pointer bg-[#FFF1E9] px-3 py-1.5 rounded-xl transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#9B4000]" />
                    <strong className="text-[#28180C]">
                      {visibleHeroComments.length}
                    </strong>
                  </button>

                  <button
                    onClick={handleLikeClick}
                    className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${hasLiked
                      ? "bg-[#9B4000] text-white shadow-sm"
                      : "bg-[#FFF1E9] text-[#574238] hover:text-[#9B4000]"
                      }`}
                  >
                    <ThumbsUp
                      className={`w-3.5 h-3.5 ${hasLiked ? "text-white" : "text-[#9B4000]"
                        }`}
                    />
                    <strong
                      className={hasLiked ? "text-white" : "text-[#28180C]"}
                    >
                      {likesCount}
                    </strong>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("open-ai-chat", {
                          detail: {
                            prompt: `Tolong jelaskan analisis inti dan rekomendasi dari berita sorotan "${featuredNews.title}"`,
                            slug: featuredNews.slug,
                            article: featuredNews,
                          },
                        })
                      );
                    }}
                    className="px-3.5 py-2 bg-[#FFF1E9] hover:bg-[#FFDDC9] text-[#9B4000] font-bold text-xs rounded-xl border border-[#DEC0B3]/60 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Tanya AI tentang berita sorotan ini"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#9B4000]" />
                    <span>Tanya AI</span>
                  </button>

                  <Link
                    href={`/berita/${featuredNews.slug}`}
                    className="px-4 py-2 bg-[#9B4000] hover:bg-[#8C4A1E] text-white font-bold rounded-xl shadow-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Baca Artikel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="text-center py-12 text-xs text-[#8B7266]">
            Belum ada berita yang tersedia untuk kategori ini.
          </div>
        )}

        {/* Section Heading & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-[#DEC0B3]/40 gap-3 reveal-on-scroll">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-2.5 h-6 bg-[#9B4000] rounded-full"></div>
            <h2 className="text-xl font-extrabold text-[#28180C] tracking-tight">
              Kajian & Laporan Lapangan Terkini
            </h2>
            {searchKeyword && (
              <span className="text-xs bg-[#FFE3D1] text-[#9B4000] px-3 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5">
                <span>Kata kunci: &quot;{searchKeyword}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="hover:text-red-700 cursor-pointer"
                  title="Hapus kata kunci"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7266]" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari berita atau isu..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-white rounded-2xl border border-[#DEC0B3]/80 focus:border-[#9B4000] focus:outline-none focus:ring-1 focus:ring-[#9B4000] shadow-xs text-[#28180C] placeholder-[#8B7266]"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7266] hover:text-[#9B4000] p-1 rounded-full cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Latest News Grid */}
        {latestNews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#DEC0B3]/40 p-6 flex flex-col items-center gap-2">
            <Search className="w-8 h-8 text-[#8B7266]" />
            <p className="text-sm font-bold text-[#28180C]">
              {searchKeyword
                ? `Tidak ada berita yang cocok dengan kata kunci "${searchKeyword}".`
                : "Belum ada berita pada kategori ini."}
            </p>
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword("")}
                className="mt-2 px-3.5 py-1.5 bg-[#9B4000] text-white text-xs font-bold rounded-xl hover:bg-[#8C4A1E] cursor-pointer"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-6 items-stretch">
            {latestNews.map((article, index) => (
              <article
                key={article.id}
                className={`bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[#DEC0B3]/40 transition-all duration-300 group reveal-on-scroll stagger-${(index % 3) + 1} flex flex-row-reverse md:flex-col justify-between p-3.5 sm:p-4 md:p-0 gap-3 sm:gap-4 md:gap-0`}
              >
                {/* Thumbnail Gambar (Kanan di HP, Full-Top di Desktop) */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-full md:h-48 rounded-xl md:rounded-none shrink-0 overflow-hidden bg-gradient-to-tr from-[#F3D4c1] to-[#FFF8F5] flex items-center justify-center text-[#9B4000]">
                  {article.image ? (
                    <img
                      src={article.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = getCategoryCoverImage(
                          getCategoryName(article)
                        );
                      }}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <FileText className="w-8 h-8 md:w-10 md:h-10 text-[#9B4000] opacity-60 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  {/* Overlay gradien di desktop */}
                  <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  {/* Badge Kategori hanya di gambar untuk Desktop */}
                  <div className="hidden md:block absolute top-3 left-3 z-10">
                    <span className="bg-[#FDB659] text-[#724700] px-3 py-1 rounded-full text-[11px] font-bold uppercase shadow-xs">
                      {getCategoryName(article)}
                    </span>
                  </div>
                </div>

                {/* Konten Teks & Tombol Aksi */}
                <div className="flex-1 min-w-0 flex flex-col justify-between md:p-5">
                  <div className="flex flex-col gap-1 md:gap-2.5">
                    {/* Header Baris Mobile: Kategori + Sumber */}
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                      <span className="md:hidden bg-[#FFE3D1] text-[#9B4000] px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                        {getCategoryName(article)}
                      </span>
                      <span className="text-[10px] md:text-[11px] font-bold text-[#8B7266] uppercase tracking-wider truncate">
                        {article.source}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#28180C] group-hover:text-[#9B4000] transition-colors line-clamp-2 leading-snug">
                      <Link href={`/berita/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>

                    <p className="hidden md:block text-xs text-[#574238] line-clamp-2 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>

                  {/* Action Bar Bawah */}
                  <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-[#DEC0B3]/25 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("open-ai-chat", {
                            detail: {
                              prompt: `Bahas berita "${article.title}" dan jelaskan apa poin pentingnya bagi warga.`,
                              slug: article.slug,
                              article: article,
                            },
                          })
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-[#FFF1E9] text-[#9B4000] hover:bg-[#FFDDC9] border border-[#DEC0B3]/50 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      title="Tanya AI tentang berita ini"
                    >
                      <Bot className="w-3 h-3 text-[#9B4000]" />
                      <span>Tanya AI</span>
                    </button>

                    <Link
                      href={`/berita/${article.slug}`}
                      className="text-[11px] md:text-xs text-[#9B4000] font-bold hover:text-[#8C4A1E] flex items-center gap-1 cursor-pointer"
                    >
                      <span className="hidden sm:inline">Baca Selengkapnya</span>
                      <span className="sm:hidden">Baca</span>
                      <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Navigasi Halus ke Arsip Berita Lengkap (Subtle Hairline & Capsule Pill) */}
        {allLatestNews.length > 0 && (
          <div className="relative py-10 flex items-center justify-center reveal-on-scroll">
            {/* Garis pemisah tipis halus */}
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#DEC0B3]/40" />
            </div>

            {/* Kapsul minimalis terpadu */}
            <div className="relative flex justify-center">
              <Link
                href={
                  searchKeyword
                    ? `/berita?search=${encodeURIComponent(searchKeyword)}`
                    : selectedCategory !== "Semua"
                    ? `/berita?category=${encodeURIComponent(selectedCategory)}`
                    : "/berita"
                }
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#FFF8F5] hover:bg-[#FFF1E9] text-[#574238] hover:text-[#9B4000] border border-[#DEC0B3]/70 hover:border-[#9B4000]/40 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-200 group active:scale-95"
              >
                <span>Lihat seluruh berita & arsip</span>
                <span className="w-1 h-1 rounded-full bg-[#DEC0B3]" />
                <span className="px-2 py-0.5 rounded-full bg-[#FFE3D1] text-[#9B4000] text-[10px] font-bold">
                  {allLatestNews.length + 1} artikel
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9B4000] group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Modal Dialog Notifikasi Pengguna */}
      {userAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#DEC0B3]/40 flex flex-col items-center text-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-inner ${userAlert.type === "error"
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : userAlert.type === "success"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
            >
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-[#28180C]">
                {userAlert.title}
              </h3>
              <p className="text-xs text-[#574238] leading-relaxed">
                {userAlert.message}
              </p>
            </div>
            <button
              onClick={() =>
                setUserAlert((prev) => ({ ...prev, isOpen: false }))
              }
              className="w-full mt-1 py-2.5 px-4 bg-[#9B4000] hover:bg-[#8C4A1E] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pengiriman Komentar dengan AI */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-[#DEC0B3]/40 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#FFF1E9] text-[#9B4000] flex items-center justify-center shadow-inner">
              <Bot className="w-9 h-9 text-[#9B4000]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[#28180C]">
                Verifikasi Otomatis AI
              </h3>
              <p className="text-xs sm:text-sm text-[#574238] leading-relaxed">
                Tanggapan Anda akan{" "}
                <strong className="text-[#9B4000]">
                  diverifikasi secara otomatis oleh AI MelekIsu
                </strong>
                . Jika memenuhi etika diskursus publik, tanggapan Anda langsung
                diterbitkan ke warga. Lanjutkan kirim?
              </p>
            </div>
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Periksa Lagi
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={isSending}
                className="flex-1 py-3 px-4 bg-[#9B4000] hover:bg-[#8C4A1E] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>AI Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim & Verifikasi AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hasil Verifikasi AI */}
      {showSuccessModal && moderationFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-[#DEC0B3]/40 flex flex-col items-center text-center gap-5">
            {moderationFeedback.approved ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Lolos Kurasi Otomatis AI</span>
                  </span>
                  <h3 className="text-xl font-extrabold text-[#28180C]">
                    Tanggapan Terverifikasi & Terbit!
                  </h3>
                  <p className="text-xs sm:text-sm text-[#574238] leading-relaxed">
                    Terima kasih atas partisipasi aktif Anda. Tanggapan Anda
                    dinilai memenuhi standar kesantunan dan relevansi publik
                    oleh AI MelekIsu sehingga langsung dapat dibaca oleh
                    seluruh warga.
                  </p>
                  {moderationFeedback.reason && (
                    <div className="mt-2 p-3 bg-[#FFF8F5] rounded-xl border border-[#DEC0B3]/40 text-left text-xs text-[#574238]">
                      <strong className="text-[#9B4000] block mb-0.5">
                        Analisis Kurasi AI:
                      </strong>
                      <span>{moderationFeedback.reason}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full mt-2 py-3 px-5 bg-[#9B4000] hover:bg-[#8C4A1E] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Selesai & Lihat Diskusi
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner border border-rose-100">
                  <AlertCircle className="w-9 h-9 text-rose-600" />
                </div>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Kurasi AI: Belum Memenuhi Syarat</span>
                  </span>
                  <h3 className="text-xl font-extrabold text-[#28180C]">
                    Tanggapan Ditolak Sistem
                  </h3>
                  <p className="text-xs sm:text-sm text-[#574238] leading-relaxed">
                    Sistem kurasi otomatis mendeteksi bahwa masukan Anda belum
                    memenuhi panduan komunitas MelekIsu.
                  </p>
                  {moderationFeedback.reason && (
                    <div className="mt-2 p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-left text-xs text-rose-900">
                      <strong className="text-rose-700 block mb-0.5">
                        Alasan Kurasi:
                      </strong>
                      <span>{moderationFeedback.reason}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-[#8B7266] italic mt-2">
                    *Kuota Anda belum terpotong. Silakan perbaiki kalimat Anda
                    agar lebih konstruktif dan sopan.
                  </p>
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full mt-2 py-3 px-5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Perbaiki Kalimat
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}