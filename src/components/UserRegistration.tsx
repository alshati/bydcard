import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  CreditCard, 
  UserCheck, 
  HelpCircle, 
  BadgeCheck, 
  Coins, 
  ArrowRight, 
  MapPin,
  CheckCircle,
  Phone,
  QrCode,
  CheckCircle2,
  Building2,
  Lock,
  Mail,
  Loader2
} from "lucide-react";
import { Language } from "../types";
import { translations, provincesList, sectorsList } from "./translations";
import { safeSetLocalStorage } from "../lib/storage";

interface UserRegistrationProps {
  lang: Language;
}

export default function UserRegistration({ lang }: UserRegistrationProps) {
  const t = translations[lang];

  // Active onboarding tab: "b2c" | "b2b"
  const [activeTab, setActiveTab] = useState<"b2c" | "b2b">("b2c");

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
              safeSetLocalStorage('BYD_CARD_TEMPLATE_ACTIVE_STATE', JSON.stringify(data));
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

  // B2C Form states
  const [fullName, setFullName] = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [province, setProvince] = useState("Baghdad");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nearestLandmark, setNearestLandmark] = useState("");
  const [b2cDuration, setB2cDuration] = useState<"6months" | "1year">("6months");
  
  // B2B Form states
  const [companyName, setCompanyName] = useState("");
  const [companySector, setCompanySector] = useState("Restaurant");
  const [customSector, setCustomSector] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [companyUsername, setCompanyUsername] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyProvince, setCompanyProvince] = useState("Baghdad");
  const [companyDiscount, setCompanyDiscount] = useState("10%");
  const [companyLogoBase64, setCompanyLogoBase64] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLat, setCompanyLat] = useState("");
  const [companyLng, setCompanyLng] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === "en" ? "Geolocation is not supported by your browser." : "خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCompanyLat(lat.toFixed(6));
        setCompanyLng(lng.toFixed(6));

        try {
          const apiKey =
            process.env.GOOGLE_MAPS_PLATFORM_KEY ||
            (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
            (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
            "";

          let addressResult = "";

          if (apiKey && apiKey !== "YOUR_API_KEY") {
            const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=${lang === "en" ? "en" : "ar"}`;
            const res = await fetch(geoUrl);
            if (res.ok) {
              const data = await res.json();
              if (data.results && data.results.length > 0) {
                addressResult = data.results[0].formatted_address || "";
              }
            }
          }

          if (!addressResult) {
            const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${lang === "en" ? "en" : "ar"}`;
            const res = await fetch(nomUrl, { headers: { "User-Agent": "BYD-Card-App/1.0" } });
            if (res.ok) {
              const data = await res.json();
              addressResult = data.display_name || "";
            }
          }

          if (addressResult) {
            setCompanyAddress(addressResult);

            // Auto-detect matching province
            const matchedProv = provincesList.find((p) =>
              addressResult.toLowerCase().includes(p.en.toLowerCase()) ||
              addressResult.includes(p.ar)
            );
            if (matchedProv) {
              setCompanyProvince(matchedProv.en);
            }
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setIsLocating(false);
        alert(lang === "en" ? "Could not retrieve GPS location. Please enter coordinates manually or choose province." : "تعذر الحصول على الموقع الجغرافي. يرجى إدخال الإحداثيات يدوياً.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submission & Result States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successB2C, setSuccessB2C] = useState<any | null>(null);
  const [successB2B, setSuccessB2B] = useState<boolean>(false);
  const [errorText, setErrorText] = useState("");

  const handleB2CSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !fullNameAr.trim() || !phoneNumber.trim() || !nearestLandmark.trim()) {
      setErrorText(lang === "en" ? "Please fill out all required fields." : "يرجى ملء جميع الحقول المطلوبة بما في ذلك أقرب نقطة دالة.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");

    const provObj = provincesList.find(p => p.en === province);
    const provinceAr = provObj ? provObj.ar : province;

    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const cardId = `BYD-2026-${randomSuffix}`;

    const isOneYear = b2cDuration === "1year";
    const feePaidIqd = isOneYear ? 50000 : 25000;
    const feePaidUsd = isOneYear ? 50 : 25;
    const durationMonths = isOneYear ? 12 : 6;
    const daysAdd = isOneYear ? 365 : 180;

    const body = {
      fullName: fullName.trim(),
      fullNameAr: fullNameAr.trim(),
      province,
      provinceAr,
      cardId,
      status: "Active",
      feePaidIqd,
      feePaidUsd,
      durationMonths,
      nearestLandmark: nearestLandmark.trim(),
      registrationDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + daysAdd * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok) {
        try {
          await fetch("/api/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cardId: cardId,
              status: "Active",
              memberId: data.member?.id || ("m-" + Date.now())
            })
          });
        } catch (cardErr) {
          console.error("Auto card registration error:", cardErr);
        }

        const registered = data.member || body;
        setSuccessB2C(registered);
        try {
          // Sync byd-custom-members
          const current = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
          const exists = current.some((m: any) => m.cardId === registered.cardId);
          if (!exists) {
            current.push(registered);
            localStorage.setItem("byd-custom-members", JSON.stringify(current));
          }

          // Sync BYD_USERS as per critical data requirements
          const usersArray = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
          const existsInUsers = usersArray.some((m: any) => m.cardId === registered.cardId);
          if (!existsInUsers) {
            usersArray.push(registered);
            localStorage.setItem("BYD_USERS", JSON.stringify(usersArray));
          }

          // Trigger dynamic layout update
          window.dispatchEvent(new Event("storage-sync-updated"));
        } catch (e) {
          console.error("Local storage B2C backup error:", e);
        }
        setFullName("");
        setFullNameAr("");
        setPhoneNumber("");
        setNearestLandmark("");
      } else {
        setErrorText(data.message || "Failed to create membership");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setErrorText(lang === "en" ? "Network error registering membership." : "خطأ في الاتصال بالشبكة أثناء التسجيل.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleB2BSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !corporateEmail.trim() || !companyUsername.trim() || !companyPassword.trim() || !companyPhone.trim()) {
      setErrorText(lang === "en" ? "Please fill out all B2B required fields." : "يرجى ملء جميع الحقول المطلوبة لتسجيل الشراكة.");
      return;
    }

    if (companySector === "Other" && !customSector.trim()) {
      setErrorText(lang === "en" ? "Please enter your company specialization." : "يرجى كتابة التخصص الخاص بالشركة.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");

    const provObj = provincesList.find(p => p.en === companyProvince);
    const provinceAr = provObj ? provObj.ar : companyProvince;

    let sectorEn = companySector;
    let sectorAr = companySector;

    if (companySector === "Other") {
      sectorEn = customSector.trim();
      sectorAr = customSector.trim();
    } else {
      const foundSec = sectorsList.find(s => s.en === companySector);
      if (foundSec) {
        sectorEn = foundSec.en;
        sectorAr = foundSec.ar;
      }
    }

    const body = {
      companyName: companyName.trim(),
      companyNameAr: companyName.trim(),
      sector: sectorEn,
      sectorAr: sectorAr,
      email: corporateEmail.trim(),
      username: companyUsername.trim(),
      password: companyPassword,
      phone: companyPhone.trim(),
      province: companyProvince,
      provinceAr,
      feePaidIqd: 150000,
      feePaidUsd: 100,
      status: "Active",
      logoUrl: companyLogoBase64 || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop",
      discount: companyDiscount || "10%",
      discountEn: companyDiscount || "10%",
      discountAr: companyDiscount || "10%",
      lat: companyLat ? parseFloat(companyLat) : undefined,
      lng: companyLng ? parseFloat(companyLng) : undefined,
      addressEn: companyAddress.trim() || `${companyProvince}, Iraq`,
      addressAr: companyAddress.trim() || `${provinceAr}، العراق`
    };

    try {
      const response = await fetch("/api/partners/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessB2B(true);
        try {
          const registered = {
            ...(data.partner || body),
            feePaidIqd: 150000,
            feePaidUsd: 100,
            status: "Active"
          };

          // Sync byd-custom-partners
          const current = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
          const exists = current.some((p: any) => 
            (p.username && registered.username && p.username.toLowerCase() === registered.username.toLowerCase()) || 
            (p.companyName && registered.companyName && p.companyName.toLowerCase() === registered.companyName.toLowerCase())
          );
          if (!exists) {
            current.push(registered);
            safeSetLocalStorage("byd-custom-partners", JSON.stringify(current));
          }

          // Sync BYD_COMPANIES as per critical requirements
          const companiesArray = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
          const existsInCompanies = companiesArray.some((p: any) => 
            (p.username && registered.username && p.username.toLowerCase() === registered.username.toLowerCase()) || 
            (p.companyName && registered.companyName && p.companyName.toLowerCase() === registered.companyName.toLowerCase())
          );
          if (!existsInCompanies) {
            companiesArray.push(registered);
            safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(companiesArray));
          }

          // Trigger dynamic layout update
          window.dispatchEvent(new Event("storage-sync-updated"));
        } catch (e) {
          console.error("Local storage B2B backup error:", e);
        }
        setCompanyName("");
        setCorporateEmail("");
        setCompanyUsername("");
        setCompanyPassword("");
        setCompanyPhone("");
        setCompanyDiscount("10%");
        setCompanyLogoBase64("");
      } else {
        setErrorText(lang === "en" ? (data.message || "Failed to register vendor") : (data.messageAr || "فشل تسجيل الشراكة"));
      }
    } catch (err) {
      console.error("B2B registration error:", err);
      setErrorText(lang === "en" ? "Network error registering partner." : "خطأ في الاتصال بالشبكة أثناء تسجيل الشركة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="registration" className="py-20 bg-gradient-to-b from-[#050505] to-[#0a0a0a] border-t border-gray-900 relative overflow-hidden">
      
      {/* Decorative background gradients */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-[#D30014]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Title Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D30014]/10 border border-[#D30014]/20 rounded-full text-xs text-[#D30014] font-bold uppercase tracking-wider mb-4">
            <CreditCard className="w-4 h-4" />
            <span>{lang === "en" ? "Instant Premium Onboarding" : "بوابة الاشتراك الفوري والشراكات"}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            {lang === "en" ? "JOIN THE BYD LOOP NETWORK" : "انضم إلى شبكة كارد بي واي دي"}
          </h2>
          
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            {lang === "en"
              ? "Register instantly as an individual customer to access up to 50% lifestyle discounts, or register your brand to connect with thousands of active cardholders."
              : "اشترك فوراً كفرد للحصول على خصومات لغاية 50%، أو سجل كشريك تجاري للوصول إلى آلاف العملاء النشطين وزيادة مبيعاتك."}
          </p>
        </div>

        {/* Toggle Onboarding Tabs */}
        <div className="flex max-w-md mx-auto bg-[#121212] border border-gray-800 p-1.5 rounded-2xl mb-12 shadow-inner">
          <button
            onClick={() => {
              setActiveTab("b2c");
              setErrorText("");
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "b2c"
                ? "bg-[#D30014] text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-4.5 h-4.5" />
            <span>{lang === "en" ? "Register as User (B2C)" : "التسجيل كفرد (B2C)"}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab("b2b");
              setErrorText("");
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "b2b"
                ? "bg-[#D30014] text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Building2 className="w-4.5 h-4.5" />
            <span>{lang === "en" ? "Register as Company (B2B)" : "التسجيل كشريك (B2B)"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Benefits Card depending on Active Tab */}
          <div className="lg:col-span-5 space-y-6">
            
            {activeTab === "b2c" ? (
              <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D30014]/5 rounded-bl-full pointer-events-none"></div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#D30014] block mb-1">
                      {b2cDuration === "1year"
                        ? (lang === "en" ? "1-YEAR MEMBERSHIP FEE" : "قيمة الاشتراك لـ سنة واحدة")
                        : (lang === "en" ? "6-MONTH MEMBERSHIP FEE" : "قيمة الاشتراك لـ 6 أشهر")}
                    </span>
                    <h3 className="text-3xl font-black text-white">
                      {b2cDuration === "1year" ? "50,000 IQD" : "25,000 IQD"}
                    </h3>
                  </div>
                </div>

                <div className="space-y-4 border-t border-gray-900 pt-5">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">
                        {lang === "en" ? "Physical Premium NFC Card" : "بطاقة بلاستيكية فاخرة بتقنية NFC"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lang === "en" ? "High-end layout printed with custom unique serial and security QR code." : "تصميم أنيق مطبوع يحتوي على الرمز السري و كود التحقق السريع للتوصيل الفوري."}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">
                        {lang === "en" ? "Unmatched Discount Network" : "شبكة خصومات غير مسبوقة"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lang === "en" ? "Direct benefits starting from 5% to 50% on selected stores, hospitals, and colleges." : "خصومات فورية وحقيقية تبدأ من 5% لغاية 50% لدى المتاجر والشركات المتعاقدة في العراق."}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">
                        {b2cDuration === "1year"
                          ? (lang === "en" ? "1 Full Year of Active Savings" : "سنة واحدة كاملة من التوفير")
                          : (lang === "en" ? "6 Months of Active Savings" : "6 أشهر كاملة من التوفير")}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lang === "en" ? "Fully activated from the dynamic registration ledger date." : "تفعيل فوري وتغطية شاملة طوال فترة الاشتراك المقررة."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D30014]/5 rounded-bl-full pointer-events-none"></div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#D30014] block mb-1">
                      {lang === "en" ? "ANNUAL B2B COMPANY CONTRACT" : "قيمة عقد الشراكة السنوي"}
                    </span>
                    <h3 className="text-3xl font-black text-white">150,000 IQD <span className="text-xs text-gray-500 font-bold">/ {lang === "en" ? "Year" : "سنة"}</span></h3>
                  </div>
                </div>

                <div className="space-y-4 border-t border-gray-900 pt-5">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#D30014] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">
                        {lang === "en" ? "Merchant Verification System" : "نظام الفحص للشركاء والمتاجر"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lang === "en" ? "Get full access to the Secure Verification Engine at /partners to audit customer cards instantly via camera scan." : "الحصول على وصول كامل إلى نظام الفحص والتحقق في صفحة الشركاء لمسح الكروت عبر كاميرا جهازك."}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#D30014] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">
                        {lang === "en" ? "Interactive Advertising & Exposure" : "ترويج وإعلان تفاعلي متقدم"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lang === "en" ? "Your company name, discount, sector, and commercial video listing will be broadcasted to all active members." : "عرض علامتك التجارية، تصنيفك، خصمك، والفيديو الترويجي الخاص بك أمام آلاف المشتركين النشطين."}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#D30014] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">
                        {lang === "en" ? "Zero Transaction Fees" : "بدون رسوم على المعاملات أو الخصم"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lang === "en" ? "Keep 100% of your customer sales value. No sales cuts or platform commissions." : "احتفظ بكافة عوائد مبيعاتك وعملائك. لا نأخذ أي عمولة أو نسبة على الخصومات الممنوحة."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live active indicator */}
            <div className="bg-black/40 border border-gray-900 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-ping flex-shrink-0"></div>
              <p className="text-xs text-gray-400 font-bold">
                {lang === "en" 
                  ? "Live Feed: 147 members and 14 new corporate partners approved in Iraq in the last 24 hours."
                  : "مباشر: نشاط متزايد مع تسجيل 147 مشتركاً و 14 شريكاً تجارياً جديداً معتمداً في المحافظات."}
              </p>
            </div>
          </div>

          {/* Right Column: Unified Double Onboarding Forms */}
          <div className="lg:col-span-7 bg-[#121212] border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            
            {/* ----------------- TAB A: B2C REGISTER & SUCCESS ENVIRONMENT ----------------- */}
            {activeTab === "b2c" && (
              successB2C ? (
                <div className="text-center py-6 space-y-6 animate-fade-in" id="reg-b2c-success">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-green-400">
                      {lang === "en" ? "MEMBERSHIP REGISTERED!" : "تم تسجيل طلبك بنجاح!"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 px-4 leading-relaxed font-bold">
                      {lang === "en" 
                        ? "Thank you! Your premium physical BYD card will be delivered via our courier. Our agent will contact you soon."
                        : "شكرًا لك! سيتم تسليم بطاقة BYD الفاخرة الخاصة بك عبر المندوب في أقرب وقت. سيتصل بك مندوبنا قريباً لتأكيد التوصيل."}
                    </p>
                  </div>

                  {/* Newly Minted Card Visual */}
                  <div className="relative w-full max-w-sm aspect-[1.58/1] rounded-2xl text-white p-6 shadow-2xl mx-auto border border-white/20 select-none overflow-hidden flex flex-col justify-between text-left">
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
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D30014] to-[#7f000b] z-0" />
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/90 opacity-90 flex items-end z-10">
                          <svg className="w-full h-full text-white/5 fill-current" viewBox="0 0 300 60" preserveAspectRatio="none">
                            <path d="M0,60 L300,60 L300,45 L290,45 L285,35 L280,45 L260,45 L255,10 L250,10 L248,20 L240,20 L235,45 L215,45 L210,30 L205,45 L180,45 L175,25 L160,25 L155,45 L140,45 C140,30 120,30 120,45 L105,45 L100,5 L95,5 L90,20 L80,20 L75,45 L50,45 L45,15 L40,15 L35,45 L20,45 L15,35 L10,45 Z" />
                          </svg>
                        </div>
                      </>
                    )}
 
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <span className="text-sm font-black tracking-tighter block leading-none">BYD CARD</span>
                        <span className="text-[7px] tracking-widest text-white/60 uppercase">BUILD YOUR DREAM</span>
                      </div>
                      <span className="text-[10px] font-mono font-black bg-black/40 px-2 py-0.5 rounded text-[#D30014]">
                        {successB2C.cardId}
                      </span>
                    </div>

                    <div className="mt-2 relative z-10">
                      <p className="text-sm font-extrabold truncate max-w-[260px]">{successB2C.fullName}</p>
                      <p className="text-xs text-white/80 font-bold truncate max-w-[260px]">{successB2C.fullNameAr}</p>
                      
                      <div className="flex gap-4 pt-2 text-[8px] text-white/70">
                        <div>
                          <span className="block opacity-60 font-bold">{lang === "en" ? "PROVINCE" : "المحافظة"}</span>
                          <span className="font-extrabold text-white">{lang === "en" ? successB2C.province : successB2C.provinceAr}</span>
                        </div>
                        <div>
                          <span className="block opacity-60 font-bold">{lang === "en" ? "VAL THRU" : "تاريخ الانتهاء"}</span>
                          <span className="font-mono text-white font-extrabold">{successB2C.expiryDate}</span>
                        </div>
                        <div>
                          <span className="block opacity-60 font-bold">{lang === "en" ? "DURATION" : "المدة"}</span>
                          <span className="font-extrabold text-green-400">
                            {successB2C.durationMonths === 12 || successB2C.feePaidIqd === 50000
                              ? (lang === "en" ? "1 Year" : "سنة واحدة")
                              : (lang === "en" ? "6 Months" : "6 أشهر")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSuccessB2C(null)}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-gray-950 border border-gray-800 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {lang === "en" ? "Register Another Account" : "تسجيل مشترك جديد"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleB2CSubmit} className="space-y-6">
                  <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-gray-900 pb-3">
                    <Sparkles className="w-5 h-5 text-[#D30014]" />
                    {lang === "en" ? "Register as User (B2C)" : "طلب تسجيل عضوية جديدة للأفراد"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Full Name (English) *" : "الاسم الكامل (بالإنجليزي) *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ali Ahmed"
                        className="w-full px-3.5 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Full Name (Arabic) *" : "الاسم الكامل (بالعربي) *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={fullNameAr}
                        onChange={(e) => setFullNameAr(e.target.value)}
                        placeholder="مثال: علي احمد"
                        className="w-full px-3.5 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Home Province *" : "المحافظة السكنية *"}
                      </label>
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3.5 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm cursor-pointer"
                      >
                        {provincesList.map((p, idx) => (
                          <option key={idx} value={p.en}>
                            {lang === "en" ? p.en : p.ar}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Contact Mobile Number *" : "رقم الهاتف المحمول *"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="077XXXXXXXX"
                          className="w-full pl-10 pr-3.5 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">
                      {lang === "en" ? "Select Subscription Duration *" : "اختر مدة الاشتراك *"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setB2cDuration("6months")}
                        className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                          b2cDuration === "6months"
                            ? "bg-[#D30014]/15 border-[#D30014] text-white shadow-lg shadow-[#D30014]/10"
                            : "bg-black border-gray-800 text-gray-400 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className="font-black text-sm">{lang === "en" ? "6 Months" : "6 أشهر"}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${b2cDuration === "6months" ? "border-[#D30014] bg-[#D30014]" : "border-gray-600"}`}>
                            {b2cDuration === "6months" && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs font-extrabold text-green-400">25,000 IQD</span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            {lang === "en" ? "6 Months from registration" : "6 أشهر من تاريخ التسجيل"}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setB2cDuration("1year")}
                        className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                          b2cDuration === "1year"
                            ? "bg-[#D30014]/15 border-[#D30014] text-white shadow-lg shadow-[#D30014]/10"
                            : "bg-black border-gray-800 text-gray-400 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className="font-black text-sm">{lang === "en" ? "1 Year" : "سنة واحدة"}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${b2cDuration === "1year" ? "border-[#D30014] bg-[#D30014]" : "border-gray-600"}`}>
                            {b2cDuration === "1year" && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs font-extrabold text-green-400">50,000 IQD</span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            {lang === "en" ? "1 Year from registration" : "سنة واحدة من تاريخ التسجيل"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                      {lang === "en" ? "Nearest Landmark (for delivery/verification) *" : "أقرب نقطة دالة (للتوصيل والتحقق) *"}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                        <MapPin className="w-4 h-4 text-[#D30014]" />
                      </div>
                      <input
                        type="text"
                        required
                        value={nearestLandmark}
                        onChange={(e) => setNearestLandmark(e.target.value)}
                        placeholder={lang === "en" ? "e.g. Near Dijlah Mall or Baghdad University" : "مثال: قرب دجلة مول أو خلف جامعة بغداد"}
                        className="w-full pl-10 pr-3.5 py-3 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-black/50 border border-gray-900 rounded-2xl p-4 text-xs space-y-2">
                    <div className="flex justify-between items-center text-gray-400">
                      <span>{lang === "en" ? "BYD NFC Serial Card" : "كارد BYD الفاخر"}</span>
                      <span className="text-white font-bold">15,000 IQD</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>
                        {b2cDuration === "1year"
                          ? (lang === "en" ? "1-Year Database Integration & License" : "ترخيص قاعدة البيانات والخصومات لـ سنة واحدة")
                          : (lang === "en" ? "6-Month Database Integration & License" : "ترخيص قاعدة البيانات والخصومات لـ 6 أشهر")}
                      </span>
                      <span className="text-white font-bold">{b2cDuration === "1year" ? "35,000 IQD" : "10,000 IQD"}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-900 text-[#D30014] font-black text-sm">
                      <span>{lang === "en" ? "Total Due (Upon Delivery):" : "مجموع المستحق (عند التسليم):"}</span>
                      <span>{b2cDuration === "1year" ? "50,000 IQD" : "25,000 IQD"}</span>
                    </div>
                  </div>

                  {errorText && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
                      {errorText}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#D30014] hover:bg-[#b00010] text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-[#D30014]/15 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>{lang === "en" ? "Securely Registering Account..." : "جاري تسجيل حسابك..."}</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-5 h-5" />
                        <span>{lang === "en" ? "Subscribe & Generate BYD Card" : "إتمام الاشتراك وتوليد كارد BYD"}</span>
                      </>
                    )}
                  </button>
                </form>
              )
            )}

            {/* ----------------- TAB B: B2B REGISTER & SUCCESS ENVIRONMENT ----------------- */}
            {activeTab === "b2b" && (
              successB2B ? (
                <div className="text-center py-6 space-y-6 animate-fade-in" id="reg-b2b-success">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto mb-2">
                    <Building2 className="w-10 h-10" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-green-400">
                      {lang === "en" ? "B2B PARTNERSHIP SUCCESSFUL!" : "تم تسجيل الشراكة بنجاح!"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 px-4 leading-relaxed font-bold">
                      {lang === "en" 
                        ? "Registration successful! Use your credentials to log into the Partner Portal at /partners to verify customer cards."
                        : "تم تسجيل شركتك بنجاح في النظام! يمكنك الآن استخدام بيانات الدخول لتسجيل الدخول في بوابة الشركاء على الرابط /partners والبدء بالتحقق من بطاقات المشتركين."}
                    </p>
                  </div>

                  <div className="bg-black/60 border border-gray-800 rounded-2xl p-5 max-w-sm mx-auto text-xs text-gray-400">
                    <p className="font-bold text-white mb-2">{lang === "en" ? "Merchant Quick Access Link:" : "رابط الوصول السريع للمتجر:"}</p>
                    <a
                      href="/partners"
                      className="text-[#D30014] font-black underline hover:text-red-400 transition-colors text-sm"
                    >
                      {window.location.origin}/partners
                    </a>
                  </div>

                  <button
                    onClick={() => setSuccessB2B(false)}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-gray-950 border border-gray-800 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {lang === "en" ? "Register Another Company" : "تسجيل شركة شريكة أخرى"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleB2BSubmit} className="space-y-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-gray-900 pb-3">
                    <Building2 className="w-5 h-5 text-[#D30014]" />
                    {lang === "en" ? "Register as Company (B2B)" : "تسجيل شركة شريكة جديدة (B2B)"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Company Name *" : "اسم الشركة / العلامة التجارية *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Al-Taj Restaurant"
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Commercial Sector / Specialization *" : "نوع النشاط / القطاع التجاري *"}
                      </label>
                      <select
                        value={companySector}
                        onChange={(e) => setCompanySector(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm cursor-pointer"
                      >
                        {sectorsList.map((sec, idx) => (
                          <option key={idx} value={sec.en}>
                            {lang === "en" ? `${sec.en} (${sec.ar})` : `${sec.ar} (${sec.en})`}
                          </option>
                        ))}
                      </select>

                      {companySector === "Other" && (
                        <div className="mt-3 animate-fade-in">
                          <label className="block text-xs text-[#D30014] font-bold mb-1.5 uppercase tracking-wider">
                            {lang === "en" ? "Specify Company Specialization *" : "اكتب تخصص الشركة بالتفصيل *"}
                          </label>
                          <input
                            type="text"
                            required
                            value={customSector}
                            onChange={(e) => setCustomSector(e.target.value)}
                            placeholder={lang === "en" ? "e.g. Interior Design Studio, Solar Energy, Law Firm..." : "مثال: استوديو تصميم داخلي، طاقة شمسية، مكتب محاماة، استشارات..."}
                            className="w-full px-3.5 py-2.5 bg-black border border-[#D30014]/70 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Corporate Email *" : "البريد الإلكتروني للشركة *"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={corporateEmail}
                          onChange={(e) => setCorporateEmail(e.target.value)}
                          placeholder="info@brand.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Corporate Phone Number *" : "رقم هاتف التواصل للشركة *"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="077XXXXXXXX"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Choose Username *" : "اسم مستخدم لوحة الشركاء *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={companyUsername}
                        onChange={(e) => setCompanyUsername(e.target.value)}
                        placeholder="e.g. brandpartner"
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Secure Password *" : "رقم سري آمن *"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type="password"
                          required
                          value={companyPassword}
                          onChange={(e) => setCompanyPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                      {lang === "en" ? "Corporate Home Province *" : "محافظة مقر العمل للشركة *"}
                    </label>
                    <select
                      value={companyProvince}
                      onChange={(e) => setCompanyProvince(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm cursor-pointer"
                    >
                      {provincesList.map((p, idx) => (
                        <option key={idx} value={p.en}>
                          {lang === "en" ? p.en : p.ar}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Address & Map Pin Coordinates */}
                  <div className="p-4 bg-gray-950/80 border border-gray-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white font-bold flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#D30014]" />
                        {lang === "en" ? "Store / Branch Location on Google Maps" : "موقع المحل / الفرع على خريطة التغطية"}
                      </label>
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                        className="text-[11px] px-2.5 py-1 bg-[#D30014]/10 hover:bg-[#D30014]/20 border border-[#D30014]/30 text-[#D30014] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isLocating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {lang === "en" ? "Locating..." : "جاري جلب الموقع والعنوان..."}
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3 h-3" />
                            {lang === "en" ? "Use GPS" : "تحديد بالموقع الحالي"}
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder={lang === "en" ? "Detailed Address e.g. Al-Mansour St. 14, Baghdad" : "العنوان التفصيلي مثل: المنصور، شارع 14، قرب ساحة الاحتفالات"}
                        className="w-full px-3.5 py-2 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[10px] text-gray-500 font-bold mb-1">
                          {lang === "en" ? "Latitude (lat)" : "خط العرض (Latitude)"}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={companyLat}
                          onChange={(e) => setCompanyLat(e.target.value)}
                          placeholder="e.g. 33.3152"
                          className="w-full px-3 py-1.5 bg-black border border-gray-800 rounded-lg text-white font-mono text-xs outline-none focus:border-[#D30014]"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500 font-bold mb-1">
                          {lang === "en" ? "Longitude (lng)" : "خط الطول (Longitude)"}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={companyLng}
                          onChange={(e) => setCompanyLng(e.target.value)}
                          placeholder="e.g. 44.3661"
                          className="w-full px-3 py-1.5 bg-black border border-gray-800 rounded-lg text-white font-mono text-xs outline-none focus:border-[#D30014]"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {lang === "en" 
                        ? "* Leaving coordinates blank will automatically place your branch pin in your selected province center."
                        : "* ترك الإحداثيات فارغة سيقوم بوضع موقع المحل تلقائياً في مركز المحافظة المختارة."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Discount Percentage / نسبة الخصم *" : "نسبة الخصم / Discount Percentage *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={companyDiscount}
                        onChange={(e) => setCompanyDiscount(e.target.value)}
                        placeholder="e.g. 10%, 15%"
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-xl text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                        {lang === "en" ? "Upload Company Logo / رفع شعار الشركة *" : "رفع شعار الشركة / Upload Company Logo *"}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="company-logo-input"
                        />
                        <label
                          htmlFor="company-logo-input"
                          className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-[#D30014]/50 hover:bg-black/80 rounded-xl text-xs font-bold text-gray-300 cursor-pointer transition-all active:scale-95 flex items-center justify-center min-h-[42px] flex-grow"
                        >
                          {lang === "en" ? "Choose Image" : "اختر صورة"}
                        </label>
                        {companyLogoBase64 && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-800 bg-black flex-shrink-0">
                            <img src={companyLogoBase64} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {errorText && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
                      {errorText}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#D30014] hover:bg-[#b00010] text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-[#D30014]/15 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>{lang === "en" ? "Submitting Corporate Contract..." : "جاري تقديم طلب الشراكة..."}</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-5 h-5" />
                        <span>{lang === "en" ? "Register Partner Account" : "تسجيل كشريك تجاري معتمد"}</span>
                      </>
                    )}
                  </button>
                </form>
              )
            )}

          </div>

        </div>

      </div>

    </section>
  );
}
