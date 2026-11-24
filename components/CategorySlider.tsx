"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategorySliderProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    theme?: "light" | "hero";
}

export default function CategorySlider({
    categories,
    selectedCategory,
    onSelectCategory,
    theme = "light",
}: CategorySliderProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);
    const [hasMoved, setHasMoved] = useState(false);

    // Cek batas scroll kiri dan kanan
    const updateScrollBounds = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(scrollLeft > 8);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    }, []);

    useEffect(() => {
        updateScrollBounds();
        const el = scrollContainerRef.current;
        if (!el) return;

        const handleResize = () => updateScrollBounds();
        window.addEventListener("resize", handleResize);
        el.addEventListener("scroll", updateScrollBounds, { passive: true });

        // Cek kembali setelah font/layout selesai dirender
        const timer = setTimeout(updateScrollBounds, 300);

        return () => {
            window.removeEventListener("resize", handleResize);
            el.removeEventListener("scroll", updateScrollBounds);
            clearTimeout(timer);
        };
    }, [categories, updateScrollBounds]);

    // Geser manual dengan tombol panah
    const handleSlide = (direction: "left" | "right") => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const offset = direction === "left" ? -280 : 280;
        el.scrollBy({ left: offset, behavior: "smooth" });
    };

    // Mouse Drag untuk pengguna desktop/laptop
    const handleMouseDown = (e: React.MouseEvent) => {
        const el = scrollContainerRef.current;
        if (!el) return;
        setIsDragging(true);
        setHasMoved(false);
        setStartX(e.pageX - el.offsetLeft);
        setScrollLeftState(el.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        const el = scrollContainerRef.current;
        const x = e.pageX - el.offsetLeft;
        const distance = x - startX;
        if (Math.abs(distance) > 5) {
            setHasMoved(true);
        }
        el.scrollLeft = scrollLeftState - distance;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const handlePillClick = (cat: string, e: React.MouseEvent<HTMLButtonElement>) => {
        if (hasMoved) {
            // Jika pengguna baru saja men-drag mouse, jangan trigger pilihan
            return;
        }
        onSelectCategory(cat);
        // Scroll item yang dipilih ke tengah
        e.currentTarget.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
        });
    };

    // Efek fade alami menggunakan CSS mask-image (tidak merusak background foto maupun gradasi)
    const maskStyle = useMemo(() => {
        if (canScrollLeft && canScrollRight) {
            return {
                maskImage: "linear-gradient(to right, transparent 0%, black 48px, black calc(100% - 48px), transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 48px, black calc(100% - 48px), transparent 100%)",
            };
        }
        if (canScrollRight) {
            return {
                maskImage: "linear-gradient(to right, black calc(100% - 48px), transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, black calc(100% - 48px), transparent 100%)",
            };
        }
        if (canScrollLeft) {
            return {
                maskImage: "linear-gradient(to right, transparent 0%, black 48px, black 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 48px, black 100%)",
            };
        }
        return {};
    }, [canScrollLeft, canScrollRight]);

    return (
        <div className="relative w-full group select-none">
            {/* Tombol Geser Kiri Melayang Rapi (Floating Glassmorphism) */}
            {canScrollLeft && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex items-center pl-0.5 animate-in fade-in duration-200">
                    <button
                        type="button"
                        onClick={() => handleSlide("left")}
                        aria-label="Geser ke kiri"
                        className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md text-[#9B4000] border border-[#DEC0B3]/80 shadow-md hover:shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>
            )}

            {/* Container List Kategori dengan Mask Transparan Alami */}
            <div
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className={`flex items-center gap-2 overflow-x-auto w-full py-1.5 px-1 scroll-smooth scrollbar-none ${
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    ...maskStyle,
                }}
            >
                {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={(e) => handlePillClick(cat, e)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-2xs shrink-0 cursor-pointer border ${
                                isSelected
                                    ? "bg-[#9B4000] text-white border-[#9B4000] shadow-sm ring-2 ring-[#9B4000]/20"
                                    : "bg-white text-[#574238] border-[#DEC0B3]/60 hover:bg-[#FFE3D1] hover:text-[#9B4000]"
                            }`}
                        >
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* Tombol Geser Kanan Melayang Rapi (Floating Glassmorphism) */}
            {canScrollRight && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center pr-0.5 animate-in fade-in duration-200">
                    <button
                        type="button"
                        onClick={() => handleSlide("right")}
                        aria-label="Geser ke kanan"
                        className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md text-[#9B4000] border border-[#DEC0B3]/80 shadow-md hover:shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>
            )}
        </div>
    );
}
