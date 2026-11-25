"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const progressCircleRef = useRef<SVGCircleElement>(null);

  // Lingkaran SVG Progres: Radius 16 -> circumference = 2 * PI * 16 ≈ 100.53
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const updateProgress = (progressPercent: number, currentY: number) => {
      if (progressCircleRef.current) {
        const progress = Math.min(100, Math.max(0, progressPercent));
        const offset = circumference - (progress / 100) * circumference;
        progressCircleRef.current.style.strokeDashoffset = `${offset}`;
      }
      setIsVisible(currentY > 260);
    };

    // 1. Tangkap event real-time dari Lenis (saat momentum scroll bergerak)
    const handleAppScroll = (e: any) => {
      if (e.detail && typeof e.detail.progress === "number") {
        updateProgress(e.detail.progress * 100, e.detail.scrollY || window.scrollY);
      }
    };

    // 2. Tangkap scroll native browser
    const handleNativeScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      updateProgress(progress, window.scrollY);
    };

    window.addEventListener("app-scroll", handleAppScroll, { passive: true });
    window.addEventListener("scroll", handleNativeScroll, { passive: true });
    handleNativeScroll();

    return () => {
      window.removeEventListener("app-scroll", handleAppScroll);
      window.removeEventListener("scroll", handleNativeScroll);
    };
  }, [circumference]);

  const scrollToTop = () => {
    if (typeof window !== "undefined" && (window as any).__lenis) {
      (window as any).__lenis.scrollTo(0, { duration: 1.2 });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className={`fixed bottom-24 right-6 z-40 transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-3 scale-90 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 backdrop-blur-md text-[#9B4000] border border-[#DEC0B3]/70 shadow-lg hover:shadow-xl hover:border-[#9B4000] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Kembali ke atas"
        aria-label="Kembali ke atas"
      >
        {/* SVG Circular Progress Track & Fill */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5"
          viewBox="0 0 44 44"
        >
          {/* Background circle track */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            stroke="#DEC0B3"
            strokeWidth="2.5"
            strokeOpacity="0.4"
            fill="transparent"
          />
          {/* Animated Progress circle (Real-time GPU accelerated) */}
          <circle
            ref={progressCircleRef}
            cx="22"
            cy="22"
            r={radius}
            stroke="#9B4000"
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
          />
        </svg>

        {/* Arrow Icon */}
        <ArrowUp className="w-4 h-4 text-[#9B4000] group-hover:-translate-y-0.5 transition-transform duration-200" />
      </button>
    </div>
  );
}
