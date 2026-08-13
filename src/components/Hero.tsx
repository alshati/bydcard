import React from "react";
import { Sparkles, Building2, UserCheck, Star, BadgeDollarSign, HeartHandshake } from "lucide-react";
import { translations } from "./translations";
import { Language } from "../types";

interface HeroProps {
  lang: Language;
}

export default function Hero({ lang }: HeroProps) {
  const t = translations[lang];

  return (
    <section id="hero" className="relative min-h-[90vh] bg-[#050505] flex flex-col justify-center overflow-hidden py-16">
      
      {/* Background circular decorations inspired by the PDF layout */}
      <div className="absolute top-10 left-10 w-28 h-28 bg-[#D30014] rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-44 h-44 bg-[#D30014] rounded-full blur-3xl opacity-25"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D30014]/5 rounded-full blur-3xl"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        
        {/* New Business Badge & Main Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D30014]/15 border border-[#D30014]/30 text-[#D30014] text-xs sm:text-sm font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4" />
            <span>{t.heroBadge}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase leading-none mb-6">
            BUILD <span className="text-[#D30014]">YOUR</span> DREAM
          </h1>
          
          <p className="text-gray-400 text-base sm:text-xl font-medium leading-relaxed mt-4">
            {t.heroSub}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a 
              href="#registration" 
              className="px-6 py-3.5 bg-[#D30014] text-white font-bold rounded-lg text-sm sm:text-base hover:bg-[#b00010] shadow-lg shadow-[#D30014]/25 transition-all"
            >
              {lang === "en" ? "Subscribe Now" : "اشترك الآن"}
            </a>
            <a 
              href="#verify" 
              className="px-6 py-3.5 bg-[#121212] text-gray-300 border border-gray-800 font-bold rounded-lg text-sm sm:text-base hover:bg-[#1a1a1a] transition-all"
            >
              {lang === "en" ? "Verify BYD Card" : "تحقق من البطاقة"}
            </a>
            <a 
              href="/partners" 
              className="px-6 py-3.5 bg-[#121212] text-gray-300 border border-gray-800 font-bold rounded-lg text-sm sm:text-base hover:bg-[#1a1a1a] transition-all"
            >
              {lang === "en" ? "Partner Platform" : "بوابة الشركاء"}
            </a>
          </div>
        </div>

        {/* B2B and B2C Value Proposition Cards */}
        <div id="offers" className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-16">
          
          {/* B2B CARD */}
          <div className="relative overflow-hidden rounded-2xl bg-[#121212] border-2 border-[#D30014]/20 hover:border-[#D30014]/60 transition-all duration-300 p-8 sm:p-10 flex flex-col justify-between shadow-xl shadow-black/40 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D30014]/10 rounded-bl-full pointer-events-none"></div>
            
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-[#D30014] text-white flex items-center justify-center shadow-lg shadow-[#D30014]/30">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{t.b2bTitle}</h3>
                  <p className="text-sm text-gray-400 font-semibold">{t.b2bBenefit}</p>
                </div>
              </div>

              {/* B2B Price Tag */}
              <div className="my-6 py-4 px-6 rounded-xl bg-black/50 border border-gray-800 flex flex-col sm:flex-row items-baseline justify-between gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#D30014]">
                  {t.b2bPrice}
                </span>
                <span className="text-sm sm:text-base text-gray-400 font-bold">
                  {t.b2bPriceIqd}
                </span>
              </div>

              {/* B2B Props list */}
              <ul className="space-y-4 mt-8">
                {t.b2bProps.map((prop, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-gray-300 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#D30014] text-white flex items-center justify-center text-xs font-black mt-0.5">
                      ✓
                    </span>
                    <span>{prop}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800/60 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                {lang === "en" ? "Primary Benefit" : "الفائدة الأساسية"}
              </span>
              <span className="px-3 py-1 bg-[#D30014]/15 text-[#D30014] rounded-md text-xs font-black">
                {lang === "en" ? "HIGH EXPOSURE" : "انتشار واسع"}
              </span>
            </div>
          </div>

          {/* B2C CARD */}
          <div className="relative overflow-hidden rounded-2xl bg-[#121212] border-2 border-gray-800 hover:border-[#D30014]/40 transition-all duration-300 p-8 sm:p-10 flex flex-col justify-between shadow-xl shadow-black/40 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800/10 rounded-bl-full pointer-events-none"></div>

            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-white text-black flex items-center justify-center shadow-lg shadow-white/10">
                  <UserCheck className="w-8 h-8 text-[#D30014]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{t.b2cTitle}</h3>
                  <p className="text-sm text-gray-400 font-semibold">{t.b2cBenefit}</p>
                </div>
              </div>

              {/* B2C Price Tag */}
              <div className="my-6 py-4 px-6 rounded-xl bg-black/50 border border-gray-800 flex flex-col sm:flex-row items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {t.b2cPrice}
                </span>
                <span className="text-sm sm:text-base text-gray-400 font-bold">
                  {t.b2cPriceYear}
                </span>
              </div>

              {/* B2C Props list */}
              <ul className="space-y-4 mt-8">
                {t.b2cProps.map((prop, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-gray-300 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs font-black mt-0.5">
                      ✓
                    </span>
                    <span>{prop}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800/60 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                {lang === "en" ? "Primary Benefit" : "الفائدة الأساسية"}
              </span>
              <span className="px-3 py-1 bg-white/15 text-white rounded-md text-xs font-black">
                {lang === "en" ? "DISCOUNTS STARTING FROM 5%" : "خصومات تبدأ من 5%"}
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
