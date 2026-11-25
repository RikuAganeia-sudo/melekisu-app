"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/AIChatWidget";
import BackToTop from "@/components/BackToTop";
import ScrollEffects from "@/components/ScrollEffects";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  // Jika sedang membuka rute /admin (baik login maupun dashboard),
  // sembunyikan Navbar, Footer, dan Widget AI warga agar layout admin mandiri & bersih
  if (isAdminRoute) {
    return (
      <>
        <ScrollEffects />
        <main className="flex-1">{children}</main>
        <BackToTop />
      </>
    );
  }

  return (
    <>
      <ScrollEffects />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
      <AIChatWidget />
    </>
  );
}
