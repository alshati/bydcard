import React, { useState, useEffect } from "react";
import { Scan, HelpCircle, CheckCircle2, AlertCircle, ShieldAlert, FileKey } from "lucide-react";
import { translations } from "./translations";
import { Language } from "../types";

interface CardVerificationProps {
  lang: Language;
}

interface VerificationResult {
  success: boolean;
  status: "Active" | "Inactive" | "NotFound";
  holderName?: string;
  holderNameAr?: string;
  province?: string;
  provinceAr?: string;
  expiryDate?: string;
  message: string;
  messageAr: string;
}

export default function CardVerification({ lang }: CardVerificationProps) {
  const t = translations[lang];
  const [cardIdInput, setCardIdInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorText, setErrorText] = useState("");
  const [rateLimitActive, setRateLimitActive] = useState(false);

  const [activeTemplate, setActiveTemplate] = useState<{ cardDesignBase64: string; type?: "image" | "video" } | null>(null);
  const [cardMedia, setCardMedia] = useState<{ type: "image" | "video"; data: string } | null>(() => {
    const cached = localStorage.getItem("BYD_CARD_MEDIA");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  useEffect(() => {
    const loadMediaState = () => {
      const cached = localStorage.getItem("BYD_CARD_MEDIA");
      if (cached) {
        try {
          setCardMedia(JSON.parse(cached));
        } catch (e) {
          console.error(e);
        }
      } else {
        setCardMedia(null);
      }
    };

    const loadTemplate = () => {
      const cached = localStorage.getItem('BYD_CARD_TEMPLATE_ACTIVE_STATE');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.cardDesignBase64) {
            setActiveTemplate(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        fetch("/api/cards/active-template")
          .then(res => res.json())
          .then(data => {
            if (data?.cardDesignBase64) {
              setActiveTemplate(data);
              localStorage.setItem('BYD_CARD_TEMPLATE_ACTIVE_STATE', JSON.stringify(data));
            }
          })
          .catch(err => console.error("Error loading card template:", err));
      }
    };

    loadMediaState();
    loadTemplate();
    window.addEventListener("storage-sync-updated", loadMediaState);
    window.addEventListener("storage-sync-updated", loadTemplate);
    window.addEventListener("storage", loadMediaState);
    window.addEventListener("storage", loadTemplate);
    return () => {
      window.removeEventListener("storage-sync-updated", loadMediaState);
      window.removeEventListener("storage-sync-updated", loadTemplate);
      window.removeEventListener("storage", loadMediaState);
      window.removeEventListener("storage", loadTemplate);
    };
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardIdInput.trim()) return;

    setIsVerifying(true);
    setErrorText("");
    setRateLimitActive(false);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: cardIdInput }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setRateLimitActive(true);
        setErrorText(lang === "en" ? data.message : data.messageAr);
        setResult(null);
      } else if (response.ok) {
        setResult(data);
      } else {
        // Not Found or general error
        setResult({
          success: false,
          status: "NotFound",
          message: data.message,
          messageAr: data.messageAr
        });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setErrorText(lang === "en" ? "Connection failure. Please retry." : "خطأ في الاتصال. يرجى إعادة المحاولة.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Quick preset helper to allow direct testing easily
  const fillPreset = (id: string) => {
    setCardIdInput(id);
  };

  return (
    <section id="verify" className="bg-[#050505] py-24 relative overflow-hidden border-t border-gray-950">
      
      {/* Visual background accents */}
      <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#D30014]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            {t.verifyTitle}
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            {t.verifySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Card Visual Side (Left) - Inspired by page 2 of the PDF */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center gap-6">
            
            <div className="relative w-full max-w-sm aspect-[1.58/1] rounded-2xl text-white p-6 shadow-2xl shadow-[#D30014]/15 overflow-hidden border border-white/10 group select-none">
              {/* Dynamic Multimedia Background Layer */}
              {cardMedia?.type === "image" && cardMedia.data ? (
                <img src={cardMedia.data} alt="Card Template" className="absolute inset-0 w-full h-full object-cover z-0 opacity-80" />
              ) : cardMedia?.type === "video" && cardMedia.data ? (
                <video src={cardMedia.data} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 rounded-2xl" />
              ) : activeTemplate?.cardDesignBase64 ? (
                activeTemplate.type === "video" ? (
                  <video src={activeTemplate.cardDesignBase64} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 rounded-2xl" />
                ) : (
                  <img src={activeTemplate.cardDesignBase64} alt="Card Template" className="absolute inset-0 w-full h-full object-cover z-0 opacity-80" />
                )
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D30014] to-[#a00010] z-0" />
                  {/* Skyline Silhouette from Slide 2 */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-black opacity-90 flex items-end">
                    {/* Embedded SVG Skyline mimicking the slide's skyline bridge and mosque style */}
                    <svg className="w-full h-full text-white fill-current" viewBox="0 0 300 60" preserveAspectRatio="none">
                      <path d="M0,60 L300,60 L300,45 L290,45 L285,35 L280,45 L260,45 L255,10 L250,10 L248,20 L240,20 L235,45 L215,45 L210,30 L205,45 L180,45 L175,25 L160,25 L155,45 L140,45 C140,30 120,30 120,45 L105,45 L100,5 L95,5 L90,20 L80,20 L75,45 L50,45 L45,15 L40,15 L35,45 L20,45 L15,35 L10,45 Z" />
                    </svg>
                  </div>
                </>
              )}

              {/* Card Label and Content */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-2xl font-black tracking-tighter leading-none flex items-center gap-1">
                    BYD <span className="text-xs font-serif italic text-white/80 font-medium">Card</span>
                  </h4>
                  <p className="text-[10px] tracking-widest text-white/70 uppercase mt-0.5">Build Your Dream</p>
                </div>
              </div>

              {/* Dynamic Status Overlay Ring */}
              {result && (
                <div className={`absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 transition-opacity duration-300`}>
                  {result.status === "Active" ? (
                    <div className="text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2 animate-bounce" />
                      <p className="text-green-500 font-extrabold text-lg">{lang === "en" ? "Active / صالح" : "فعال / صالح"}</p>
                      <p className="text-white font-bold text-sm mt-1 truncate max-w-[280px]">
                        {lang === "en" ? result.holderName : result.holderNameAr}
                      </p>
                      <p className="text-gray-400 text-xs font-mono mt-0.5">
                        {lang === "en" ? result.province : result.provinceAr}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-2">
                      <AlertCircle className="w-12 h-12 text-[#D30014] mx-auto mb-2" />
                      <p className="text-[#D30014] font-extrabold text-sm leading-tight">
                        {lang === "en" ? result.message : result.messageAr}
                      </p>
                      {result.holderName && (
                        <p className="text-gray-300 font-bold text-xs mt-1">
                          {lang === "en" ? result.holderName : result.holderNameAr}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Form Side (Right) */}
          <div className="lg:col-span-7 bg-[#121212] border border-gray-800 p-8 sm:p-10 rounded-2xl shadow-xl">
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2" htmlFor="card-id-input">
                  {t.verifyPlaceholder}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Scan className="w-5 h-5 text-[#D30014]" />
                  </div>
                  <input
                    type="text"
                    id="card-id-input"
                    value={cardIdInput}
                    onChange={(e) => setCardIdInput(e.target.value)}
                    placeholder="e.g. BYD-2026-001"
                    className="block w-full pl-11 pr-4 py-3.5 bg-black border border-gray-800 focus:border-[#D30014] focus:ring-1 focus:ring-[#D30014] rounded-lg text-white font-bold placeholder-gray-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Rate limit status warning block */}
              {rateLimitActive && (
                <div className="flex items-start gap-3 p-4 bg-[#D30014]/10 border border-[#D30014]/30 rounded-lg text-xs text-red-400">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-[#D30014]" />
                  <div>
                    <span className="font-bold block">{lang === "en" ? "Brute-Force Guard Active" : "نظام حماية التخمين مفعّل"}</span>
                    <span>{errorText}</span>
                  </div>
                </div>
              )}

              {/* Standard status/error block */}
              {!rateLimitActive && errorText && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {/* Success verified results (under form) */}
              {result && !rateLimitActive && (
                <div className={`p-5 rounded-lg border ${
                  result.status === "Active" 
                    ? "bg-green-500/10 border-green-500/30 text-green-400" 
                    : "bg-[#D30014]/10 border-[#D30014]/30 text-[#D30014]"
                }`}>
                  <h5 className="font-black text-sm uppercase tracking-wider mb-3 pb-2 border-b border-white/5 flex items-center gap-2">
                    {result.status === "Active" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4" />}
                    {t.verifyStatus}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white">
                    <div>
                      <span className="text-xs text-gray-500 block">{t.verifyHolder}</span>
                      <span className="font-extrabold text-base">
                        {lang === "en" ? result.holderName || "N/A" : result.holderNameAr || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">{t.verifyProvince}</span>
                      <span className="font-semibold">
                        {lang === "en" ? result.province || "N/A" : result.provinceAr || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">{t.verifyExpiry}</span>
                      <span className="font-mono">{result.expiryDate || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">{lang === "en" ? "Status Label" : "حالة الاشتراك"}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-black uppercase mt-1 ${
                        result.status === "Active" ? "bg-green-500 text-black" : "bg-[#D30014] text-white"
                      }`}>
                        {lang === "en" ? result.message : result.messageAr}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifying || !cardIdInput.trim()}
                  className="w-full py-4 px-6 bg-[#D30014] hover:bg-[#b00010] disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-extrabold rounded-lg text-sm sm:text-base transition-colors shadow-lg shadow-[#D30014]/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t.verifying}</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-5 h-5" />
                      <span>{t.verifyBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center gap-2 text-xs text-gray-500 justify-center">
              <HelpCircle className="w-4 h-4 text-[#D30014]" />
              <span>{t.rateLimitWarning}</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
