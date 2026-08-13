import React from "react";
import { ShieldCheck, Languages, Landmark } from "lucide-react";
import { translations } from "./translations";
import { Language } from "../types";
import systemLogo from "../assets/images/byd_card_logo_exact_1784543953366.jpg";

interface NavbarProps {
  lang: Language;
  setLang: (lang: Language) => void;
  isAdmin: boolean;
  isAdminLoggedIn: boolean;
  setShowAdminLogin: (show: boolean) => void;
  setTab: (tab: "landing" | "admin") => void;
  tab: "landing" | "admin";
  hideAdminTrigger?: boolean;
}

export default function Navbar({
  lang,
  setLang,
  isAdmin,
  isAdminLoggedIn,
  setShowAdminLogin,
  setTab,
  tab,
  hideAdminTrigger = false,
}: NavbarProps) {
  const t = translations[lang];

  const handleLanguageToggle = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  const handleAdminClick = () => {
    if (isAdminLoggedIn) {
      setTab(tab === "admin" ? "landing" : "admin");
    } else {
      setShowAdminLogin(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050505]/95 backdrop-blur-md border-b border-[#D30014]/25 shadow-lg shadow-[#D30014]/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Brand */}
          <div 
            onClick={() => setTab("landing")}
            className="flex items-center gap-3 cursor-pointer group"
            id="brand-logo"
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden border border-gray-800 shadow-md shadow-[#D30014]/40 transition-transform group-hover:scale-105 bg-black">
              <img 
                src={systemLogo} 
                alt="BYD Card Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-xl sm:text-2xl tracking-wider leading-none group-hover:text-[#D30014] transition-colors">
                BYD Card
              </span>
              <span className="text-xs text-gray-400 font-medium tracking-widest mt-1">
                {lang === "en" ? "Build Your Dream" : "ابن حلمك"}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            {tab === "landing" ? (
              <>
                <a href="#hero" className="text-gray-300 hover:text-[#D30014] transition-colors">
                  {t.navHome}
                </a>
                <a href="#verify" className="text-gray-300 hover:text-[#D30014] transition-colors">
                  {t.navVerify}
                </a>
                <a href="#offers" className="text-gray-300 hover:text-[#D30014] transition-colors">
                  {t.navOffers}
                </a>
                <a href="#interactive-map" className="text-gray-300 hover:text-[#D30014] transition-colors flex items-center gap-1">
                  <span>{lang === "en" ? "Google Map" : "الخريطة التفاعلية"}</span>
                </a>
                <a href="/partners" className="text-gray-300 hover:text-[#D30014] transition-colors">
                  {t.navPartners}
                </a>
              </>
            ) : (
              <button 
                onClick={() => setTab("landing")}
                className="text-gray-300 hover:text-[#D30014] transition-colors"
              >
                ← {lang === "en" ? "Back to Public Page" : "العودة للموقع الرئيسي"}
              </button>
            )}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Toggle Button */}
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-gray-300 bg-[#121212] hover:bg-[#1f1f1f] border border-gray-800 rounded-lg transition-all active:scale-95"
              id="lang-toggle-btn"
              title="Toggle language"
            >
              <Languages className="w-4 h-4 text-[#D30014]" />
              <span className="font-semibold">{t.langToggle}</span>
            </button>

            {/* Admin Dashboard Trigger */}
            {!hideAdminTrigger && (
              <button
                onClick={handleAdminClick}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all active:scale-95 ${
                  tab === "admin"
                    ? "bg-white text-black border-white hover:bg-gray-100"
                    : "bg-[#D30014] text-white border-transparent hover:bg-[#b00010] shadow-md shadow-[#D30014]/20"
                }`}
                id="admin-nav-btn"
              >
                {isAdminLoggedIn ? (
                  <>
                    <Landmark className="w-4 h-4" />
                    <span>{tab === "admin" ? t.navHome : t.navAdmin}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t.navAdmin}</span>
                  </>
                )}
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
