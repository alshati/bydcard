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
  const [viewerAccounts, setViewerAccounts] = useState<ViewerAccount[]>([]);
  const [viewerForm, setViewerForm] = useState({ username: "", password: "", name: "", notes: "" });
  const [viewerLoading, setViewerLoading] = useState(false);
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

  // Sync Local Storage
  const updateLocalLists = () => {
    try {
      const deletedP = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]").map((s: string) => String(s).toLowerCase());
      const deletedM = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]").map((s: string) => String(s).toLowerCase());

      const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
      const combinedM = [...m1];
      m2.forEach((m: any) => {
        if (m && m.cardId && !combinedM.some((x: any) => x.cardId === m.cardId)) combinedM.push(m);
      });
      const filteredM = combinedM.filter((m: any) => !deletedM.includes((m.id || "").toLowerCase()) && !deletedM.includes((m.cardId || "").toLowerCase()));

      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const combinedP = [...p1];
      p2.forEach((p: any) => {
        if (p && !combinedP.some((x: any) => x.username === p.username || x.companyName === p.companyName)) combinedP.push(p);
      });
      const filteredP = combinedP.filter((p: any) => !deletedP.includes((p.id || "").toLowerCase()) && !deletedP.includes((p.username || "").toLowerCase()) && !deletedP.includes((p.companyName || "").toLowerCase()));

      setLocalMembersList(filteredM);
      setLocalPartnersList(filteredP);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    updateLocalLists();
    try {
      const [membersRes, partnersRes, cardsRes] = await Promise.all([
        fetch("/api/members").catch(() => null),
        fetch("/api/partners").catch(() => null),
        fetch("/api/cards").catch(() => null)
      ]);

      if (membersRes?.ok) setMembers(await membersRes.json());
      if (partnersRes?.ok) setPartners(await partnersRes.json());
      if (cardsRes?.ok) setCards(await cardsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener("storage-sync-updated", updateLocalLists);
    return () => window.removeEventListener("storage-sync-updated", updateLocalLists);
  }, []);

  // Helpers
  const isPartnerActive = (p: any) => !p.status || String(p.status).toLowerCase() === "active" || String(p.status).toLowerCase() === "نشط";
  const isMemberActive = (m: any) => !m.status || String(m.status).toLowerCase() === "active" || String(m.status).toLowerCase() === "نشط";

  const allMembers = React.useMemo(() => {
    const list = [...members];
    localMembersList.forEach(lm => {
      const idx = list.findIndex(m => m.id === lm.id || (lm.cardId && m.cardId === lm.cardId));
      if (idx > -1) list[idx] = { ...list[idx], ...lm };
      else list.push(lm);
    });
    return list;
  }, [members, localMembersList]);

  const allPartners = React.useMemo(() => {
    const list = [...partners];
    localPartnersList.forEach(lp => {
      const idx = list.findIndex(p => p.id === lp.id || (lp.username && p.username === lp.username));
      if (idx > -1) list[idx] = { ...list[idx], ...lp };
      else list.push(lp);
    });
    return list;
  }, [partners, localPartnersList]);

  const activeLocalMembers = allMembers.filter(isMemberActive);
  const activeLocalPartners = allPartners.filter(isPartnerActive);

  const localB2BCollected = activeLocalPartners.reduce((sum, p) => sum + (Number(p.feePaidIqd) || 150000), 0);
  const localB2CCollected = activeLocalMembers.reduce((sum, m) => sum + (Number(m.feePaidIqd) || 25000), 0);

  const filteredMembers = allMembers.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || (m.fullName && m.fullName.toLowerCase().includes(q)) || (m.fullNameAr && m.fullNameAr.toLowerCase().includes(q)) || (m.cardId && m.cardId.toLowerCase().includes(q));
    const matchProv = provinceFilter === "All" || m.province === provinceFilter || m.provinceAr === provinceFilter;
    const matchStatus = statusFilter === "All" || (statusFilter === "Active" && isMemberActive(m)) || (statusFilter === "Inactive" && !isMemberActive(m));
    return matchQ && matchProv && matchStatus;
  });

  const filteredPartners = allPartners.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || (p.companyName && p.companyName.toLowerCase().includes(q)) || (p.companyNameAr && p.companyNameAr.toLowerCase().includes(q));
    const matchProv = provinceFilter === "All" || p.province === provinceFilter || p.provinceAr === provinceFilter;
    const matchStatus = statusFilter === "All" || (statusFilter === "Active" && isPartnerActive(p)) || (statusFilter === "Inactive" && !isPartnerActive(p));
    return matchQ && matchProv && matchStatus;
  });

  const liveProvinceBreakdown = React.useMemo(() => {
    return provincesList.map(prov => {
      const provPartners = activeLocalPartners.filter(p => p.province === prov.en || p.provinceAr === prov.ar);
      const provMembers = activeLocalMembers.filter(m => m.province === prov.en || m.provinceAr === prov.ar);
      const collectedB2B = provPartners.reduce((s, p) => sum + (Number(p.feePaidIqd) || 150000), 0);
      const collectedB2C = provMembers.reduce((s, m) => sum + (Number(m.feePaidIqd) || 25000), 0);
      return {
        province: prov.en,
        provinceAr: prov.ar,
        partners: provPartners.length,
        users: provMembers.length,
        collectedB2B,
        collectedB2C
      };
    });
  }, [activeLocalMembers, activeLocalPartners]);

  // Handlers
  const handleToggleMemberStatus = async (member: Member) => {
    const newStatus = isMemberActive(member) ? "Inactive" : "Active";
    const updated = { ...member, status: newStatus };

    const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
    const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
    const isMatch = (x: any) => x.id === member.id || (member.cardId && x.cardId === member.cardId);

    safeSetLocalStorage("byd-custom-members", JSON.stringify(m1.map((x: any) => isMatch(x) ? { ...x, status: newStatus } : x)));
    safeSetLocalStorage("BYD_USERS", JSON.stringify(m2.map((x: any) => isMatch(x) ? { ...x, status: newStatus } : x)));

    window.dispatchEvent(new Event("storage-sync-updated"));
    setMembers(prev => prev.map(x => isMatch(x) ? updated : x));
    setLocalMembersList(prev => prev.map(x => isMatch(x) ? updated : x));
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { id: editingMember?.id || "m-" + Date.now(), ...memberForm };
    const current = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
    const idx = current.findIndex((x: any) => x.id === body.id || x.cardId === body.cardId);
    if (idx > -1) current[idx] = body; else current.push(body);

    safeSetLocalStorage("byd-custom-members", JSON.stringify(current));
    safeSetLocalStorage("BYD_USERS", JSON.stringify(current));

    window.dispatchEvent(new Event("storage-sync-updated"));
    setShowMemberForm(false);
    setEditingMember(null);
    loadAllData();
  };

  const handleEditMemberClick = (member: Member) => {
    setEditingMember(member);
    setMemberForm({
      fullName: member.fullName || "",
      fullNameAr: member.fullNameAr || "",
      cardId: member.cardId || "",
      province: member.province || "Baghdad",
      status: member.status || "Active",
      feePaidIqd: member.feePaidIqd || 25000,
      feePaidUsd: member.feePaidUsd || 25,
      nearestLandmark: member.nearestLandmark || "",
      durationMonths: member.durationMonths || 6,
      registrationDate: member.registrationDate || new Date().toISOString().split("T")[0],
      expiryDate: member.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    });
    setShowMemberForm(true);
  };

  const handleDeleteMember = (id: string) => {
    if (!confirm(t.confirmDelete || "هل أنت متأكد من الحذف؟")) return;
    const deleted = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]");
    deleted.push(id);
    safeSetLocalStorage("BYD_DELETED_MEMBERS", JSON.stringify(deleted));
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const resetMemberForm = () => {
    setMemberForm({
      fullName: "", fullNameAr: "", cardId: "", province: "Baghdad", status: "Active",
      feePaidIqd: 25000, feePaidUsd: 25, nearestLandmark: "", durationMonths: 6,
      registrationDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    });
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-900 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
              {t.adminHeader || "لوحة التحكم الإدارية"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] border border-gray-800 rounded-lg text-xs font-bold text-gray-300">
              <ArrowLeft className="w-4 h-4 text-[#D30014]" /> <span>الموقع العام</span>
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold">
              <LogOut className="w-4 h-4" /> <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">المشتركين (B2C)</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalMembers.length}</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">الشركاء (B2B)</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalPartners.length}</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">إيراد B2B</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2BCollected.toLocaleString()} IQD</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">إيراد B2C</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2CCollected.toLocaleString()} IQD</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-2">
          <button onClick={() => setActiveTab("analytics")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "analytics" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>الإحصائيات والتحليلات</button>
          <button onClick={() => setActiveTab("members")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "members" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>سجل المشتركين B2C</button>
          <button onClick={() => setActiveTab("partners")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "partners" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>سجل الشركاء B2B</button>
          <button onClick={() => setActiveTab("branding")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "branding" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>الشركات المالكة</button>
          <button onClick={() => setActiveTab("cards")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "cards" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>إدارة البطاقات</button>
        </div>

        {/* TAB 1: ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="bg-[#121212] border border-gray-800 p-6 rounded-xl">
              <h3 className="text-lg font-black mb-4">تحصيل الإيرادات مقابل المستهدف</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={[{ name: "B2B", Collected: localB2BCollected, Target: 28500000 }, { name: "B2C", Collected: localB2CCollected, Target: 95000000 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                    <Bar dataKey="Collected" fill="#D30014" />
                    <Bar dataKey="Target" fill="#444" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === "members" && (
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
                    <th className="py-4 px-6">الاسم الكامل</th>
                    <th className="py-4 px-6">رقم البطاقة</th>
                    <th className="py-4 px-6">المحافظة</th>
                    <th className="py-4 px-6">المدة</th>
                    <th className="py-4 px-6 text-center">الحالة</th>
                    <th className="py-4 px-6 text-right">الإجراءات</th>
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

      {/* MODAL: MEMBER FORM */}
      {showMemberForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black mb-6">{editingMember ? "تعديل مشترك B2C" : "إضافة مشترك جديد B2C"}</h3>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-400 font-bold mb-1">الاسم الكامل (إنجليزي) *</label>
                <input type="text" required value={memberForm.fullName} onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })} className="w-full p-2.5 bg-black border border-gray-800 rounded text-white font-bold" />
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">الاسم الكامل (عربي) *</label>
                <input type="text" required value={memberForm.fullNameAr} onChange={(e) => setMemberForm({ ...memberForm, fullNameAr: e.target.value })} className="w-full p-2.5 bg-black border border-gray-800 rounded text-white font-bold" />
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">رقم البطاقة (Card ID) *</label>
                <input type="text" required value={memberForm.cardId} onChange={(e) => setMemberForm({ ...memberForm, cardId: e.target.value })} className="w-full p-2.5 bg-black border border-gray-800 rounded text-white font-bold font-mono" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowMemberForm(false)} className="px-4 py-2 bg-gray-900 text-gray-300 rounded cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-white rounded font-bold cursor-pointer">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
