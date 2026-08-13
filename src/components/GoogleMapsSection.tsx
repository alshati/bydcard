import React, { useState, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef
} from "@vis.gl/react-google-maps";
import {
  MapPin,
  Building2,
  Navigation,
  Search,
  Filter,
  Phone,
  Tag,
  ExternalLink,
  Key,
  Info,
  Compass,
  CreditCard,
  Building,
  CheckCircle2
} from "lucide-react";
import { Language } from "../types";
import { provincesList, sectorsList } from "./translations";

interface GoogleMapsSectionProps {
  lang: Language;
}

interface MapPartnerLocation {
  id: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  sectorAr: string;
  province: string;
  lat: number;
  lng: number;
  addressEn: string;
  addressAr: string;
  discount: string;
  phone?: string;
  logoUrl?: string;
  status: string;
}

// Key Iraqi province center coordinates
const PROVINCE_COORDINATES: { [key: string]: { lat: number; lng: number; zoom: number } } = {
  Baghdad: { lat: 33.3152, lng: 44.3661, zoom: 12 },
  Erbil: { lat: 36.1901, lng: 44.0091, zoom: 12 },
  Basra: { lat: 30.5081, lng: 47.7835, zoom: 12 },
  Nineveh: { lat: 36.3400, lng: 43.1300, zoom: 12 },
  Sulaymaniyah: { lat: 35.5562, lng: 45.4373, zoom: 12 },
  Duhok: { lat: 36.8679, lng: 42.9886, zoom: 12 },
  Kirkuk: { lat: 35.4681, lng: 44.3922, zoom: 12 },
  "Salah al-Din": { lat: 34.6000, lng: 43.6800, zoom: 11 },
  Diyala: { lat: 33.7431, lng: 44.6461, zoom: 11 },
  Anbar: { lat: 33.4217, lng: 43.3039, zoom: 11 },
  Babylon: { lat: 32.4637, lng: 44.4206, zoom: 12 },
  Karbala: { lat: 32.6160, lng: 44.0249, zoom: 13 },
  Najaf: { lat: 32.0000, lng: 44.3333, zoom: 13 },
  Qadisiyah: { lat: 31.9856, lng: 44.9250, zoom: 12 },
  Muthanna: { lat: 31.3100, lng: 45.2800, zoom: 11 },
  "Thi Qar": { lat: 31.0500, lng: 46.2500, zoom: 12 },
  Maysan: { lat: 31.8300, lng: 47.1400, zoom: 12 },
  Wasit: { lat: 32.5100, lng: 45.8200, zoom: 12 },
  Halabja: { lat: 35.1778, lng: 45.9861, zoom: 13 }
};

// Sub-component for individual partner marker with InfoWindow popup
function MarkerWithInfoWindow({
  location,
  lang,
  isSelected,
  onSelect
}: {
  key?: string;
  location: MapPartnerLocation;
  lang: Language;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: location.lat, lng: location.lng }}
        onClick={() => onSelect(isSelected ? null : location.id)}
        title={lang === "en" ? location.nameEn : location.nameAr}
      >
        <div className={`cursor-pointer transition-transform duration-200 ${isSelected ? "scale-125 z-50" : "hover:scale-110"}`}>
          <div className="relative flex flex-col items-center">
            {/* Card Badge Pin Header */}
            <div className={`px-2 py-1 rounded-full border shadow-xl flex items-center gap-1 font-black text-[10px] whitespace-nowrap ${
              isSelected ? "bg-[#D30014] text-white border-white" : "bg-black/90 text-green-400 border-green-500/50"
            }`}>
              <CreditCard className="w-3 h-3 text-white" />
              <span>{location.discount}</span>
            </div>
            {/* Standard Pin */}
            <Pin
              background={isSelected ? "#D30014" : "#10B981"}
              borderColor="#000000"
              glyphColor="#FFFFFF"
              scale={isSelected ? 1.1 : 0.9}
            />
          </div>
        </div>
      </AdvancedMarker>

      {isSelected && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => onSelect(null)}
          headerContent={
            <div className="font-black text-xs text-[#D30014] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>BYD CARD VERIFIED PARTNER</span>
            </div>
          }
        >
          <div className="p-1 max-w-xs text-black font-sans dir-auto">
            <div className="flex items-center gap-2 mb-2">
              {location.logoUrl ? (
                <img
                  src={location.logoUrl}
                  alt={location.nameEn}
                  className="w-10 h-10 rounded-lg object-cover border border-gray-300"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : null}
              <div>
                <h4 className="font-black text-sm text-gray-900 leading-tight">
                  {lang === "en" ? location.nameEn : location.nameAr}
                </h4>
                <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-bold text-[10px] mt-0.5">
                  {lang === "en" ? location.sector : location.sectorAr}
                </span>
              </div>
            </div>
            
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="inline-block px-2.5 py-1 bg-green-600 text-white rounded-lg font-black text-xs shadow-sm">
                🏷️ {lang === "en" ? `${location.discount} Discount` : `خصم ${location.discount}`}
              </span>
              <span className="inline-block px-2 py-0.5 bg-red-100 text-[#D30014] rounded font-bold text-[10px]">
                {lang === "en" ? "BYD Card Accepted" : "يدعم خصم البطاقة"}
              </span>
              <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[10px] ${
                location.status?.toLowerCase() === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}>
                {location.status?.toLowerCase() === "active" 
                  ? (lang === "en" ? "Active Partner" : "شريك نشط") 
                  : (lang === "en" ? location.status : "قيد التفعيل")}
              </span>
            </div>

            <p className="text-xs text-gray-600 mt-2 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#D30014] flex-shrink-0 mt-0.5" />
              <span>{lang === "en" ? location.addressEn : location.addressAr}</span>
            </p>

            {location.phone && (
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>{location.phone}</span>
              </p>
            )}

            <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#D30014] hover:bg-red-700 text-white rounded text-xs font-bold transition-all text-decoration-none"
              >
                <Navigation className="w-3 h-3" />
                <span>{lang === "en" ? "Get Directions" : "اتجاهات الخريطة"}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function GoogleMapsSection({ lang }: GoogleMapsSectionProps) {
  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    "";

  const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

  // State
  const [selectedProvince, setSelectedProvince] = useState<string>("Baghdad");
  const [selectedSector, setSelectedSector] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("Active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [customMapCenter, setCustomMapCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  
  // Real registered partner locations state
  const [partnerLocations, setPartnerLocations] = useState<MapPartnerLocation[]>([]);

  // Function to load registered partners dynamically from API and LocalStorage (BYD_COMPANIES)
  const loadPartners = async () => {
    try {
      let serverPartners: any[] = [];
      try {
        const res = await fetch("/api/partners");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) serverPartners = data;
        }
      } catch (err) {
        console.error("Error fetching live partners for Google Maps:", err);
      }

      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const deletedList = (JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]")).map((x: any) => String(x).toLowerCase());

      const isDeleted = (p: any) => {
        const id = String(p.id || "").toLowerCase();
        const un = String(p.username || "").toLowerCase();
        const cn = String(p.companyName || "").toLowerCase();
        return deletedList.includes(id) || deletedList.includes(un) || deletedList.includes(cn);
      };

      const combinedRaw: any[] = [];

      const addOrMerge = (p: any) => {
        if (!p || isDeleted(p)) return;
        const pId = String(p.id || "").toLowerCase();
        const pUn = String(p.username || "").toLowerCase();
        const pCn = String(p.companyName || "").toLowerCase();

        const existingIdx = combinedRaw.findIndex((existing: any) => {
          const eId = String(existing.id || "").toLowerCase();
          const eUn = String(existing.username || "").toLowerCase();
          const eCn = String(existing.companyName || "").toLowerCase();
          return (pId && eId && pId === eId) ||
                 (pUn && eUn && pUn === eUn) ||
                 (pCn && eCn && pCn === eCn);
        });

        if (existingIdx !== -1) {
          combinedRaw[existingIdx] = {
            ...combinedRaw[existingIdx],
            ...p,
            lat: p.lat !== undefined && p.lat !== 0 ? p.lat : combinedRaw[existingIdx].lat,
            lng: p.lng !== undefined && p.lng !== 0 ? p.lng : combinedRaw[existingIdx].lng,
            discount: p.discount || combinedRaw[existingIdx].discount,
            status: p.status || combinedRaw[existingIdx].status || "Active",
          };
        } else {
          combinedRaw.push(p);
        }
      };

      serverPartners.forEach(addOrMerge);
      p1.forEach(addOrMerge);
      p2.forEach(addOrMerge);

      // Map registered companies to MapPartnerLocation format
      const locations: MapPartnerLocation[] = combinedRaw.map((p: any, idx: number) => {
        const prov = p.province || "Baghdad";
        const baseCoord = PROVINCE_COORDINATES[prov] || PROVINCE_COORDINATES["Baghdad"];

        let lat = Number(p.lat);
        let lng = Number(p.lng);

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          const jitterLat = (Math.sin(idx + 1) * 0.015);
          const jitterLng = (Math.cos(idx + 1) * 0.015);
          lat = Number((baseCoord.lat + jitterLat).toFixed(6));
          lng = Number((baseCoord.lng + jitterLng).toFixed(6));
        }

        const discountVal = p.discountAr || p.discountEn || p.discount || "10%";
        const cleanDiscount = discountVal.includes("%") ? discountVal : `${discountVal}%`;

        return {
          id: p.id || `p-${idx}`,
          nameEn: p.companyName || "Partner Branch",
          nameAr: p.companyNameAr || p.companyName || "فرع شركة شريكة",
          sector: p.sector || "Company",
          sectorAr: p.sectorAr || p.sector || "شركة",
          province: prov,
          lat,
          lng,
          addressEn: p.addressEn || p.address || `${prov}, Iraq`,
          addressAr: p.addressAr || p.address || `${p.provinceAr || prov}، العراق`,
          discount: cleanDiscount,
          phone: p.phone,
          logoUrl: p.logoUrl,
          status: p.status || "Active"
        };
      });

      setPartnerLocations(locations);
      if (locations.length > 0 && !selectedLocationId) {
        setSelectedLocationId(locations[0].id);
      }
    } catch (e) {
      console.error("Error building partner map locations:", e);
    }
  };

  useEffect(() => {
    loadPartners();
    window.addEventListener("storage-sync-updated", loadPartners);
    window.addEventListener("storage", loadPartners);
    return () => {
      window.removeEventListener("storage-sync-updated", loadPartners);
      window.removeEventListener("storage", loadPartners);
    };
  }, []);

  // Listen for direct navigation events from company cards in the public page
  useEffect(() => {
    const handlePartnerMapNav = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      const pProv = detail.province || "Baghdad";
      setSelectedProvince(pProv);
      setSelectedSector("All");
      setSelectedStatus("All");
      setSearchQuery("");

      const pId = detail.id ? String(detail.id).toLowerCase() : "";
      const pCn = detail.companyName ? String(detail.companyName).toLowerCase() : "";
      const pCnAr = detail.companyNameAr ? String(detail.companyNameAr).toLowerCase() : "";

      const found = partnerLocations.find((loc) => {
        const lId = String(loc.id || "").toLowerCase();
        const lEn = String(loc.nameEn || "").toLowerCase();
        const lAr = String(loc.nameAr || "").toLowerCase();
        return (pId && lId === pId) || (pCn && (lEn === pCn || lAr === pCn)) || (pCnAr && (lEn === pCnAr || lAr === pCnAr));
      });

      if (found) {
        setSelectedLocationId(found.id);
        setCustomMapCenter({ lat: found.lat, lng: found.lng, zoom: 15 });
      } else if (detail.lat && detail.lng) {
        setCustomMapCenter({ lat: Number(detail.lat), lng: Number(detail.lng), zoom: 15 });
        if (detail.id) setSelectedLocationId(detail.id);
      } else {
        const provCoord = PROVINCE_COORDINATES[pProv] || PROVINCE_COORDINATES["Baghdad"];
        setCustomMapCenter({ lat: provCoord.lat, lng: provCoord.lng, zoom: provCoord.zoom || 13 });
      }
    };

    window.addEventListener("byd-navigate-to-partner-map", handlePartnerMapNav);
    return () => window.removeEventListener("byd-navigate-to-partner-map", handlePartnerMapNav);
  }, [partnerLocations]);

  // Dynamic Center & Zoom
  const currentCoords = customMapCenter || PROVINCE_COORDINATES[selectedProvince] || { lat: 33.3152, lng: 44.3661, zoom: 12 };

  // Dynamic filter based on Province, Sector, Status, and Search Query
  const filteredLocations = partnerLocations.filter((loc) => {
    const matchesProv = selectedProvince === "All" || loc.province.toLowerCase() === selectedProvince.toLowerCase();
    const matchesSec = selectedSector === "All" || loc.sector.toLowerCase() === selectedSector.toLowerCase();
    const matchesStatus =
      selectedStatus === "All" ||
      (loc.status ? loc.status.toLowerCase() === selectedStatus.toLowerCase() : selectedStatus.toLowerCase() === "active");

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      loc.nameEn.toLowerCase().includes(searchLower) ||
      loc.nameAr.toLowerCase().includes(searchLower) ||
      loc.addressEn.toLowerCase().includes(searchLower) ||
      loc.addressAr.toLowerCase().includes(searchLower);

    return matchesProv && matchesSec && matchesStatus && matchesSearch;
  });

  return (
    <section id="interactive-map" className="bg-[#050505] py-16 border-t border-gray-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#D30014]/10 border border-[#D30014]/25 rounded-full text-xs text-[#D30014] font-black uppercase tracking-wider mb-3">
            <Compass className="w-4 h-4" />
            <span>{lang === "en" ? "Interactive Google Maps Partner Radar" : "خريطة فروع الشركاء المعتمدين والتخفيضات"}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {lang === "en" ? "FIND REGISTERED BYD PARTNER BRANCHES" : "تتبع فروع الشركاء التي تدعم بطاقة BYD على الخريطة"}
          </h2>

          <p className="text-gray-400 text-xs sm:text-sm mt-2 leading-relaxed">
            {lang === "en"
              ? "View live location pins of registered corporate partners offering instant BYD Card discounts across all Iraqi provinces."
              : "تستعرض هذه الخريطة المواقع الجغرافية الحقيقية للشركات والمحلات المسجلة في النظام والتي توفر خصومات لحاملي بطاقة BYD."}
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#121212] border border-gray-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
            
            {/* Province Selector */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                {lang === "en" ? "Select Province:" : "المحافظة السكنية:"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#D30014]">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    setSelectedProvince(newProv);
                    const provCoord = PROVINCE_COORDINATES[newProv] || PROVINCE_COORDINATES["Baghdad"];
                    const firstMatch = partnerLocations.find(
                      (l) => l.province.toLowerCase() === newProv.toLowerCase()
                    );
                    if (firstMatch) {
                      setSelectedLocationId(firstMatch.id);
                      setCustomMapCenter({ lat: firstMatch.lat, lng: firstMatch.lng, zoom: 15 });
                    } else {
                      setCustomMapCenter({ lat: provCoord.lat, lng: provCoord.lng, zoom: provCoord.zoom || 13 });
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-black border border-gray-800 rounded-xl text-white text-xs font-bold outline-none focus:border-[#D30014]"
                >
                  {provincesList.map((p) => (
                    <option key={p.en} value={p.en}>
                      {lang === "en" ? p.en : p.ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sector Filter */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                {lang === "en" ? "Filter Sector:" : "تصنيف القطاع:"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Filter className="w-4 h-4" />
                </div>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-black border border-gray-800 rounded-xl text-white text-xs font-bold outline-none focus:border-[#D30014]"
                >
                  <option value="All">{lang === "en" ? "All Sectors" : "جميع القطاعات"}</option>
                  {sectorsList.map((s) => (
                    <option key={s.en} value={s.en}>
                      {lang === "en" ? s.en : s.ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Partner Status Filter */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                {lang === "en" ? "Partner Status:" : "حالة الشريك:"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-black border border-gray-800 rounded-xl text-white text-xs font-bold outline-none focus:border-[#D30014]"
                >
                  <option value="Active">{lang === "en" ? "Active Partners Only" : "الشركاء النشطون فقط"}</option>
                  <option value="All">{lang === "en" ? "All Statuses" : "جميع الحالات"}</option>
                  <option value="Pending">{lang === "en" ? "Pending Approval" : "قيد المراجعة"}</option>
                  <option value="Inactive">{lang === "en" ? "Inactive" : "غير نشط"}</option>
                </select>
              </div>
            </div>

            {/* Keyword Search */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                {lang === "en" ? "Search Branch Name:" : "البحث عن فرع أو شركة:"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "en" ? "e.g. Al-Mansour, Baghdad..." : "مثال: الكرادة، أربيل، المنصور..."}
                  className="w-full pl-9 pr-3 py-2.5 bg-black border border-gray-800 rounded-xl text-white text-xs font-bold outline-none focus:border-[#D30014]"
                />
              </div>
            </div>

          </div>
        </div>

        {/* MAP & LIST SPLIT VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Google Maps Render Container */}
          <div className="lg:col-span-8 bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl min-h-[450px] h-[550px] relative">
            {hasValidKey ? (
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  defaultCenter={{ lat: currentCoords.lat, lng: currentCoords.lng }}
                  center={{ lat: currentCoords.lat, lng: currentCoords.lng }}
                  defaultZoom={currentCoords.zoom}
                  zoom={currentCoords.zoom}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                  style={{ width: "100%", height: "100%" }}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                >
                  {filteredLocations.map((loc) => (
                    <MarkerWithInfoWindow
                      key={loc.id}
                      location={loc}
                      lang={lang}
                      isSelected={selectedLocationId === loc.id}
                      onSelect={(id) => setSelectedLocationId(id)}
                    />
                  ))}
                </Map>
              </APIProvider>
            ) : (
              /* Splash screen when GOOGLE_MAPS_PLATFORM_KEY is missing */
              <div className="w-full h-full p-8 flex flex-col justify-center items-center text-center bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-[#121212]">
                <div className="w-16 h-16 rounded-2xl bg-[#D30014]/10 border border-[#D30014]/30 text-[#D30014] flex items-center justify-center mb-4">
                  <Key className="w-8 h-8 animate-pulse" />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-wide">
                  {lang === "en" ? "Google Maps API Key Required" : "مطلوب مفتاح Google Maps API Key"}
                </h3>

                <p className="text-xs text-gray-400 max-w-md mt-2 leading-relaxed">
                  {lang === "en"
                    ? "To view live partner store pins and directions on Google Maps, configure your GOOGLE_MAPS_PLATFORM_KEY secret."
                    : "لعرض مواقع المحلات والشركات المباشرة والاتجاهات على الخريطة، يرجى إضافة مفتاح GOOGLE_MAPS_PLATFORM_KEY في الإعدادات."}
                </p>

                <div className="mt-6 bg-black/80 border border-gray-800 rounded-2xl p-5 text-left max-w-lg w-full text-xs space-y-2">
                  <div className="font-extrabold text-[#D30014] uppercase text-[11px] mb-2 flex items-center gap-1.5">
                    <Info className="w-4 h-4" />
                    <span>How to configure API key:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-gray-300 leading-relaxed font-mono text-[11px]">
                    <li>
                      Get an API key from{" "}
                      <a
                        href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 underline font-bold"
                      >
                        Google Cloud Console
                      </a>
                    </li>
                    <li>
                      Open <strong>Settings</strong> (⚙️ gear icon, top-right corner)
                    </li>
                    <li>
                      Select <strong>Secrets</strong> → Type <code>GOOGLE_MAPS_PLATFORM_KEY</code>
                    </li>
                    <li>Paste your key and press <strong>Enter</strong> to automatically rebuild!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Branch List Sidebar */}
          <div className="lg:col-span-4 bg-[#121212] border border-gray-800 rounded-3xl p-5 shadow-2xl h-[550px] flex flex-col">
            <div className="pb-3 border-b border-gray-900 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#D30014]" />
                <span>{lang === "en" ? "Registered Partners" : "فروع الشركاء المسجلين"}</span>
              </h3>
              <span className="text-[10px] bg-[#D30014]/15 text-[#D30014] font-black px-2 py-0.5 rounded">
                {filteredLocations.length} {lang === "en" ? "Locations" : "موقع"}
              </span>
            </div>

            <div className="flex-grow overflow-y-auto mt-3 pr-1 space-y-3 custom-scrollbar">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  return (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setSelectedLocationId(loc.id);
                        setSelectedProvince(loc.province);
                        setCustomMapCenter({ lat: loc.lat, lng: loc.lng, zoom: 15 });
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#D30014]/10 border-[#D30014] text-white shadow-lg shadow-[#D30014]/10"
                          : "bg-black/50 border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-black/80"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          {loc.logoUrl && (
                            <img
                              src={loc.logoUrl}
                              alt={loc.nameEn}
                              className="w-7 h-7 rounded object-cover border border-gray-700 flex-shrink-0"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )}
                          <h4 className="font-bold text-xs text-white leading-snug">
                            {lang === "en" ? loc.nameEn : loc.nameAr}
                          </h4>
                        </div>
                        <span className="inline-block px-2 py-0.5 bg-green-500/15 text-green-400 font-black text-[9px] rounded flex-shrink-0">
                          {loc.discount}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#D30014] flex-shrink-0" />
                        <span className="truncate">{lang === "en" ? loc.addressEn : loc.addressAr}</span>
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-gray-900 flex justify-between items-center text-[10px]">
                        <span className="text-gray-500 font-bold">{lang === "en" ? loc.sector : loc.sectorAr}</span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#D30014] font-black flex items-center gap-1 hover:underline"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{lang === "en" ? "Directions" : "الاتجاهات"}</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 px-4 text-gray-500 text-xs">
                  <Building className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="font-bold text-gray-400">
                    {lang === "en" ? "No registered partner branches found." : "لا توجد شركات مسجلة حالياً في هذه المحافظة."}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {lang === "en" ? "When companies register and specify location, pins appear here." : "عندما تقوم الشركات بالتسجيل وإدخال مواقعها، ستظهر مواقعها تلقائياً على الخريطة."}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
