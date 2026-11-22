export interface PolicyTopicDataset {
    id: string;
    title: string;
    category: "Infrastruktur Publik" | "Ketahanan Pangan" | "Pendidikan & SDM" | "Transformasi Digital" | "Tata Kelola & Transparansi" | "Energi & Lingkungan";
    source: string;
    datasetOrigin: string;
    keyPoints: string[];
    defaultImage: string;
}

export const POLICY_DATASETS: PolicyTopicDataset[] = [
    {
        id: "dataset-mbg-eval",
        title: "Evaluasi Skema Distribusi dan Transparansi Anggaran Program Makan Bergizi Gratis (MBG)",
        category: "Ketahanan Pangan",
        source: "Badan Gizi Nasional & Bappenas",
        datasetOrigin: "Portal Satu Data Indonesia - Ketahanan Pangan",
        keyPoints: [
            "Penyaluran bertahap untuk jutaan siswa sekolah dasar dan menengah di 38 provinsi.",
            "Integrasi pengawasan digital dengan melibatkan UMKM lokal dan kelompok tani sekitar.",
            "Alokasi APBN untuk standar higienitas dan pengawasan kualitas gizi berkala."
        ],
        defaultImage: "/images/petani.jpg"
    },
    {
        id: "dataset-transit-urban",
        title: "Perluasan Rute Feeder LRT dan Integrasi Tiket Tunggal Kawasan Aglomerasi Urban",
        category: "Infrastruktur Publik",
        source: "Kementerian Perhubungan",
        datasetOrigin: "Open Data Transportasi Nasional",
        keyPoints: [
            "Penambahan 12 rute koridor baru ramah lingkungan yang menghubungkan kawasan penyangga.",
            "Tarif terintegrasi berbasis aplikasi digital dengan subsidi pemerintah daerah.",
            "Target penurunan emisi karbon sektor transportasi perkotaan hingga 22%."
        ],
        defaultImage: "/images/infrastruktur.jpg"
    },
    {
        id: "dataset-digital-id",
        title: "Akselerasi Identitas Kependudukan Digital (IKD) Menuju Layanan Publik Satu Pintu",
        category: "Transformasi Digital",
        source: "Kementerian Komunikasi dan Digital & Ditjen Dukcapil",
        datasetOrigin: "Portal Digitalisasi Layanan Publik Nasional",
        keyPoints: [
            "Penyederhanaan verifikasi administrasi kependudukan tanpa memerlukan fotokopi berkas fisik.",
            "Penguatan enkripsi keamanan data pribadi warga sesuai UU Perlindungan Data Pribadi.",
            "Integrasi dengan sistem perbankan dan jaminan sosial kesehatan nasional."
        ],
        defaultImage: "/images/guru.jpg"
    },
    {
        id: "dataset-anggaran-desa",
        title: "Transparansi Dana Desa Digital: Publikasi Real-Time Pemanfaatan Anggaran Infrastruktur Desa",
        category: "Tata Kelola & Transparansi",
        source: "Kementerian Keuangan & Kementerian Desa",
        datasetOrigin: "Satu Data Anggaran & Perbendaharaan Negara",
        keyPoints: [
            "Dashboard terbuka pemantauan alokasi dan realisasi fisik pembangunan fasilitas desa.",
            "Partisipasi warga dalam audit sosial proyek infrastruktur pertanian dan sanitasi.",
            "Insentif khusus bagi desa dengan tata kelola akuntabel dan bebas temuan penyelewengan."
        ],
        defaultImage: "/images/rupiah.jpg"
    },
    {
        id: "dataset-plts-rakyat",
        title: "Subsidi Insentif Pemasangan Panel Surya Atap (PLTS) untuk Kawasan Rumah Tangga dan Pesantren",
        category: "Energi & Lingkungan",
        source: "Kementerian ESDM & PLN",
        datasetOrigin: "Pusat Data Energi Baru Terbarukan (EBT)",
        keyPoints: [
            "Dukungan insentif tarif bagi masyarakat yang memproduksi energi bersih mandiri.",
            "Program percontohan di 500 titik fasilitas sosial dan komunitas pedesaan.",
            "Langkah strategis akselerasi bauran energi hijau nasional menuju target nol emisi."
        ],
        defaultImage: "/images/plts.webp"
    },
    {
        id: "dataset-vokasi-ai",
        title: "Program Nasional Pelatihan AI dan Keterampilan Digital untuk 100.000 Lulusan SMK dan Vokasi",
        category: "Pendidikan & SDM",
        source: "Kementerian Pendidikan Dasar dan Menengah & Ketenagakerjaan",
        datasetOrigin: "Sistem Informasi Ketenagakerjaan Terbuka",
        keyPoints: [
            "Kurikulum adaptif yang dikembangkan bersama industri teknologi terkemuka.",
            "Pemberian sertifikasi kompetensi gratis bagi generasi muda di daerah 3T.",
            "Penyaluran kerja langsung ke ekosistem industri digital dan manufaktur modern."
        ],
        defaultImage: "/images/guru.jpg"
    },
    {
        id: "dataset-pupuk-subsidi",
        title: "Modernisasi Sistem Penyaluran Pupuk Bersubsidi Berbasis Kartu Tani Terpadu",
        category: "Ketahanan Pangan",
        source: "Kementerian Pertanian & Pupuk Indonesia",
        datasetOrigin: "Satu Data Pangan Nasional",
        keyPoints: [
            "Penyederhanaan birokrasi tebus pupuk subsidi hanya menggunakan NIK terverifikasi.",
            "Pencegahan kebocoran distribusi melalui sistem geolokasi kios resmi pengecer.",
            "Peningkatan kuota pupuk organik untuk menjaga kesuburan tanah pertanian jangka panjang."
        ],
        defaultImage: "/images/pupuk.jpg"
    }
];

export const POLICY_CATEGORIES = [
    "Semua",
    "Politik & Pemerintahan",
    "Hukum & Regulasi",
    "Ekonomi & Bisnis",
    "Ketahanan Pangan",
    "Infrastruktur & Transportasi",
    "Energi & Lingkungan",
    "Pendidikan & Riset",
    "Kesehatan & Kesejahteraan",
    "Internasional & Pertahanan",
] as const;

export function getCategoryCoverImage(category: string): string {
    const lower = (category || "").toLowerCase();
    if (lower.includes("pangan") || lower.includes("tani") || lower.includes("beras")) return "/images/petani.jpg";
    if (lower.includes("infrastruktur") || lower.includes("transportasi") || lower.includes("kereta") || lower.includes("tol")) return "/images/infrastruktur.jpg";
    if (lower.includes("pendidikan") || lower.includes("sdm") || lower.includes("riset") || lower.includes("guru") || lower.includes("sekolah")) return "/images/guru.jpg";
    if (lower.includes("ekonomi") || lower.includes("bisnis") || lower.includes("rupiah") || lower.includes("anggaran") || lower.includes("keuangan") || lower.includes("fiskal") || lower.includes("bank")) return "/images/rupiah.jpg";
    if (lower.includes("energi") || lower.includes("lingkungan") || lower.includes("surya") || lower.includes("iklim") || lower.includes("plts") || lower.includes("limbah")) return "/images/plts.webp";
    if (lower.includes("pupuk")) return "/images/pupuk.jpg";
    if (lower.includes("politik") || lower.includes("pemerintah") || lower.includes("hukum") || lower.includes("internasional") || lower.includes("pertahanan")) return "/images/jakarta.jpg";
    return "/images/infrastruktur.jpg";
}

export function classifyPolicyCategory(title: string, desc: string = "", preferred?: string): string {
    // Jika preferred sudah sah sebagai kategori resmi MelekIsu, prioritaskan
    const officialCategories = POLICY_CATEGORIES.filter(c => c !== "Semua");
    if (preferred && officialCategories.some(c => c.toLowerCase() === preferred.toLowerCase())) {
        const found = officialCategories.find(c => c.toLowerCase() === preferred.toLowerCase());
        if (found) return found;
    }

    const text = `${title} ${desc}`.toLowerCase();

    // 1. Internasional & Pertahanan (Geopolitik, Militer, Luar Negeri, Pertahanan)
    if (text.match(/jet tempur|f-16|pesawat tempur|rudal|militer|tni|pertahanan|perang|geopolitik|iran|as|amerika|israel|palestina|rusia|ukraina|nato|tiongkok|china|diplomasi|kedutaan|luar negeri|pbb|internasional|senjata|konflik global/)) {
        return "Internasional & Pertahanan";
    }

    // 2. Energi & Lingkungan
    if (text.match(/energi|lingkungan|iklim|limbah|sungai|abrasi|pesisir|sampah|polusi|hutan|emisi|plts|surya|batu bara|tambang|bencana|banjir|konservasi|hijau|esdm|pln|bbm|pertamina|air bersih|pembangkit/)) {
        return "Energi & Lingkungan";
    }

    // 3. Ketahanan Pangan & Pertanian
    if (text.match(/pangan|beras|tani|petani|pupuk|panen|sembako|bulog|pertanian|perikanan|nelayan|subsidi pangan|kebun|hortikultura|gizi|konsumsi pangan|harga beras/)) {
        return "Ketahanan Pangan";
    }

    // 4. Infrastruktur & Transportasi
    if (text.match(/jalan|tol|jembatan|stasiun|kereta|krl|mrt|lrt|kcic|whoosh|bus|transit|pelabuhan|bandara|konstruksi|proyek strategis|infrastruktur|transportasi|perumahan|tata kota|tata ruang|fasilitas umum/)) {
        return "Infrastruktur & Transportasi";
    }

    // 5. Hukum & Regulasi
    if (text.match(/hukum|kpk|korupsi|polisi|polri|jaksa|kejaksaan|pengadilan|mahkamah|hakim|vonis|tersangka|pasal|undang-undang|uu|regulasi|ajb|sertifikat|agraria|tanah|bpn|pidana|perdata|ham|gugatan|sidang/)) {
        return "Hukum & Regulasi";
    }

    // 6. Ekonomi & Bisnis
    if (text.match(/ekonomi|atm|bank|perbankan|bi|ojk|bunga|rupiah|dolar|investasi|ihsg|saham|pasar|fiskal|apbn|apbd|pajak|bea cukai|bumn|umkm|devisa|inflasi|saldo|keuangan|pinjol|tarif|finansial/)) {
        return "Ekonomi & Bisnis";
    }

    // 7. Pendidikan & Riset
    if (text.match(/pendidikan|sekolah|guru|siswa|kuliah|mahasiswa|kampus|vokasi|kurikulum|akademik|beasiswa|riset|brin|universitas|dosen|belajar|sdm|talenta/)) {
        return "Pendidikan & Riset";
    }

    // 8. Kesehatan & Kesejahteraan
    if (text.match(/kesehatan|rumah sakit|dokter|nakes|obat|bpjs|vaksin|penyakit|pandemi|stunting|gizi buruk|bansos|kemiskinan|buruh|ketenagakerjaan|upah|umr|ump|pekerja/)) {
        return "Kesehatan & Kesejahteraan";
    }

    // 9. Politik & Pemerintahan (Default kebijakan publik nasional)
    return "Politik & Pemerintahan";
}
