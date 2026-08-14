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
  XCircle,
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

  const [activeTab, setActiveTab] = useState<"analytics" | "members" | "partners" | "branding" | "cards" | "viewers">("analytics");

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
  const [isLoading, setIsLoading] = useState(true);

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

  const [activeTemplate, setActiveTemplate] = useState<{ cardDesignBase64: string; type?: "image" | "video" } | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<"image" | "video">("image");
  const [cardMedia, setCardMedia] = useState<{ type: "image" | "video"; data: string } | null>(() => {
    const cached = localStorage.getItem("BYD_CARD_MEDIA");
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    const loadMediaState = () => {
      const cached = localStorage.getItem("BYD_CARD_MEDIA");
      setCardMedia(cached ? JSON.parse(cached) : null);
    };

    const loadTemplate = () => {
      const cached = localStorage.getItem('BYD_CARD_TEMPLATE_ACTIVE_STATE');
      if (cached) {
        try { setActiveTemplate(JSON.parse(cached)); } catch (e) { console.error(e); }
      }
    };

    loadMediaState();
    loadTemplate();

    window.addEventListener("storage-sync-updated", loadMediaState);
    window.addEventListener("storage", loadMediaState);
    return () => {
      window.removeEventListener("storage-sync-updated", loadMediaState);
      window.removeEventListener("storage", loadMediaState);
    };
  }, []);

  const handleMultimediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      alert("الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 4 ميغابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const mediaPayload = { type: selectedAssetType, data: base64String };
      localStorage.setItem('BYD_CARD_MEDIA', JSON.stringify(mediaPayload));
      setCardMedia(mediaPayload);
      window.dispatchEvent(new Event('storage-sync-updated'));
      alert("تم رفع وحفظ أصل الوسائط المتعددة بنجاح!");
    };
    reader.readAsDataURL(file);
  };

  const handleResetMedia = () => {
    localStorage.removeItem('BYD_CARD_MEDIA');
    localStorage.removeItem('BYD_CARD_TEMPLATE_ACTIVE_STATE');
    setCardMedia(null);
    setActiveTemplate(null);
    window.dispatchEvent(new Event('storage-sync-updated'));
    alert("تمت إعادة تعيين قالب البطاقة للتصميم الافتراضي!");
  };

  // Forms State
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [cardForm, setCardForm] = useState({ cardId: "", status: "Active" as "Active" | "Inactive", memberId: "" });

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
    discount: "10%"
  });

  const [brandingForm, setBrandingForm] = useState({
    company1Name: branding?.company1Name || "TAJ Marketing",
    company1NameAr: branding?.company1NameAr || "شركة تاج للتسويق",
    company1Desc: "",
    company1DescAr: "",
    company1Logo: branding?.company1Logo || "",
    company2Name: branding?.company2Name || "GeniusWings Group",
    company2NameAr: branding?.company2NameAr || "أجنحة العبقرية للنظم",
    company2Desc: "",
    company2DescAr: "",
    company2Logo: branding?.company2Logo || ""
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [mRes, pRes, fRes, cRes] = await Promise.all([
        fetch("/api/members").catch(() => null),
        fetch("/api/partners").catch(() => null),
        fetch("/api/financials").catch(() => null),
        fetch("/api/cards").catch(() => null)
      ]);
      if (mRes?.ok) setMembers(await mRes.json());
      if (pRes?.ok) setPartners(await pRes.json());
      if (fRes?.ok) {
        const fData = await fRes.json();
        if (fData) setFinancials(fData);
      }
      if (cRes?.ok) setCards(await cRes.json());

      const mLocal = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const pLocal = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      setLocalMembersList(mLocal);
      setLocalPartnersList(pLocal);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [adminToken]);

  const isPartnerActive = (p: any) => !p || !p.status || String(p.status).toLowerCase() === "active" || String(p.status).toLowerCase() === "نشط";
  const isMemberActive = (m: any) => !m || !m.status || String(m.status).toLowerCase() === "active" || String(m.status).toLowerCase() === "نشط";

  const allPartners = React.useMemo(() => {
    const list = [...partners];
    localPartnersList.forEach((lp: any) => {
      if (!lp) return;
      const idx = list.findIndex((sp: any) => (lp.id && sp.id && lp.id === sp.id) || (lp.companyName && sp.companyName && lp.companyName.toLowerCase() === sp.companyName.toLowerCase()));
      if (idx > -1) list[idx] = { ...list[idx], ...lp };
      else list.push(lp);
    });
    return list;
  }, [partners, localPartnersList]);

  const allMembers = React.useMemo(() => {
    const list = [...members];
    localMembersList.forEach((lm: any) => {
      if (!lm) return;
      const idx = list.findIndex((sm: any) => (lm.id && sm.id && lm.id === sm.id) || (lm.cardId && sm.cardId && lm.cardId.toLowerCase() === sm.cardId.toLowerCase()));
      if (idx > -1) list[idx] = { ...list[idx], ...lm };
      else list.push(lm);
    });
    return list;
  }, [members, localMembersList]);

  const activeLocalMembers = React.useMemo(() => allMembers.filter(isMemberActive), [allMembers]);
  const activeLocalPartners = React.useMemo(() => allPartners.filter(isPartnerActive), [allPartners]);

  const localB2BCollected = React.useMemo(() => activeLocalPartners.reduce((sum, p: any) => sum + (Number(p?.feePaidIqd) || 150000), 0), [activeLocalPartners]);
  const localB2CCollected = React.useMemo(() => activeLocalMembers.reduce((sum, m: any) => sum + (Number(m?.feePaidIqd) || 25000), 0), [activeLocalMembers]);

  const liveProvinceBreakdown = React.useMemo(() => {
    return provincesList.map(prov => {
      const provPartners = activeLocalPartners.filter(p => p && (p.province === prov.en || p.provinceAr === prov.ar));
      const provMembers = activeLocalMembers.filter(m => m && (m.province === prov.en || m.provinceAr === prov.ar));
      return {
        province: prov.en,
        provinceAr: prov.ar,
        partners: provPartners.length,
        users: provMembers.length,
        collectedB2B: provPartners.reduce((s, p: any) => s + (Number(p?.feePaidIqd) || 150000), 0),
        collectedB2C: provMembers.reduce((s, m: any) => s + (Number(m?.feePaidIqd) || 25000), 0),
        targetPartners: 10,
        targetUsers: 100
      };
    });
  }, [activeLocalMembers, activeLocalPartners]);

  const filteredMembers = React.useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return allMembers.filter(m => {
      if (!m) return false;
      const matchesSearch = !q || (m.fullName && m.fullName.toLowerCase().includes(q)) || (m.fullNameAr && m.fullNameAr.toLowerCase().includes(q)) || (m.cardId && m.cardId.toLowerCase().includes(q));
      const matchesProvince = provinceFilter === "All" || m.province === provinceFilter || m.provinceAr === provinceFilter;
      const matchesStatus = statusFilter === "All" || m.status === statusFilter;
      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [allMembers, searchQuery, provinceFilter, statusFilter]);

  const filteredPartners = React.useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return allPartners.filter(p => {
      if (!p) return false;
      const matchesSearch = !q || (p.companyName && p.companyName.toLowerCase().includes(q)) || (p.companyNameAr && p.companyNameAr.toLowerCase().includes(q)) || (p.sector && p.sector.toLowerCase().includes(q));
      const matchesProvince = provinceFilter === "All" || p.province === provinceFilter || p.provinceAr === provinceFilter;
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [allPartners, searchQuery, provinceFilter, statusFilter]);

  // Actions
  const handleClearAllData = () => {
    if (!confirm("هل أنت متأكد من مسح جميع البيانات؟")) return;
    safeSetLocalStorage("byd-custom-members", JSON.stringify([]));
    safeSetLocalStorage("BYD_USERS", JSON.stringify([]));
    safeSetLocalStorage("byd-custom-partners", JSON.stringify([]));
    safeSetLocalStorage("BYD_COMPANIES", JSON.stringify([]));
    safeSetLocalStorage("byd-cards", JSON.stringify([]));
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const handleToggleMemberStatus = (member: Member) => {
    const newStatus = isMemberActive(member) ? "Inactive" : "Active";
    const updated = { ...member, status: newStatus };
    const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
    safeSetLocalStorage("byd-custom-members", JSON.stringify(m1.map((i: any) => (i.id === member.id || i.cardId === member.cardId) ? updated : i)));
    setLocalMembersList(prev => prev.map(m => (m.id === member.id || m.cardId === member.cardId) ? updated : m));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const handleTogglePartnerStatus = (partner: Partner) => {
    const newStatus = isPartnerActive(partner) ? "Inactive" : "Active";
    const updated = { ...partner, status: newStatus };
    const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
    safeSetLocalStorage("byd-custom-partners", JSON.stringify(p1.map((i: any) => (i.id === partner.id || i.username === partner.username) ? updated : i)));
    setLocalPartnersList(prev => prev.map(p => (p.id === partner.id || p.username === partner.username) ? updated : p));
    window.dispatchEvent(new Event("storage-sync-updated"));
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.fullName || !memberForm.cardId) {
      alert("يرجى ملء الحقول المطلوبة");
      return;
    }
    const body = { id: editingMember?.id || "m-" + Date.now(), ...memberForm };
    const currentCustom = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
    const idx = currentCustom.findIndex((m: any) => m.id === body.id || m.cardId === body.cardId);
    if (idx > -1) currentCustom[idx] = body; else currentCustom.push(body);
    safeSetLocalStorage("byd-custom-members", JSON.stringify(currentCustom));
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
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const deleted = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]");
    if (!deleted.includes(id)) deleted.push(id);
    safeSetLocalStorage("BYD_DELETED_MEMBERS", JSON.stringify(deleted));
    const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]").filter((m: any) => m.id !== id && m.cardId !== id);
    safeSetLocalStorage("byd-custom-members", JSON.stringify(m1));
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.companyName) {
      alert("يرجى ملء الحقول المطلوبة");
      return;
    }
    const body = { id: editingPartner?.id || "p-" + Date.now(), ...partnerForm };
    const currentCustom = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
    const idx = currentCustom.findIndex((p: any) => p.id === body.id || p.companyName === body.companyName);
    if (idx > -1) currentCustom[idx] = body; else currentCustom.push(body);
    safeSetLocalStorage("byd-custom-partners", JSON.stringify(currentCustom));
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
      discount: partner.discount || "10%"
    });
    setShowPartnerForm(true);
  };

  const handleDeletePartner = (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const deleted = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]");
    if (!deleted.includes(id)) deleted.push(id);
    safeSetLocalStorage("BYD_DELETED_PARTNERS", JSON.stringify(deleted));
    const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]").filter((p: any) => p.id !== id && p.username !== id);
    safeSetLocalStorage("byd-custom-partners", JSON.stringify(p1));
    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.cardId) return;
    const cardsList = JSON.parse(localStorage.getItem("byd-cards") || "[]");
    const idx = cardsList.findIndex((c: any) => c.cardId === cardForm.cardId);
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
    setCardForm({ cardId: card.cardId || "", status: card.status || "Active", memberId: card.memberId || "" });
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
    setCardForm({ cardId: `BYD-2026-${String(maxSuffix + 1).padStart(3, "0")}`, status: "Active", memberId: "" });
    setEditingCard(null);
    setShowCardForm(true);
  };

  const handleCreateViewerAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerForm.username || !viewerForm.password) return;
    const newViewer: ViewerAccount = {
      id: "v-" + Date.now(),
      username: viewerForm.username.trim(),
      password: viewerForm.password.trim(),
      name: viewerForm.name.trim() || viewerForm.username.trim(),
      notes: viewerForm.notes.trim(),
      createdAt: new Date().toISOString().split("T")[0]
    };
    const updated = [newViewer, ...viewerAccounts];
    setViewerAccounts(updated);
    safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(updated));
    setViewerForm({ username: "", password: "", name: "", notes: "" });
    setViewerMsg({ type: "success", text: "تم إنشاء حساب المراقبة بنجاح!" });
  };

  const handleDeleteViewerAccount = (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const updated = viewerAccounts.filter(v => v.id !== id);
    setViewerAccounts(updated);
    safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(updated));
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("byd-custom-branding", JSON.stringify(brandingForm));
    if (setBranding) setBranding(brandingForm);
    alert("تم حفظ إعدادات الهوية والشركات المالكة بنجاح!");
  };

  // 📄 Professional PDF Comprehensive Report Generator (Matches Google AI Studio design)
  const handleExportComprehensiveAnalyticsPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة لتصدير التقرير الاحترافي");
      return;
    }

    const totalMembersCount = activeLocalMembers.length;
    const totalPartnersCount = activeLocalPartners.length;
    const totalCollectedB2B = localB2BCollected;
    const totalCollectedB2C = localB2CCollected;
    const totalGrossRevenue = totalCollectedB2B + totalCollectedB2C;
    const totalTargetRevenue = 28500000 + 95000000;
    const achievementPercent = ((totalGrossRevenue / totalTargetRevenue) * 100).toFixed(1);

    const sixMonthsCount = activeLocalMembers.filter(m => !m.durationMonths || m.durationMonths === 6).length;
    const twelveMonthsCount = activeLocalMembers.filter(m => m.durationMonths === 12).length;

    const sectorStats: { [sector: string]: number } = {};
    activeLocalPartners.forEach(p => {
      const s = p.sector || p.sectorAr || "Other";
      sectorStats[s] = (sectorStats[s] || 0) + 1;
    });

    const sectorRows = Object.entries(sectorStats).map(([sec, count]) => {
      const pct = totalPartnersCount > 0 ? ((count / totalPartnersCount) * 100).toFixed(1) : "0";
      return `<tr><td style="font-weight: bold;">${sec}</td><td style="text-align: center; font-weight: bold;">${count}</td><td style="text-align: right; color: #D30014; font-weight: bold;">${pct}%</td></tr>`;
    }).join("");

    const provinceRows = liveProvinceBreakdown.map((pb, index) => `
      <tr style="${index % 2 === 1 ? 'background-color: #fafafa;' : ''}">
        <td style="font-weight: bold;"><span>${pb.province}</span> <span style="color: #666; font-size: 11px;">(${pb.provinceAr})</span></td>
        <td style="text-align: center; font-weight: bold;">${pb.partners}</td>
        <td style="text-align: center; font-weight: bold;">${pb.users}</td>
        <td style="text-align: right;">${pb.collectedB2B.toLocaleString()} IQD</td>
        <td style="text-align: right;">${pb.collectedB2C.toLocaleString()} IQD</td>
        <td style="text-align: right; font-weight: bold; color: #137333;">${(pb.collectedB2B + pb.collectedB2C).toLocaleString()} IQD</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="ltr">
        <head>
          <meta charset="utf-8" />
          <title>BYD Comprehensive Analytics & Statistical Audit Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 35px; font-size: 12px; line-height: 1.45; background: #fff; }
            .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #D30014; padding-bottom: 16px; margin-bottom: 24px; }
            .badge-certified { background: #111; color: #fff; font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
            .kpi-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 14px; }
            .kpi-card.highlight { background: #fff5f5; border-color: #fed7d7; }
            .section-title { font-size: 13px; font-weight: 900; color: #111; text-transform: uppercase; margin: 24px 0 12px 0; border-left: 4px solid #D30014; padding-left: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; }
            th { background: #1a1a1a; color: #fff; padding: 9px 12px; text-transform: uppercase; font-size: 10.5px; }
            td { padding: 8px 12px; border-bottom: 1px solid #e9ecef; }
            .total-row td { background: #f1f3f5; font-weight: 900; border-top: 2px solid #111; border-bottom: 2px solid #111; }
            .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 35px; border-top: 1px solid #dee2e6; padding-top: 20px; text-align: center; }
            .sign-box { background: #fafafa; border: 1px dashed #ced4da; border-radius: 8px; padding: 10px; }
            .sign-placeholder { height: 40px; border-bottom: 1px solid #111; margin: 10px 20px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="font-size: 20px; font-weight: 900; color: #D30014;">BYD LUXURY VIP NETWORK</div>
            </div>
            <div style="text-align: right;">
              <span class="badge-certified">OFFICIAL EXECUTIVE AUDIT</span>
              <div style="font-size: 11px; margin-top: 4px;">Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card highlight">
              <div style="font-size: 10px; font-weight: bold; color: #6c757d;">GROSS REVENUE (IQD)</div>
              <div style="font-size: 18px; font-weight: 900; color: #D30014; margin-top: 6px;">${totalGrossRevenue.toLocaleString()} IQD</div>
              <div style="font-size: 10px; color: #888; margin-top: 4px;">Achievement: ${achievementPercent}%</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; font-weight: bold; color: #6c757d;">B2B CORPORATE REVENUE</div>
              <div style="font-size: 18px; font-weight: 900; color: #137333; margin-top: 6px;">${totalCollectedB2B.toLocaleString()} IQD</div>
              <div style="font-size: 10px; color: #888; margin-top: 4px;">${totalPartnersCount} Active Companies</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; font-weight: bold; color: #6c757d;">B2C MEMBERS REVENUE</div>
              <div style="font-size: 18px; font-weight: 900; color: #1a73e8; margin-top: 6px;">${totalCollectedB2C.toLocaleString()} IQD</div>
              <div style="font-size: 10px; color: #888; margin-top: 4px;">${totalMembersCount} Active Subscribers</div>
            </div>
            <div class="kpi-card">
              <div style="font-size: 10px; font-weight: bold; color: #6c757d;">NATIONAL COVERAGE</div>
              <div style="font-size: 18px; font-weight: 900; color: #111; margin-top: 6px;">19 Provinces</div>
              <div style="font-size: 10px; color: #888; margin-top: 4px;">100% Nationwide Node</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <div class="section-title">B2C Subscription Plans Breakdown</div>
              <table>
                <thead><tr><th>Plan Type</th><th style="text-align: center;">Members</th><th style="text-align: right;">Total IQD</th></tr></thead>
                <tbody>
                  <tr><td>6-Month Plan (VIP)</td><td style="text-align: center;">${sixMonthsCount}</td><td style="text-align: right;">${(sixMonthsCount * 25000).toLocaleString()} IQD</td></tr>
                  <tr><td>12-Month Plan (Annual)</td><td style="text-align: center;">${twelveMonthsCount}</td><td style="text-align: right;">${(twelveMonthsCount * 50000).toLocaleString()} IQD</td></tr>
                  <tr class="total-row"><td>Total B2C</td><td style="text-align: center;">${totalMembersCount}</td><td style="text-align: right;">${totalCollectedB2C.toLocaleString()} IQD</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div class="section-title">B2B Corporate Sectors Distribution</div>
              <table>
                <thead><tr><th>Sector</th><th style="text-align: center;">Count</th><th style="text-align: right;">Share %</th></tr></thead>
                <tbody>
                  ${sectorRows || '<tr><td colspan="3" style="text-align:center;">No partners registered</td></tr>'}
                  <tr class="total-row"><td>Total Partners</td><td style="text-align: center;">${totalPartnersCount}</td><td style="text-align: right;">100%</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title">Geographical Distribution Across Iraq Governorates (19 Provinces)</div>
          <table>
            <thead><tr><th>Province / المحافظة</th><th style="text-align: center;">B2B</th><th style="text-align: center;">B2C</th><th style="text-align: right;">B2B Rev</th><th style="text-align: right;">B2C Rev</th><th style="text-align: right;">Total (IQD)</th></tr></thead>
            <tbody>
              ${provinceRows}
              <tr class="total-row"><td>GRAND TOTAL</td><td style="text-align: center;">${activeLocalPartners.length}</td><td style="text-align: center;">${activeLocalMembers.length}</td><td style="text-align: right;">${totalCollectedB2B.toLocaleString()}</td><td style="text-align: right;">${totalCollectedB2C.toLocaleString()}</td><td style="text-align: right; color: #D30014;">${totalGrossRevenue.toLocaleString()} IQD</td></tr>
            </tbody>
          </table>

          <div class="sign-grid">
            <div class="sign-box"><h5>BYD Platform Administration</h5><div class="sign-placeholder"></div><p>Authorized Signature</p></div>
            <div class="sign-box"><h5>GeniusWings Group</h5><div class="sign-placeholder"></div><p>Technical & Operations</p></div>
            <div class="sign-box"><h5>TAJ Marketing & Production</h5><div class="sign-placeholder"></div><p>Commercial Department</p></div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportToPDF = () => handleExportComprehensiveAnalyticsPDF();

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
              <button onClick={handleExportComprehensiveAnalyticsPDF} className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] text-white font-bold rounded-xl text-xs cursor-pointer shadow-md">
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
                <MapPin className="w-4 h-4 text-[#D30014]" /> مؤشرات الأداء المالي المفصلة حسب المحافظات الـ 19
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black mb-4">{editingMember ? "تعديل مشترك" : "إضافة مشترك جديد"}</h3>
            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">الاسم (إنجليزي)</label>
                <input type="text" required value={memberForm.fullName} onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">الاسم (عربي)</label>
                <input type="text" required value={memberForm.fullNameAr} onChange={(e) => setMemberForm({ ...memberForm, fullNameAr: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">رقم البطاقة الفريد</label>
                <input type="text" required value={memberForm.cardId} onChange={(e) => setMemberForm({ ...memberForm, cardId: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">المحافظة</label>
                <select value={memberForm.province} onChange={(e) => setMemberForm({ ...memberForm, province: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold">
                  {provincesList.map((p, idx) => <option key={idx} value={p.en}>{p.ar}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowMemberForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg cursor-pointer">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PARTNER CRUD */}
      {showPartnerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black mb-4">{editingPartner ? "تعديل شريك" : "إضافة شريك جديد"}</h3>
            <form onSubmit={handleSavePartner} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">اسم الشركة (إنجليزي)</label>
                <input type="text" required value={partnerForm.companyName} onChange={(e) => setPartnerForm({ ...partnerForm, companyName: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">اسم الشركة (عربي)</label>
                <input type="text" required value={partnerForm.companyNameAr} onChange={(e) => setPartnerForm({ ...partnerForm, companyNameAr: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">القطاع</label>
                <select value={partnerForm.sector} onChange={(e) => setPartnerForm({ ...partnerForm, sector: e.target.value })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold">
                  {sectorsList.map((s, idx) => <option key={idx} value={s.en}>{s.ar}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowPartnerForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg cursor-pointer">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CARD CRUD */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
            <h3 className="text-lg font-black mb-4">تسجيل رقم بطاقة</h3>
            <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">رقم مسلسل البطاقة</label>
                <input type="text" required value={cardForm.cardId} onChange={(e) => setCardForm({ ...cardForm, cardId: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCardForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg cursor-pointer">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
