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
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Video, 
  MapPin, 
  RefreshCw, 
  LogOut,
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign as UsdIcon,
  VideoOff,
  Languages,
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Shield,
  Copy,
  Check,
  Lock,
  UserPlus,
  FileText,
  AlertTriangle,
  UserCheck,
  AlertCircle,
  PieChart as PieChartIcon,
  Printer,
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
  const t = translations[lang];
  const isViewer = userRole === "viewer";

  const [activeTab, setActiveTab] = useState<"analytics" | "members" | "partners" | "branding" | "cards" | "viewers">("analytics");

  const [members, setMembers] = useState<Member[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [localMembersList, setLocalMembersList] = useState<any[]>([]);
  const [localPartnersList, setLocalPartnersList] = useState<any[]>([]);
  const [financials, setFinancials] = useState<FinancialStats | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewerAccounts, setViewerAccounts] = useState<ViewerAccount[]>([]);
  const [viewerForm, setViewerForm] = useState({ username: "", password: "", name: "", notes: "" });
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerMsg, setViewerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeTemplate, setActiveTemplate] = useState<{ cardDesignBase64: string; type?: "image" | "video" } | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<"image" | "video">("image");
  const [cardMedia, setCardMedia] = useState<{ type: "image" | "video"; data: string } | null>(() => {
    const cached = localStorage.getItem("BYD_CARD_MEDIA");
    if (cached) { try { return JSON.parse(cached); } catch (e) { console.error(e); } }
    return null;
  });

  useEffect(() => {
    const loadMediaState = () => {
      const cached = localStorage.getItem("BYD_CARD_MEDIA");
      if (cached) { try { setCardMedia(JSON.parse(cached)); } catch (e) { console.error(e); } } else { setCardMedia(null); }
    };
    loadMediaState();
    window.addEventListener("storage-sync-updated", loadMediaState);
    window.addEventListener("storage", loadMediaState);
    return () => {
      window.removeEventListener("storage-sync-updated", loadMediaState);
      window.removeEventListener("storage", loadMediaState);
    };
  }, []);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({
    fullName: "", fullNameAr: "", cardId: "", province: "Baghdad", status: "Active" as "Active" | "Inactive",
    feePaidIqd: 25000, feePaidUsd: 25, nearestLandmark: "", durationMonths: 6,
    registrationDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  });

  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    companyName: "", companyNameAr: "", sector: "Restaurant", logoUrl: "", promoVideoUrl: "",
    province: "Baghdad", expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "Active" as "Active" | "Inactive", feePaidIqd: 150000, feePaidUsd: 100,
    username: "", password: "", email: "", phone: "", discount: "10%", discountEn: "10%", discountAr: "10%"
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [analyticsProvinceSearch, setAnalyticsProvinceSearch] = useState("");
  const [analyticsSortBy, setAnalyticsSortBy] = useState<"revenue" | "members" | "partners" | "name">("revenue");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, partnersRes, finRes, cardsRes] = await Promise.all([
        fetch("/api/members").catch(() => null),
        fetch("/api/partners").catch(() => null),
        fetch("/api/financials").catch(() => null),
        fetch("/api/cards").catch(() => null)
      ]);

      if (membersRes && membersRes.ok) setMembers(await membersRes.json());
      if (partnersRes && partnersRes.ok) setPartners(await partnersRes.json());
      if (cardsRes && cardsRes.ok) setCards(await cardsRes.json());
      if (finRes && finRes.ok) setFinancials(await finRes.json());
      else {
        setFinancials({
          totalRevenueIqd: 0,
          totalRevenueUsd: 0,
          monthlyTrend: [
            { month: "01/2026", b2b: 0, b2c: 0 },
            { month: "Current (Live)", b2b: 0, b2c: 0 }
          ]
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [adminToken]);

  useEffect(() => {
    const updateLocalLists = () => {
      const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
      const combinedMembers = [...m1];
      m2.forEach((m: any) => {
        if (!combinedMembers.some((e: any) => e.cardId === m.cardId)) combinedMembers.push(m);
      });
      setLocalMembersList(combinedMembers);

      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const combinedPartners = [...p1];
      p2.forEach((p: any) => {
        if (!combinedPartners.some((e: any) => e.username === p.username || e.companyName === p.companyName)) combinedPartners.push(p);
      });
      setLocalPartnersList(combinedPartners);
    };

    updateLocalLists();
    window.addEventListener("storage-sync-updated", updateLocalLists);
    window.addEventListener("storage", updateLocalLists);
    return () => {
      window.removeEventListener("storage-sync-updated", updateLocalLists);
      window.removeEventListener("storage", updateLocalLists);
    };
  }, []);

  const handleToggleMemberStatus = async (member: Member) => {
    const newStatus = member.status === "Active" ? "Inactive" : "Active";
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: newStatus } : m));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.fullName || !memberForm.cardId) return;

    const registered = {
      ...memberForm,
      id: editingMember?.id || ("m-" + Date.now())
    };

    const current = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
    const idx = current.findIndex((m: any) => m.id === registered.id || m.cardId === registered.cardId);
    if (idx > -1) current[idx] = registered;
    else current.push(registered);
    safeSetLocalStorage("byd-custom-members", JSON.stringify(current));

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
      expiryDate: member.expiryDate || new Date().toISOString().split("T")[0]
    });
    setShowMemberForm(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    setMembers(prev => prev.filter(m => m.id !== id));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.companyName) return;

    const partnerId = editingPartner?.id || ("p-" + Date.now());
    const registered = {
      ...partnerForm,
      id: partnerId,
      feePaidIqd: partnerForm.feePaidIqd || 150000
    };

    const current = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
    const idx = current.findIndex((p: any) => p.id === partnerId || p.username === registered.username);
    if (idx > -1) current[idx] = registered;
    else current.push(registered);
    safeSetLocalStorage("byd-custom-partners", JSON.stringify(current));

    const companies = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
    const idxC = companies.findIndex((p: any) => p.id === partnerId || p.username === registered.username);
    if (idxC > -1) companies[idxC] = registered;
    else companies.push(registered);
    safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(companies));

    setShowPartnerForm(false);
    setEditingPartner(null);
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const handleEditPartnerClick = (partner: Partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      companyName: partner.companyName || "",
      companyNameAr: partner.companyNameAr || "",
      sector: partner.sector || "Restaurant",
      logoUrl: partner.logoUrl || "",
      promoVideoUrl: partner.promoVideoUrl || "",
      province: partner.province || "Baghdad",
      expiryDate: partner.expiryDate || "",
      status: partner.status || "Active",
      feePaidIqd: partner.feePaidIqd || 150000,
      feePaidUsd: partner.feePaidUsd || 100,
      username: partner.username || "",
      password: partner.password || "",
      email: partner.email || "",
      phone: partner.phone || "",
      discount: partner.discount || "10%",
      discountEn: partner.discountEn || "10%",
      discountAr: partner.discountAr || "10%"
    });
    setShowPartnerForm(true);
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    setPartners(prev => prev.filter(p => p.id !== id));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const allPartners = React.useMemo(() => {
    const list = [...partners];
    localPartnersList.forEach((lp: any) => {
      if (!list.some(sp => sp.id === lp.id || sp.username === lp.username)) list.push(lp);
    });
    return list;
  }, [partners, localPartnersList]);

  const allMembers = React.useMemo(() => {
    const list = [...members];
    localMembersList.forEach((lm: any) => {
      if (!list.some(sm => sm.id === lm.id || sm.cardId === lm.cardId)) list.push(lm);
    });
    return list;
  }, [members, localMembersList]);

  const activeLocalMembers = allMembers.filter(m => m.status === "Active" || !m.status);
  const activeLocalPartners = allPartners.filter(p => p.status === "Active" || !p.status);

  const localB2BCollected = activeLocalPartners.reduce((sum, p: any) => sum + (Number(p.feePaidIqd) || 150000), 0);
  const localB2CCollected = activeLocalMembers.reduce((sum, m: any) => sum + (Number(m.feePaidIqd) || 25000), 0);

  const liveProvinceBreakdown = React.useMemo(() => {
    const iraqiProvinces = ["Baghdad", "Erbil", "Basra", "Nineveh", "Kirkuk"];
    return iraqiProvinces.map(prov => {
      const provPartners = activeLocalPartners.filter(p => p.province === prov);
      const provMembers = activeLocalMembers.filter(m => m.province === prov);
      return {
        province: prov,
        provinceAr: prov,
        partners: provPartners.length,
        users: provMembers.length,
        collectedB2B: provPartners.reduce((s, p: any) => s + (Number(p.feePaidIqd) || 150000), 0),
        collectedB2C: provMembers.reduce((s, m: any) => s + (Number(m.feePaidIqd) || 25000), 0),
        targetPartners: 10,
        targetUsers: 100
      };
    });
  }, [activeLocalMembers, activeLocalPartners]);

  const getRevenueComparisonData = () => [
    { name: lang === "en" ? "B2B (Partners)" : "الشركات (B2B)", Collected: localB2BCollected, Target: 28500000 },
    { name: lang === "en" ? "B2C (Members)" : "الأعضاء (B2C)", Collected: localB2CCollected, Target: 95000000 }
  ];

  const getSectorDistributionData = () => [
    { name: "Restaurant", value: activeLocalPartners.length || 1, color: "#D30014" }
  ];

  const getTopProvincesRevenueData = () => liveProvinceBreakdown.map(p => ({
    name: p.province, B2B: p.collectedB2B, B2C: p.collectedB2C, Total: p.collectedB2B + p.collectedB2C
  }));

  const getLiveMonthlyTrend = () => [
    { month: "Current (Live)", b2b: localB2BCollected, b2c: localB2CCollected }
  ];

  const filteredMembers = allMembers.filter(m => !searchQuery || m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || m.cardId?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPartners = allPartners.filter(p => !searchQuery || p.companyName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleExportFinancialAuditCSV = () => {};
  const handlePrintCurrentDashboard = () => window.print();
  const handleExportComprehensiveAnalyticsPDF = () => window.print();

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header control line */}
        <div className="flex justify-between items-center pb-6 border-b border-gray-900 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t.adminHeader}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="px-3.5 py-2 bg-[#121212] border border-gray-800 rounded-lg text-xs font-bold text-gray-300 cursor-pointer">
              {lang === "en" ? "Public Site" : "الموقع العام"}
            </button>
            <button onClick={onLogout} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold cursor-pointer">
              {t.adminLogout}
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">B2C Members</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalMembers.length}</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">B2B Partners</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalPartners.length}</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">B2B Revenue</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2BCollected.toLocaleString()} IQD</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">B2C Revenue</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2CCollected.toLocaleString()} IQD</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-2">
          <button onClick={() => setActiveTab("analytics")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "analytics" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>{t.dashboardTab}</button>
          <button onClick={() => setActiveTab("members")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "members" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>{t.membersTab}</button>
          <button onClick={() => setActiveTab("partners")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "partners" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>{t.partnersTab}</button>
          <button onClick={() => setActiveTab("branding")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "branding" ? "border-[#D30014] text-white" : "border-transparent text-gray-500"}`}>Owning Companies</button>
        </div>

        {/* ANALYTICS TAB (القسم المفقود الذي كان يسبب الشاشة الفارغة) */}
        {!isLoading && activeTab === "analytics" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-black text-white mb-6">Revenue Breakdown vs Target</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={getRevenueComparisonData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                      <Legend />
                      <Bar dataKey="Collected" fill="#D30014" />
                      <Bar dataKey="Target" fill="#444" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-black text-white mb-6">Growth Trend</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getLiveMonthlyTrend()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="month" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                      <Area type="monotone" dataKey="b2c" stroke="#D30014" fill="#D30014" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Province Breakdown Table */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 overflow-hidden">
              <h3 className="text-lg font-black text-white mb-4">Province Performance Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                      <th className="py-3 px-4">Province</th>
                      <th className="py-3 px-4 text-center">Partners</th>
                      <th className="py-3 px-4 text-center">Users</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-sm">
                    {liveProvinceBreakdown.map((pb, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-bold">{pb.province}</td>
                        <td className="py-3 px-4 text-center">{pb.partners}</td>
                        <td className="py-3 px-4 text-center">{pb.users}</td>
                        <td className="py-3 px-4 text-right font-black text-green-400">
                          {(pb.collectedB2B + pb.collectedB2C).toLocaleString()} IQD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {!isLoading && activeTab === "members" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden">
            {!isViewer && (
              <div className="p-4 border-b border-gray-800 flex justify-end">
                <button onClick={() => { setEditingMember(null); setShowMemberForm(true); }} className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">
                  {t.addMemberBtn}
                </button>
              </div>
            )}
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="py-4 px-6">{t.tblFullName}</th>
                  <th className="py-4 px-6">{t.tblCardId}</th>
                  <th className="py-4 px-6">{t.tblProvince}</th>
                  <th className="py-4 px-6 text-right">{t.tblActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900 text-sm">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 px-6 font-bold">{m.fullName}</td>
                    <td className="py-4 px-6 font-mono text-[#D30014]">{m.cardId}</td>
                    <td className="py-4 px-6">{m.province}</td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button onClick={() => handleEditMemberClick(m)} className="p-1.5 bg-gray-800 rounded text-xs cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteMember(m.id)} className="p-1.5 bg-red-500/10 text-red-500 rounded text-xs cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PARTNERS TAB */}
        {!isLoading && activeTab === "partners" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden">
            {!isViewer && (
              <div className="p-4 border-b border-gray-800 flex justify-end">
                <button onClick={() => { setEditingPartner(null); setShowPartnerForm(true); }} className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">
                  {t.addPartnerBtn}
                </button>
              </div>
            )}
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="py-4 px-6">{t.tblCompanyName}</th>
                  <th className="py-4 px-6">{t.tblSector}</th>
                  <th className="py-4 px-6">{t.tblProvince}</th>
                  <th className="py-4 px-6 text-right">{t.tblActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900 text-sm">
                {filteredPartners.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 px-6 font-bold">{p.companyName}</td>
                    <td className="py-4 px-6 uppercase text-gray-400">{p.sector}</td>
                    <td className="py-4 px-6">{p.province}</td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button onClick={() => handleEditPartnerClick(p)} className="p-1.5 bg-gray-800 rounded text-xs cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeletePartner(p.id)} className="p-1.5 bg-red-500/10 text-red-500 rounded text-xs cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* BRANDING TAB */}
        {!isLoading && activeTab === "branding" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div>
                <label className="block text-gray-400 font-bold mb-1 text-xs">Entity 1 Name (EN)</label>
                <input type="text" id="entity1-name-en" value={brandingForm.company1Name} onChange={e => setBrandingForm({...brandingForm, company1Name: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white" />
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1 text-xs">Entity 1 Name (AR)</label>
                <input type="text" id="entity1-name-ar" value={brandingForm.company1NameAr} onChange={e => setBrandingForm({...brandingForm, company1NameAr: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-5 py-2.5 bg-[#D30014] text-white font-bold rounded text-xs cursor-pointer">Save Branding</button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* MEMBER MODAL */}
      {showMemberForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-black mb-4">{editingMember ? "Edit Member" : "Add Member"}</h3>
            <form onSubmit={handleSaveMember} className="space-y-3">
              <input type="text" placeholder="Full Name" value={memberForm.fullName} onChange={e => setMemberForm({...memberForm, fullName: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white text-xs" required />
              <input type="text" placeholder="Arabic Name" value={memberForm.fullNameAr} onChange={e => setMemberForm({...memberForm, fullNameAr: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white text-xs" required />
              <input type="text" placeholder="Card ID" value={memberForm.cardId} onChange={e => setMemberForm({...memberForm, cardId: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white text-xs font-mono" required />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowMemberForm(false)} className="px-4 py-2 bg-gray-800 text-xs rounded cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-xs rounded font-bold cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTNER MODAL */}
      {showPartnerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-black mb-4">{editingPartner ? "Edit Partner" : "Add Partner"}</h3>
            <form onSubmit={handleSavePartner} className="space-y-3">
              <input type="text" placeholder="Company Name" value={partnerForm.companyName} onChange={e => setPartnerForm({...partnerForm, companyName: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white text-xs" required />
              <input type="text" placeholder="Arabic Name" value={partnerForm.companyNameAr} onChange={e => setPartnerForm({...partnerForm, companyNameAr: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white text-xs" required />
              <input type="text" placeholder="Username" value={partnerForm.username} onChange={e => setPartnerForm({...partnerForm, username: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white text-xs font-mono" />
              <input type="text" placeholder="Password" value={partnerForm.password} onChange={e => setPartnerForm({...partnerForm, password: e.target.value})} className="w-full px-3 py-2 bg-black border border-gray-800 rounded text-white text-xs font-mono" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPartnerForm(false)} className="px-4 py-2 bg-gray-800 text-xs rounded cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-xs rounded font-bold cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
