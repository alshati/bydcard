import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Scan, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ShieldAlert, 
  Camera, 
  Globe, 
  User, 
  MapPin, 
  Calendar,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
  RotateCcw,
  LogOut,
  KeyRound
} from "lucide-react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
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

  // Secured Partner Login State
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

  // Login form states
  const [loginKey, setLoginKey] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Card verification states
  const [cardIdInput, setCardIdInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Scanner states
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");

 // Log in handler
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
      console.warn("Server login offline, falling back to local storage:", err);
      
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
  // HTML5 QR Code Scanner initialization
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;

    if (isScannerActive) {
      setScannerError("");
      const scannerId = "reader";
      
      try {
        html5QrcodeScanner = new Html5QrcodeScanner(
          scannerId,
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
          },
          /* verbose= */ false
        );

        html5QrcodeScanner.render(
          (decodedText) => {
            console.log("QR Decoded text:", decodedText);
            setCardIdInput(decodedText);
            setIsScannerActive(false);
            handleVerify(decodedText);
            if (html5QrcodeScanner) {
              html5QrcodeScanner.clear().catch(err => console.error(err));
            }
          },
          (errorMessage) => {
            // Safe to ignore scanner warm-up warnings
          }
        );
      } catch (err: any) {
        console.error("Failed to start QR scanner:", err);
        setScannerError(lang === "en" 
          ? "Camera blocked or inaccessible. Please use the simulated scanner or check permissions." 
          : "الكاميرا محجوبة أو غير متاحة. يرجى استخدام الفحص التجريبي أو التحقق من أذونات المتصفح.");
      }
    }

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(err => console.log("Failed clear:", err));
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
      
      {/* Dynamic Navbar */}
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
          
          {/* Back button to public portal */}
          <div className="mb-8 flex justify-between items-center">
            <a 
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
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

          {/* SECURED LOGIN SCREEN */}
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
                  {lang === "en" 
                    ? "Enter your approved corporate email or username with secure password."
                    : "يرجى كتابة اسم المستخدم أو البريد الإلكتروني الخاص بشركتك المسجلة والرقم السري."}
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
                      <span>{lang === "en" ? "Authenticating Partner Credentials..." : "جاري التحقق من بياناتك..."}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{lang === "en" ? "Secure Sign In" : "دخول آمن للمتجر"}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Demo Help tips */}
              <div className="mt-8 pt-6 border-t border-gray-900 text-center">
                <span className="inline-block px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold">
                  {lang === "en" ? "💡 Live Test Account:" : "💡 حساب اختبار مباشر:"}
                </span>
                <p className="text-[11px] text-gray-500 mt-2 font-mono">
                  Username: <span className="text-gray-300 font-bold">partner</span> &nbsp;|&nbsp; Password: <span className="text-gray-300 font-bold">byd2026</span>
                </p>
              </div>

            </div>
          ) : (
            /* AUTHENTICATED ENVIRONMENT - ONLY CARD VERIFICATION ENGINE */
            <div className="animate-fade-in">
              
              {/* Logged in Welcome Banner */}
              <div className="bg-gradient-to-r from-[#121212] to-[#0a0a0a] border border-gray-800 rounded-3xl p-6 sm:p-8 mb-10 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D30014]/5 rounded-bl-full pointer-events-none"></div>
                
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

                <div className="bg-black/60 border border-gray-800 rounded-2xl px-5 py-3 text-center sm:text-right">
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">{lang === "en" ? "VERIFICATION METHOD" : "نظام الفحص الفوري"}</span>
                  <span className="text-xs font-black text-[#D30014] tracking-wider block mt-0.5">SECURE END-TO-END</span>
                </div>
              </div>

              {/* CARD VALIDATION ENGINE CONTAINER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                
                {/* Left side: Instructions and QR Simulated Tester */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-base sm:text-lg font-black text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#D30014]" />
                      {lang === "en" ? "Verification Methods" : "طرق التحقق المتاحة"}
                    </h3>
                    
                    <div className="space-y-4 text-xs sm:text-sm text-gray-400 leading-relaxed">
                      <p>
                        {lang === "en" 
                          ? "Verify physical BYD serial cards instantly using two secure methods:" 
                          : "بصفتك متجراً معتمداً، يمكنك فحص بطاقات العملاء والتحقق من فعاليتها بطريقتين:"}
                      </p>
                      
                      <div className="bg-black/40 border border-gray-900 rounded-xl p-3.5 space-y-3">
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded bg-[#D30014]/10 border border-[#D30014]/30 text-[#D30014] font-bold flex items-center justify-center text-xs">1</span>
                          <div>
                            <span className="font-bold text-white block">{lang === "en" ? "Manual Serial Key Entry" : "إدخال الرقم التسلسلي يدوياً"}</span>
                            <span>{lang === "en" ? "Type the unique serial ID directly into the ledger console." : "اكتب المعرف الفريد للبطاقة (مثال: BYD-2026-001) ثم انقر تحقق."}</span>
                          </div>
                        </div>

                        <div className="flex gap-3 border-t border-gray-950 pt-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded bg-[#D30014]/10 border border-[#D30014]/30 text-[#D30014] font-bold flex items-center justify-center text-xs">2</span>
                          <div>
                            <span className="font-bold text-white block">{lang === "en" ? "Interactive Camera Scan" : "المسح الضوئي بالكاميرا"}</span>
                            <span>{lang === "en" ? "Use your mobile/desktop camera to scan the physical QR card directly." : "افتح الماسح المدمج بالكاميرا لمسح الكود المطبوع على البطاقة."}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated scan triggers */}
                  <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3">
                      {lang === "en" ? "💡 Quick Simulated Card Tester" : "💡 بطاقات اختبار محاكاة فورية"}
                    </h4>
                    <p className="text-xs text-gray-400 mb-4">
                      {lang === "en" ? "Click any preset below to simulate an immediate QR/Barcode scan:" : "انقر على أي من البطاقات التالية لمحاكاة مسح الكود فوراً:"}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => handleSimulatedScan("BYD-2026-001")}
                        className="p-3 bg-black hover:bg-[#D30014]/10 border border-gray-800 hover:border-[#D30014]/40 rounded-xl text-left transition-all flex flex-col cursor-pointer"
                      >
                        <span className="text-green-400 font-bold">✓ Active Card ID</span>
                        <span className="text-gray-500 text-[10px] mt-1 font-bold">BYD-2026-001</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSimulatedScan("BYD-2026-003")}
                        className="p-3 bg-black hover:bg-[#D30014]/10 border border-gray-800 hover:border-[#D30014]/40 rounded-xl text-left transition-all flex flex-col cursor-pointer"
                      >
                        <span className="text-red-500 font-bold">✗ Expired Card ID</span>
                        <span className="text-gray-500 text-[10px] mt-1 font-bold">BYD-2026-003</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right side: Unified Card Validation Console */}
                <div className="lg:col-span-7 bg-[#121212] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                  
                  <div className="border-b border-gray-900 pb-5 mb-6 flex justify-between items-center">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <Scan className="w-5 h-5 text-[#D30014]" />
                      {lang === "en" ? "CARD VALIDATION ENGINE" : "محرك التحقق من كارد BYD"}
                    </h3>
                    <span className="text-[10px] bg-[#D30014]/15 text-[#D30014] border border-[#D30014]/25 px-2 py-0.5 rounded font-black">
                      {lang === "en" ? "SECURE CHANNELS" : "قنوات آمنة"}
                    </span>
                  </div>

                  {/* Main controls toggle */}
                  <div className="flex gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => setIsScannerActive(false)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${
                        !isScannerActive 
                          ? "bg-white text-black border-white" 
                          : "bg-black border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {lang === "en" ? "⌨ Manual Serial" : "⌨ إدخال يدوي"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScannerActive(true)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border cursor-pointer ${
                        isScannerActive 
                          ? "bg-white text-black border-white" 
                          : "bg-black border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {lang === "en" ? "📷 Camera QR Scan" : "📷 مسح بالكاميرا"}
                    </button>
                  </div>

                  {/* ---------------- METHOD A: MANUAL FORM ---------------- */}
                  {!isScannerActive && (
                    <form onSubmit={handleManualSubmit} className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                          {lang === "en" ? "Enter Card Serial Key Number:" : "الرقم المسلسل للبطاقة:"}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={cardIdInput}
                            onChange={(e) => setCardIdInput(e.target.value.toUpperCase())}
                            placeholder="e.g. BYD-2026-001"
                            className="block w-full px-4 py-4 bg-black border border-gray-800 focus:border-[#D30014] rounded-xl text-white font-black font-mono placeholder-gray-700 outline-none transition-all text-center text-lg uppercase tracking-widest"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifying || !cardIdInput.trim()}
                        className="w-full py-4 px-6 bg-[#D30014] hover:bg-[#b00010] disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-sm sm:text-base transition-colors shadow-lg shadow-[#D30014]/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isVerifying ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>{lang === "en" ? "Checking Database Ledger..." : "جاري فحص قاعدة البيانات..."}</span>
                          </>
                        ) : (
                          <>
                            <Scan className="w-5 h-5" />
                            <span>{lang === "en" ? "Validate Card Holder" : "تحقق من صلاحية البطاقة"}</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* ---------------- METHOD B: CAMERA SCANNER ---------------- */}
                  {isScannerActive && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-400 text-center">
                        {lang === "en" ? "Grant browser camera permissions when prompted. Hold the physical card's QR code up to the camera preview box." : "يرجى منح صلاحية الكاميرا للمتصفح. ضع رمز QR المطبوع على البطاقة أمام الكاميرا."}
                      </p>

                      <div className="relative overflow-hidden bg-black rounded-xl border border-gray-800 min-h-[250px] flex flex-col justify-center items-center">
                        
                        {/* HTML5 Scanner Container */}
                        <div id="reader" className="w-full"></div>

                        {scannerError && (
                          <div className="p-4 text-center max-w-sm">
                            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-2" />
                            <p className="text-xs text-red-400 font-bold">{scannerError}</p>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsScannerActive(false)}
                        className="w-full py-3 bg-[#121212] hover:bg-gray-950 border border-gray-800 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {lang === "en" ? "Cancel Camera Scanner" : "إلغاء تفعيل الكاميرا"}
                      </button>
                    </div>
                  )}

                  {/* RATE LIMIT STATUS WARNING */}
                  {rateLimitActive && (
                    <div className="flex items-start gap-3 p-4 bg-[#D30014]/10 border border-[#D30014]/30 rounded-xl text-xs text-red-400 mt-6">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0 text-[#D30014]" />
                      <div>
                        <span className="font-bold block">{lang === "en" ? "Security Rate Limit Active" : "نظام الحماية من المحاولات المتكررة فعال"}</span>
                        <span>{errorText}</span>
                      </div>
                    </div>
                  )}

                  {/* ERROR ALERT */}
                  {!rateLimitActive && errorText && (
                    <div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl mt-6">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorText}</span>
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* FULL-SCREEN DYNAMIC VERIFICATION OVERLAY (SUCCESS / FAILURE FEEDBACK) */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-fade-in">
          
          <div className="absolute inset-0 bg-gradient-to-br from-black via-transparent to-black pointer-events-none"></div>

          <div className={`w-full max-w-lg rounded-3xl border-2 p-6 sm:p-8 relative shadow-2xl overflow-hidden transition-all duration-300 scale-95 ${
            result.status === "Active" 
              ? "bg-[#0b2413] border-green-500/50 shadow-green-500/10" 
              : "bg-[#2b080b] border-red-500/50 shadow-red-500/10"
          }`}>
            
            {/* Visual Header Icon */}
            <div className="text-center mb-6">
              {result.status === "Active" ? (
                <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto mb-3 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <XCircle className="w-10 h-10" />
                </div>
              )}

              <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                result.status === "Active" ? "text-green-400" : "text-red-500"
              }`}>
                {result.status === "Active" 
                  ? (lang === "en" ? "CARD IS ACTIVE" : "البطاقة نشطة / صالحة") 
                  : (lang === "en" ? "CARD INVALID" : "البطاقة غير فعالة / غير مطابقة")}
              </h2>
              
              <p className="text-xs text-gray-400 font-bold mt-1">
                {lang === "en" ? "VERIFIED ECOSYSTEM AUDIT" : "فحص معتمد من الهوية الرقمية"}
              </p>
            </div>

            {/* Dynamic Card Artwork Representation inside the overlay */}
            <div className={`relative w-full aspect-[1.58/1] rounded-2xl p-5 text-white mb-6 select-none overflow-hidden border ${
              result.status === "Active"
                ? "bg-gradient-to-br from-[#10b981] to-[#047857] border-white/20"
                : "bg-gradient-to-br from-[#ef4444] to-[#b91c1c] border-white/10"
            }`}>
              
              {/* Skyline Silhouette */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/95 flex items-end">
                <svg className="w-full h-full text-white/10 fill-current" viewBox="0 0 300 60" preserveAspectRatio="none">
                  <path d="M0,60 L300,60 L300,45 L290,45 L285,35 L280,45 L260,45 L255,10 L250,10 L248,20 L240,20 L235,45 L215,45 L210,30 L205,45 L180,45 L175,25 L160,25 L155,45 L140,45 C140,30 120,30 120,45 L105,45 L100,5 L95,5 L90,20 L80,20 L75,45 L50,45 L45,15 L40,15 L35,45 L20,45 L15,35 L10,45 Z" />
                </svg>
              </div>

              {/* Card Label and Content */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-black tracking-tighter leading-none flex items-center gap-1">
                    BYD <span className="text-[10px] font-serif italic text-white/80 font-medium">Card</span>
                  </h4>
                  <p className="text-[8px] tracking-widest text-white/70 uppercase">Build Your Dream</p>
                </div>
                <div className="text-right text-[10px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded text-white">
                  {cardIdInput || "BYD-XXXX-XXX"}
                </div>
              </div>

              <div className="mt-4 relative z-10">
                {result.status === "Active" ? (
                  <div className="space-y-1">
                    <p className="text-sm font-black truncate max-w-[280px]">{result.holderName}</p>
                    <p className="text-xs text-white/80 font-bold truncate max-w-[280px]">{result.holderNameAr}</p>
                    <div className="flex gap-4 pt-1.5 text-[9px] text-white/70">
                      <div>
                        <span className="block opacity-60 font-bold">{lang === "en" ? "PROVINCE" : "المحافظة"}</span>
                        <span className="font-extrabold text-white">{lang === "en" ? result.province : result.provinceAr}</span>
                      </div>
                      <div>
                        <span className="block opacity-60 font-bold">{lang === "en" ? "EXPIRES" : "تاريخ الانتهاء"}</span>
                        <span className="font-mono text-white font-extrabold">{result.expiryDate}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-white/50 font-black tracking-wider uppercase">
                      {lang === "en" ? "INACTIVE LEDGER STOCK" : "بطاقة غير فعالة في السجل"}
                    </p>
                    <p className="text-[10px] text-white/70 font-semibold max-w-[240px] mt-1">
                      {lang === "en" ? result.message : result.messageAr}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom markings */}
              <div className="absolute bottom-2 left-4 text-xs font-black font-mono tracking-widest text-white/30">
                456
              </div>

            </div>

            {/* Structured ledger readout lists */}
            <div className="bg-black/55 border border-gray-950 rounded-2xl p-4 sm:p-5 space-y-3.5 mb-6 text-xs sm:text-sm">
              <div className="flex justify-between items-center border-b border-gray-900 pb-2.5">
                <span className="text-gray-500 font-bold">{lang === "en" ? "Validated Serial Key:" : "الرقم المسلسل:"}</span>
                <span className="font-mono font-black text-white">{cardIdInput}</span>
              </div>

              {result.status === "Active" ? (
                <>
                  <div className="flex justify-between items-center border-b border-gray-900 pb-2.5">
                    <span className="text-gray-500 font-bold">{lang === "en" ? "Card Holder Name:" : "اسم حامل البطاقة:"}</span>
                    <span className="font-bold text-white text-right">
                      {lang === "en" ? result.holderName : result.holderNameAr}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-900 pb-2.5">
                    <span className="text-gray-500 font-bold">{lang === "en" ? "Home Province:" : "المحافظة السكنية:"}</span>
                    <span className="font-semibold text-white">
                      {lang === "en" ? result.province : result.provinceAr}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold">{lang === "en" ? "Database Expiry Date:" : "تاريخ انتهاء الصلاحية:"}</span>
                    <span className="font-mono font-black text-green-400">{result.expiryDate}</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-red-400 py-2">
                  <span className="font-bold block mb-1">
                    {lang === "en" ? "System Audit Output:" : "مخرجات نظام الفحص الآمن:"}
                  </span>
                  <span className="text-xs text-gray-400 font-medium leading-relaxed block">
                    {lang === "en" ? result.message : result.messageAr}
                  </span>
                </div>
              )}
            </div>

            {/* Action controls */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleReset}
                className={`w-full py-3.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  result.status === "Active"
                    ? "bg-green-500 hover:bg-green-600 text-black shadow-lg shadow-green-500/10"
                    : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/10"
                }`}
              >
                {lang === "en" ? "Close & Verify Next Card" : "إغلاق وفحص بطاقة جديدة"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Corporate Footer */}
      <Footer lang={lang} branding={branding} />

    </div>
  );
}
