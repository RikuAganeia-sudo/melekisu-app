"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          const currentY = window.scrollY;

          if (totalHeight > 0) {
            const progress = (currentY / totalHeight) * 100;
            setScrollProgress(Math.min(100, Math.max(0, progress)));
          }

          setIsVisible(currentY > 260);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Lingkaran SVG Progres: Radius 16 -> circumference = 2 * PI * 16 ≈ 100.53
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

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
          {/* Animated Progress circle */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            stroke="#9B4000"
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-150 ease-out"
          />
        </svg>

        {/* Arrow Icon */}
        <ArrowUp className="w-4 h-4 text-[#9B4000] group-hover:-translate-y-0.5 transition-transform duration-200" />
      </button>
    </div>
  );
}
