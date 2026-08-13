import React, { useState, useEffect } from "react";
import { Lock, Shield, Eye, EyeOff, X, ArrowLeft } from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import { Language, Branding } from "../types";
import { translations } from "./translations";

interface SecureAdminRouterProps {
  lang: Language;
  setLang: (lang: Language) => void;
  branding: Branding | null;
  setBranding: (branding: Branding) => void;
}

export default function SecureAdminRouter({
  lang,
  setLang,
  branding,
  setBranding
}: SecureAdminRouterProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "viewer">("admin");
  const [userName, setUserName] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // Login form state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const t = translations[lang];

  // Verify session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("byd-admin-token");
    if (savedToken) {
      fetch("/api/admin/verify-session", {
        headers: { "Authorization": `Bearer ${savedToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsAdminLoggedIn(true);
            setAdminToken(savedToken);
            setUserRole(data.role || "admin");
            setUserName(data.name || data.username || "");
          } else {
            localStorage.removeItem("byd-admin-token");
          }
        })
        .catch(err => {
          console.error("Session verification failure:", err);
        })
        .finally(() => {
          setCheckingSession(false);
        });
    } else {
      setCheckingSession(false);
    }
  }, []);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setLoginError(lang === "en" ? "Credentials cannot be empty." : "لا يمكن ترك حقول الدخول فارغة.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAdminLoggedIn(true);
        setAdminToken(data.token);
        setUserRole(data.role || "admin");
        setUserName(data.name || data.username || "");
        localStorage.setItem("byd-admin-token", data.token);
        setAdminUsername("");
        setAdminPassword("");
      } else {
        setLoginError(lang === "en" ? data.message : (data.messageAr || data.message));
      }
    } catch (err) {
      console.error(err);
      setLoginError(lang === "en" ? "Connection error." : "خطأ في الاتصال بالخادم.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (err) {
      console.error(err);
    }
    setIsAdminLoggedIn(false);
    setAdminToken("");
    setUserRole("admin");
    setUserName("");
    localStorage.removeItem("byd-admin-token");
  };

  const navigateToPublicSite = () => {
    window.location.hash = "";
    window.location.pathname = "/";
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#D30014]/20 border-t-[#D30014] rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Verifying SecurID Session...</p>
        </div>
      </div>
    );
  }

  if (isAdminLoggedIn) {
    return (
      <div className="bg-[#050505] min-h-screen text-white font-sans" id="admin-secured-portal-root">
        <AdminDashboard
          lang={lang}
          setLang={setLang}
          adminToken={adminToken}
          userRole={userRole}
          userName={userName}
          onLogout={handleLogout}
          onGoBack={navigateToPublicSite}
          branding={branding}
          setBranding={setBranding}
        />
      </div>
    );
  }

  // Else, render the isolated elegant administrative login card fullscreen with high contrast red-black presentation
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center p-4 relative" id="isolated-admin-auth-screen">
      
      {/* Floating subtle brand bg text */}
      <div className="absolute top-10 left-10 text-white/5 font-black text-6xl tracking-tighter select-none font-sans">
        BYD CORE
      </div>

      <div className="w-full max-w-md bg-[#121212] border-2 border-[#D30014]/40 rounded-2xl p-6 sm:p-8 relative shadow-2xl shadow-black/50">
        
        {/* Return to Public Button */}
        <button
          onClick={navigateToPublicSite}
          className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-black hover:bg-gray-900 border border-gray-800 rounded-lg text-[10px] sm:text-xs font-bold text-gray-400 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#D30014]" />
          <span>{lang === "en" ? "Public Site" : "الموقع العام"}</span>
        </button>

        {/* Lock/Security Icon banner */}
        <div className="flex flex-col items-center text-center mb-6 mt-4">
          <div className="w-12 h-12 rounded-full bg-[#D30014]/15 border border-[#D30014]/40 text-[#D30014] flex items-center justify-center mb-3 shadow-inner">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">{t.adminTitle}</h3>
          <p className="text-xs text-gray-500 font-bold mt-1 max-w-[280px]">
            {lang === "en" ? "Authorized Personnel Administration Core" : "بوابة الإدارة والتفعيل الحصرية لشركاء الهوية"}
          </p>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              {t.adminUser}
            </label>
            <input
              type="text"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              placeholder={lang === "en" ? "Enter Username" : "أدخل اسم المستخدم"}
              className="w-full px-3.5 py-3 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014] transition-colors"
              id="admin-username-field"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              {t.adminPass}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-3 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014] transition-colors"
                id="admin-password-field"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {loginError && (
            <p className="text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg text-center">
              {loginError}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-[#D30014] hover:bg-[#b00010] text-white font-extrabold rounded-lg text-sm transition-colors shadow-lg shadow-[#D30014]/20 flex items-center justify-center gap-2 cursor-pointer"
              id="submit-login-btn"
            >
              {loginLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{t.adminLoading}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{t.adminLoginBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
