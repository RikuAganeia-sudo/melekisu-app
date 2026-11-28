"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Newspaper,
  AlertCircle,
  LogIn,
  User,
  Search,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/", label: "Beranda", icon: null },
  { href: "/berita", label: "Berita", icon: Newspaper },
  { href: "/transparansi-aksi", label: "Transparansi Aksi", icon: AlertCircle },
];

interface NavUserProfile {
  id?: string;
  fullName: string;
  emailOrPhone?: string;
  role?: string;
  joinedDate?: string;
}

interface AuthUserLike {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
  created_at?: string;
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<NavUserProfile | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Pantau posisi scroll secara real-time langsung ke DOM tanpa lag/delay
  useEffect(() => {
    const updateBar = (progress: number) => {
      if (progressBarRef.current) {
        const clamped = Math.min(1, Math.max(0, progress));
        progressBarRef.current.style.transform = `scaleX(${clamped})`;
      }
    };

    // 1. Dengarkan event real-time dari Lenis (saat momentum scroll bergerak)
    const handleAppScroll = (e: any) => {
      if (e.detail && typeof e.detail.progress === "number") {
        updateBar(e.detail.progress);
      }
    };

    // 2. Dengarkan scroll native browser sebagai fallback
    const handleNativeScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
      updateBar(progress);
    };

    window.addEventListener("app-scroll", handleAppScroll, { passive: true });
    window.addEventListener("scroll", handleNativeScroll, { passive: true });
    handleNativeScroll();

    return () => {
      window.removeEventListener("app-scroll", handleAppScroll);
      window.removeEventListener("scroll", handleNativeScroll);
    };
  }, [pathname]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const isActiveNav = (href: string) => {
    if (pendingHref) return pendingHref === href;
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  // Sinkronisasi sesi user Supabase & localStorage secara real-time
  useEffect(() => {
    const supabase = createClient();

    const formatUserProfile = (authUser: AuthUserLike): NavUserProfile => {
      return {
        id: authUser.id,
        fullName:
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "Warga",
        emailOrPhone: authUser.email,
        role: authUser.user_metadata?.role || "Warga Terverifikasi",
        joinedDate: authUser.created_at
          ? new Date(authUser.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
          : "Terdaftar",
      };
    };

    // 1. Cek sesi user Supabase awal
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const profile = formatUserProfile(user);
        setCurrentUser(profile);
        localStorage.setItem("current_user", JSON.stringify(profile));
      } else {
        localStorage.removeItem("current_user");
        setCurrentUser(null);
      }
    });

    // 2. Dengarkan perubahan status auth dari Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile = formatUserProfile(session.user);
        setCurrentUser(profile);
        localStorage.setItem("current_user", JSON.stringify(profile));
      } else {
        setCurrentUser(null);
        localStorage.removeItem("current_user");
      }
    });

    // 3. Dengarkan event storage untuk sinkronisasi antar tab
    const handleStorage = () => {
      const activeUser = localStorage.getItem("current_user");
      if (activeUser) {
        try {
          setCurrentUser(JSON.parse(activeUser));
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Fungsi untuk menangani pencarian saat user menekan Enter atau submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/berita?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Fungsi untuk menghapus seluruh teks pada kolom pencarian
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#DEC0B3]/40 bg-[#FFF8F5]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* Left: Logo & Kapsul Nav Links */}
        <div className="flex items-center gap-5">
          <Link
            href="/"
            onClick={() => setPendingHref("/")}
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#9B4000] shrink-0 active:scale-[0.98] transition-transform duration-200 ease-out"
          >
            <img
              src="/images/logo.png"
              alt="Logo MelekIsu"
              className="w-8 h-8 object-contain rounded-xl shadow-xs"
            />
            <span className="font-editorial">
              Melek<span className="text-[#FDB659]">Isu</span>
            </span>
          </Link>

          {/* Desktop Kapsul Nav (Beranda, Berita, Transparansi Aksi) */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-1 rounded-full bg-[#FFF1E9]/90 p-1 border border-[#DEC0B3]/60 shadow-2xs"
          >
            {navLinks.map((link) => {
              const active = isActiveNav(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setPendingHref(link.href)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-out active:scale-95 whitespace-nowrap select-none ${active
                    ? "bg-[#9B4000] text-white font-semibold shadow-sm"
                    : "text-[#574238] hover:text-[#9B4000] hover:bg-white/80"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Middle: Oval Search Bar with Clear (X) Button */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-sm lg:max-w-md xl:max-w-lg justify-end"
        >
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7266]" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berita atau isu..."
              className="w-full pl-10 pr-8 py-1.5 text-sm bg-white text-[#28180C] placeholder-[#8B7266] rounded-full border border-[#DEC0B3]/70 focus:outline-none focus:border-[#9B4000] focus:ring-1 focus:ring-[#9B4000] transition-all shadow-inner"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B7266] hover:text-[#9B4000] p-0.5 rounded-full hover:bg-[#FFF1E9] transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* --- DESKTOP AUTH / CLEAN & PROFESSIONAL USER PROFILE --- */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {currentUser ? (
            <Link
              href="/profil"
              onClick={() => setPendingHref("/profil")}
              className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white hover:bg-[#FFF1E9] text-[#28180C] rounded-full border border-[#DEC0B3]/60 transition-all duration-300 ease-out active:scale-95 shadow-xs group"
              title="Profil Saya"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#9B4000] to-[#FDB659] text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-105 transition-transform duration-200">
                {currentUser.fullName
                  ? currentUser.fullName.charAt(0).toUpperCase()
                  : "W"}
              </div>
              <span className="text-xs font-bold text-[#28180C] group-hover:text-[#9B4000] transition-colors max-w-[120px] truncate">
                {currentUser.fullName
                  ? currentUser.fullName.split(" ")[0]
                  : "Warga"}
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/masuk"
                onClick={() => setPendingHref("/masuk")}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 ease-out active:scale-95 hover:bg-gray-100"
              >
                <LogIn className="h-4 w-4" />
                Masuk
              </Link>
              <Link
                href="/daftar"
                onClick={() => setPendingHref("/daftar")}
                className="flex items-center gap-1.5 rounded-full bg-[#9B4000] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out active:scale-95 hover:bg-[#8C4A1E]"
              >
                <User className="h-4 w-4" />
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-gray-600 transition-all duration-200 ease-out active:scale-95 hover:bg-gray-100 md:hidden"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-[#DEC0B3]/40 bg-[#FFF8F5] md:hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="px-4 py-3">
            {/* Mobile Oval Search Bar with Clear Button */}
            <form onSubmit={handleSearchSubmit} className="relative w-full mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7266]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berita..."
                className="w-full pl-10 pr-8 py-2 text-sm bg-white text-[#28180C] placeholder-[#8B7266] rounded-full border border-[#DEC0B3]/70 focus:outline-none focus:border-[#9B4000] focus:ring-1 focus:ring-[#9B4000]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B7266] hover:text-[#9B4000] p-0.5 rounded-full hover:bg-[#FFF1E9] transition-colors cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const active = isActiveNav(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      setPendingHref(link.href);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out active:scale-[0.98] ${active
                      ? "bg-[#9B4000] text-white font-semibold shadow-xs"
                      : "text-[#574238] hover:bg-[#FFF1E9] hover:text-[#9B4000]"
                      }`}
                  >
                    {link.icon && <link.icon className="h-4 w-4" />}
                    {link.label}
                  </Link>
                );
              })}
              <hr className="my-2 border-[#DEC0B3]/40" />

              {currentUser ? (
                <Link
                  href="/profil"
                  onClick={() => {
                    setPendingHref("/profil");
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-between rounded-lg bg-white px-3.5 py-2.5 text-sm font-bold text-[#28180C] border border-[#DEC0B3]/50 transition-all duration-200 active:scale-[0.98] shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#9B4000] to-[#FDB659] text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.fullName
                        ? currentUser.fullName.charAt(0).toUpperCase()
                        : "W"}
                    </div>
                    <span>{currentUser.fullName}</span>
                  </div>
                </Link>
              ) : (
                <>
                  <Link
                    href="/masuk"
                    onClick={() => {
                      setPendingHref("/masuk");
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 active:scale-[0.98] hover:bg-gray-100"
                  >
                    <LogIn className="h-4 w-4" />
                    Masuk
                  </Link>
                  <Link
                    href="/daftar"
                    onClick={() => {
                      setPendingHref("/daftar");
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-[#9B4000] px-3 py-2.5 text-center text-sm font-medium text-white transition-all duration-200 active:scale-[0.98] hover:bg-[#8C4A1E] justify-center"
                  >
                    <User className="h-4 w-4" />
                    Daftar
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Scroll Reading Progress Bar di bagian bawah Navbar (Real-time Hardware Accelerated) */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#DEC0B3]/25 pointer-events-none overflow-hidden">
        <div
          ref={progressBarRef}
          className="h-full w-full bg-gradient-to-r from-[#9B4000] via-[#D97706] to-[#FDB659] shadow-[0_0_8px_rgba(253,182,89,0.8)] origin-left will-change-transform"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </header>
  );
}