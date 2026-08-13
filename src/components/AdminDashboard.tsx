import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Video, 
  MapPin, 
  RefreshCw, 
  LogOut, 
  CheckCircle, 
  VideoOff, 
  Languages, 
  ArrowLeft, 
  FileSpreadsheet, 
  CreditCard, 
  Download, 
  Eye, 
  Shield, 
  Copy, 
  Check, 
  FileText, 
  UserCheck, 
  X 
} from "lucide-react";
import { translations, provincesList, sectorsList } from "./translations";
import { Member, Partner, FinancialStats, Language, Branding, ViewerAccount } from "../types";
import { safeSetLocalStorage } from "../lib/storage";
import systemLogo from "../assets/images/byd_card_logo_exact_1784543953366.jpg";

interface AdminDashboardProps {
  lang: Language;
  setLang: (lang: Language) => void;
  adminToken: string;
  onLogout: () => void;
  onGoBack: () => void;
  branding: Branding | null;
  setBranding: React.Dispatch<React.SetStateAction<Branding | null>>;
  userRole?: "admin" | "viewer";
  userName?: string;
}

export default function AdminDashboard({ 
  lang, 
  setLang, 
  adminToken, 
  onLogout, 
  onGoBack,
  branding,
  setBranding,
  userRole = "admin",
  userName = ""
}: AdminDashboardProps) {
  const t = translations[lang] || translations.ar;
  const isViewer = userRole === "viewer";

  // Tab State
  const [activeTab, setActiveTab] = useState<"analytics" | "members" | "partners" | "branding" | "cards" | "viewers">("analytics");

  // Data States
  const [members, setMembers] = useState<Member[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [localMembersList, setLocalMembersList] = useState<any[]>([]);
  const [localPartnersList, setLocalPartnersList] = useState<any[]>([]);
  const [financials, setFinancials] = useState<FinancialStats | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Viewer Accounts State
  const [viewerAccounts, setViewerAccounts] = useState<ViewerAccount[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("byd-viewer-accounts") || "[]");
    } catch {
      return [];
    }
  });
  const [viewerForm, setViewerForm] = useState({ username: "", password: "", name: "", notes: "" });
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerMsg, setViewerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Media & Template States
  const [activeTemplate, setActiveTemplate] = useState<{ cardDesignBase64: string; type?: "image" | "video" } | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<"image" | "video">("image");
  const [cardMedia, setCardMedia] = useState<{ type: "image" | "video"; data: string } | null>(null);

  // Forms Visibility
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({
    fullName: "",
    fullNameAr: "",
    cardId: "",
    province: "Baghdad",
    status: "Active" as "Active" | "Inactive",
    feePaidIqd: 25000,
    feePaidUsd: 25,
    nearestLandmark: "",
    durationMonths: 6,
    registrationDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  });

  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    companyName: "",
    companyNameAr: "",
    sector: "Restaurant",
    logoUrl: "",
    promoVideoUrl: "",
    province: "Baghdad",
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "Active" as "Active" | "Inactive",
    feePaidIqd: 150000,
    feePaidUsd: 100,
    username: "",
    password: "",
    email: "",
    phone: "",
    discount: "10%",
    discountEn: "10%",
    discountAr: "10%"
  });

  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [cardForm, setCardForm] = useState({ cardId: "", status: "Active" as "Active" | "Inactive", memberId: "" });

  const [brandingForm, setBrandingForm] = useState({
    company1Name: "", company1NameAr: "", company1Desc: "", company1DescAr: "", company1Logo: "",
    company2Name: "", company2NameAr: "", company2Desc: "", company2DescAr: "", company2Logo: ""
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Sync Local Storage Lists
  const updateLocalLists = () => {
    try {
      const deletedPartners = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]").map((s: string) => String(s).toLowerCase());
      const deletedMembers = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]").map((s: string) => String(s).toLowerCase());

      const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
      const combinedMembers = [...m1];
      m2.forEach((m: any) => {
        if (m && m.cardId && !combinedMembers.some((existing: any) => existing.cardId === m.cardId)) {
          combinedMembers.push(m);
        }
      });

      const filteredMembersList = combinedMembers.filter((m: any) => {
        const id = (m.id || "").toLowerCase();
        const cardId = (m.cardId || "").toLowerCase();
        return !deletedMembers.includes(id) && !deletedMembers.includes(cardId);
      });

      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const combinedPartners = [...p1];
      p2.forEach((p: any) => {
        if (p && !combinedPartners.some((existing: any) => existing.username === p.username || existing.companyName === p.companyName)) {
          combinedPartners.push(p);
        }
      });

      const filteredPartnersList = combinedPartners.filter((p: any) => {
        const id = (p.id || "").toLowerCase();
        const username = (p.username || "").toLowerCase();
        const companyName = (p.companyName || "").toLowerCase();
        return !deletedPartners.includes(id) && !deletedPartners.includes(username) && !deletedPartners.includes(companyName);
      });

      setLocalMembersList(filteredMembersList);
      setLocalPartnersList(filteredPartnersList);
    } catch (e) {
      console.error("Local storage list update error:", e);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    updateLocalLists();
    try {
      const [membersRes, partnersRes, finRes, cardsRes] = await Promise.all([
        fetch("/api/members").catch(() => null),
        fetch("/api/partners").catch(() => null),
        fetch("/api/financials").catch(() => null),
        fetch("/api/cards").catch(() => null)
      ]);

      if (membersRes?.ok) setMembers(await membersRes.json());
      if (partnersRes?.ok) setPartners(await partnersRes.json());
      if (finRes?.ok) setFinancials(await finRes.json());
      if (cardsRes?.ok) setCards(await cardsRes.json());
    } catch (err) {
      console.error("Administrative data fetch error:", err);
    } finally {
      setIsLoading(false);
    }

    if (!isViewer) {
      try {
        const viewersRes = await fetch("/api/admin/viewers", {
          headers: { "Authorization": `Bearer ${adminToken}` }
        });
        if (viewersRes.ok) {
          const fetchedViewers = await viewersRes.json();
          if (Array.isArray(fetchedViewers)) {
            setViewerAccounts(fetchedViewers);
            safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(fetchedViewers));
          }
        }
      } catch (viewersErr) {
        console.error("Viewer accounts fetch error:", viewersErr);
      }
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener("storage-sync-updated", updateLocalLists);
    return () => window.removeEventListener("storage-sync-updated", updateLocalLists);
  }, []);

  const isPartnerActive = (p: any) => !p.status || String(p.status).toLowerCase() === "active" || String(p.status).toLowerCase() === "نشط";
  const isMemberActive = (m: any) => !m.status || String(m.status).toLowerCase() === "active" || String(m.status).toLowerCase() === "نشط";

  const allPartners = React.useMemo(() => {
    const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]").map((s: string) => String(s).toLowerCase());
    const isDeleted = (p: any) => {
      const cn = (p.companyName || "").toLowerCase();
      const un = (p.username || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return deletedList.includes(cn) || deletedList.includes(un) || deletedList.includes(id);
    };

    const list: Partner[] = partners.filter(sp => !isDeleted(sp));
    localPartnersList.forEach((lp: any) => {
      if (isDeleted(lp)) return;
      const idx = list.findIndex((sp: any) => 
        (lp.id && sp.id && lp.id === sp.id) ||
        (lp.username && sp.username && lp.username.toLowerCase() === sp.username.toLowerCase()) ||
        (lp.companyName && sp.companyName && lp.companyName.toLowerCase() === sp.companyName.toLowerCase())
      );
      if (idx > -1) {
        list[idx] = { ...list[idx], ...lp };
      } else {
        list.push(lp);
      }
    });
    return list;
  }, [partners, localPartnersList]);

  const allMembers = React.useMemo(() => {
    const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]").map((s: string) => String(s).toLowerCase());
    const isDeleted = (m: any) => {
      const cardId = (m.cardId || "").toLowerCase();
      const id = (m.id || "").toLowerCase();
      return deletedList.includes(cardId) || deletedList.includes(id);
    };

    const list: Member[] = members.filter(sm => !isDeleted(sm));
    localMembersList.forEach((lm: any) => {
      if (isDeleted(lm)) return;
      const idx = list.findIndex((sm: any) => 
        (lm.id && sm.id && lm.id === sm.id) ||
        (lm.cardId && sm.cardId && lm.cardId.toLowerCase() === sm.cardId.toLowerCase())
      );
      if (idx > -1) {
        list[idx] = { ...list[idx], ...lm };
      } else {
        list.push(lm);
      }
    });
    return list;
  }, [members, localMembersList]);

  const activeLocalMembers = allMembers.filter(isMemberActive);
  const activeLocalPartners = allPartners.filter(isPartnerActive);

  const localB2BCollected = activeLocalPartners.reduce((sum, p) => sum + (Number(p.feePaidIqd) || 150000), 0);
  const localB2CCollected = activeLocalMembers.reduce((sum, m) => sum + (Number(m.feePaidIqd) || 25000), 0);

  const filteredMembers = React.useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return allMembers.filter(m => {
      const matchesSearch = !q ||
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.fullNameAr && m.fullNameAr.toLowerCase().includes(q)) ||
        (m.cardId && m.cardId.toLowerCase().includes(q)) ||
        (m.id && m.id.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.nearestLandmark && m.nearestLandmark.toLowerCase().includes(q));
      
      const matchesProvince = provinceFilter === "All" || m.province === provinceFilter || m.provinceAr === provinceFilter;
      const matchesStatus = statusFilter === "All" || m.status === statusFilter || (statusFilter === "Active" && isMemberActive(m)) || (statusFilter === "Inactive" && !isMemberActive(m));

      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [allMembers, searchQuery, provinceFilter, statusFilter]);

  const filteredPartners = React.useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return allPartners.filter(p => {
      const matchesSearch = !q ||
        (p.companyName && p.companyName.toLowerCase().includes(q)) ||
        (p.companyNameAr && p.companyNameAr.toLowerCase().includes(q)) ||
        (p.sector && p.sector.toLowerCase().includes(q)) ||
        (p.sectorAr && p.sectorAr.toLowerCase().includes(q)) ||
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q));
      
      const matchesProvince = provinceFilter === "All" || p.province === provinceFilter || p.provinceAr === provinceFilter;
      const matchesStatus = statusFilter === "All" || p.status === statusFilter || (statusFilter === "Active" && isPartnerActive(p)) || (statusFilter === "Inactive" && !isPartnerActive(p));

      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [allPartners, searchQuery, provinceFilter, statusFilter]);

  // إصلاح تموضع المتغيرات وحساب الإحصائيات بدقة لمنع خطأ الشاشة البيضاء
  const liveProvinceBreakdown = React.useMemo(() => {
    return provincesList.map(prov => {
      const provPartners = activeLocalPartners.filter(p => p.province === prov.en || p.provinceAr === prov.ar);
      const provMembers = activeLocalMembers.filter(m => m.province === prov.en || m.provinceAr === prov.ar);
      const collectedB2B = provPartners.reduce((s, p) => s + (Number(p.feePaidIqd) || 150000), 0);
      const collectedB2C = provMembers.reduce((s, m) => s + (Number(m.feePaidIqd) || 25000), 0);
      return {
        province: prov.en,
        provinceAr: prov.ar,
        partners: provPartners.length,
        users: provMembers.length,
        collectedB2B,
        collectedB2C,
        targetPartners: 10,
        targetUsers: 100
      };
    });
  }, [activeLocalMembers, activeLocalPartners]);

  const getRevenueComparisonData = () => [
    { name: lang === "en" ? "B2B (Partners)" : "الشركات (B2B)", Collected: localB2BCollected, Target: 28500000 },
    { name: lang === "en" ? "B2C (Members)" : "الأعضاء (B2C)", Collected: localB2CCollected, Target: 95000000 }
  ];

  const getLiveMonthlyTrend = () => {
    const defaultTrend = [
      { month: "04/2026", b2b: 7500000, b2c: 15000000, b2bTarget: 28500000, b2cTarget: 95000000 },
      { month: "08/2026", b2b: 18000000, b2c: 30000000, b2bTarget: 28500000, b2cTarget: 95000000 },
      { month: "12/2026 (Target)", b2b: 28500000, b2c: 95000000, b2bTarget: 28500000, b2cTarget: 95000000 },
      { month: "Current (Live)", b2b: localB2BCollected, b2c: localB2CCollected, b2bTarget: 28500000, b2cTarget: 95000000 }
    ];
    if (!financials || !financials.monthlyTrend) return defaultTrend;
    return financials.monthlyTrend;
  };

  // Status Toggles
  const handleToggleMemberStatus = async (member: Member) => {
    const currentActive = isMemberActive(member);
    const newStatus = currentActive ? "Inactive" : "Active";
    const updatedMember = { ...member, status: newStatus };

    try {
      const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");

      const updateMatch = (item: any) => 
        (member.id && item.id && item.id === member.id) || 
        (member.cardId && item.cardId && item.cardId.trim().toUpperCase() === member.cardId.trim().toUpperCase());

      const updatedM1 = m1.map((item: any) => updateMatch(item) ? { ...item, status: newStatus } : item);
      const updatedM2 = m2.map((item: any) => updateMatch(item) ? { ...item, status: newStatus } : item);

      safeSetLocalStorage("byd-custom-members", JSON.stringify(updatedM1));
      safeSetLocalStorage("BYD_USERS", JSON.stringify(updatedM2));
    } catch (e) {
      console.error(e);
    }

    setMembers(prev => prev.map(m => (m.id === member.id || (member.cardId && m.cardId === member.cardId)) ? updatedMember : m));
    setLocalMembersList(prev => prev.map(m => (m.id === member.id || (member.cardId && m.cardId === member.cardId)) ? updatedMember : m));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.fullName || !memberForm.fullNameAr || !memberForm.cardId) {
      alert(t.errorFill || "يرجى ملء الحقول المطلوبة");
      return;
    }

    const provinceObj = provincesList.find(p => p.en === memberForm.province);
    const provinceAr = provinceObj ? provinceObj.ar : memberForm.province;

    const body = {
      id: editingMember?.id || "m-" + Date.now(),
      ...memberForm,
      provinceAr
    };

    try {
      const currentCustom = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const currentUsers = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
      const isMatch = (m: any) => (editingMember?.id && m.id === editingMember.id) || (m.cardId && m.cardId.trim().toUpperCase() === body.cardId.trim().toUpperCase());

      const idxC = currentCustom.findIndex(isMatch);
      if (idxC > -1) currentCustom[idxC] = body; else currentCustom.push(body);

      const idxU = currentUsers.findIndex(isMatch);
      if (idxU > -1) currentUsers[idxU] = body; else currentUsers.push(body);

      safeSetLocalStorage("byd-custom-members", JSON.stringify(currentCustom));
      safeSetLocalStorage("BYD_USERS", JSON.stringify(currentUsers));

      window.dispatchEvent(new Event("storage-sync-updated"));
    } catch (e) {
      console.error(e);
    }

    alert(t.successSave || "تم الحفظ بنجاح!");
    setShowMemberForm(false);
    setEditingMember(null);
    resetMemberForm();
    loadAllData();
  };

  const handleEditMemberClick = (member: Member) => {
    setEditingMember(member);
    const durationMonths = member.durationMonths || (member.feePaidIqd === 50000 ? 12 : 6);
    const feeIqd = member.feePaidIqd !== undefined ? member.feePaidIqd : (durationMonths === 12 ? 50000 : 25000);
    const feeUsd = member.feePaidUsd !== undefined ? member.feePaidUsd : (durationMonths === 12 ? 50 : 25);
    setMemberForm({
      fullName: member.fullName,
      fullNameAr: member.fullNameAr,
      cardId: member.cardId,
      province: member.province,
      status: member.status || "Active",
      feePaidIqd: feeIqd,
      feePaidUsd: feeUsd,
      nearestLandmark: member.nearestLandmark || "",
      durationMonths,
      registrationDate: member.registrationDate || new Date().toISOString().split("T")[0],
      expiryDate: member.expiryDate || new Date(Date.now() + (durationMonths === 12 ? 365 : 180) * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    });
    setShowMemberForm(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm(t.confirmDelete || "هل أنت متأكد من الحذف؟")) return;

    try {
      const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]");
      if (!deletedList.includes(id)) deletedList.push(id);
      safeSetLocalStorage("BYD_DELETED_MEMBERS", JSON.stringify(deletedList));

      const syncBydUsers = JSON.parse(localStorage.getItem("BYD_USERS") || "[]").filter((m: any) => m.id !== id && m.cardId !== id);
      const syncCustomMembers = JSON.parse(localStorage.getItem("byd-custom-members") || "[]").filter((m: any) => m.id !== id && m.cardId !== id);

      safeSetLocalStorage("BYD_USERS", JSON.stringify(syncBydUsers));
      safeSetLocalStorage("byd-custom-members", JSON.stringify(syncCustomMembers));
    } catch (e) {
      console.error(e);
    }

    setMembers(prev => prev.filter(m => m.id !== id && m.cardId !== id));
    setLocalMembersList(prev => prev.filter((m: any) => m.id !== id && m.cardId !== id));
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const resetMemberForm = () => {
    setMemberForm({
      fullName: "",
      fullNameAr: "",
      cardId: "",
      province: "Baghdad",
      status: "Active",
      feePaidIqd: 25000,
      feePaidUsd: 25,
      nearestLandmark: "",
      durationMonths: 6,
      registrationDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    });
  };

  const handleClearAllData = async () => {
    if (!confirm("هل أنت متأكد من مسح جميع البيانات بشكل نهائي؟")) return;
    localStorage.setItem("byd-custom-members", JSON.stringify([]));
    localStorage.setItem("BYD_USERS", JSON.stringify([]));
    localStorage.setItem("byd-custom-partners", JSON.stringify([]));
    localStorage.setItem("BYD_COMPANIES", JSON.stringify([]));
    localStorage.setItem("byd-cards", JSON.stringify([]));
    setLocalMembersList([]);
    setLocalPartnersList([]);
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header control line */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-900 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
              {t.adminHeader || "لوحة التحكم الإدارية والمالية"}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <button onClick={onGoBack} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] border border-gray-800 rounded-lg text-xs font-bold text-gray-300">
              <ArrowLeft className={`w-4 h-4 text-[#D30014] ${lang === "ar" ? "rotate-180" : ""}`} />
              <span>{lang === "en" ? "Public Site" : "الموقع العام"}</span>
            </button>

            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] border border-gray-800 rounded-lg text-xs font-bold text-gray-300">
              <Languages className="w-4 h-4 text-[#D30014]" />
              <span>{t.langToggle}</span>
            </button>

            <button onClick={loadAllData} className="p-2 bg-[#121212] border border-gray-800 rounded-lg text-gray-400 hover:text-white">
              <RefreshCw className="w-5 h-5" />
            </button>

            {!isViewer && (
              <button onClick={handleClearAllData} className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:text-white rounded-lg text-xs font-bold">
                <Trash2 className="w-4 h-4" />
                <span>مسح البيانات</span>
              </button>
            )}

            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold">
              <LogOut className="w-4 h-4" />
              <span>{t.adminLogout}</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">{t.tblFullName} (B2C)</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalMembers.length}</p>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">{t.tblCompanyName} (B2B)</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalPartners.length}</p>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">المبالغ المحصلة للشركات</span>
            <p className="text-xl sm:text-2xl font-black text-green-400 mt-2">{localB2BCollected.toLocaleString()} IQD</p>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">المبالغ المحصلة للأفراد</span>
            <p className="text-xl sm:text-2xl font-black text-green-400 mt-2">{localB2CCollected.toLocaleString()} IQD</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-2">
          <button onClick={() => setActiveTab("analytics")} className={`px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer ${activeTab === "analytics" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>{t.dashboardTab}</button>
          <button onClick={() => setActiveTab("members")} className={`px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer ${activeTab === "members" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>{t.membersTab}</button>
          <button onClick={() => setActiveTab("partners")} className={`px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer ${activeTab === "partners" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>{t.partnersTab}</button>
          <button onClick={() => setActiveTab("branding")} className={`px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer ${activeTab === "branding" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>الشركات المالكة</button>
          <button onClick={() => setActiveTab("cards")} className={`px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer ${activeTab === "cards" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>إدارة البطاقات</button>
        </div>

        {/* TAB 1: ANALYTICS */}
        {!isLoading && activeTab === "analytics" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-black text-white mb-6">مقارنة المبالغ المحصلة مقابل المستهدفة</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={getRevenueComparisonData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff" }} />
                      <Bar dataKey="Collected" fill="#D30014" name="المحصل (د.ع)" />
                      <Bar dataKey="Target" fill="#444" name="المستهدف (د.ع)" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-black text-white mb-6">{t.finGrowthTrend}</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getLiveMonthlyTrend()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="month" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff" }} />
                      <Area type="monotone" dataKey="b2c" stroke="#D30014" fill="#D30014" fillOpacity={0.2} name="B2C (الأعضاء)" />
                      <Area type="monotone" dataKey="b2b" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} name="B2B (الشركات)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Province Table */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 overflow-hidden">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#D30014]" />
                {t.finProvinceStats}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold">
                      <th className="py-3 px-4">{t.finProvinceCol}</th>
                      <th className="py-3 px-4 text-center">{t.finPartnersCol}</th>
                      <th className="py-3 px-4 text-center">{t.finUsersCol}</th>
                      <th className="py-3 px-4 text-center">إيراد B2B</th>
                      <th className="py-3 px-4 text-center">إيراد B2C</th>
                      <th className="py-3 px-4 text-right">{t.finRevenueCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                    {liveProvinceBreakdown.map((pb, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-bold text-white">{pb.provinceAr}</td>
                        <td className="py-3.5 px-4 text-center">{pb.partners}</td>
                        <td className="py-3.5 px-4 text-center">{pb.users}</td>
                        <td className="py-3.5 px-4 text-center text-gray-400">{pb.collectedB2B.toLocaleString()} IQD</td>
                        <td className="py-3.5 px-4 text-center text-gray-400">{pb.collectedB2C.toLocaleString()} IQD</td>
                        <td className="py-3.5 px-4 text-right font-black text-green-400">{(pb.collectedB2B + pb.collectedB2C).toLocaleString()} IQD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {!isLoading && activeTab === "members" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#121212] p-4 rounded-xl border border-gray-800">
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم البطاقة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-black border border-gray-800 rounded-lg text-xs font-bold text-white outline-none w-72"
              />
              {!isViewer && (
                <button
                  onClick={() => { resetMemberForm(); setEditingMember(null); setShowMemberForm(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] text-white font-bold rounded-lg text-xs hover:bg-[#b00010] cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> <span>إضافة عضو جديد</span>
                </button>
              )}
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold bg-black/40">
                    <th className="py-4 px-6">{t.tblFullName}</th>
                    <th className="py-4 px-6">{t.tblCardId}</th>
                    <th className="py-4 px-6">{t.tblProvince}</th>
                    <th className="py-4 px-6">المدة</th>
                    <th className="py-4 px-6 text-center">{t.tblStatus}</th>
                    <th className="py-4 px-6 text-right">{t.tblActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-white">{m.fullName}</div>
                        <div className="text-xs text-gray-500">{m.fullNameAr}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[#D30014] font-black">{m.cardId}</td>
                      <td className="py-4 px-6">{lang === "en" ? m.province : m.provinceAr}</td>
                      <td className="py-4 px-6 text-xs">{m.durationMonths === 12 ? "سنة واحدة" : "6 أشهر"}</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => !isViewer && handleToggleMemberStatus(m)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black cursor-pointer ${
                            isMemberActive(m) ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}
                        >
                          {isMemberActive(m) ? "فعال" : "غير فعال"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isViewer && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditMemberClick(m)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded cursor-pointer">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteMember(m.id)} className="p-1.5 bg-red-500/10 hover:bg-[#D30014] text-red-400 hover:text-white rounded cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: MEMBER CRUD FORM */}
      {showMemberForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#D30014] rounded-sm"></span>
              {editingMember ? "تعديل تفاصيل المشترك B2C" : "إضافة مشترك جديد B2C"}
            </h3>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.mFullNameEn} *</label>
                  <input
                    type="text"
                    required
                    value={memberForm.fullName}
                    onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.mFullNameAr} *</label>
                  <input
                    type="text"
                    required
                    value={memberForm.fullNameAr}
                    onChange={(e) => setMemberForm({ ...memberForm, fullNameAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">{t.mCardId} *</label>
                <input
                  type="text"
                  required
                  value={memberForm.cardId}
                  onChange={(e) => setMemberForm({ ...memberForm, cardId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold outline-none focus:border-[#D30014]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.mProvince} *</label>
                  <select
                    value={memberForm.province}
                    onChange={(e) => setMemberForm({ ...memberForm, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  >
                    {provincesList.map((p, idx) => (
                      <option key={idx} value={p.en}>{p.ar} ({p.en})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.mStatus} *</label>
                  <select
                    value={memberForm.status}
                    onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value as "Active" | "Inactive" })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  >
                    <option value="Active">{t.active}</option>
                    <option value="Inactive">{t.inactive}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">مدة الاشتراك *</label>
                <select
                  value={memberForm.durationMonths}
                  onChange={(e) => {
                    const months = Number(e.target.value);
                    const newFee = months === 12 ? 50000 : 25000;
                    const regDate = memberForm.registrationDate || new Date().toISOString().split("T")[0];
                    const regTime = new Date(regDate).getTime();
                    const expTime = regTime + (months === 12 ? 365 : 180) * 24 * 60 * 60 * 1000;
                    const newExpDate = new Date(expTime).toISOString().split("T")[0];

                    setMemberForm({
                      ...memberForm,
                      durationMonths: months,
                      feePaidIqd: newFee,
                      feePaidUsd: Math.round(newFee / 1500),
                      expiryDate: newExpDate
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                >
                  <option value={6}>6 أشهر من تاريخ التسجيل - 25,000 د.ع</option>
                  <option value={12}>سنة واحدة من تاريخ التسجيل - 50,000 د.ع</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowMemberForm(false)}
                  className="px-5 py-2.5 bg-[#121212] border border-gray-800 text-gray-300 font-bold rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white font-bold rounded-lg transition-all cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
