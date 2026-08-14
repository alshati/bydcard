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
  Upload,
  CreditCard,
  Download,
  Eye,
  Shield,
  Copy,
  Check,
  FileText,
  UserCheck,
  AlertCircle,
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
  lang = "ar", 
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
  const [financials, setFinancials] = useState<FinancialStats | null>({
    totalCollectedIqd: 0,
    totalTargetIqd: 123500000,
    monthlyTrend: [
      { month: "04/2026", b2b: 7500000, b2c: 15000000 },
      { month: "08/2026", b2b: 18000000, b2c: 30000000 },
      { month: "12/2026 (Target)", b2b: 28500000, b2c: 95000000 },
      { month: "Current (Live)", b2b: 0, b2c: 0 }
    ]
  });
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Viewer Accounts State
  const [viewerAccounts, setViewerAccounts] = useState<ViewerAccount[]>(() => {
    try {
      const data = localStorage.getItem("byd-viewer-accounts");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });
  const [viewerForm, setViewerForm] = useState({ username: "", password: "", name: "", notes: "" });
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerMsg, setViewerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Media & Template States
  const [selectedAssetType, setSelectedAssetType] = useState<"image" | "video">("image");
  const [cardMedia, setCardMedia] = useState<{ type: "image" | "video"; data: string } | null>(() => {
    try {
      const cached = localStorage.getItem("BYD_CARD_MEDIA");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Card Form State
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [cardForm, setCardForm] = useState({ cardId: "", status: "Active" as "Active" | "Inactive", memberId: "" });

  // Member Form State
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState<{
    fullName: string;
    fullNameAr: string;
    cardId: string;
    province: string;
    status: "Active" | "Inactive";
    feePaidIqd: number;
    feePaidUsd: number;
    nearestLandmark: string;
    durationMonths: number;
    registrationDate: string;
    expiryDate: string;
  }>({
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

  // Partner Form State
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

  // Branding Form State
  const [brandingForm, setBrandingForm] = useState({
    company1Name: "TAJ Marketing",
    company1NameAr: "شركة تاج للتسويق والإنتاج",
    company1Desc: "",
    company1DescAr: "",
    company1Logo: "",
    company2Name: "GeniusWings Group",
    company2NameAr: "أجنحة العبقرية للنظم",
    company2Desc: "",
    company2DescAr: "",
    company2Logo: ""
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Sync Local Storage Lists
  const updateLocalLists = () => {
    try {
      const deletedPartners: string[] = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]").map((s: string) => String(s).toLowerCase());
      const deletedMembers: string[] = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]").map((s: string) => String(s).toLowerCase());

      const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
      const combinedMembers = Array.isArray(m1) ? [...m1] : [];
      if (Array.isArray(m2)) {
        m2.forEach((m: any) => {
          if (m && m.cardId && !combinedMembers.some((existing: any) => existing.cardId === m.cardId)) {
            combinedMembers.push(m);
          }
        });
      }

      const filteredMembersList = combinedMembers.filter((m: any) => {
        if (!m) return false;
        const id = String(m.id || "").toLowerCase();
        const cardId = String(m.cardId || "").toLowerCase();
        return !deletedMembers.includes(id) && !deletedMembers.includes(cardId);
      });

      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const combinedPartners = Array.isArray(p1) ? [...p1] : [];
      if (Array.isArray(p2)) {
        p2.forEach((p: any) => {
          if (p && !combinedPartners.some((existing: any) => existing.username === p.username || existing.companyName === p.companyName)) {
            combinedPartners.push(p);
          }
        });
      }

      const filteredPartnersList = combinedPartners.filter((p: any) => {
        if (!p) return false;
        const id = String(p.id || "").toLowerCase();
        const username = String(p.username || "").toLowerCase();
        const companyName = String(p.companyName || "").toLowerCase();
        return !deletedPartners.includes(id) && !deletedPartners.includes(username) && !deletedPartners.includes(companyName);
      });

      const savedCards = JSON.parse(localStorage.getItem("byd-cards") || "[]");
      setCards(Array.isArray(savedCards) ? savedCards : []);
      setLocalMembersList(filteredMembersList);
      setLocalPartnersList(filteredPartnersList);
    } catch (e) {
      console.error("Local storage error:", e);
    }
  };

  const loadAllData = () => {
    updateLocalLists();
    try {
      const brandCached = localStorage.getItem("byd-custom-branding");
      if (brandCached) {
        setBrandingForm(JSON.parse(brandCached));
      } else if (branding) {
        setBrandingForm({
          company1Name: branding.company1Name || "TAJ Marketing",
          company1NameAr: branding.company1NameAr || "شركة تاج للتسويق والإنتاج",
          company1Desc: branding.company1Desc || "",
          company1DescAr: branding.company1DescAr || "",
          company1Logo: branding.company1Logo || "",
          company2Name: branding.company2Name || "GeniusWings Group",
          company2NameAr: branding.company2NameAr || "أجنحة العبقرية للنظم",
          company2Desc: branding.company2Desc || "",
          company2DescAr: branding.company2DescAr || "",
          company2Logo: branding.company2Logo || ""
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener("storage-sync-updated", updateLocalLists);
    return () => window.removeEventListener("storage-sync-updated", updateLocalLists);
  }, []);

  const isPartnerActive = (p: any) => !p || !p.status || String(p.status).toLowerCase() === "active" || String(p.status).toLowerCase() === "نشط";
  const isMemberActive = (m: any) => !m || !m.status || String(m.status).toLowerCase() === "active" || String(m.status).toLowerCase() === "نشط";

  const allPartners = React.useMemo(() => {
    const list: Partner[] = [...partners];
    localPartnersList.forEach((lp: any) => {
      if (!lp) return;
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
    const list: Member[] = [...members];
    localMembersList.forEach((lm: any) => {
      if (!lm) return;
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

  const activeLocalMembers = React.useMemo(() => allMembers.filter(isMemberActive), [allMembers]);
  const activeLocalPartners = React.useMemo(() => allPartners.filter(isPartnerActive), [allPartners]);

  const localB2BCollected = React.useMemo(() => {
    return activeLocalPartners.reduce((sum, p: any) => {
      const fee = Number(p?.feePaidIqd) || 150000;
      return sum + (isNaN(fee) ? 150000 : fee);
    }, 0);
  }, [activeLocalPartners]);

  const localB2CCollected = React.useMemo(() => {
    return activeLocalMembers.reduce((sum, m: any) => {
      const fee = Number(m?.feePaidIqd) || 25000;
      return sum + (isNaN(fee) ? 25000 : fee);
    }, 0);
  }, [activeLocalMembers]);

  const liveProvinceBreakdown = React.useMemo(() => {
    const defaultProvs = Array.isArray(provincesList) && provincesList.length > 0 ? provincesList : [
      { en: "Baghdad", ar: "بغداد" },
      { en: "Erbil", ar: "أربيل" },
      { en: "Basra", ar: "البصرة" },
      { en: "Nineveh", ar: "نينوى" },
      { en: "Kirkuk", ar: "كركوك" },
      { en: "Salah al-Din", ar: "صلاح الدين" }
    ];

    return defaultProvs.map(prov => {
      const provPartners = activeLocalPartners.filter(p => p && (p.province === prov.en || p.provinceAr === prov.ar));
      const provMembers = activeLocalMembers.filter(m => m && (m.province === prov.en || m.provinceAr === prov.ar));
      
      const collectedB2B = provPartners.reduce((s, p: any) => s + (Number(p?.feePaidIqd) || 150000), 0);
      const collectedB2C = provMembers.reduce((s, m: any) => s + (Number(m?.feePaidIqd) || 25000), 0);

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

  const revenueComparisonData = React.useMemo(() => [
    { name: lang === "en" ? "B2B (Partners)" : "الشركات (B2B)", Collected: localB2BCollected, Target: 28500000 },
    { name: lang === "en" ? "B2C (Members)" : "الأعضاء (B2C)", Collected: localB2CCollected, Target: 95000000 }
  ], [lang, localB2BCollected, localB2CCollected]);

  const liveMonthlyTrendData = React.useMemo(() => [
    { month: "04/2026", b2b: 7500000, b2c: 15000000, b2bTarget: 28500000, b2cTarget: 95000000 },
    { month: "08/2026", b2b: 18000000, b2c: 30000000, b2bTarget: 28500000, b2cTarget: 95000000 },
    { month: "12/2026 (Target)", b2b: 28500000, b2c: 95000000, b2bTarget: 28500000, b2cTarget: 95000000 },
    { month: "Current (Live)", b2b: localB2BCollected, b2c: localB2CCollected, b2bTarget: 28500000, b2cTarget: 95000000 }
  ], [localB2BCollected, localB2CCollected]);

  const filteredMembers = React.useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return allMembers.filter(m => {
      if (!m) return false;
      const matchesSearch = !q ||
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.fullNameAr && m.fullNameAr.toLowerCase().includes(q)) ||
        (m.cardId && m.cardId.toLowerCase().includes(q));
      
      const matchesProvince = provinceFilter === "All" || m.province === provinceFilter || m.provinceAr === provinceFilter;
      const matchesStatus = statusFilter === "All" || m.status === statusFilter;
      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [allMembers, searchQuery, provinceFilter, statusFilter]);

  const filteredPartners = React.useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return allPartners.filter(p => {
      if (!p) return false;
      const matchesSearch = !q ||
        (p.companyName && p.companyName.toLowerCase().includes(q)) ||
        (p.companyNameAr && p.companyNameAr.toLowerCase().includes(q)) ||
        (p.sector && p.sector.toLowerCase().includes(q));
      
      const matchesProvince = provinceFilter === "All" || p.province === provinceFilter || p.provinceAr === provinceFilter;
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [allPartners, searchQuery, provinceFilter, statusFilter]);

  // Actions
  const handleClearAllData = () => {
    if (!confirm("هل أنت متأكد من مسح جميع البيانات بشكل نهائي؟")) return;
    localStorage.setItem("byd-custom-members", JSON.stringify([]));
    localStorage.setItem("BYD_USERS", JSON.stringify([]));
    localStorage.setItem("byd-custom-partners", JSON.stringify([]));
    localStorage.setItem("BYD_COMPANIES", JSON.stringify([]));
    localStorage.setItem("byd-cards", JSON.stringify([]));
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const handleToggleMemberStatus = (member: Member) => {
    const currentActive = isMemberActive(member);
    const newStatus = currentActive ? "Inactive" : "Active";
    const updated = { ...member, status: newStatus };

    const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
    const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
    const updateMatch = (item: any) => item && (item.id === member.id || item.cardId === member.cardId);

    safeSetLocalStorage("byd-custom-members", JSON.stringify(m1.map((i: any) => updateMatch(i) ? { ...i, status: newStatus } : i)));
    safeSetLocalStorage("BYD_USERS", JSON.stringify(m2.map((i: any) => updateMatch(i) ? { ...i, status: newStatus } : i)));
    
    setLocalMembersList(prev => prev.map(m => (m.id === member.id || m.cardId === member.cardId) ? updated : m));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const handleTogglePartnerStatus = (partner: Partner) => {
    const currentActive = isPartnerActive(partner);
    const newStatus = currentActive ? "Inactive" : "Active";
    const updated = { ...partner, status: newStatus };

    const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
    const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
    const updateMatch = (item: any) => item && (item.id === partner.id || item.username === partner.username || item.companyName === partner.companyName);

    safeSetLocalStorage("byd-custom-partners", JSON.stringify(p1.map((i: any) => updateMatch(i) ? { ...i, status: newStatus } : i)));
    safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(p2.map((i: any) => updateMatch(i) ? { ...i, status: newStatus } : i)));

    setLocalPartnersList(prev => prev.map(p => (p.id === partner.id || p.username === partner.username) ? updated : p));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.fullName || !memberForm.cardId) {
      alert("يرجى ملء الحقول المطلوبة");
      return;
    }

    const body = {
      id: editingMember?.id || "m-" + Date.now(),
      ...memberForm
    };

    const currentCustom = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
    const currentUsers = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
    const isMatch = (m: any) => m && (m.id === body.id || m.cardId === body.cardId);

    const idxC = currentCustom.findIndex(isMatch);
    if (idxC > -1) currentCustom[idxC] = body; else currentCustom.push(body);

    const idxU = currentUsers.findIndex(isMatch);
    if (idxU > -1) currentUsers[idxU] = body; else currentUsers.push(body);

    safeSetLocalStorage("byd-custom-members", JSON.stringify(currentCustom));
    safeSetLocalStorage("BYD_USERS", JSON.stringify(currentUsers));

    window.dispatchEvent(new Event("storage-sync-updated"));
    setShowMemberForm(false);
    setEditingMember(null);
    loadAllData();
  };

  const handleEditMemberClick = (member: Member) => {
    setEditingMember(member);
    const durationMonths = member.durationMonths || 6;
    setMemberForm({
      fullName: member.fullName || "",
      fullNameAr: member.fullNameAr || "",
      cardId: member.cardId || "",
      province: member.province || "Baghdad",
      status: member.status || "Active",
      feePaidIqd: member.feePaidIqd || 25000,
      feePaidUsd: member.feePaidUsd || 25,
      nearestLandmark: member.nearestLandmark || "",
      durationMonths,
      registrationDate: member.registrationDate || new Date().toISOString().split("T")[0],
      expiryDate: member.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    });
    setShowMemberForm(true);
  };

  const handleDeleteMember = (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]");
    if (!deletedList.includes(id)) deletedList.push(id);
    safeSetLocalStorage("BYD_DELETED_MEMBERS", JSON.stringify(deletedList));

    const syncBydUsers = JSON.parse(localStorage.getItem("BYD_USERS") || "[]").filter((m: any) => m && m.id !== id && m.cardId !== id);
    const syncCustomMembers = JSON.parse(localStorage.getItem("byd-custom-members") || "[]").filter((m: any) => m && m.id !== id && m.cardId !== id);

    safeSetLocalStorage("BYD_USERS", JSON.stringify(syncBydUsers));
    safeSetLocalStorage("byd-custom-members", JSON.stringify(syncCustomMembers));

    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.companyName) {
      alert("يرجى ملء الحقول المطلوبة");
      return;
    }

    const body = {
      id: editingPartner?.id || "p-" + Date.now(),
      ...partnerForm
    };

    const currentCustom = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
    const currentCompanies = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
    const isMatch = (p: any) => p && (p.id === body.id || p.companyName === body.companyName);

    const idxC = currentCustom.findIndex(isMatch);
    if (idxC > -1) currentCustom[idxC] = body; else currentCustom.push(body);

    const idxComp = currentCompanies.findIndex(isMatch);
    if (idxComp > -1) currentCompanies[idxComp] = body; else currentCompanies.push(body);

    safeSetLocalStorage("byd-custom-partners", JSON.stringify(currentCustom));
    safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(currentCompanies));

    window.dispatchEvent(new Event("storage-sync-updated"));
    setShowPartnerForm(false);
    setEditingPartner(null);
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

  const handleDeletePartner = (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]");
    if (!deletedList.includes(id)) deletedList.push(id);
    safeSetLocalStorage("BYD_DELETED_PARTNERS", JSON.stringify(deletedList));

    const syncBydCompanies = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]").filter((p: any) => p && p.id !== id && p.username !== id);
    const syncCustomPartners = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]").filter((p: any) => p && p.id !== id && p.username !== id);

    safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(syncBydCompanies));
    safeSetLocalStorage("byd-custom-partners", JSON.stringify(syncCustomPartners));

    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.cardId) return;

    const cardsList = JSON.parse(localStorage.getItem("byd-cards") || "[]");
    const idx = cardsList.findIndex((c: any) => c && c.cardId === cardForm.cardId);
    const newCard = { id: editingCard?.id || "c-" + Date.now(), ...cardForm };
    if (idx > -1) cardsList[idx] = newCard; else cardsList.unshift(newCard);
    safeSetLocalStorage("byd-cards", JSON.stringify(cardsList));

    window.dispatchEvent(new Event("storage-sync-updated"));
    setShowCardForm(false);
    setEditingCard(null);
    loadAllData();
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setCardForm({
      cardId: card.cardId || "",
      status: card.status || "Active",
      memberId: card.memberId || ""
    });
    setShowCardForm(true);
  };

  const handleGenerateSequentialCard = () => {
    let maxSuffix = 10; 
    cards.forEach((c: any) => {
      const match = c?.cardId?.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1]);
        if (val > maxSuffix) maxSuffix = val;
      }
    });

    const nextSuffix = maxSuffix + 1;
    const paddedSuffix = String(nextSuffix).padStart(3, "0");
    const nextCardId = `BYD-2026-${paddedSuffix}`;

    setCardForm({ cardId: nextCardId, status: "Active", memberId: "" });
    setEditingCard(null);
    setShowCardForm(true);
  };

  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMembersCSV = () => {
    const headers = ["ID", "Card ID", "Full Name (EN)", "Full Name (AR)", "Province", "Status", "Fee Paid (IQD)", "Reg Date"];
    const rows = filteredMembers.map(m => [m.id || "", m.cardId || "", m.fullName || "", m.fullNameAr || "", m.province || "", m.status || "", m.feePaidIqd || 25000, m.registrationDate || ""]);
    downloadCSV(`BYD_Members_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportPartnersCSV = () => {
    const headers = ["ID", "Company Name (EN)", "Company Name (AR)", "Sector", "Province", "Status", "Fee Paid (IQD)", "Phone"];
    const rows = filteredPartners.map(p => [p.id || "", p.companyName || "", p.companyNameAr || "", p.sector || "", p.province || "", p.status || "", p.feePaidIqd || 150000, p.phone || ""]);
    downloadCSV(`BYD_Partners_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportFinancialAuditCSV = () => {
    const headers = ["Province", "Arabic Name", "Partners", "Members", "Collected B2B", "Collected B2C", "Total"];
    const rows = liveProvinceBreakdown.map(pb => [pb.province, pb.provinceAr, pb.partners, pb.users, pb.collectedB2B, pb.collectedB2C, pb.collectedB2B + pb.collectedB2C]);
    downloadCSV(`BYD_Financial_Audit_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportToExcel = () => {
    if (activeTab === "members") {
      const data = filteredMembers.map(m => ({
        "الاسم": m.fullName,
        "رقم البطاقة": m.cardId,
        "المحافظة": m.provinceAr || m.province,
        "الحالة": m.status
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Members");
      XLSX.writeFile(wb, "byd_members.xlsx");
    } else {
      const data = filteredPartners.map(p => ({
        "الشركة": p.companyName,
        "القطاع": p.sector,
        "المحافظة": p.provinceAr || p.province,
        "الحالة": p.status
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Partners");
      XLSX.writeFile(wb, "byd_partners.xlsx");
    }
  };

  const handleExportToPDF = () => {
    handleExportComprehensiveAnalyticsPDF();
  };

  const handleExportComprehensiveAnalyticsPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير");
      return;
    }
    printWindow.document.write(`
      <html dir="rtl">
        <head><title>تقرير التدقيق المالي والإحصائي BYD</title><style>body{font-family:Tahoma;padding:30px;}</style></head>
        <body>
          <h2>BYD VIP Network - تقرير التدقيق المالي الشامل</h2>
          <hr/>
          <p>إجمالي إيرادات الشركات (B2B): ${localB2BCollected.toLocaleString()} د.ع</p>
          <p>إجمالي إيرادات الأفراد (B2C): ${localB2CCollected.toLocaleString()} د.ع</p>
          <p>إجمالي الإيرادات الكلية: ${(localB2BCollected + localB2CCollected).toLocaleString()} د.ع</p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-6 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header control line */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-900 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
              {t.adminHeader || "لوحة التحكم الإدارية BYD"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase tracking-wider mt-1">
              Secure BYD Card Administrative Control Panel
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <button onClick={onGoBack} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs font-bold text-gray-300 cursor-pointer">
              <ArrowLeft className={`w-4 h-4 text-[#D30014] ${lang === "ar" ? "rotate-180" : ""}`} />
              <span>الموقع العام</span>
            </button>

            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs font-bold text-gray-300 cursor-pointer">
              <Languages className="w-4 h-4 text-[#D30014]" />
              <span>{t.langToggle}</span>
            </button>

            <button onClick={loadAllData} className="p-2 bg-[#121212] hover:bg-[#1f1f1f] border border-gray-800 rounded-lg text-gray-400 hover:text-white cursor-pointer" title="تحديث">
              <RefreshCw className="w-5 h-5" />
            </button>

            {!isViewer && (
              <button onClick={handleClearAllData} className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white rounded-lg text-xs font-bold cursor-pointer">
                <Trash2 className="w-4 h-4" />
                <span>مسح البيانات</span>
              </button>
            )}

            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-[#D30014] hover:text-white border border-red-500/20 text-red-500 rounded-lg text-xs font-bold cursor-pointer">
              <LogOut className="w-4 h-4" />
              <span>{t.adminLogout}</span>
            </button>
          </div>
        </div>

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">الاسم الكامل (B2C)</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalMembers.length}</p>
            <span className="text-xs text-gray-500 font-bold block mt-1">Target: 1,900 Users</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">اسم الشركة / المحل (B2B)</span>
            <p className="text-3xl font-black text-white mt-2">{activeLocalPartners.length}</p>
            <span className="text-xs text-gray-500 font-bold block mt-1">Target: 190 Partners</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">المبالغ المحصلة للشركات</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2BCollected.toLocaleString()} د.ع</p>
            <span className="text-xs text-gray-500 font-bold block mt-1">المستهدف: 28,500,000 د.ع</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">المبالغ المحصلة للأفراد</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2CCollected.toLocaleString()} د.ع</p>
            <span className="text-xs text-gray-500 font-bold block mt-1">المستهدف: 95,000,000 د.ع</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-2">
          <button onClick={() => setActiveTab("analytics")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "analytics" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>الإحصائيات والمالية</button>
          <button onClick={() => setActiveTab("members")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "members" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>إدارة الأعضاء (B2C)</button>
          <button onClick={() => setActiveTab("partners")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "partners" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>إدارة الشركاء (B2B)</button>
          <button onClick={() => setActiveTab("branding")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "branding" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>الشركات المالكة</button>
          <button onClick={() => setActiveTab("cards")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "cards" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>إدارة البطاقات</button>
          {!isViewer && (
            <button onClick={() => setActiveTab("viewers")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer flex items-center gap-2 ${activeTab === "viewers" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>
              <Eye className="w-4 h-4 text-[#D30014]" />
              <span>حسابات المراقبة والتدقيق</span>
            </button>
          )}
        </div>

        {/* ----------------- TAB 1: ANALYTICS ----------------- */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-[#121212] border border-gray-800 p-5 rounded-2xl">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
                  الأداء المالي والأهداف المستهدفة
                </h2>
                <p className="text-xs text-gray-400 mt-1">نقاط الاستهداف وتوقعات الأداء المالي الديناميكي المباشر في محافظات العراق الـ 19.</p>
              </div>
              <button onClick={handleExportComprehensiveAnalyticsPDF} className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] text-white font-bold rounded-xl text-xs cursor-pointer">
                <FileText className="w-4 h-4" /> <span>تصدير تقرير الإحصائيات الشامل PDF</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-base font-black mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#D30014]" /> مقارنة المبالغ المحصلة مقابل المستهدفة
                </h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={revenueComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                      <Bar dataKey="Collected" fill="#D30014" name="المحصل (د.ع)" />
                      <Bar dataKey="Target" fill="#444" name="المستهدف (د.ع)" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-base font-black mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white" /> اتجاه نمو الإيرادات التراكمي
                </h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={liveMonthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="month" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
                      <Area type="monotone" dataKey="b2c" stroke="#D30014" fill="#D30014" fillOpacity={0.25} name="B2C (الأعضاء)" />
                      <Area type="monotone" dataKey="b2b" stroke="#8884d8" fill="#8884d8" fillOpacity={0.25} name="B2B (الشركات)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Province Breakdown */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 overflow-hidden">
              <h3 className="text-base font-black mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D30014]" /> مؤشرات الأداء المالي المفصلة حسب المحافظات
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold">
                      <th className="py-3 px-4">اسم المحافظة</th>
                      <th className="py-3 px-4 text-center">الشركاء النشطين</th>
                      <th className="py-3 px-4 text-center">الأعضاء النشطين</th>
                      <th className="py-3 px-4 text-center">إيراد B2B (د.ع)</th>
                      <th className="py-3 px-4 text-center">إيراد B2C (د.ع)</th>
                      <th className="py-3 px-4 text-right">إجمالي المبالغ المحصلة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-xs font-semibold text-gray-300">
                    {liveProvinceBreakdown.map((pb, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#D30014]"></span>
                          {pb.provinceAr}
                        </td>
                        <td className="py-3.5 px-4 text-center">{pb.partners} / 10</td>
                        <td className="py-3.5 px-4 text-center">{pb.users} / 100</td>
                        <td className="py-3.5 px-4 text-center text-gray-400">{pb.collectedB2B.toLocaleString()} د.ع</td>
                        <td className="py-3.5 px-4 text-center text-gray-400">{pb.collectedB2C.toLocaleString()} د.ع</td>
                        <td className="py-3.5 px-4 text-right font-black text-green-400">
                          {(pb.collectedB2B + pb.collectedB2C).toLocaleString()} د.ع
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: MEMBERS ----------------- */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#121212] p-4 rounded-xl border border-gray-800 flex-wrap gap-3">
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم البطاقة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-black border border-gray-800 rounded-lg text-xs font-bold text-white outline-none w-72"
              />
              <div className="flex items-center gap-2">
                <button onClick={handleExportMembersCSV} className="px-3.5 py-2 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">تصدير CSV</button>
                <button onClick={handleExportToExcel} className="px-3.5 py-2 bg-green-700 text-white font-bold rounded-lg text-xs cursor-pointer">تصدير إكسل</button>
                <button onClick={handleExportToPDF} className="px-3.5 py-2 bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer">تصدير PDF</button>
                {!isViewer && (
                  <button onClick={() => { resetMemberForm(); setEditingMember(null); setShowMemberForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">
                    <Plus className="w-4 h-4" /> <span>إضافة عضو جديد</span>
                  </button>
                )}
              </div>
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
                    <th className="py-4 px-6 text-right">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredMembers.map((m) => (
                    <tr key={m.id || m.cardId} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-white">{m.fullName}</div>
                        <div className="text-xs text-gray-500">{m.fullNameAr}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[#D30014] font-black">{m.cardId}</td>
                      <td className="py-4 px-6">{m.provinceAr || m.province}</td>
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
                            <button onClick={() => handleEditMemberClick(m)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded cursor-pointer" title="تعديل">
                              <Edit3 className="w-4 h-4 text-[#D30014]" />
                            </button>
                            <button onClick={() => handleDeleteMember(m.id || m.cardId)} className="p-1.5 bg-red-500/10 hover:bg-[#D30014] text-red-400 hover:text-white rounded cursor-pointer" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 font-bold">لا توجد سجلات مشتركون مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: PARTNERS ----------------- */}
        {activeTab === "partners" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#121212] p-4 rounded-xl border border-gray-800 flex-wrap gap-3">
              <input
                type="text"
                placeholder="ابحث باسم الشركة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-black border border-gray-800 rounded-lg text-xs font-bold text-white outline-none w-72"
              />
              <div className="flex items-center gap-2">
                <button onClick={handleExportPartnersCSV} className="px-3.5 py-2 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">تصدير CSV</button>
                <button onClick={handleExportToExcel} className="px-3.5 py-2 bg-green-700 text-white font-bold rounded-lg text-xs cursor-pointer">تصدير إكسل</button>
                <button onClick={handleExportToPDF} className="px-3.5 py-2 bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer">تصدير PDF</button>
                {!isViewer && (
                  <button onClick={() => { resetPartnerForm(); setEditingPartner(null); setShowPartnerForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">
                    <Plus className="w-4 h-4" /> <span>إضافة شريك جديد</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold">
                    <th className="py-4 px-6">اسم الشركة / المحل</th>
                    <th className="py-4 px-6">القطاع</th>
                    <th className="py-4 px-6">المحافظة</th>
                    <th className="py-4 px-6">الرسوم</th>
                    <th className="py-4 px-6 text-center">الحالة</th>
                    <th className="py-4 px-6 text-right">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredPartners.map((p) => (
                    <tr key={p.id || p.username} className="hover:bg-white/[0.01]">
                      <td className="py-4 px-6 font-bold text-white">{p.companyName}</td>
                      <td className="py-4 px-6 text-xs text-gray-400">{p.sectorAr || p.sector}</td>
                      <td className="py-4 px-6">{p.provinceAr || p.province}</td>
                      <td className="py-4 px-6 text-xs font-mono font-bold text-white">{(p.feePaidIqd || 150000).toLocaleString()} د.ع</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => !isViewer && handleTogglePartnerStatus(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black cursor-pointer ${
                            isPartnerActive(p) ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}
                        >
                          {isPartnerActive(p) ? "فعال" : "غير فعال"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isViewer && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditPartnerClick(p)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded cursor-pointer" title="تعديل">
                              <Edit3 className="w-4 h-4 text-[#D30014]" />
                            </button>
                            <button onClick={() => handleDeletePartner(p.id || p.username)} className="p-1.5 bg-red-500/10 hover:bg-[#D30014] text-red-400 hover:text-white rounded cursor-pointer" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPartners.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 font-bold">لا توجد شركات مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: BRANDING ----------------- */}
        {activeTab === "branding" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-xl font-black text-white mb-6">إعدادات الهوية والشركات المالكة</h2>
            <form onSubmit={handleSaveBranding} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black/40 border border-gray-900 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-black text-[#D30014] uppercase">الجهة المالكة الأولى (التسويق)</h3>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">اسم الشركة (إنجليزي)</label>
                    <input type="text" id="entity1-name-en" value={brandingForm.company1Name} onChange={(e) => setBrandingForm({ ...brandingForm, company1Name: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">اسم الشركة (عربي)</label>
                    <input type="text" id="entity1-name-ar" value={brandingForm.company1NameAr} onChange={(e) => setBrandingForm({ ...brandingForm, company1NameAr: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                  </div>
                </div>

                <div className="bg-black/40 border border-gray-900 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-black text-[#D30014] uppercase">الجهة المالكة الثانية (التكنولوجيا)</h3>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">اسم الشركة (إنجليزي)</label>
                    <input type="text" id="entity2-name-en" value={brandingForm.company2Name} onChange={(e) => setBrandingForm({ ...brandingForm, company2Name: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">اسم الشركة (عربي)</label>
                    <input type="text" id="entity2-name-ar" value={brandingForm.company2NameAr} onChange={(e) => setBrandingForm({ ...brandingForm, company2NameAr: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                  </div>
                </div>
              </div>

              {!isViewer && (
                <div className="flex justify-end">
                  <button type="submit" className="px-6 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white text-xs font-bold rounded-lg cursor-pointer">
                    حفظ إعدادات الهوية
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ----------------- TAB 5: CARDS ----------------- */}
        {activeTab === "cards" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#121212] border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-black text-white">سجل إدارة الأصول الرقمية والبطاقات</h2>
              {!isViewer && (
                <button onClick={handleGenerateSequentialCard} className="flex items-center gap-2 px-5 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white font-bold rounded-xl text-xs cursor-pointer">
                  <Plus className="w-4 h-4" /> <span>توليد بطاقة جديدة</span>
                </button>
              )}
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold">
                    <th className="py-4 px-6">الرقم المسلسل</th>
                    <th className="py-4 px-6">الحالة</th>
                    <th className="py-4 px-6 text-right">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {cards.map((card: any) => (
                    <tr key={card.id}>
                      <td className="py-4 px-6 font-mono font-bold text-white">{card.cardId}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${card.status === "Active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"}`}>
                          {card.status === "Active" ? "نشطة" : "معطلة"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isViewer && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditCard(card)} className="p-2 bg-gray-800 text-white rounded cursor-pointer" title="تعديل">
                              <Edit3 className="w-4 h-4 text-[#D30014]" />
                            </button>
                            <button onClick={() => handleDeleteCard(card.id)} className="p-2 bg-red-500/10 text-red-500 rounded cursor-pointer" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {cards.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-gray-500 font-bold">لا توجد بطاقات مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB 6: VIEWERS ----------------- */}
        {activeTab === "viewers" && !isViewer && (
          <div className="space-y-8">
            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-black text-white mb-4">إدارة حسابات المراقبة والتدقيق</h2>
              <form onSubmit={handleCreateViewerAccount} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input type="text" required placeholder="اسم المستخدم" value={viewerForm.username} onChange={(e) => setViewerForm({ ...viewerForm, username: e.target.value })} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                <input type="text" required placeholder="كلمة المرور" value={viewerForm.password} onChange={(e) => setViewerForm({ ...viewerForm, password: e.target.value })} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                <input type="text" placeholder="اسم المراقب" value={viewerForm.name} onChange={(e) => setViewerForm({ ...viewerForm, name: e.target.value })} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                <button type="submit" className="px-6 py-2 bg-[#D30014] text-white text-xs font-bold rounded-lg cursor-pointer">
                  إنشاء الحساب
                </button>
              </form>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold">
                    <th className="py-4 px-6">اسم المستخدم</th>
                    <th className="py-4 px-6">كلمة المرور</th>
                    <th className="py-4 px-6">اسم المراقب</th>
                    <th className="py-4 px-6 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-xs font-semibold text-gray-300">
                  {viewerAccounts.map((acc) => (
                    <tr key={acc.id}>
                      <td className="py-4 px-6 font-mono font-bold text-white">{acc.username}</td>
                      <td className="py-4 px-6 font-mono text-amber-300">{acc.password}</td>
                      <td className="py-4 px-6">{acc.name || "—"}</td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => handleDeleteViewerAccount(acc.id, acc.username)} className="p-2 bg-red-500/10 text-red-500 rounded cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {viewerAccounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500 font-bold">لا توجد حسابات مراقبة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: MEMBER CRUD */}
      {showMemberForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <h3 className="text-lg font-black mb-4">{editingMember ? "تعديل مشترك" : "إضافة مشترك جديد"}</h3>
            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <input type="text" required placeholder="الاسم (إنجليزي)" value={memberForm.fullName} onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              <input type="text" required placeholder="الاسم (عربي)" value={memberForm.fullNameAr} onChange={(e) => setMemberForm({ ...memberForm, fullNameAr: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              <input type="text" required placeholder="رقم البطاقة (e.g. BYD-2026-001)" value={memberForm.cardId} onChange={(e) => setMemberForm({ ...memberForm, cardId: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold" />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowMemberForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PARTNER CRUD */}
      {showPartnerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <h3 className="text-lg font-black mb-4">{editingPartner ? "تعديل شريك" : "إضافة شريك جديد"}</h3>
            <form onSubmit={handleSavePartner} className="space-y-4 text-xs">
              <input type="text" required placeholder="اسم الشركة (إنجليزي)" value={partnerForm.companyName} onChange={(e) => setPartnerForm({ ...partnerForm, companyName: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              <input type="text" required placeholder="اسم الشركة (عربي)" value={partnerForm.companyNameAr} onChange={(e) => setPartnerForm({ ...partnerForm, companyNameAr: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowPartnerForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CARD CRUD */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <h3 className="text-lg font-black mb-4">تسجيل رقم بطاقة</h3>
            <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
              <input type="text" required placeholder="رقم مسلسل البطاقة" value={cardForm.cardId} onChange={(e) => setCardForm({ ...cardForm, cardId: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold" />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCardForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
