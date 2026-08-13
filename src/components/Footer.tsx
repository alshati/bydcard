import React from "react";
import { Award, Mail, Phone, MapPin, ExternalLink, Calendar } from "lucide-react";
import { translations } from "./translations";
import { Language, Branding } from "../types";
import tajLogo from "../assets/images/taj_marketing_logo_1783092987071.jpg";
import geniusWingsLogo from "../assets/images/geniuswings_logo_1783092968725.jpg";
import systemLogo from "../assets/images/byd_card_logo_exact_1784543953366.jpg";

interface FooterProps {
  lang: Language;
  branding: Branding | null;
}

export default function Footer({ lang, branding }: FooterProps) {
  const t = translations[lang];

  // Load state dynamically from branding or BYD_BRAND_PERSISTENT_STATE or byd-custom-branding to make sure it's never hardcoded
  const getBrandingState = () => {
    if (branding && branding.company1Name) {
      return branding;
    }
    const persistentSaved = localStorage.getItem("BYD_BRAND_PERSISTENT_STATE");
    if (persistentSaved) {
      try {
        const brandData = JSON.parse(persistentSaved);
        return {
          company1Name: brandData.entity1NameEn || "",
          company1NameAr: brandData.entity1NameAr || "",
          company1Desc: brandData.entity1DescEn || "",
          company1DescAr: brandData.entity1DescAr || "",
          company1Logo: brandData.entity1Logo || "",
          company2Name: brandData.entity2NameEn || "",
          company2NameAr: brandData.entity2NameAr || "",
          company2Desc: brandData.entity2DescEn || "",
          company2DescAr: brandData.entity2DescAr || "",
          company2Logo: brandData.entity2Logo || ""
        };
      } catch (e) {
        console.error("Error parsing BYD_BRAND_PERSISTENT_STATE in Footer:", e);
      }
    }
    const saved = localStorage.getItem("byd-custom-branding");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing byd-custom-branding in Footer:", e);
      }
    }
    return null;
  };

  const activeBranding = getBrandingState();

  React.useEffect(() => {
    const updateFooterBranding = () => {
      const storedBrand = localStorage.getItem('BYD_BRAND_PERSISTENT_STATE');
      if (storedBrand) {
        try {
          const brand = JSON.parse(storedBrand);
          // Dynamically overwrite HTML content with the stored Base64 images and texts
          if (brand.entity1NameAr) {
            const el = document.getElementById('footer-entity1-text');
            if (el) el.innerText = brand.entity1NameAr;
          }
          if (brand.entity1Logo) {
            const el = document.getElementById('footer-entity1-img') as HTMLImageElement;
            if (el) {
              if (brand.entity1Logo.includes("/src/assets/")) {
                el.src = tajLogo;
              } else {
                el.src = brand.entity1Logo;
              }
            }
          }
          if (brand.entity2NameAr) {
            const el = document.getElementById('footer-entity2-text');
            if (el) el.innerText = brand.entity2NameAr;
          }
          if (brand.entity2Logo) {
            const el = document.getElementById('footer-entity2-img') as HTMLImageElement;
            if (el) {
              if (brand.entity2Logo.includes("/src/assets/")) {
                el.src = geniusWingsLogo;
              } else {
                el.src = brand.entity2Logo;
              }
            }
          }
        } catch (e) {
          console.error("Error applying BYD_BRAND_PERSISTENT_STATE in Footer:", e);
        }
      }
    };

    updateFooterBranding();

    window.addEventListener('DOMContentLoaded', updateFooterBranding);
    
    // Custom storage listener to update real-time when admin changes the settings
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'BYD_BRAND_PERSISTENT_STATE') {
        updateFooterBranding();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('DOMContentLoaded', updateFooterBranding);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <footer className="bg-[#050505] text-gray-400 py-16 border-t border-gray-900 relative overflow-hidden">
      
      {/* Decorative crimson blur element */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-80 h-40 bg-[#D30014]/5 rounded-full blur-3xl"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        
        {/* Core Triad Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          
          {/* Column 1: Brand & Bio */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center bg-black shadow-md shadow-[#D30014]/25">
                <img 
                  src={systemLogo} 
                  alt="BYD Card Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-white font-black text-lg tracking-wider block">BYD Card</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block -mt-1">
                  {lang === "en" ? "Build Your Dream" : "ابن حلمك"}
                </span>
              </div>
            </div>
            
            <p className="text-sm leading-relaxed text-gray-500 max-w-md">
              {lang === "en" 
                ? "BYD is Iraq's premiere loyalty ecosystem designed to unite elite corporate entities and individual consumers under a single high-exposure savings triad."
                : "بي واي دي هي المنظومة الخدمية الرائدة في العراق المصممة لتوحيد الشركات المتميزة والأعضاء تحت مظلة خصومات متكاملة تضمن الانتشار والقيمة المضافة."}
            </p>
          </div>

          {/* Column 2: Structural Divisions (Slide 6) - Owning Companies logos */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-white font-extrabold text-xs uppercase tracking-widest border-b border-gray-900 pb-2">
              {lang === "en" ? "OWNING COMPANIES" : "المنظومة والشركات المالكة"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              {/* TAJ Marketing Logo */}
              <div className="flex items-center gap-3 bg-black/40 border border-gray-900 rounded-xl p-3 hover:border-[#D30014]/40 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center bg-black group-hover:scale-105 transition-transform flex-shrink-0">
                  <img
                    id="footer-entity1-img"
                    src={(!activeBranding?.company1Logo || activeBranding.company1Logo.includes("/src/assets/")) ? tajLogo : activeBranding.company1Logo}
                    alt="TAJ Marketing Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span id="footer-entity1-text" className="text-white text-xs font-black block leading-tight">
                    {lang === "en" ? (activeBranding?.company1Name || "TAJ Marketing") : (activeBranding?.company1NameAr || "شركة تاج للتسويق")}
                  </span>
                </div>
              </div>

              {/* GeniusWings Group Logo */}
              <div className="flex items-center gap-3 bg-black/40 border border-gray-900 rounded-xl p-3 hover:border-white/20 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center bg-black group-hover:scale-105 transition-transform flex-shrink-0">
                  <img
                    id="footer-entity2-img"
                    src={(!activeBranding?.company2Logo || activeBranding.company2Logo.includes("/src/assets/")) ? geniusWingsLogo : activeBranding.company2Logo}
                    alt="GeniusWings Group Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span id="footer-entity2-text" className="text-white text-xs font-black block leading-tight">
                    {lang === "en" ? (activeBranding?.company2Name || "GeniusWings Group") : (activeBranding?.company2NameAr || "أجنحة العبقرية للنظم")}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Column 3: Contact & Info */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-extrabold text-xs uppercase tracking-widest border-b border-gray-900 pb-2">
              {lang === "en" ? "OFFICE CHANNELS" : "قنوات التواصل"}
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-semibold">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D30014] flex-shrink-0" />
                <a 
                  href="tel:+9647730279390" 
                  className="dir-ltr text-white font-mono font-bold hover:text-[#D30014] transition-colors cursor-pointer"
                  title={lang === "en" ? "Call Us" : "اتصل بنا"}
                >
                  +964 773 027 9390
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D30014] flex-shrink-0" />
                <span className="truncate">geniuswingsgroup@gmail.com</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D30014] flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {lang === "en" ? "Kirkuk, Governorate Street / Ghazi Mall" : "كركوك، شارع المحافظة / غازي مول"}
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Lower Credits bar */}
        <div className="border-t border-gray-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-600">
          
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#D30014]" />
            <span>
              {lang === "en" 
                ? "Authorized BYD platform engineered for GeniusWings Group & TAJ Marketing."
                : "منصة BYD الرسمية المعتمدة لشركة تاج للتسويق ومجموعة أجنحة العبقرية."}
            </span>
          </div>

          {/* Author Credits - Slide 7 */}
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="w-4 h-4 text-[#D30014]" />
            <span>Ghaith Adnan 2026</span>
          </div>

        </div>

      </div>
    </footer>
  );
}
