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
  Copy,
  Check,
  Shield,
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
  const t = translations[lang];
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

  // Viewer Accounts State (for Master Admin)
  const [viewerAccounts, setViewerAccounts] = useState<ViewerAccount[]>([]);
  const [viewerForm, setViewerForm] = useState({
    username: "",
    password: "",
    name: "",
    notes: ""
  });
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerMsg, setViewerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Card Template Management State & Functions
  const [activeTemplate, setActiveTemplate] = useState<{ cardDesignBase64: string; type?: "image" | "video" } | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<"image" | "video">("image");
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

  const handleMultimediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      alert(lang === "en" ? "File is too large. Please select a file under 4MB." : "حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 4 ميغابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const mediaPayload = { type: selectedAssetType, data: base64String };

      try {
        localStorage.setItem('BYD_CARD_MEDIA', JSON.stringify(mediaPayload));
        setCardMedia(mediaPayload);
        
        const legacyPayload = {
          cardDesignBase64: base64String,
          type: selectedAssetType,
          themeName: "Custom Uploaded Design",
          uploadedAt: new Date().toISOString()
        };
        setActiveTemplate(legacyPayload);
        localStorage.setItem('BYD_CARD_TEMPLATE_ACTIVE_STATE', JSON.stringify(legacyPayload));
        
        await fetch("/api/cards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
          },
          body: JSON.stringify(legacyPayload)
        }).catch(err => console.error("Server template sync ignored:", err));

        window.dispatchEvent(new Event('storage-sync-updated'));
        window.dispatchEvent(new Event('storage'));
        alert(lang === "en" ? "Multimedia asset saved successfully!" : "تم حفظ أصل الوسائط بنجاح!");
      } catch (err) {
        console.error(err);
        alert(lang === "en" ? "Failed to save storage." : "فشل الحفظ في الذاكرة.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetMedia = async () => {
    localStorage.removeItem('BYD_CARD_MEDIA');
    localStorage.removeItem('BYD_CARD_TEMPLATE_ACTIVE_STATE');
    setCardMedia(null);
    setActiveTemplate(null);

    try {
      await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ cardDesignBase64: "" })
      });
    } catch (err) {
      console.error(err);
    }

    window.dispatchEvent(new Event('storage-sync-updated'));
    window.dispatchEvent(new Event('storage'));
    alert(lang === "en" ? "Template reset to default!" : "تمت إعادة تعيين قالب البطاقة للافتراضي!");
  };

  // Card CRUD States
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [cardForm, setCardForm] = useState({
    cardId: "",
    status: "Active" as "Active" | "Inactive",
    memberId: ""
  });

  // Dynamic Branding Form State
  const [brandingForm, setBrandingForm] = useState({
    company1Name: "",
    company1NameAr: "",
    company1Desc: "",
    company1DescAr: "",
    company1Logo: "",
    company2Name: "",
    company2NameAr: "",
    company2Desc: "",
    company2DescAr: "",
    company2Logo: ""
  });

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        company1Name: branding.company1Name || "",
        company1NameAr: branding.company1NameAr || "",
        company1Desc: branding.company1Desc || "",
        company1DescAr: branding.company1DescAr || "",
        company1Logo: branding.company1Logo || "",
        company2Name: branding.company2Name || "",
        company2NameAr: branding.company2NameAr || "",
        company2Desc: branding.company2Desc || "",
        company2DescAr: branding.company2DescAr || "",
        company2Logo: branding.company2Logo || ""
      });
    }
  }, [branding]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();

    const brandData = {
      entity1NameEn: brandingForm.company1Name,
      entity1NameAr: brandingForm.company1NameAr,
      entity1DescEn: brandingForm.company1Desc,
      entity1DescAr: brandingForm.company1DescAr,
      entity1Logo: brandingForm.company1Logo,
      entity2NameEn: brandingForm.company2Name,
      entity2NameAr: brandingForm.company2NameAr,
      entity2DescEn: brandingForm.company2Desc,
      entity2DescAr: brandingForm.company2DescAr,
      entity2Logo: brandingForm.company2Logo
    };
    localStorage.setItem('BYD_BRAND_PERSISTENT_STATE', JSON.stringify(brandData));
    localStorage.setItem("byd-custom-branding", JSON.stringify(brandingForm));
    setBranding(brandingForm);

    try {
      await fetch("/api/branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(brandingForm)
      });
    } catch (err) {
      console.error("Cloud saving failed, using local fallback:", err);
    }
    alert(lang === "en" ? "Branding updated successfully!" : "تم تحديث إعدادات الهوية بنجاح!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "company1Logo" | "company2Logo") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === "en" ? "Image size exceeds 2MB" : "حجم الصورة يتجاوز 2 ميجابايت");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandingForm(prev => ({
          ...prev,
          [field]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePartnerLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartnerForm(prev => ({
          ...prev,
          logoUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePartnerVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartnerForm(prev => ({
          ...prev,
          promoVideoUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // CRUD Actions / Form States
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

  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    companyName: "",
    companyNameAr: "",
    sector: "Restaurant",
    logoUrl: "",
    promoVideoUrl: "",
    province: "Baghdad",
    expiryDate: "",
    status: "Active",
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

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Video Preview Modal
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Load All Dashboard Data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, partnersRes, finRes, cardsRes] = await Promise.all([
        fetch("/api/members").catch(() => null),
        fetch("/api/partners").catch(() => null),
        fetch("/api/financials").catch(() => null),
        fetch("/api/cards").catch(() => null)
      ]);

      if (membersRes?.ok) {
        setMembers(await membersRes.json());
      }
      if (partnersRes?.ok) {
        setPartners(await partnersRes.json());
      }
      if (finRes?.ok) {
        setFinancials(await finRes.json());
      }
      if (cardsRes?.ok) {
        setCards(await cardsRes.json());
      }
    } catch (err) {
      console.error("Error loading administrative data:", err);
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
          }
        }
      } catch (viewersErr) {
        console.error("Error loading viewer accounts:", viewersErr);
      }
    }
  };

  const handleCreateViewerAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerForm.username || !viewerForm.password) {
      setViewerMsg({
        type: "error",
        text: lang === "en" ? "Username and Password are required." : "اسم المستخدم وكلمة المرور مطلوبان."
      });
      return;
    }

    setViewerLoading(true);
    setViewerMsg(null);

    try {
      const res = await fetch("/api/admin/viewers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(viewerForm)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.viewers)) {
          setViewerAccounts(data.viewers);
        } else if (data.viewer) {
          setViewerAccounts((prev) => [data.viewer, ...prev.filter((v) => v.id !== data.viewer.id)]);
        }
        setViewerForm({ username: "", password: "", name: "", notes: "" });
        setViewerMsg({
          type: "success",
          text: lang === "en" ? "Monitoring account created successfully!" : "تم إنشاء حساب المراقبة بنجاح!"
        });
      } else {
        setViewerMsg({
          type: "error",
          text: lang === "en" ? data.message : (data.messageAr || data.message)
        });
      }
    } catch (err) {
      console.error(err);
      setViewerMsg({
        type: "error",
        text: lang === "en" ? "Failed to create account." : "فشل إنشاء الحساب."
      });
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDeleteViewerAccount = async (id: string, username: string) => {
    if (!window.confirm(lang === "en" ? `Delete auditor account '${username}'?` : `حذف حساب المراقبة '${username}'؟`)) {
      return;
    }

    const previousAccounts = [...viewerAccounts];
    setViewerAccounts((prev) => prev.filter((v) => v.id !== id && v.username !== username));

    try {
      const res = await fetch(`/api/admin/viewers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.viewers)) {
        setViewerAccounts(data.viewers);
      }
    } catch (err) {
      console.error(err);
      setViewerAccounts(previousAccounts);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  useEffect(() => {
    loadAllData();
  }, [adminToken]);

  useEffect(() => {
    const updateLocalLists = () => {
      const deletedPartners = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]").map((s: string) => s.toLowerCase());
      const deletedMembers = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]").map((s: string) => s.toLowerCase());

      const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
      const combinedMembers = [...m1];
      m2.forEach((m: any) => {
        if (!combinedMembers.some((existing: any) => existing.cardId === m.cardId)) {
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
        if (!combinedPartners.some((existing: any) => existing.username === p.username || existing.companyName === p.companyName)) {
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
    };

    updateLocalLists();
    
    window.addEventListener("storage-sync-updated", updateLocalLists);
    window.addEventListener("storage", updateLocalLists);
    return () => {
      window.removeEventListener("storage-sync-updated", updateLocalLists);
      window.removeEventListener("storage", updateLocalLists);
    };
  }, []);

  // MEMBER TOGGLE STATUS (Active <-> Inactive)
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

      const cardsList = JSON.parse(localStorage.getItem("byd-cards") || "[]");
      const updatedCards = cardsList.map((c: any) => {
        if (member.cardId && c.cardId && c.cardId.trim().toUpperCase() === member.cardId.trim().toUpperCase()) {
          return { ...c, status: newStatus };
        }
        return c;
      });
      safeSetLocalStorage("byd-cards", JSON.stringify(updatedCards));
    } catch (e) {
      console.error("Local storage toggle member sync error:", e);
    }

    setMembers(prev => prev.map(m => (m.id === member.id || (member.cardId && m.cardId === member.cardId)) ? updatedMember : m));
    setLocalMembersList(prev => prev.map(m => (m.id === member.id || (member.cardId && m.cardId === member.cardId)) ? updatedMember : m));

    window.dispatchEvent(new Event("storage-sync-updated"));

    try {
      await fetch(`/api/members/${encodeURIComponent(member.id || member.cardId)}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(updatedMember)
      });
    } catch (err) {
      console.warn("Backend unreachable during member status toggle, updated locally only.", err);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.fullName || !memberForm.fullNameAr || !memberForm.cardId) {
      alert(t.errorFill);
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

    const url = editingMember ? `/api/members/${editingMember.id}` : "/api/members";
    const method = editingMember ? "PUT" : "POST";

    try {
      await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.warn("API unreachable, saved locally only.", err);
    }

    alert(t.successSave);
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
    if (!confirm(t.confirmDelete)) return;

    const memberToDelete = members.find(m => m.id === id || m.cardId === id) ||
                           localMembersList.find((m: any) => m.id === id || m.cardId === id);
    
    const targetId = memberToDelete?.id || id;
    const cardId = memberToDelete?.cardId;

    try {
      const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]");
      if (targetId && !deletedList.includes(targetId)) deletedList.push(targetId);
      if (cardId && !deletedList.includes(cardId)) deletedList.push(cardId);
      safeSetLocalStorage("BYD_DELETED_MEMBERS", JSON.stringify(deletedList));

      const isMatch = (m: any) => m.id === targetId || m.id === id || (cardId && m.cardId === cardId);

      const syncBydUsers = JSON.parse(localStorage.getItem("BYD_USERS") || "[]").filter((m: any) => !isMatch(m));
      const syncCustomMembers = JSON.parse(localStorage.getItem("byd-custom-members") || "[]").filter((m: any) => !isMatch(m));

      safeSetLocalStorage("BYD_USERS", JSON.stringify(syncBydUsers));
      safeSetLocalStorage("byd-custom-members", JSON.stringify(syncCustomMembers));
    } catch (e) {
      console.error(e);
    }

    setMembers(prev => prev.filter(m => m.id !== targetId && m.id !== id && (!cardId || m.cardId !== cardId)));
    setLocalMembersList(prev => prev.filter((m: any) => m.id !== targetId && m.id !== id && (!cardId || m.cardId !== cardId)));

    try {
      await fetch(`/api/members/${encodeURIComponent(targetId || cardId || id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (err) {
      console.error(err);
    }

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

  const isPartnerActive = (p: any) => {
    if (!p.status) return true;
    const s = String(p.status).toLowerCase();
    return s === "active" || s === "نشط";
  };

  const isMemberActive = (m: any) => {
    if (!m.status) return true;
    const s = String(m.status).toLowerCase();
    return s === "active" || s === "نشط";
  };

  // PARTNER TOGGLE STATUS (Active <-> Inactive)
  const handleTogglePartnerStatus = async (partner: Partner) => {
    const currentActive = isPartnerActive(partner);
    const newStatus = currentActive ? "Inactive" : "Active";
    const updatedPartner = { ...partner, status: newStatus };

    try {
      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");

      const updateMatch = (item: any) => 
        (partner.id && item.id && item.id === partner.id) ||
        (partner.username && item.username && item.username.toLowerCase() === partner.username.toLowerCase()) ||
        (partner.companyName && item.companyName && item.companyName.toLowerCase() === partner.companyName.toLowerCase());

      const updatedP1 = p1.map((item: any) => updateMatch(item) ? { ...item, status: newStatus } : item);
      const updatedP2 = p2.map((item: any) => updateMatch(item) ? { ...item, status: newStatus } : item);

      safeSetLocalStorage("byd-custom-partners", JSON.stringify(updatedP1));
      safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(updatedP2));
    } catch (e) {
      console.error("Local storage partner status toggle error:", e);
    }

    setPartners(prev => prev.map(p => (p.id === partner.id || p.username === partner.username || p.companyName === partner.companyName) ? updatedPartner : p));
    setLocalPartnersList(prev => prev.map(p => (p.id === partner.id || p.username === partner.username || p.companyName === partner.companyName) ? updatedPartner : p));

    window.dispatchEvent(new Event("storage-sync-updated"));

    try {
      await fetch(`/api/partners/${encodeURIComponent(partner.id || partner.username || partner.companyName)}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(updatedPartner)
      });
    } catch (err) {
      console.warn("Backend unreachable, updated partner status locally only.", err);
    }
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.companyName || !partnerForm.companyNameAr) {
      alert(t.errorFill);
      return;
    }

    const provinceObj = provincesList.find(p => p.en === partnerForm.province);
    const provinceAr = provinceObj ? provinceObj.ar : partnerForm.province;

    const sectorObj = sectorsList.find(s => s.en === partnerForm.sector);
    const sectorAr = sectorObj ? sectorObj.ar : partnerForm.sector;

    const cleanCompanyName = partnerForm.companyName.trim();
    const fallbackUsername = partnerForm.username?.trim() || (cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Math.floor(Math.random() * 1000));
    const fallbackPassword = partnerForm.password?.trim() || "123456";

    const body = {
      id: editingPartner?.id || "p-" + Date.now(),
      ...partnerForm,
      username: fallbackUsername,
      password: fallbackPassword,
      provinceAr,
      sectorAr
    };

    try {
      const currentCustom = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const currentCompanies = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");

      const isMatch = (p: any) => (editingPartner?.id && p.id === editingPartner.id) || (p.username && p.username.toLowerCase() === body.username.toLowerCase());

      const idxC = currentCustom.findIndex(isMatch);
      if (idxC > -1) currentCustom[idxC] = body; else currentCustom.push(body);

      const idxComp = currentCompanies.findIndex(isMatch);
      if (idxComp > -1) currentCompanies[idxComp] = body; else currentCompanies.push(body);

      safeSetLocalStorage("byd-custom-partners", JSON.stringify(currentCustom));
      safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(currentCompanies));

      window.dispatchEvent(new Event("storage-sync-updated"));
    } catch (e) {
      console.error(e);
    }

    const url = editingPartner ? `/api/partners/${editingPartner.id}` : "/api/partners";
    const method = editingPartner ? "PUT" : "POST";

    try {
      await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.warn("API unreachable, saved partner locally.", err);
    }

    alert(t.successSave);
    setShowPartnerForm(false);
    setEditingPartner(null);
    resetPartnerForm();
    loadAllData();
  };

  const handleEditPartnerClick = (partner: Partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      companyName: partner.companyName,
      companyNameAr: partner.companyNameAr,
      sector: partner.sector,
      logoUrl: partner.logoUrl,
      promoVideoUrl: partner.promoVideoUrl,
      province: partner.province,
      expiryDate: partner.expiryDate,
      status: partner.status || "Active",
      feePaidIqd: partner.feePaidIqd || (partner.feePaidUsd ? partner.feePaidUsd * 1500 : 150000),
      feePaidUsd: partner.feePaidUsd || 100,
      username: partner.username || "",
      password: partner.password || "",
      email: partner.email || "",
      phone: partner.phone || "",
      discount: partner.discount || "10%",
      discountEn: partner.discountEn || partner.discount || "10%",
      discountAr: partner.discountAr || partner.discount || "10%"
    });
    setShowPartnerForm(true);
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;

    const partnerToDelete = partners.find(p => p.id === id || p.username === id || p.companyName === id) ||
                            localPartnersList.find((p: any) => p.id === id || p.username === id || p.companyName === id);
    
    const targetId = partnerToDelete?.id || id;
    const username = partnerToDelete?.username;
    const companyName = partnerToDelete?.companyName;

    try {
      const deletedList = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]");
      if (targetId && !deletedList.includes(targetId)) deletedList.push(targetId);
      if (username && !deletedList.includes(username)) deletedList.push(username);
      if (companyName && !deletedList.includes(companyName)) deletedList.push(companyName);
      safeSetLocalStorage("BYD_DELETED_PARTNERS", JSON.stringify(deletedList));

      const isMatch = (p: any) => p.id === targetId || p.id === id || (username && p.username === username) || (companyName && p.companyName === companyName);

      const syncBydCompanies = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]").filter((p: any) => !isMatch(p));
      const syncCustomPartners = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]").filter((p: any) => !isMatch(p));

      safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(syncBydCompanies));
      safeSetLocalStorage("byd-custom-partners", JSON.stringify(syncCustomPartners));
    } catch (e) {
      console.error(e);
    }

    setPartners(prev => prev.filter(p => p.id !== targetId && p.id !== id && (!username || p.username !== username)));
    setLocalPartnersList(prev => prev.filter((p: any) => p.id !== targetId && p.id !== id && (!username || p.username !== username)));

    try {
      await fetch(`/api/partners/${encodeURIComponent(targetId || username || companyName || id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (err) {
      console.error(err);
    }

    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
  };

  const resetPartnerForm = () => {
    setPartnerForm({
      companyName: "",
      companyNameAr: "",
      sector: "Restaurant",
      logoUrl: "",
      promoVideoUrl: "",
      province: "Baghdad",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "Active",
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
  };

  // CARD CRUD ACTIONS
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.cardId) {
      alert(lang === "en" ? "Please fill Card Serial ID" : "يرجى إدخال رقم مسلسل البطاقة");
      return;
    }

    try {
      const cardsList = JSON.parse(localStorage.getItem("byd-cards") || "[]");
      const idx = cardsList.findIndex((c: any) => c.cardId.trim().toUpperCase() === cardForm.cardId.trim().toUpperCase());
      const newCard = { id: editingCard?.id || "c-" + Date.now(), ...cardForm };
      if (idx > -1) cardsList[idx] = newCard; else cardsList.unshift(newCard);
      safeSetLocalStorage("byd-cards", JSON.stringify(cardsList));

      if (cardForm.memberId) {
        const users = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
        const updatedUsers = users.map((u: any) => u.id === cardForm.memberId ? { ...u, status: cardForm.status, cardId: cardForm.cardId } : u);
        safeSetLocalStorage("BYD_USERS", JSON.stringify(updatedUsers));
      }

      window.dispatchEvent(new Event("storage-sync-updated"));
    } catch (e) {
      console.error(e);
    }

    const url = editingCard ? `/api/cards/${editingCard.id}` : "/api/cards";
    const method = editingCard ? "PUT" : "POST";

    try {
      await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(cardForm)
      });
    } catch (err) {
      console.warn("API unreachable, saved card locally.", err);
    }

    alert(lang === "en" ? "Card saved successfully!" : "تم حفظ البطاقة بنجاح!");
    setShowCardForm(false);
    setEditingCard(null);
    resetCardForm();
    loadAllData();
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm(lang === "en" ? "Delete this Card?" : "حذف هذه البطاقة؟")) return;

    try {
      const cardsList = JSON.parse(localStorage.getItem("byd-cards") || "[]").filter((c: any) => c.id !== id);
      safeSetLocalStorage("byd-cards", JSON.stringify(cardsList));
      window.dispatchEvent(new Event("storage-sync-updated"));
    } catch (e) {
      console.error(e);
    }

    try {
      await fetch(`/api/cards/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (err) {
      console.error(err);
    }

    loadAllData();
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setCardForm({
      cardId: card.cardId,
      status: card.status || "Active",
      memberId: card.memberId || ""
    });
    setShowCardForm(true);
  };

  const handleGenerateSequentialCard = () => {
    let maxSuffix = 10; 
    cards.forEach((c: any) => {
      const match = c.cardId.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1]);
        if (val > maxSuffix) maxSuffix = val;
      }
    });

    const nextSuffix = maxSuffix + 1;
    const paddedSuffix = String(nextSuffix).padStart(3, "0");
    const nextCardId = `BYD-2026-${paddedSuffix}`;

    setCardForm({
      cardId: nextCardId,
      status: "Active",
      memberId: ""
    });
    setEditingCard(null);
    setShowCardForm(true);
  };

  const resetCardForm = () => {
    setCardForm({
      cardId: "",
      status: "Active",
      memberId: ""
    });
  };

  const handleClearAllData = async () => {
    if (!confirm((t as any).confirmClearAll || "Permanently clear all subscriber and company data?")) {
      return;
    }

    try {
      localStorage.setItem("byd-custom-members", JSON.stringify([]));
      localStorage.setItem("BYD_USERS", JSON.stringify([]));
      localStorage.setItem("byd-custom-partners", JSON.stringify([]));
      localStorage.setItem("BYD_COMPANIES", JSON.stringify([]));
      localStorage.setItem("byd-cards", JSON.stringify([]));

      setLocalMembersList([]);
      setLocalPartnersList([]);

      window.dispatchEvent(new Event("storage-sync-updated"));
      window.dispatchEvent(new Event("storage"));

      await fetch("/api/admin/clear-all-data", {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
      }).catch(() => null);

      alert((t as any).successClearAll || "All records cleared successfully!");
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Unified list calculations
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

  // Live province breakdown
  const liveProvinceBreakdown = React.useMemo(() => {
    const iraqiProvinces = [
      { en: "Baghdad", ar: "بغداد" }, { en: "Erbil", ar: "أربيل" }, { en: "Basra", ar: "البصرة" },
      { en: "Nineveh", ar: "نينوى" }, { en: "Sulaymaniyah", ar: "السليمانية" }, { en: "Duhok", ar: "دهوك" },
      { en: "Kirkuk", ar: "كركوك" }, { en: "Salah al-Din", ar: "صلاح الدين" }, { en: "Diyala", ar: "ديالى" },
      { en: "Anbar", ar: "الأنبار" }, { en: "Babylon", ar: "بابل" }, { en: "Karbala", ar: "كربلاء" },
      { en: "Najaf", ar: "النجف" }, { en: "Qadisiyah", ar: "القادسية" }, { en: "Muthanna", ar: "المثنى" },
      { en: "Thi Qar", ar: "ذي قار" }, { en: "Maysan", ar: "ميسان" }, { en: "Wasit", ar: "واسط" }, { en: "Halabja", ar: "حلبجة" }
    ];

    return iraqiProvinces.map(prov => {
      const provPartners = activeLocalPartners.filter((p: Partner) => 
        (p.province === prov.en || p.province === prov.ar || p.provinceAr === prov.ar)
      );

      const provMembers = activeLocalMembers.filter((m: Member) => 
        (m.province === prov.en || m.province === prov.ar || m.provinceAr === prov.ar)
      );

      const collectedB2B = provPartners.reduce((sum: number, p: Partner) => {
        const fee = p.feePaidIqd !== undefined && p.feePaidIqd !== null ? Number(p.feePaidIqd) : (p.feePaidUsd ? Number(p.feePaidUsd) * 1500 : 150000);
        return sum + (isNaN(fee) ? 150000 : fee);
      }, 0);

      const collectedB2C = provMembers.reduce((sum: number, m: Member) => {
        const fee = m.feePaidIqd !== undefined && m.feePaidIqd !== null ? Number(m.feePaidIqd) : (m.feePaidUsd ? Number(m.feePaidUsd) * 1500 : 25000);
        return sum + (isNaN(fee) ? 25000 : fee);
      }, 0);

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

  // FILTERING LOGIC
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

  const localB2BCollected = activeLocalPartners.reduce((sum: number, p: any) => {
    const fee = p.feePaidIqd !== undefined && p.feePaidIqd !== null
      ? Number(p.feePaidIqd)
      : (p.feePaidUsd ? Number(p.feePaidUsd) * 1500 : 150000);
    return sum + (isNaN(fee) ? 150000 : fee);
  }, 0);

  const localB2CCollected = activeLocalMembers.reduce((sum: number, m: any) => {
    const fee = m.feePaidIqd !== undefined && m.feePaidIqd !== null
      ? Number(m.feePaidIqd)
      : (m.feePaidUsd ? Number(m.feePaidUsd) * 1500 : 25000);
    return sum + (isNaN(fee) ? 25000 : fee);
  }, 0);

  const getRevenueComparisonData = () => {
    return [
      {
        name: lang === "en" ? "B2B (Partners)" : "الشركات (B2B)",
        Collected: localB2BCollected,
        Target: 28500000
      },
      {
        name: lang === "en" ? "B2C (Members)" : "الأعضاء (B2C)",
        Collected: localB2CCollected,
        Target: 95000000
      }
    ];
  };

  const getLiveMonthlyTrend = () => {
    const defaultTrend = [
      { month: "04/2026", b2b: 7500000, b2c: 15000000, b2bTarget: 28500000, b2cTarget: 95000000 },
      { month: "08/2026", b2b: 18000000, b2c: 30000000, b2bTarget: 28500000, b2cTarget: 95000000 },
      { month: "12/2026 (Target)", b2b: 28500000, b2c: 95000000, b2bTarget: 28500000, b2cTarget: 95000000 },
      { month: "Current (Live)", b2b: localB2BCollected, b2c: localB2CCollected, b2bTarget: 28500000, b2cTarget: 95000000 }
    ];

    if (!financials || !financials.monthlyTrend) return defaultTrend;
    return financials.monthlyTrend.map((item: any) => {
      if (item.month === "Current (Live)") {
        return {
          ...item,
          b2b: localB2BCollected,
          b2c: localB2CCollected,
          b2bTarget: 28500000,
          b2cTarget: 95000000
        };
      }
      return {
        ...item,
        b2bTarget: 28500000,
        b2cTarget: 95000000
      };
    });
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
    const headers = ["ID", "Card ID", "Full Name (EN)", "Full Name (AR)", "Province", "Status", "Fee Paid (IQD)", "Duration", "Registration Date", "Expiry Date"];
    const rows = filteredMembers.map(m => [
      m.id || "",
      m.cardId || "",
      m.fullName || "",
      m.fullNameAr || "",
      m.province || "",
      m.status || "Active",
      m.feePaidIqd !== undefined && m.feePaidIqd !== null ? m.feePaidIqd : (m.feePaidUsd ? m.feePaidUsd * 1500 : 25000),
      m.durationMonths === 12 ? "12 Months (1 Year)" : "6 Months",
      m.registrationDate || "",
      m.expiryDate || ""
    ]);
    downloadCSV(`BYD_Members_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportPartnersCSV = () => {
    const headers = ["ID", "Company Name (EN)", "Company Name (AR)", "Sector", "Province", "Status", "Fee Paid (IQD)", "Discount", "Username", "Phone"];
    const rows = filteredPartners.map(p => [
      p.id || "",
      p.companyName || "",
      p.companyNameAr || "",
      p.sector || "",
      p.province || "",
      p.status || "Active",
      p.feePaidIqd !== undefined && p.feePaidIqd !== null ? p.feePaidIqd : (p.feePaidUsd ? p.feePaidUsd * 1500 : 150000),
      p.discount || "10%",
      p.username || "",
      p.phone || ""
    ]);
    downloadCSV(`BYD_Partners_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportFinancialAuditCSV = () => {
    const headers = ["Province", "Arabic Province Name", "Active B2B Partners", "Active B2C Members", "Collected B2B Revenue (IQD)", "Collected B2C Revenue (IQD)", "Total Collected Revenue (IQD)"];
    const rows = liveProvinceBreakdown.map(pb => [
      pb.province,
      pb.provinceAr,
      pb.partners,
      pb.users,
      pb.collectedB2B,
      pb.collectedB2C,
      pb.collectedB2B + pb.collectedB2C
    ]);

    const totalB2B = liveProvinceBreakdown.reduce((sum, pb) => sum + pb.collectedB2B, 0);
    const totalB2C = liveProvinceBreakdown.reduce((sum, pb) => sum + pb.collectedB2C, 0);

    rows.push([
      "ALL PROVINCES TOTAL",
      "الإجمالي الكلي لكافة المحافظات",
      activeLocalPartners.length,
      activeLocalMembers.length,
      totalB2B,
      totalB2C,
      totalB2B + totalB2C
    ]);

    downloadCSV(`BYD_Financial_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportComprehensiveAnalyticsPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(lang === "en" ? "Please allow popups to export PDF." : "يرجى السماح بالنوافذ المنبثقة لتصدير الـ PDF");
      return;
    }

    const totalMembersCount = activeLocalMembers.length;
    const totalPartnersCount = activeLocalPartners.length;
    const totalCollectedB2B = localB2BCollected;
    const totalCollectedB2C = localB2CCollected;
    const totalGrossRevenue = totalCollectedB2B + totalCollectedB2C;
    const targetB2B = 28500000;
    const targetB2C = 95000000;
    const totalTargetRevenue = targetB2B + targetB2C;
    const achievementPercent = totalTargetRevenue > 0 ? ((totalGrossRevenue / totalTargetRevenue) * 100).toFixed(1) : "0";

    const sixMonthsCount = activeLocalMembers.filter(m => !m.durationMonths || m.durationMonths === 6).length;
    const twelveMonthsCount = activeLocalMembers.filter(m => m.durationMonths === 12).length;

    const provinceRows = liveProvinceBreakdown.map((pb, index) => `
      <tr style="${index % 2 === 1 ? 'background-color: #fafafa;' : ''}">
        <td style="font-weight: bold;">${pb.province} (${pb.provinceAr})</td>
        <td style="text-align: center; font-weight: bold;">${pb.partners}</td>
        <td style="text-align: center; font-weight: bold;">${pb.users}</td>
        <td style="text-align: right;">${pb.collectedB2B.toLocaleString()} IQD</td>
        <td style="text-align: right;">${pb.collectedB2C.toLocaleString()} IQD</td>
        <td style="text-align: right; font-weight: bold; color: #137333;">${(pb.collectedB2B + pb.collectedB2C).toLocaleString()} IQD</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>BYD Comprehensive Analytics Audit Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            h1 { color: #D30014; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background-color: #111; color: #fff; }
          </style>
        </head>
        <body>
          <h1>BYD LUXURY VIP NETWORK — Audit Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Gross Revenue: ${totalGrossRevenue.toLocaleString()} IQD (${achievementPercent}% of Target)</p>
          <table>
            <thead>
              <tr><th>Province</th><th>Partners</th><th>Members</th><th>B2B Rev</th><th>B2C Rev</th><th>Total</th></tr>
            </thead>
            <tbody>${provinceRows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportToPDF = () => {
    if (activeTab === "analytics") {
      handleExportComprehensiveAnalyticsPDF();
      return;
    }

    const isMembers = activeTab === "members";
    const title = isMembers ? "BYD VIP B2C Members Registry" : "BYD Commercial Partners Registry";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dataRows = isMembers ? filteredMembers : filteredPartners;

    let tableRows = isMembers 
      ? (dataRows as Member[]).map(m => `
          <tr>
            <td>${m.fullName} (${m.fullNameAr})</td>
            <td>${m.cardId}</td>
            <td>${m.province}</td>
            <td>${m.registrationDate}</td>
            <td>${m.expiryDate}</td>
            <td>${isMemberActive(m) ? 'Active' : 'Inactive'}</td>
          </tr>
        `).join("")
      : (dataRows as Partner[]).map(p => `
          <tr>
            <td>${p.companyName} (${p.companyNameAr})</td>
            <td>${p.sector}</td>
            <td>${p.province}</td>
            <td>${p.expiryDate}</td>
            <td>${isPartnerActive(p) ? 'Active' : 'Inactive'}</td>
          </tr>
        `).join("");

    printWindow.document.write(`
      <html>
        <head><title>${title}</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:8px;font-size:12px;}</style></head>
        <body>
          <h2>${title}</h2>
          <table>
            <thead><tr><th>Name</th><th>ID/Sector</th><th>Province</th><th>Reg Date</th><th>Exp Date</th><th>Status</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportToExcel = () => {
    if (activeTab === "members") {
      const data = filteredMembers.map(m => ({
        "الاسم (إنجليزي)": m.fullName || "",
        "الاسم (عربي)": m.fullNameAr || "",
        "رقم البطاقة": m.cardId || "",
        "المحافظة": m.province || "",
        "تاريخ الانتهاء": m.expiryDate || "",
        "الحالة": isMemberActive(m) ? "نشط" : "غير نشط"
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "B2C Members");
      XLSX.writeFile(workbook, `byd_members_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (activeTab === "partners") {
      const data = filteredPartners.map(p => ({
        "اسم الشركة": p.companyName || "",
        "القطاع": p.sector || "",
        "المحافظة": p.province || "",
        "الحالة": isPartnerActive(p) ? "نشط" : "غير نشط"
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "B2B Partners");
      XLSX.writeFile(workbook, `byd_partners_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header control line */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-900 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
              {t.adminHeader}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase tracking-wider mt-1">
              لوحة التحكم الإدارية والمالية لـ كارد BYD
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <button onClick={onGoBack} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] border border-gray-800 rounded-lg text-xs font-bold text-gray-300">
              <ArrowLeft className="w-4 h-4 text-[#D30014]" />
              <span>الموقع العام</span>
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
                <span>مسح الكل</span>
              </button>
            )}
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold">
              <LogOut className="w-4 h-4" />
              <span>{t.adminLogout}</span>
            </button>
          </div>
        </div>

        {/* Top summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">{t.tblFullName} (B2C)</span>
              <Users className="w-5 h-5 text-[#D30014]" />
            </div>
            <p className="text-3xl font-black text-white">{activeLocalMembers.length}</p>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">{t.tblCompanyName} (B2B)</span>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-black text-white">{activeLocalPartners.length}</p>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">المبالغ المحصلة للشركات</span>
              <Building2 className="w-5 h-5 text-[#D30014]" />
            </div>
            <p className="text-2xl font-black text-green-400">{localB2BCollected.toLocaleString()} IQD</p>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">المبالغ المحصلة للأفراد</span>
              <Users className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-black text-green-400">{localB2CCollected.toLocaleString()} IQD</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-2">
          {["analytics", "members", "partners", "branding", "cards"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as any); setSearchQuery(""); }}
              className={`px-5 py-3 text-sm font-black border-b-2 transition-all cursor-pointer ${
                activeTab === tab ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"
              }`}
            >
              {tab === "analytics" ? t.dashboardTab : tab === "members" ? t.membersTab : tab === "partners" ? t.partnersTab : tab === "branding" ? "الشركات المالكة" : "إدارة البطاقات"}
            </button>
          ))}
        </div>

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
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
                      <Legend />
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
                      <Legend />
                      <Area type="monotone" dataKey="b2c" stroke="#D30014" fill="#D30014" fillOpacity={0.2} name="B2C (الأعضاء)" />
                      <Area type="monotone" dataKey="b2b" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} name="B2B (الشركات)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Province Specific Performance Breakdown */}
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

        {/* MEMBERS TAB */}
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
                    <th className="py-4 px-6">{t.tblFullName}</th>
                    <th className="py-4 px-6">{t.tblCardId}</th>
                    <th className="py-4 px-6">{t.tblProvince}</th>
                    <th className="py-4 px-6">المدة</th>
                    <th className="py-4 px-6">{t.tblRegDate}</th>
                    <th className="py-4 px-6">{t.tblExpDate}</th>
                    <th className="py-4 px-6 text-center">{t.tblStatus}</th>
                    <th className="py-4 px-6 text-right">{t.tblActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-white">{m.fullName}</div>
                        <div className="text-xs text-gray-500 font-bold font-mono">{m.fullNameAr}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[#D30014] font-black">{m.cardId}</td>
                      <td className="py-4 px-6">{lang === "en" ? m.province : m.provinceAr}</td>
                      <td className="py-4 px-6 text-xs">{m.durationMonths === 12 ? "سنة واحدة" : "6 أشهر"}</td>
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono">{m.registrationDate}</td>
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono">{m.expiryDate}</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => !isViewer && handleToggleMemberStatus(m)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black cursor-pointer ${
                            isMemberActive(m) ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isMemberActive(m) ? "bg-green-400" : "bg-red-500"}`}></span>
                          {isMemberActive(m) ? t.active : t.inactive}
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

      {/* ----------------- MODAL MODAL: MEMBER CRUD FORM ----------------- */}
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
                    placeholder="Ahmed Ali Al-Rubaie"
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
                    placeholder="أحمد علي الربيعي"
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
                  placeholder="BYD-2026-XXX"
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

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">أقرب نقطة دالة</label>
                <input
                  type="text"
                  value={memberForm.nearestLandmark || ""}
                  onChange={(e) => setMemberForm({ ...memberForm, nearestLandmark: e.target.value })}
                  placeholder="مثال: قرب دجلة مول"
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                />
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

      {/* ----------------- MODAL MODAL: PARTNER CRUD FORM ----------------- */}
      {showPartnerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#D30014] rounded-sm"></span>
              {editingPartner ? "تعديل تفاصيل الشريك B2B" : "إضافة شركة شريكة جديدة B2B"}
            </h3>

            <form onSubmit={handleSavePartner} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.pCompanyNameEn} *</label>
                  <input
                    type="text"
                    required
                    value={partnerForm.companyName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, companyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.pCompanyNameAr} *</label>
                  <input
                    type="text"
                    required
                    value={partnerForm.companyNameAr}
                    onChange={(e) => setPartnerForm({ ...partnerForm, companyNameAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowPartnerForm(false)}
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

      {/* ----------------- MODAL MODAL: CARD CRUD FORM ----------------- */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 sm:p-8 relative shadow-2xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#D30014] rounded-sm"></span>
              {editingCard ? "تعديل أصول البطاقة" : "توليد بطاقة جديدة"}
            </h3>

            <form onSubmit={handleSaveCard} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">الرقم المسلسل للبطاقة *</label>
                <input
                  type="text"
                  required
                  value={cardForm.cardId}
                  onChange={(e) => setCardForm({ ...cardForm, cardId: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold outline-none focus:border-[#D30014]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCardForm(false)}
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
