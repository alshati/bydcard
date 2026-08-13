import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Utensils, 
  Coffee, 
  Hotel, 
  Hospital, 
  ShoppingBag, 
  Store, 
  Car, 
  GraduationCap, 
  UserSquare2, 
  Landmark, 
  Wrench, 
  MapPin,
  Search,
  Video,
  Filter,
  Check,
  Tag,
  Clock,
  Sparkles,
  Percent,
  TrendingUp,
  Navigation,
  Compass,
  X
} from "lucide-react";
import { translations, provincesList } from "./translations";
import { Language } from "../types";

interface InfiniteCarouselProps {
  lang: Language;
}

// Curated default partner cards to guarantee data coverage
const DEFAULT_PARTNERS: any[] = [];

const SECTOR_ICONS: { [key: string]: any } = {
  Company: Building2,
  Restaurant: Utensils,
  Cafe: Coffee,
  Hotel: Hotel,
  Hospital: Hospital,
  Shops: ShoppingBag,
  Market: Store,
  Taxi: Car,
  University: GraduationCap,
  Freelancer: UserSquare2,
  Bank: Landmark,
  Service: Wrench
};

export default function InfiniteCarousel({ lang }: InfiniteCarouselProps) {
  const t = translations[lang];

  // Selected state for filters
  const [selectedProvince, setSelectedProvince] = useState<string>("Baghdad");
  const [selectedSector, setSelectedSector] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [livePartners, setLivePartners] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Promo Video Modal State
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  // Fetch live B2B partners registered on server and local storage
  const [localPartners, setLocalPartners] = useState<any[]>([]);

  const fetchLive = async () => {
    try {
      const response = await fetch("/api/partners");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setLivePartners(data);
        }
      }
    } catch (err) {
      console.error("Failed to load live partners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateLocal = () => {
      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]").map((x: any) => String(x).toLowerCase());

      const isDeleted = (p: any) => {
        const id = String(p.id || "").toLowerCase();
        const un = String(p.username || "").toLowerCase();
        const cn = String(p.companyName || "").toLowerCase();
        return deletedList.includes(id) || deletedList.includes(un) || deletedList.includes(cn);
      };

      const combined = [...p1];
      p2.forEach((p: any) => {
        if (!combined.some((existing: any) => existing.username === p.username || existing.companyName === p.companyName)) {
          combined.push(p);
        }
      });

      setLocalPartners(combined.filter((p: any) => !isDeleted(p)));
      fetchLive();
    };

    updateLocal();
    window.addEventListener("storage-sync-updated", updateLocal);
    window.addEventListener("storage", updateLocal);
    return () => {
      window.removeEventListener("storage-sync-updated", updateLocal);
      window.removeEventListener("storage", updateLocal);
    };
  }, []);

  // Filter out any deleted partners from livePartners as well
  const deletedList = (JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]")).map((x: any) => String(x).toLowerCase());
  const isDeletedPartner = (p: any) => {
    const id = String(p.id || "").toLowerCase();
    const un = String(p.username || "").toLowerCase();
    const cn = String(p.companyName || "").toLowerCase();
    return deletedList.includes(id) || deletedList.includes(un) || deletedList.includes(cn);
  };

  // Merge database partners with local storage
  const activeLivePartners = livePartners.filter((p) => !isDeletedPartner(p));
  const allAvailablePartners = [...activeLivePartners];
  localPartners.forEach((lp) => {
    if (!isDeletedPartner(lp) && !allAvailablePartners.some((p) => (p.username && lp.username && p.username.toLowerCase() === lp.username.toLowerCase()) || (p.companyName && lp.companyName && p.companyName.toLowerCase() === lp.companyName.toLowerCase()) || p.id === lp.id)) {
      allAvailablePartners.push(lp);
    }
  });

  // Remove duplicate partner entries if any
  const uniquePartnersMap = new Map();
  allAvailablePartners.forEach((p) => {
    const key = `${p.companyName}-${p.province}`;
    if (!uniquePartnersMap.has(key)) {
      uniquePartnersMap.set(key, p);
    }
  });
  const mergedPartners = Array.from(uniquePartnersMap.values());

  // Filter partners dynamically based on selected Province, Sector, and Search string
  const filteredPartners = mergedPartners.filter((partner) => {
    // 1. Province filter
    const matchesProvince = partner.province.toLowerCase() === selectedProvince.toLowerCase();

    // 2. Sector filter
    const matchesSector = selectedSector === "All" || partner.sector.toLowerCase() === selectedSector.toLowerCase();

    // 3. Search query filter
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = (partner.companyName || "").toLowerCase().includes(searchLower) || 
                      (partner.companyNameAr || "").toLowerCase().includes(searchLower);
    const descMatch = (partner.descriptionEn || "").toLowerCase().includes(searchLower) || 
                      (partner.descriptionAr || "").toLowerCase().includes(searchLower);
    const matchesSearch = searchQuery.trim() === "" || nameMatch || descMatch;

    return matchesProvince && matchesSector && matchesSearch;
  });

  // Get Arabic province name
  const currentProvObj = provincesList.find(p => p.en.toLowerCase() === selectedProvince.toLowerCase());
  const selectedProvinceAr = currentProvObj ? currentProvObj.ar : selectedProvince;

  // Navigation handler to smoothly scroll to map and focus selected partner pin
  const handleNavigateToPartnerMap = (partner: any) => {
    // 1. Dispatch custom event for GoogleMapsSection
    window.dispatchEvent(
      new CustomEvent("byd-navigate-to-partner-map", {
        detail: {
          id: partner.id,
          companyName: partner.companyName || partner.companyNameAr,
          companyNameAr: partner.companyNameAr || partner.companyName,
          province: partner.province || selectedProvince,
          provinceAr: partner.provinceAr || selectedProvinceAr,
          lat: partner.lat,
          lng: partner.lng,
          sector: partner.sector,
          discount: partner.discount || partner.discountAr || partner.discountEn
        }
      })
    );

    // 2. Smooth scroll to the interactive map section
    const mapElement = document.getElementById("interactive-map");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Render sector badge
  const renderSectorBadge = (sectorName: string, sectorAr: string) => {
    const IconComp = SECTOR_ICONS[sectorName] || Building2;
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold">
        <IconComp className="w-3.5 h-3.5 text-[#D30014]" />
        <span>{lang === "en" ? sectorName : sectorAr}</span>
      </span>
    );
  };

  return (
    <section id="offers" className="bg-[#070707] py-20 border-y border-gray-900 relative">
      
      {/* Absolute Decorative Visual Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D30014]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#D30014]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Title Block */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D30014]/10 border border-[#D30014]/20 rounded-full text-xs text-[#D30014] font-black uppercase tracking-wider mb-4">
            <Percent className="w-4 h-4" />
            <span>{lang === "en" ? "Exclusive B2C Benefits Explorer" : "مستكشف الفوائد والخصومات الحصرية للأفراد"}</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            {lang === "en" ? "DISCOUNTS BY PROVINCE" : "الفوائد والخصومات حسب المحافظة"}
          </h2>
          
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            {lang === "en"
              ? "Select your home province to instantly explore verified lifestyle benefits, premium restaurant discounts, healthcare reductions, and university sponsorships near you."
              : "اختر محافظتك فوراً لاستكشاف جميع الخصومات والامتيازات المتاحة لك من الفنادق والجامعات والمراكز الطبية والمطاعم المعتمدة."}
          </p>
        </div>

        {/* Dynamic Province Filter Toolbar */}
        <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 mb-10 shadow-2xl space-y-6">
          
          {/* Province Selector Header */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D30014]" />
              {lang === "en" ? "1. Select Iraqi Province:" : "1. اختر محافظة العراق السكنية:"}
            </h3>

            {/* Main Interactive Province Chips & Dropdown Combination */}
            <div className="flex flex-wrap gap-2 items-center">
              {provincesList.slice(0, 6).map((prov) => (
                <button
                  key={prov.en}
                  onClick={() => {
                    setSelectedProvince(prov.en);
                    setSearchQuery("");
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border flex items-center gap-2 cursor-pointer ${
                    selectedProvince.toLowerCase() === prov.en.toLowerCase()
                      ? "bg-[#D30014] border-[#D30014] text-white shadow-lg shadow-[#D30014]/15"
                      : "bg-[#0a0a0a] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {lang === "en" ? prov.en : prov.ar}
                  {selectedProvince.toLowerCase() === prov.en.toLowerCase() && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
              ))}

              {/* All Provinces Select Dropdown for the remaining 13 provinces */}
              <div className="relative">
                <select
                  value={provincesList.some(p => p.en === selectedProvince) && provincesList.findIndex(p => p.en === selectedProvince) >= 6 ? selectedProvince : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedProvince(e.target.value);
                      setSearchQuery("");
                    }
                  }}
                  className={`px-4 py-2.5 bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-black outline-none transition-all cursor-pointer ${
                    provincesList.findIndex(p => p.en === selectedProvince) >= 6
                      ? "text-[#D30014] border-[#D30014]/50 bg-[#D30014]/5"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <option value="" disabled>
                    {lang === "en" ? "More Provinces..." : "باقي المحافظات الـ 13 الأخرى..."}
                  </option>
                  {provincesList.slice(6).map((prov) => (
                    <option key={prov.en} value={prov.en} className="bg-[#121212] text-white">
                      {lang === "en" ? prov.en : prov.ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Secondary Sector & Search Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-gray-900">
            
            {/* Sector Type filter */}
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                {lang === "en" ? "Filter by Sector Type:" : "تصفية حسب نوع القطاع:"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Filter className="w-4 h-4" />
                </div>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs"
                >
                  <option value="All">{lang === "en" ? "All Diverse Sectors" : "جميع القطاعات المتنوعة"}</option>
                  <option value="Restaurant">{lang === "en" ? "Restaurants" : "المطاعم والمأكولات"}</option>
                  <option value="Cafe">{lang === "en" ? "Cafes & Lounges" : "المقاهي والكافيهات"}</option>
                  <option value="Hotel">{lang === "en" ? "Hotels & Resorts" : "الفنادق والمنتجعات"}</option>
                  <option value="Hospital">{lang === "en" ? "Hospitals & Medical" : "المستشفيات والعيادات"}</option>
                  <option value="Shops">{lang === "en" ? "Retail & Stores" : "متاجر التجزئة والتسوق"}</option>
                  <option value="Market">{lang === "en" ? "Supermarkets" : "الأسواق والمواد الغذائية"}</option>
                  <option value="University">{lang === "en" ? "Colleges & Education" : "الجامعات والتعليم"}</option>
                  <option value="Service">{lang === "en" ? "Auto & Maintenance" : "خدمات الصيانة والسيارات"}</option>
                  <option value="Freelancer">{lang === "en" ? "Digital Services" : "الخدمات الحرة والرقمية"}</option>
                </select>
              </div>
            </div>

            {/* Freeform Search Bar */}
            <div className="md:col-span-8">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                {lang === "en" ? "Search specific brands or items:" : "ابحث عن ماركة تجارية أو كلمة دلالية:"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "en" ? "e.g. Al-Taj, tuition, hospital, hotel..." : "مثال: التاج، بابل، مستشفى، كورس..."}
                  className="w-full pl-10 pr-3.5 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs"
                />
              </div>
            </div>

          </div>

        </div>

        {/* Dynamic filtered partners render grid */}
        {filteredPartners.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map((partner, index) => {
              // Ensure proper structure of discount rate
              let discountStr = "";
              if (lang === "en") {
                const cleanEn = partner.discountEn || partner.discount || "10%";
                discountStr = cleanEn.toLowerCase().includes("off") || cleanEn.toLowerCase().includes("discount")
                  ? cleanEn
                  : `Special Discount: ${cleanEn}`;
              } else {
                const cleanAr = partner.discountAr || partner.discount || "10%";
                discountStr = cleanAr.includes("خصم")
                  ? cleanAr
                  : `خصم مميز بـ ${cleanAr}`;
              }

              return (
                <div
                  key={index}
                  id={`partner-card-${partner.id || index}`}
                  onClick={() => handleNavigateToPartnerMap(partner)}
                  className="bg-[#121212] border border-gray-800 hover:border-[#D30014] rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#D30014]/10 group relative overflow-hidden cursor-pointer"
                  title={lang === "en" ? "Click to view branch location on Google Map" : "انقر لعرض موقع الشركة والفرع على الخريطة"}
                >
                  {/* Glowing background hint */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#D30014]/[0.03] group-hover:bg-[#D30014]/[0.08] rounded-bl-full transition-all pointer-events-none"></div>

                  <div>
                    {/* Top line metadata */}
                    <div className="flex justify-between items-start gap-2 mb-4">
                      {renderSectorBadge(partner.sector, partner.sectorAr || partner.sector)}
                      
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-black">
                        <Tag className="w-3 h-3" />
                        {discountStr}
                      </span>
                    </div>

                    {/* Partner Details Block */}
                    <div className="flex gap-4 items-center mb-4">
                      {partner.logoUrl ? (
                        <img
                          src={partner.logoUrl}
                          alt="Partner Logo"
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-2xl object-cover border border-gray-800 group-hover:border-[#D30014]/50 transition-colors flex-shrink-0"
                          onError={(e) => {
                            // Fallback to stylized text placeholder on error
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}

                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-[#D30014] transition-colors leading-tight">
                          {lang === "en" ? partner.companyName : (partner.companyNameAr || partner.companyName)}
                        </h4>
                        
                        <p className="text-[11px] text-gray-400 group-hover:text-gray-300 flex items-center gap-1 mt-1 font-bold transition-colors">
                          <MapPin className="w-3.5 h-3.5 text-[#D30014]" />
                          <span>{lang === "en" ? selectedProvince : selectedProvinceAr}</span>
                        </p>
                      </div>
                    </div>

                    {/* Bilingual Description text */}
                    <p className="text-gray-400 text-xs leading-relaxed mb-4">
                      {lang === "en"
                        ? (partner.descriptionEn || `Enjoy premier direct benefits and high-end savings across all services in ${selectedProvince}.`)
                        : (partner.descriptionAr || `تمتع بمميزات وخصومات حقيقية وفورية للأفراد حاملي الكارد طوال مدة اشتراكهم في ${selectedProvinceAr}.`)}
                    </p>
                  </div>

                  {/* Bottom section: map navigation and video activation state */}
                  <div className="pt-4 border-t border-gray-900/80 flex flex-wrap justify-between items-center gap-2 text-xs">
                    {/* Direct Go to Map Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToPartnerMap(partner);
                      }}
                      className="px-3 py-1.5 bg-[#D30014]/15 hover:bg-[#D30014] text-[#D30014] hover:text-white border border-[#D30014]/30 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{lang === "en" ? "View on Map" : "عرض على الخريطة"}</span>
                    </button>

                    {/* Interactive promo video trigger if exists or simulate one */}
                    {partner.promoVideoUrl ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVideo(partner.promoVideoUrl);
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Video className="w-3.5 h-3.5 text-red-400" />
                        <span>{lang === "en" ? "Watch Video" : "عرض المقطع"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVideo("https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-41712-large.mp4");
                        }}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-medium text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Video className="w-3 h-3 text-gray-500" />
                        <span>{lang === "en" ? "Promo" : "فيديو"}</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Empty results layout state */
          <div className="text-center py-16 bg-[#121212] border border-gray-800 rounded-3xl p-8 max-w-lg mx-auto">
            <Filter className="w-12 h-12 text-[#D30014]/40 mx-auto mb-4" />
            <h4 className="text-lg font-black text-white">
              {lang === "en" ? "No Active Partners Registered" : "لا يوجد شركاء نشطين حالياً"}
            </h4>
            <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
              {lang === "en"
                ? `Currently, there are no specific B2B contracts matched in ${selectedProvince} for this sector category. Please check back soon or try another province.`
                : `عفواً، لا يوجد شركاء مسجلين حالياً في محافظة ${selectedProvinceAr} ضمن هذا التصنيف المحدد. يرجى مراجعة الخدمة لاحقاً أو تجربة محافظة أخرى.`}
            </p>
            <button
              onClick={() => {
                setSelectedSector("All");
                setSearchQuery("");
              }}
              className="mt-5 px-5 py-2 bg-gray-900 border border-gray-800 hover:bg-gray-950 text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              {lang === "en" ? "Reset Category Filters" : "إعادة تعيين الفلاتر"}
            </button>
          </div>
        )}

      </div>

      {/* Video Lightbox Modal Dialog */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="video-lightbox">
          <div className="bg-[#121212] border border-gray-800 rounded-3xl w-full max-w-3xl overflow-hidden relative shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-900 flex justify-between items-center bg-black/50">
              <span className="text-xs font-black text-[#D30014] tracking-widest flex items-center gap-1.5 uppercase">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                {lang === "en" ? "BYD Verified Promo Broadcasting" : "بث العرض الترويجي المعتمد لـ BYD"}
              </span>
              <button
                onClick={() => setActiveVideo(null)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video w-full bg-black relative">
              <video
                src={activeVideo}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 text-center bg-black/30">
              <p className="text-[11px] text-gray-500 font-mono">
                {lang === "en" 
                  ? "Streaming securely from BYD verified Content Delivery Network (CDN)" 
                  : "يتم البث بأمان من خوادم شبكة تسليم المحتوى المعتمدة لشركة بي واي دي"}
              </p>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
