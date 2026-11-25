"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export default function ScrollEffects() {
  const pathname = usePathname();

  // 1. Inisialisasi Lenis Smooth Momentum Scroll
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Hormati pengaturan aksesibilitas reduced-motion jika aktif di perangkat user
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });

    // Pasang ke window agar bisa diakses komponen interaktif (seperti tombol BackToTop)
    (window as any).__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete (window as any).__lenis;
    };
  }, []);

  // Reset posisi scroll ke atas saat berpindah halaman/rute
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__lenis) {
      (window as any).__lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  // 2. IntersectionObserver dengan Re-Trigger Animasi (muncul berulang saat di-scroll bolak-balik)
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
        el.classList.add("is-revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          } else {
            // Ketika elemen keluar dari layar ke bawah (misal pengguna scroll up ke atas halaman),
            // lepas class is-revealed agar saat di-scroll down lagi, animasinya meluncur kembali!
            if (entry.boundingClientRect.top > 0) {
              entry.target.classList.remove("is-revealed");
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px 80px 0px", // Memicu 80px sebelum mencapai batas bawah viewport agar kartu langsung siap tanpa jeda
        threshold: 0.02,
      }
    );

    // Ambil dan pantau semua elemen dengan class .reveal-on-scroll
    const observeElements = () => {
      const elements = document.querySelectorAll(".reveal-on-scroll");
      elements.forEach((el) => observer.observe(el));
    };

    observeElements();
    const timer = setTimeout(observeElements, 100);

    // Pantau penambahan elemen baru (misal hasil fetch API, ganti filter, atau render dinamis)
    const mutationObserver = new MutationObserver(() => {
      observeElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
