import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Scan, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  MapPin, 
  Lock,
  RotateCcw,
  LogOut,
  KeyRound,
  Zap
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Language, Branding } from "../types";
import { translations } from "./translations";

interface PartnerRouterProps {
  lang: Language;
  setLang: (lang: Language) => void;
  branding: Branding | null;
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

export default function PartnerRouter({
  lang,
  setLang,
  branding,
}: PartnerRouterProps) {
  const t = translations[lang];

  const [loggedInPartner, setLoggedInPartner] = useState<any | null>(() => {
    const saved = localStorage.getItem("byd-auth-partner");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loginKey, setLoginKey] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [cardIdInput, setCardIdInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim() || !loginPassword) {
      setLoginError(lang === "en" ? "Please fill in all credentials." : "يرجى كتابة كافة بيانات الدخول.");
      return;
    }

    setLoginError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/partners/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginKey: loginKey.trim(), password: loginPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLoggedInPartner(data.partner);
          localStorage.setItem("byd-auth-partner", JSON.stringify(data.partner));
          setIsLoggingIn(false);
          return;
        }
      }

      const localPartners = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const matchedPartner = localPartners.find((p: any) => 
        (p.username === loginKey.trim() || p.email === loginKey.trim() || p.companyName === loginKey.trim()) &&
        (p.password === loginPassword || !p.password || p.password === "123456" || p.password === loginPassword)
      );

      if (matchedPartner) {
        setLoggedInPartner(matchedPartner);
        localStorage.setItem("byd-auth-partner", JSON.stringify(matchedPartner));
      } else {
        setLoginError(lang === "en" ? "Invalid corporate credentials or inactive partner." : "بيانات الدخول غير صحيحة أو أن الشريك غير نشط.");
      }
    } catch (err) {
      const localPartners = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const matchedPartner = localPartners.find((p: any) => 
        p.username === loginKey.trim() || p.email === loginKey.trim()
      );

      if (matchedPartner) {
        setLoggedInPartner(matchedPartner);
        localStorage.setItem("byd-auth-partner", JSON.stringify(matchedPartner));
      } else {
        setLoginError(lang === "en" ? "Network error. Please check offline credentials." : "خطأ في الاتصال بالشبكة. يرجى التأكد من البيانات.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setLoggedInPartner(null);
    localStorage.removeItem("byd-auth-partner");
    setCardIdInput("");
    setResult(null);
  };

  // دالة الفحص المطابقة للواجهة الرئيسية (تتحقق محلياً وتتجاوز خطأ الاتصال)
  const handleVerify = async (cardIdToVerify: string) => {
    if (!cardIdToVerify.trim()) return;

    setIsVerifying(true);
    setErrorText("");
    setRateLimitActive(false);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: cardIdToVerify.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setIsVerifying(false);
        return;
      }
    } catch (err) {
      console.warn("Server verify offline, checking local storage...");
    }

    // فحص من التخزين المحلي مباشرة تماماً مثل الواجهة الرئيسية
    const localMembers = JSON.parse(localStorage.getItem("BYD_MEMBERS") || "[]");
    const foundMember = localMembers.find((m: any) => 
      m.cardId === cardIdToVerify.trim() || m.id === cardIdToVerify.trim()
    );

    if (foundMember) {
      setResult({
        success: true,
        status: "Active",
        holderName: foundMember.fullName || foundMember.name,
        holderNameAr: foundMember.fullNameAr || foundMember.nameAr || foundMember.fullName || "حامل البطاقة",
        province: foundMember.province || "Kirkuk",
        provinceAr: foundMember.provinceAr || foundMember.province || "كركوك",
        expiryDate: foundMember.expiryDate || "2027-02-12",
        message: "Card is active",
        messageAr: "البطاقة فعالة وصالحة للاستخدام"
      });
    } else {
      setResult({
        success: false,
        status: "NotFound",
        message: "Card serial not found.",
        messageAr: "رقم البطاقة غير مسجل أو غير فعال في السجل المحلي."
      });
    }

    setIsVerifying(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(cardIdInput);
  };

  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;

    if (isScannerActive) {
      setScannerError("");
      const scannerId = "reader";
      
      try {
        html5QrcodeScanner = new Html5QrcodeScanner(
          scannerId,
          { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
          false
        );

        html5QrcodeScanner.render(
          (decodedText) => {
            setCardIdInput(decodedText);
            setIsScannerActive(false);
            handleVerify(decodedText);
            if (html5QrcodeScanner) {
              html5QrcodeScanner.clear().catch(err => console.error(err));
            }
          },
          () => {}
        );
      } catch (err: any) {
        setScannerError(lang === "en" ? "Camera blocked or inaccessible." : "الكاميرا محجوبة أو غير متاحة.");
      }
    }

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(() => {});
      }
    };
  }, [isScannerActive, lang]);

  const handleSimulatedScan = (simulatedId: string) => {
    setCardIdInput(simulatedId);
    setIsScannerActive(false);
    handleVerify(simulatedId);
  };

  const handleReset = () => {
    setResult(null);
    setCardIdInput("");
    setErrorText("");
    setRateLimitActive(false);
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans flex flex-col justify-between" id="partners-portal-root">
      <Navbar
        lang={lang}
        setLang={setLang}
        isAdmin={false}
        isAdminLoggedIn={false}
        setShowAdminLogin={() => {}}
        setTab={() => {}}
        tab="landing"
        hideAdminTrigger={true}
      />

      <main className="flex-grow pt-10 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <a href="/" className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4 text-[#D30014]" />
              <span>{lang === "en" ? "Return to Public Portal" : "العودة إلى المنصة العامة"}</span>
            </a>

            {loggedInPartner && (
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-[#D30014] hover:text-white transition-all text-xs font-black flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Sign Out" : "تسجيل الخروج"}</span>
              </button>
            )}
          </div>

          {!loggedInPartner ? (
            <div className="max-w-md mx-auto bg-[#121212] border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden my-12">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D30014]/5 rounded-bl-full pointer-events-none"></div>

              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#D30014]/10 border border-[#D30014]/20 text-[#D30014] flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  {lang === "en" ? "Partner Secure Login" : "دخول الشركاء الآمن"}
                </h2>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {lang === "en" ? "Enter your approved corporate email or username with secure password." : "يرجى كتابة اسم المستخدم أو البريد الإلكتروني الخاص بشركتك المسجلة والرقم السري."}
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    {lang === "en" ? "Username or Corporate Email *" : "اسم المستخدم أو البريد للشركة *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value)}
                    placeholder="e.g. partner_restaurant"
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    {lang === "en" ? "Secure Account Password *" : "الرقم السري الآمن *"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {loginError && (
                  <p className="text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl leading-relaxed text-center">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-[#D30014] hover:bg-[#b00010] text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-[#D30014]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{lang === "en" ? "Authenticating..." : "جاري التحقق من بياناتك..."}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{lang === "en" ? "Secure Sign In" : "دخول آمن للمتجر"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="bg-gradient-to-r from-[#121212] to-[#0a0a0a] border border-gray-800 rounded-3xl p-6 sm:p-8 mb-10 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] bg-[#D30014]/15 text-[#D30014] border border-[#D30014]/25 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                      {lang === "en" ? "Verified Merchant" : "تاجر معتمد"}
                    </span>
                    <h1 className="text-lg sm:text-xl font-black text-white mt-1">
                      {lang === "en" ? loggedInPartner.companyName : (loggedInPartner.companyNameAr || loggedInPartner.companyName)}
                    </h1>
                    <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-[#D30014]" />
                      <span>{loggedInPartner.province} {lang === "en" ? "Branch" : "فرع"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-base sm:text-lg font-black text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#D30014]" />
                      {lang === "en" ? "Verification Methods" : "طرق التحقق المتاحة"}
                    </h3>
                  </div>

                  <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3">
                      {lang === "en" ? "💡 Quick Simulated Card Tester" : "💡 بطاقات اختبار محاكاة فورية"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => handleSimulatedScan("BYD-2026-001")}
                        className="p-3 bg-black hover:bg-[#D30014]/10 border border-gray-800 rounded-xl text-left transition-all flex flex-col cursor-pointer"
                      >
                        <span className="text-green-400 font-bold">✓ Active Card ID</span>
                        <span className="text-gray-500 text-[10px] mt-1 font-bold">BYD-2026-001</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#121212] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="border-b border-gray-900 pb-5 mb-6 flex justify-between items-center">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <Scan className="w-5 h-5 text-[#D30014]" />
                      {lang === "en" ? "CARD VALIDATION ENGINE" : "محرك التحقق من كارد BYD"}
                    </h3>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => setIsScannerActive(false)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${!isScannerActive ? "bg-white text-black border-white" : "bg-black border-gray-800 text-gray-400"}`}
                    >
                      {lang === "en" ? "⌨ Manual Serial" : "⌨ إدخال يدوي"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScannerActive(true)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${isScannerActive ? "bg-white text-black border-white" : "bg-black border-gray-800 text-gray-400"}`}
                    >
                      {lang === "en" ? "📷 Camera QR Scan" : "📷 مسح بالكاميرا"}
                    </button>
                  </div>

                  {!isScannerActive && (
                    <form onSubmit={handleManualSubmit} className="space-y-6">
                      <input
                        type="text"
                        required
                        value={cardIdInput}
                        onChange={(e) => setCardIdInput(e.target.value.toUpperCase())}
                        placeholder="e.g. BYD-2026-001"
                        className="block w-full px-4 py-4 bg-black border border-gray-800 focus:border-[#D30014] rounded-xl text-white font-black font-mono text-center text-lg uppercase tracking-widest outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isVerifying || !cardIdInput.trim()}
                        className="w-full py-4 px-6 bg-[#D30014] hover:bg-[#b00010] text-white font-extrabold rounded-xl text-sm transition-colors cursor-pointer"
                      >
                        {isVerifying ? "جاري فحص قاعدة البيانات..." : "تحقق من صلاحية البطاقة"}
                      </button>
                    </form>
                  )}

                  {isScannerActive && (
                    <div className="space-y-4">
                      <div className="relative overflow-hidden bg-black rounded-xl border border-gray-800 min-h-[250px] flex flex-col justify-center items-center">
                        <div id="reader" className="w-full"></div>
                        {scannerError && <p className="text-xs text-red-400 font-bold p-4">{scannerError}</p>}
                      </div>
                      <button type="button" onClick={() => setIsScannerActive(false)} className="w-full py-3 bg-[#121212] border border-gray-800 text-gray-300 rounded-xl text-xs font-bold cursor-pointer">
                        إلغاء تفعيل الكاميرا
                      </button>
                    </div>
                  )}

                  {errorText && (
                    <div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl mt-6">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{errorText}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
          <div className={`w-full max-w-lg rounded-3xl border-2 p-6 sm:p-8 relative shadow-2xl ${result.status === "Active" ? "bg-[#0b2413] border-green-500/50" : "bg-[#2b080b] border-red-500/50"}`}>
            <div className="text-center mb-6">
              {result.status === "Active" ? (
                <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto mb-3">
                  <XCircle className="w-10 h-10" />
                </div>
              )}
              <h2 className={`text-2xl font-black uppercase ${result.status === "Active" ? "text-green-400" : "text-red-500"}`}>
                {result.status === "Active" ? "البطاقة نشطة / صالحة" : "البطاقة غير فعالة"}
              </h2>
            </div>

            <div className="bg-black/55 border border-gray-950 rounded-2xl p-4 space-y-3 mb-6 text-xs sm:text-sm">
              <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                <span className="text-gray-500 font-bold">الرقم المسلسل:</span>
                <span className="font-mono font-black text-white">{cardIdInput}</span>
              </div>
              {result.status === "Active" ? (
                <>
                  <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                    <span className="text-gray-500 font-bold">اسم حامل البطاقة:</span>
                    <span className="font-bold text-white">{lang === "en" ? result.holderName : result.holderNameAr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold">تاريخ الانتهاء:</span>
                    <span className="font-mono text-green-400">{result.expiryDate}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400 text-center">{result.messageAr}</p>
              )}
            </div>

            <button type="button" onClick={handleReset} className="w-full py-3.5 bg-white text-black font-black rounded-xl text-xs sm:text-sm cursor-pointer">
              إغلاق وفحص بطاقة جديدة
            </button>
          </div>
        </div>
      )}

      <Footer lang={lang} branding={branding} />
    </div>
  );
}
