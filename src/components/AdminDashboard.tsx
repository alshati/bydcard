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
  Area 
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

  // Tab State: "analytics" | "members" | "partners" | "branding" | "cards" | "viewers"
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
  const [viewerAccounts, setViewerAccounts] = useState<ViewerAccount[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("byd-viewer-accounts") || "[]");
    } catch {
      return [];
    }
  });
  const [viewerForm, setViewerForm] = useState({
    username: "",
    password: "",
    name: "",
    notes: ""
  });
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerMsg, setViewerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showViewerPasswords, setShowViewerPasswords] = useState<{ [id: string]: boolean }>({});

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
      alert(lang === "en" ? "File is too large for local storage prototyping. Please select a file under 4MB." : "الملف كبير جداً للتجربة المحلية. يرجى اختيار ملف بحجم أقل من 4 ميغابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const mediaPayload = {
        type: selectedAssetType,
        data: base64String
      };

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
        alert(lang === "en" ? "Multimedia asset uploaded and saved successfully!" : "تم رفع وحفظ أصل الوسائط المتعددة بنجاح!");
      } catch (err) {
        console.error(err);
        alert(lang === "en" ? "Quota exceeded or failed to save to storage. Please try a smaller file." : "تم تجاوز الحد المسموح به أو فشل الحفظ. يرجى تجربة ملف أصغر حجماً.");
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
      console.error("Server template reset ignored:", err);
    }

    window.dispatchEvent(new Event('storage-sync-updated'));
    window.dispatchEvent(new Event('storage'));
    alert(lang === "en" ? "Card template reset to original default layout!" : "تمت إعادة تعيين قالب البطاقة إلى التصميم الافتراضي الأصلي!");
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

    const globalEntity1Base64Str = brandingForm.company1Logo;
    const globalEntity2Base64Str = brandingForm.company2Logo;

    const brandData = {
      entity1NameEn: (document.getElementById('entity1-name-en') as HTMLInputElement)?.value || brandingForm.company1Name,
      entity1NameAr: (document.getElementById('entity1-name-ar') as HTMLInputElement)?.value || brandingForm.company1NameAr,
      entity1DescEn: (document.getElementById('entity1-desc-en') as HTMLInputElement)?.value || brandingForm.company1Desc,
      entity1DescAr: (document.getElementById('entity1-desc-ar') as HTMLInputElement)?.value || brandingForm.company1DescAr,
      entity1Logo: globalEntity1Base64Str,
      entity2NameEn: (document.getElementById('entity2-name-en') as HTMLInputElement)?.value || brandingForm.company2Name,
      entity2NameAr: (document.getElementById('entity2-name-ar') as HTMLInputElement)?.value || brandingForm.company2NameAr,
      entity2DescEn: (document.getElementById('entity2-desc-en') as HTMLInputElement)?.value || brandingForm.company2Desc,
      entity2DescAr: (document.getElementById('entity2-desc-ar') as HTMLInputElement)?.value || brandingForm.company2DescAr,
      entity2Logo: globalEntity2Base64Str
    };
    localStorage.setItem('BYD_BRAND_PERSISTENT_STATE', JSON.stringify(brandData));

    const updatedForm = {
      company1Name: brandData.entity1NameEn,
      company1NameAr: brandData.entity1NameAr,
      company1Desc: brandData.entity1DescEn,
      company1DescAr: brandData.entity1DescAr,
      company1Logo: brandData.entity1Logo,
      company2Name: brandData.entity2NameEn,
      company2NameAr: brandData.entity2NameAr,
      company2Desc: brandData.entity2DescEn,
      company2DescAr: brandData.entity2DescAr,
      company2Logo: brandData.entity2Logo,
    };
    localStorage.setItem("byd-custom-branding", JSON.stringify(updatedForm));
    setBranding(updatedForm);

    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(updatedForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBranding(data.branding);
        localStorage.setItem("byd-custom-branding", JSON.stringify(data.branding));
        alert(lang === "en" ? "Dynamic branding systems updated successfully!" : "تم تحديث إعدادات الهوية والشركات المالكة بنجاح!");
      } else {
        alert(lang === "en" ? "Dynamic branding systems updated successfully!" : "تم تحديث إعدادات الهوية والشركات المالكة بنجاح!");
      }
    } catch (err) {
      console.error("Cloud saving failed, using local fallback:", err);
      alert(lang === "en" ? "Dynamic branding systems updated successfully!" : "تم تحديث إعدادات الهوية والشركات المالكة بنجاح!");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "company1Logo" | "company2Logo") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === "en" ? "Image size exceeds 2MB limit" : "حجم الصورة يتجاوز الحد الأقصى 2 ميجابايت");
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
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === "en" ? "Logo image size exceeds 2MB limit" : "حجم الشعار يتجاوز الحد الأقصى 2 ميجابايت");
        return;
      }
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
      if (file.size > 35 * 1024 * 1024) {
        alert(lang === "en" ? "Video size exceeds 35MB limit" : "حجم الفيديو يتجاوز الحد الأقصى 35 ميجابايت");
        return;
      }
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
        const fetchedMembers = await membersRes.json();
        setMembers(fetchedMembers);
      }
      if (partnersRes?.ok) {
        const fetchedPartners = await partnersRes.json();
        setPartners(fetchedPartners);
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
            safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(fetchedViewers));
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

    const newViewer: ViewerAccount = {
      id: "v-" + Date.now(),
      username: viewerForm.username.trim(),
      password: viewerForm.password.trim(),
      name: viewerForm.name.trim() || viewerForm.username.trim(),
      notes: viewerForm.notes.trim(),
      createdAt: new Date().toISOString().split("T")[0]
    };

    // الحفظ والتزامن الفوري محلياً للبدء دون أخطاء
    try {
      const currentViewers = JSON.parse(localStorage.getItem("byd-viewer-accounts") || "[]");
      currentViewers.unshift(newViewer);
      safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(currentViewers));
      setViewerAccounts(currentViewers);

      setViewerForm({ username: "", password: "", name: "", notes: "" });
      setViewerMsg({
        type: "success",
        text: lang === "en" ? "Monitoring account created successfully!" : "تم إنشاء حساب المراقبة بنجاح وبشكل فوري!"
      });
    } catch (err) {
      console.error(err);
    }

    try {
      await fetch("/api/admin/viewers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(newViewer)
      });
    } catch (err) {
      console.warn("Backend API unreachable, viewer saved locally.", err);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDeleteViewerAccount = async (id: string, username: string) => {
    if (!window.confirm(lang === "en" ? `Are you sure you want to delete auditor account '${username}'?` : `هل أنت متأكد من حذف حساب المراقبة '${username}'؟`)) {
      return;
    }

    const updated = viewerAccounts.filter((v) => v.id !== id && v.username !== username);
    setViewerAccounts(updated);
    safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(updated));

    try {
      await fetch(`/api/admin/viewers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (err) {
      console.error(err);
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

  // MEMBER CRUD ACTIONS & TOGGLE STATUS
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
      console.error(e);
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

  const handleExportToExcel = () => {
    if (activeTab === "members") {
      const data = filteredMembers.map(m => {
        const isOneYear = m.durationMonths === 12 || m.feePaidIqd === 50000;
        return {
          "الاسم (إنجليزي)": m.fullName || "",
          "الاسم (عربي)": m.fullNameAr || "",
          "رقم البطاقة": m.cardId || "",
          "المحافظة (EN)": m.province || "",
          "المحافظة (AR)": m.provinceAr || "",
          "مدة الاشتراك": isOneYear ? "سنة واحدة من تاريخ التسجيل (1 Year)" : "6 أشهر من تاريخ التسجيل (6 Months)",
          "تاريخ التسجيل": m.registrationDate || "",
          "تاريخ الانتهاء": m.expiryDate || "",
          "الحالة": m.status === "Active" ? "نشط (Active)" : "غير نشط (Inactive)",
          "المبلغ المدفوع (د.ع)": m.feePaidIqd !== undefined ? m.feePaidIqd : (isOneYear ? 50000 : 25000),
          "المبلغ المدفوع ($)": m.feePaidUsd !== undefined ? m.feePaidUsd : (isOneYear ? 50 : 25),
          "أقرب نقطة دالة": m.nearestLandmark || ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "المشتركين B2C");
      
      const fileName = `byd_members_registry_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } else if (activeTab === "partners") {
      const data = filteredPartners.map(p => {
        return {
          "اسم الشركة (EN)": p.companyName || "",
          "اسم الشركة (AR)": p.companyNameAr || "",
          "القطاع (EN)": p.sector || "",
          "القطاع (AR)": p.sectorAr || "",
          "المحافظة (EN)": p.province || "",
          "المحافظة (AR)": p.provinceAr || "",
          "مدة عقد الشراكة": "سنة واحدة من تاريخ التسجيل (1 Year)",
          "تاريخ الانتهاء": p.expiryDate || "",
          "الحالة": p.status === "Active" ? "نشط (Active)" : "غير نشط (Inactive)",
          "المبلغ المدفوع (د.ع)": p.feePaidIqd !== undefined ? p.feePaidIqd : 150000,
          "المبلغ المدفوع ($)": p.feePaidUsd !== undefined ? p.feePaidUsd : 100,
          "البريد الإلكتروني": p.email || "",
          "رقم الهاتف": p.phone || ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "الشركاء B2B");

      const fileName = `byd_partners_registry_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    }
  };

  const handleExportComprehensiveAnalyticsPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(lang === "en" ? "Please allow popups to export the PDF report." : "يرجى السماح بالنوافذ المنبثقة لتصدير ملف الـ PDF");
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

    const sectorStats: { [sector: string]: number } = {};
    activeLocalPartners.forEach(p => {
      const s = p.sector || p.sectorAr || "Other";
      sectorStats[s] = (sectorStats[s] || 0) + 1;
    });

    const sectorRows = Object.entries(sectorStats).map(([sec, count]) => {
      const pct = totalPartnersCount > 0 ? ((count / totalPartnersCount) * 100).toFixed(1) : "0";
      return `
        <tr>
          <td style="font-weight: bold;">${sec}</td>
          <td style="text-align: center; font-weight: bold;">${count}</td>
          <td style="text-align: right; color: #D30014; font-weight: bold;">${pct}%</td>
        </tr>
      `;
    }).join("");

    const provinceRows = liveProvinceBreakdown.map((pb, index) => `
      <tr style="${index % 2 === 1 ? 'background-color: #fafafa;' : ''}">
        <td style="font-weight: bold;">
          <span>${pb.province}</span>
          <span style="color: #666; font-size: 11px; margin-left: 6px;">(${pb.provinceAr})</span>
        </td>
        <td style="text-align: center; font-weight: bold;">${pb.partners}</td>
        <td style="text-align: center; font-weight: bold;">${pb.users}</td>
        <td style="text-align: right; color: #444;">${pb.collectedB2B.toLocaleString()} IQD</td>
        <td style="text-align: right; color: #444;">${pb.collectedB2C.toLocaleString()} IQD</td>
        <td style="text-align: right; font-weight: bold; color: #137333;">${(pb.collectedB2B + pb.collectedB2C).toLocaleString()} IQD</td>
      </tr>
    `).join("");

    const totalProvPartners = liveProvinceBreakdown.reduce((sum, pb) => sum + pb.partners, 0);
    const totalProvUsers = liveProvinceBreakdown.reduce((sum, pb) => sum + pb.users, 0);
    const totalProvB2B = liveProvinceBreakdown.reduce((sum, pb) => sum + pb.collectedB2B, 0);
    const totalProvB2C = liveProvinceBreakdown.reduce((sum, pb) => sum + pb.collectedB2C, 0);
    const grandProvTotal = totalProvB2B + totalProvB2C;

    const logoHtml = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${systemLogo}" alt="BYD Logo" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover; border: 2px solid #D30014; box-shadow: 0 4px 10px rgba(211,0,20,0.15);" />
        <div>
          <div style="font-size: 22px; font-weight: 900; color: #D30014; letter-spacing: 1.5px; line-height: 1.2;">BYD LUXURY VIP NETWORK</div>
          <div style="font-size: 12px; font-weight: bold; color: #111; margin-top: 3px;">منظومة كارد BYD — تقرير الإحصائيات الشامل والتدقيق المالي والتشغيلي</div>
          <div style="font-size: 10px; color: #666; font-family: monospace; margin-top: 2px;">AUDIT REF: BYD-STAT-REP-${Date.now().toString(36).toUpperCase()} | SECURE AUDIT NODE</div>
        </div>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="ltr">
        <head>
          <meta charset="utf-8" />
          <title>BYD System Comprehensive Analytics & Statistical Audit Report</title>
          <style>
            @media print {
              body { padding: 15px !important; }
              .no-print { display: none !important; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1a1a1a;
              background-color: #ffffff;
              padding: 35px;
              line-height: 1.45;
              font-size: 12px;
            }
            .header-box {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #D30014;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .report-meta { text-align: right; }
            .badge-certified {
              display: inline-block;
              background-color: #111;
              color: #fff;
              font-size: 10px;
              font-weight: 900;
              padding: 4px 10px;
              border-radius: 4px;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 14px;
              margin-bottom: 24px;
            }
            .kpi-card {
              background-color: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 10px;
              padding: 14px;
              box-sizing: border-box;
            }
            .kpi-card.highlight {
              background-color: #fff5f5;
              border-color: #fed7d7;
            }
            .kpi-title {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              color: #6c757d;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .kpi-value {
              font-size: 18px;
              font-weight: 900;
              color: #111;
            }
            .kpi-sub {
              font-size: 10px;
              color: #888;
              margin-top: 4px;
              font-weight: 600;
            }
            .section-title {
              font-size: 13px;
              font-weight: 900;
              color: #111;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 24px;
              margin-bottom: 12px;
              display: flex;
              align-items: center;
              gap: 8px;
              border-left: 4px solid #D30014;
              padding-left: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11.5px;
            }
            th {
              background-color: #1a1a1a;
              color: #ffffff;
              padding: 9px 12px;
              font-size: 10.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 8px 12px;
              border-bottom: 1px solid #e9ecef;
            }
            .total-row td {
              background-color: #f1f3f5;
              font-weight: 900;
              border-top: 2px solid #111;
              border-bottom: 2px solid #111;
            }
            .two-col-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .sign-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 35px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
            }
            .sign-box {
              text-align: center;
              padding: 10px;
              background-color: #fafafa;
              border: 1px dashed #ced4da;
              border-radius: 8px;
            }
            .sign-box h5 {
              margin: 0 0 6px 0;
              font-size: 11px;
              font-weight: 800;
              color: #111;
            }
            .sign-box p {
              margin: 0;
              font-size: 9.5px;
              color: #777;
            }
            .sign-placeholder {
              height: 40px;
              border-bottom: 1px solid #111;
              margin: 10px 20px;
            }
            .footer-notes {
              text-align: center;
              font-size: 9.5px;
              color: #999;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            ${logoHtml}
            <div class="report-meta">
              <div class="badge-certified">OFFICIAL EXECUTIVE AUDIT</div>
              <div style="font-size: 11px; font-weight: bold; color: #333; margin-top: 2px;">Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</div>
              <div style="font-size: 10px; color: #777;">Auditor / Operator: ${userName || "Master Admin"}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card highlight">
              <div class="kpi-title">Gross Revenue (IQD)</div>
              <div class="kpi-value" style="color: #D30014;">${totalGrossRevenue.toLocaleString()} IQD</div>
              <div class="kpi-sub">Target: ${totalTargetRevenue.toLocaleString()} IQD (${achievementPercent}%)</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-title">B2B Corporate Revenue</div>
              <div class="kpi-value" style="color: #137333;">${totalCollectedB2B.toLocaleString()} IQD</div>
              <div class="kpi-sub">${totalPartnersCount} Active Registered Companies</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-title">B2C Members Revenue</div>
              <div class="kpi-value" style="color: #1a73e8;">${totalCollectedB2C.toLocaleString()} IQD</div>
              <div class="kpi-sub">${totalMembersCount} Active Subscribers</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-title">National Iraq Coverage</div>
              <div class="kpi-value">19 Provinces</div>
              <div class="kpi-sub">100% Nationwide Active Node</div>
            </div>
          </div>

          <div class="two-col-grid">
            <div>
              <div class="section-title">B2C Subscription Plans Breakdown</div>
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left;">Plan Type</th>
                    <th style="text-align: center;">Members Count</th>
                    <th style="text-align: right;">Unit Fee</th>
                    <th style="text-align: right;">Total IQD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>6-Month Plan (VIP)</strong></td>
                    <td style="text-align: center; font-weight: bold;">${sixMonthsCount}</td>
                    <td style="text-align: right;">25,000 IQD</td>
                    <td style="text-align: right; font-weight: bold;">${(sixMonthsCount * 25000).toLocaleString()} IQD</td>
                  </tr>
                  <tr>
                    <td><strong>12-Month Plan (Annual VIP)</strong></td>
                    <td style="text-align: center; font-weight: bold;">${twelveMonthsCount}</td>
                    <td style="text-align: right;">50,000 IQD</td>
                    <td style="text-align: right; font-weight: bold;">${(twelveMonthsCount * 50000).toLocaleString()} IQD</td>
                  </tr>
                  <tr class="total-row">
                    <td>Total B2C</td>
                    <td style="text-align: center;">${totalMembersCount}</td>
                    <td>-</td>
                    <td style="text-align: right; color: #1a73e8;">${totalCollectedB2C.toLocaleString()} IQD</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">B2B Corporate Sectors Distribution</div>
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left;">Commercial Sector</th>
                    <th style="text-align: center;">Partners Count</th>
                    <th style="text-align: right;">Share %</th>
                  </tr>
                </thead>
                <tbody>
                  ${sectorRows || '<tr><td colspan="3" style="text-align:center; color:#999;">No partners registered yet</td></tr>'}
                  <tr class="total-row">
                    <td>Total B2B Partners</td>
                    <td style="text-align: center;">${totalPartnersCount}</td>
                    <td style="text-align: right;">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title">Geographical Distribution Across Iraq Governorates (19 Provinces)</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Province / المحافظة</th>
                <th style="text-align: center;">B2B Partners</th>
                <th style="text-align: center;">B2C Members</th>
                <th style="text-align: right;">Collected B2B</th>
                <th style="text-align: right;">Collected B2C</th>
                <th style="text-align: right;">Total Revenue (IQD)</th>
              </tr>
            </thead>
            <tbody>
              ${provinceRows}
              <tr class="total-row">
                <td>GRAND TOTAL (الإجمالي العام)</td>
                <td style="text-align: center;">${totalProvPartners}</td>
                <td style="text-align: center;">${totalProvUsers}</td>
                <td style="text-align: right;">${totalProvB2B.toLocaleString()} IQD</td>
                <td style="text-align: right;">${totalProvB2C.toLocaleString()} IQD</td>
                <td style="text-align: right; color: #D30014; font-size: 12.5px;">${grandProvTotal.toLocaleString()} IQD</td>
              </tr>
            </tbody>
          </table>

          <div class="sign-grid">
            <div class="sign-box">
              <h5>BYD Platform Administration</h5>
              <p>إدارة منظومة كارد BYD المعتمدة</p>
              <div class="sign-placeholder"></div>
              <p>Authorized Signature & Stamp</p>
            </div>
            <div class="sign-box">
              <h5>GeniusWings Group</h5>
              <p>أجنحة العبقرية للنظم والحلول الرقمية</p>
              <div class="sign-placeholder"></div>
              <p>Technical & Operations Audit</p>
            </div>
            <div class="sign-box">
              <h5>TAJ Marketing & Production</h5>
              <p>شركة تاج للتسويق والإنتاج</p>
              <div class="sign-placeholder"></div>
              <p>Commercial & Partnership Dept</p>
            </div>
          </div>

          <div class="footer-notes">
            This document is a certified system-generated comprehensive audit ledger generated from the BYD VIP System Infrastructure. Confidential & Proprietary. All rights reserved &copy; 2026.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
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
    const title = isMembers 
      ? (lang === "en" ? "BYD VIP B2C Members Registry Ledger" : "سجل المشتركين الفرديين BYD VIP B2C")
      : (lang === "en" ? "BYD Commercial Partner Registry Ledger" : "سجل الشركاء التجاريين المعتمدين BYD");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(lang === "en" ? "Please allow popups to export the PDF report." : "يرجى السماح بالنوافذ المنبثقة لتصدير ملف الـ PDF");
      return;
    }

    const dataRows = isMembers ? filteredMembers : filteredPartners;

    let tableHeaders = "";
    let tableRows = "";

    if (isMembers) {
      tableHeaders = `
        <th style="text-align: left;">Full Name</th>
        <th style="text-align: left;">Card ID</th>
        <th style="text-align: left;">Province</th>
        <th style="text-align: left;">Reg Date</th>
        <th style="text-align: left;">Expiry Date</th>
        <th style="text-align: left;">Status</th>
        <th style="text-align: left;">Fee (IQD)</th>
      `;
      tableRows = (dataRows as Member[]).map(m => `
        <tr>
          <td>
            <div style="font-weight: bold;">${m.fullName || ""}</div>
            <div style="font-size: 10px; color: #666;">${m.fullNameAr || ""}</div>
          </td>
          <td style="font-family: monospace; font-weight: bold;">${m.cardId || "Unassigned"}</td>
          <td>${m.province || m.provinceAr || ""}</td>
          <td>${m.registrationDate || ""}</td>
          <td>${m.expiryDate || ""}</td>
          <td>
            <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background-color: ${m.status === 'Active' ? '#e6f4ea' : '#fce8e6'}; color: ${m.status === 'Active' ? '#137333' : '#c5221f'};">
              ${m.status || "Active"}
            </span>
          </td>
          <td style="font-weight: bold;">${(m.feePaidIqd !== undefined ? m.feePaidIqd : 25000).toLocaleString()} IQD</td>
        </tr>
      `).join("");
    } else {
      tableHeaders = `
        <th style="text-align: left;">Company Name</th>
        <th style="text-align: left;">Sector</th>
        <th style="text-align: left;">Province</th>
        <th style="text-align: left;">Expiry Date</th>
        <th style="text-align: left;">Status</th>
        <th style="text-align: left;">Discount</th>
        <th style="text-align: left;">Phone</th>
      `;
      tableRows = (dataRows as any[]).map(p => `
        <tr>
          <td>
            <div style="font-weight: bold;">${p.companyName || ""}</div>
            <div style="font-size: 10px; color: #666;">${p.companyNameAr || ""}</div>
          </td>
          <td>${p.sector || ""}</td>
          <td>${p.province || p.provinceAr || ""}</td>
          <td>${p.expiryDate || ""}</td>
          <td>
            <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background-color: ${p.status === 'Active' ? '#e6f4ea' : '#fce8e6'}; color: ${p.status === 'Active' ? '#137333' : '#c5221f'};">
              ${p.status || "Active"}
            </span>
          </td>
          <td style="font-weight: bold; color: #D30014;">${p.discount || "10%"}</td>
          <td>${p.phone || ""}</td>
        </tr>
      `).join("");
    }

    const totalCount = dataRows.length;
    const totalRevenue = isMembers 
      ? (dataRows as Member[]).reduce((sum, m) => sum + (m.feePaidIqd !== undefined ? m.feePaidIqd : 25000), 0)
      : (dataRows as Partner[]).reduce((sum, p) => sum + (p.feePaidIqd !== undefined ? p.feePaidIqd : 150000), 0);

    const logoHtml = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${systemLogo}" alt="BYD Logo" style="width: 56px; height: 56px; border-radius: 10px; object-fit: cover; border: 2px solid #D30014;" />
        <div>
          <div style="font-size: 20px; font-weight: 900; color: #D30014; letter-spacing: 1.5px; line-height: 1.2;">BYD LUXURY VIP NETWORK</div>
          <div style="font-size: 11px; font-weight: bold; color: #111;">${isMembers ? "سجل المشتركين الفرديين B2C" : "سجل الشركاء التجاريين B2B"}</div>
        </div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @media print {
              body { padding: 20px !important; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #333;
              padding: 40px;
              line-height: 1.5;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #D30014;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .report-title {
              font-size: 16px;
              font-weight: bold;
              text-align: right;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 30px;
              background-color: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #eee;
            }
            .meta-card h4 {
              margin: 0;
              font-size: 11px;
              color: #777;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .meta-card p {
              margin: 5px 0 0 0;
              font-size: 18px;
              font-weight: bold;
              color: #111;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #111;
              color: white;
              text-align: left;
              padding: 12px 15px;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 12px 15px;
              border-bottom: 1px solid #eee;
              font-size: 13px;
            }
            tr:nth-child(even) {
              background-color: #fcfcfc;
            }
            .footer-legal {
              text-align: center;
              font-size: 10px;
              color: #999;
              margin-top: 50px;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            ${logoHtml}
            <div class="report-title">
              <div>${title}</div>
              <div style="font-size: 11px; font-weight: normal; color: #666; margin-top: 4px;">Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <h4>Total Record Count</h4>
              <p>${totalCount} Records</p>
            </div>
            <div class="meta-card">
              <h4>Aggregated Revenue</h4>
              <p>${totalRevenue.toLocaleString()} IQD</p>
            </div>
            <div class="meta-card">
              <h4>Portal Integrity</h4>
              <p>100% Certified</p>
            </div>
            <div class="meta-card">
              <h4>System Node</h4>
              <p>BYD-NODE-LIVE</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-legal">
            BYD Luxury Membership Network & Corporate Partnership Systems. All rights reserved &copy; 2026.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  // Combine server array and local storage array into unified lists with deletion filtering
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

  // Real-time dynamic financial calculations from reactive unified state
  const activeLocalMembers = allMembers.filter(isMemberActive);
  const activeLocalPartners = allPartners.filter(isPartnerActive);

  // Live province breakdown computed directly from active local state
  const liveProvinceBreakdown = React.useMemo(() => {
    const iraqiProvinces = [
      "Baghdad", "Erbil", "Basra", "Nineveh", "Sulaymaniyah", 
      "Duhok", "Kirkuk", "Salah al-Din", "Diyala", "Anbar", 
      "Babylon", "Karbala", "Najaf", "Qadisiyah", "Muthanna", 
      "Thi Qar", "Maysan", "Wasit", "Halabja"
    ];

    const iraqiProvincesAr: { [key: string]: string } = {
      Baghdad: "بغداد", Erbil: "أربيل", Basra: "البصرة", Nineveh: "نينوى",
      Sulaymaniyah: "السليمانية", Duhok: "دهوك", Kirkuk: "كركوك",
      "Salah al-Din": "صلاح الدين", Diyala: "ديالى", Anbar: "الأنبار",
      Babylon: "بابل", Karbala: "كربلاء", Najaf: "النجف", Qadisiyah: "القادسية",
      Muthanna: "المثنى", "Thi Qar": "ذي قار", Maysan: "ميسان", Wasit: "واسط", Halabja: "حلبجة"
    };

    return iraqiProvinces.map(prov => {
      const provAr = iraqiProvincesAr[prov] || prov;

      const provPartners = activeLocalPartners.filter((p: Partner) => 
        (p.province === prov || p.province === provAr || p.provinceAr === provAr || p.provinceAr === prov)
      );

      const provMembers = activeLocalMembers.filter((m: Member) => 
        (m.province === prov || m.province === provAr || m.provinceAr === provAr || m.provinceAr === prov)
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
        province: prov,
        provinceAr: provAr,
        partners: provPartners.length,
        users: provMembers.length,
        collectedB2B,
        collectedB2C,
        targetPartners: 10,
        targetUsers: 100
      };
    });
  }, [activeLocalMembers, activeLocalPartners]);

  // FILTERING LOGIC (Real-time Instant Search & Matching)
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

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header control line */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-900 mb-8" id="admin-header">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
              {t.adminHeader}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase tracking-wider mt-1">
              {lang === "en" ? "Secure BYD Card Administrative & Financial Control Panel" : "لوحة التحكم الإدارية والمالية الآمنة لـ كارد BYD"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <button
              onClick={onGoBack}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs sm:text-sm font-bold text-gray-300 transition-all active:scale-95"
            >
              <ArrowLeft className={`w-4 h-4 text-[#D30014] ${lang === "ar" ? "rotate-180" : ""}`} />
              <span>{lang === "en" ? "Public Site" : "الموقع العام"}</span>
            </button>

            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs sm:text-sm font-bold text-gray-300 transition-all active:scale-95"
            >
              <Languages className="w-4 h-4 text-[#D30014]" />
              <span>{t.langToggle}</span>
            </button>

            <button
              onClick={loadAllData}
              className="p-2 bg-[#121212] hover:bg-[#1f1f1f] border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Reload Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {!isViewer && (
              <button
                onClick={handleClearAllData}
                className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white rounded-lg text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                title={(t as any).clearAllBtn || "Clear All Data"}
              >
                <Trash2 className="w-4 h-4" />
                <span>{(t as any).clearAllBtn || "Clear All Data"}</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-[#D30014] hover:text-white border border-red-500/20 text-red-500 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.adminLogout}</span>
            </button>
          </div>
        </div>

        {/* PROMINENT VIEWER READ-ONLY AUDIT BANNER */}
        {isViewer && (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 mb-8 shadow-xl shadow-amber-500/5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Eye className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5 flex-wrap">
                    <span>{lang === "en" ? "Auditor / Monitoring Mode (Read-Only & Printing)" : "نظام المراقبة والتدقيق (صلاحية الاطلاع والطباعة فقط)"}</span>
                    <span className="px-2.5 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold uppercase tracking-wider">
                      {userName || (lang === "en" ? "Auditor" : "مراقب معتمد")}
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-200/80 mt-1 max-w-3xl leading-relaxed">
                    {lang === "en" 
                      ? "You are logged in with an authorized monitoring account. You have full access to inspect financial statistics, view all B2B/B2C registries, and export/print audit reports. Adding, editing, and deleting records are restricted." 
                      : "أنت مسجل الدخول بحساب تدقيق ومراقبة معتمد. يتيح لك النظام الاطلاع الكامل على الإحصائيات والبيانات المالية وتصدير وطباعة التقارير وبطاقات الأعضاء. عمليات الإضافة والتعديل والحذف مقفلة لحماية قاعدة البيانات."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs font-black text-amber-300 shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{lang === "en" ? "Viewing & Printing: Enabled" : "الاطلاع والطباعة: مفعلة بالكامل"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Top summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">{t.tblFullName} (B2C)</span>
              <Users className="w-5 h-5 text-[#D30014]" />
            </div>
            <p className="text-3xl font-black text-white">{activeLocalMembers.length}</p>
            <span className="text-xs text-gray-500 font-bold block mt-2">Target: 1,900 Users</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">{t.tblCompanyName} (B2B)</span>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-black text-white">{activeLocalPartners.length}</p>
            <span className="text-xs text-gray-500 font-bold block mt-2">Target: 190 Partners</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">
                {lang === "en" ? "Collected B2B Revenue" : "المبالغ المحصلة للشركات"}
              </span>
              <Building2 className="w-5 h-5 text-[#D30014]" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-green-400">
              {localB2BCollected.toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}
            </p>
            <span className="text-xs text-gray-500 font-bold block mt-2">
              {lang === "en" ? "Target: 28,500,000 IQD" : "المستهدف: 28,500,000 د.ع"}
            </span>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-gray-500 font-black uppercase tracking-wider">
                {lang === "en" ? "Collected B2C Revenue" : "المبالغ المحصلة للأفراد"}
              </span>
              <Users className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-green-400">
              {localB2CCollected.toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}
            </p>
            <span className="text-xs text-gray-500 font-bold block mt-2">
              {lang === "en" ? "Target: 95,000,000 IQD" : "المستهدف: 95,000,000 د.ع"}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-2">
          <button
            onClick={() => { setActiveTab("analytics"); setSearchQuery(""); }}
            className={`px-5 py-3 text-sm sm:text-base font-black border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "analytics"
                ? "border-[#D30014] text-white bg-[#121212]/50"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.dashboardTab}
          </button>
          <button
            onClick={() => { setActiveTab("members"); setSearchQuery(""); }}
            className={`px-5 py-3 text-sm sm:text-base font-black border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "members"
                ? "border-[#D30014] text-white bg-[#121212]/50"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.membersTab}
          </button>
          <button
            onClick={() => { setActiveTab("partners"); setSearchQuery(""); }}
            className={`px-5 py-3 text-sm sm:text-base font-black border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "partners"
                ? "border-[#D30014] text-white bg-[#121212]/50"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.partnersTab}
          </button>
          <button
            onClick={() => { setActiveTab("branding"); setSearchQuery(""); }}
            className={`px-5 py-3 text-sm sm:text-base font-black border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "branding"
                ? "border-[#D30014] text-white bg-[#121212]/50"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {lang === "en" ? "Owning Companies" : "الشركات المالكة"}
          </button>
          <button
            onClick={() => { setActiveTab("cards"); setSearchQuery(""); }}
            className={`px-5 py-3 text-sm sm:text-base font-black border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === "cards"
                ? "border-[#D30014] text-white bg-[#121212]/50"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
            id="cards-tab-btn"
          >
            {lang === "en" ? "Card Assets" : "إدارة البطاقات"}
          </button>
          
          {!isViewer && (
            <button
              onClick={() => { setActiveTab("viewers"); setSearchQuery(""); }}
              className={`px-5 py-3 text-sm sm:text-base font-black border-b-2 transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                activeTab === "viewers"
                  ? "border-[#D30014] text-white bg-[#121212]/50"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
              id="viewers-tab-btn"
            >
              <Eye className="w-4 h-4 text-[#D30014]" />
              <span>{lang === "en" ? "Auditor Accounts" : "حسابات المراقبة والتدقيق"}</span>
              {viewerAccounts.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] bg-[#D30014]/20 border border-[#D30014]/40 text-[#D30014] rounded-full font-bold">
                  {viewerAccounts.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-[#D30014]/30 border-t-[#D30014] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-bold tracking-wider">Syncing Secure Database Ledger...</p>
          </div>
        )}

        {/* ----------------- SECTION 1: ANALYTICS TAB ----------------- */}
        {!isLoading && activeTab === "analytics" && (
          <div className="space-y-10">
            
            {/* Financial Performance Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121212] border border-gray-800/80 rounded-2xl p-5 shadow-lg shadow-black/40">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
                  {t.finTitle}
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">{t.finSubtitle}</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                <button
                  onClick={handleExportComprehensiveAnalyticsPDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] hover:bg-[#b00010] border border-[#D30014] text-white font-black rounded-xl text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-red-900/30 cursor-pointer"
                  id="export-comprehensive-pdf-btn"
                  title={lang === "en" ? "Export Comprehensive Analytics & Audit PDF with Platform Logo" : "تصدير تقرير الإحصائيات الشامل والتدقيق المالي PDF مع الشعار"}
                >
                  <FileText className="w-4 h-4" />
                  <span>{lang === "en" ? "Export Comprehensive Statistics PDF" : "تصدير تقرير الإحصائيات الشامل PDF"}</span>
                </button>
              </div>
            </div>

            {/* Target Breakdown & Comparison Bar chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#D30014]" />
                  {lang === "en" ? "Revenue Breakdown vs Target" : "مقارنة المبالغ المحصلة مقابل المستهدفة"}
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={getRevenueComparisonData()}
                      margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff" }}
                        cursor={{ fill: "rgba(211, 0, 20, 0.05)" }}
                      />
                      <Legend />
                      <Bar dataKey="Collected" fill="#D30014" name={lang === "en" ? "Collected (IQD)" : "المحصل (د.ع)"} />
                      <Bar dataKey="Target" fill="#444" name={lang === "en" ? "Target (IQD)" : "المستهدف (د.ع)"} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                  {t.finGrowthTrend}
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={getLiveMonthlyTrend()}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorB2C" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D30014" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#D30014" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorB2B" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="month" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff" }} />
                      <Legend />
                      <Area type="monotone" dataKey="b2c" stroke="#D30014" fillOpacity={1} fill="url(#colorB2C)" name="B2C (Members)" />
                      <Area type="monotone" dataKey="b2b" stroke="#8884d8" fillOpacity={1} fill="url(#colorB2B)" name="B2B (Partners)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Target Breakdown Information Widget */}
            <div className="bg-gradient-to-br from-[#121212] to-black border border-gray-800 rounded-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-[#D30014]/15 text-[#D30014]">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-extrabold text-white">{t.finTargetPt}</h4>
                  <p className="text-xs text-gray-500 uppercase font-black">Triad Projections across 19 Provinces</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-300">
                <div className="bg-black/50 p-4 rounded-lg border border-gray-900">
                  <span className="text-xs text-[#D30014] font-black uppercase tracking-wider block mb-1">Corporate Target (B2B)</span>
                  <span className="text-lg font-black text-white">{t.finPartnersTarget}</span>
                  <p className="text-xs text-gray-500 mt-2">
                    {lang === "en" ? "Yields 28,500,000 IQD projected core revenue annually." : "تنتج 28,500,000 د.ع من الإيرادات السنوية المتوقعة."}
                  </p>
                </div>
                <div className="bg-black/50 p-4 rounded-lg border border-gray-900">
                  <span className="text-xs text-[#D30014] font-black uppercase tracking-wider block mb-1">Consumer Target (B2C)</span>
                  <span className="text-lg font-black text-white">{t.finUsersTarget}</span>
                  <p className="text-xs text-gray-500 mt-2">
                    {lang === "en" ? "Yields 47,500,000 IQD projected core revenue annually." : "تنتج 47,500,000 د.ع من الإيرادات السنوية المتوقعة."}
                  </p>
                </div>
                <div className="bg-black/50 p-4 rounded-lg border border-gray-900">
                  <span className="text-xs text-[#D30014] font-black uppercase tracking-wider block mb-1">Iraq National Coverage</span>
                  <span className="text-lg font-black text-white">19/19 Provinces Active</span>
                  <p className="text-xs text-gray-500 mt-2">Full decentralized B2C/B2B exposure network.</p>
                </div>
              </div>
            </div>

            {/* Province Specific Performance Breakdown */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#D30014]" />
                  {t.finProvinceStats}
                </h3>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleExportFinancialAuditCSV}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 text-gray-200 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    id="export-financial-csv-btn"
                  >
                    <Download className="w-4 h-4 text-[#D30014]" />
                    <span>{lang === "en" ? "Export Financial CSV" : "تصدير التقرير المالي CSV"}</span>
                  </button>

                  <button
                    onClick={handleExportComprehensiveAnalyticsPDF}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#D30014] hover:bg-red-700 text-white rounded-lg text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                    id="export-financial-pdf-btn"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{lang === "en" ? "Export Comprehensive Audit PDF" : "تصدير التقرير الشامل PDF"}</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-widest font-bold">
                      <th className="py-3 px-4">{t.finProvinceCol}</th>
                      <th className="py-3 px-4 text-center">{t.finPartnersCol}</th>
                      <th className="py-3 px-4 text-center">{t.finUsersCol}</th>
                      <th className="py-3 px-4 text-center">{lang === "en" ? "B2B Rev (IQD)" : "إيراد B2B (د.ع)"}</th>
                      <th className="py-3 px-4 text-center">{lang === "en" ? "B2C Rev (IQD)" : "إيراد B2C (د.ع)"}</th>
                      <th className="py-3 px-4 text-right">{t.finRevenueCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                    {liveProvinceBreakdown.map((pb, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#D30014]"></span>
                          {lang === "en" ? pb.province : pb.provinceAr}
                        </td>
                        <td className="py-3.5 px-4 text-center text-white">{pb.partners} / <span className="text-xs text-gray-600">{pb.targetPartners}</span></td>
                        <td className="py-3.5 px-4 text-center text-white">{pb.users} / <span className="text-xs text-gray-600">{pb.targetUsers}</span></td>
                        <td className="py-3.5 px-4 text-center text-gray-400">{pb.collectedB2B.toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}</td>
                        <td className="py-3.5 px-4 text-center text-gray-400">{pb.collectedB2C.toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}</td>
                        <td className="py-3.5 px-4 text-right font-black text-green-400">
                          {(pb.collectedB2B + pb.collectedB2C).toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ----------------- FILTER CONTROLS FOR CRUD TABLES ----------------- */}
        {!isLoading && (activeTab === "members" || activeTab === "partners") && (
          <div className="bg-[#121212] border border-gray-800 p-6 rounded-xl mb-6 space-y-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
              <h3 className="text-lg font-black">
                {activeTab === "members" ? "B2C Members Registry" : "B2B Partners Registry"}
              </h3>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
                <button
                  onClick={() => {
                    if (activeTab === "members") {
                      handleExportMembersCSV();
                    } else {
                      handleExportPartnersCSV();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] hover:bg-red-700 border border-red-600 text-white font-bold rounded-lg text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-md shadow-red-900/20"
                  id="export-csv-btn"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === "en" ? "Export CSV" : "تصدير CSV"}</span>
                </button>

                <button
                  onClick={handleExportToExcel}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 border border-green-600 text-white font-bold rounded-lg text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-md shadow-green-900/20"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{lang === "en" ? "Export Excel" : "تصدير إكسل"}</span>
                </button>

                <button
                  onClick={handleExportToPDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 border border-rose-600 text-white font-bold rounded-lg text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-md shadow-rose-900/20"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{lang === "en" ? "Export PDF" : "تصدير PDF"}</span>
                </button>

                {!isViewer && (
                  <button
                    onClick={() => {
                      if (activeTab === "members") {
                        resetMemberForm();
                        setEditingMember(null);
                        setShowMemberForm(true);
                      } else {
                        resetPartnerForm();
                        setEditingPartner(null);
                        setShowPartnerForm(true);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] text-white font-bold rounded-lg text-xs sm:text-sm hover:bg-[#b00010] shadow-md shadow-[#D30014]/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{activeTab === "members" ? t.addMemberBtn : t.addPartnerBtn}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              
              <div className="relative">
                <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-gray-400" />
                <input
                  id="admin-member-search-input"
                  type="text"
                  placeholder={
                    activeTab === "members"
                      ? (lang === "en" ? "Search by Name or Card ID..." : "ابحث بالاسم أو رقم البطاقة...")
                      : t.searchPlaceholder
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-black border border-gray-800 focus:border-[#D30014] focus:ring-1 focus:ring-[#D30014] rounded-lg text-xs font-bold text-white placeholder-gray-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-2.5 my-auto w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
                    title={lang === "en" ? "Clear Search" : "مسح البحث"}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-gray-800 focus:border-[#D30014] rounded-lg text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                >
                  <option value="All">🌍 {t.allProvinces}</option>
                  {provincesList.map((p, idx) => (
                    <option key={idx} value={p.en}>
                      {lang === "en" ? p.en : p.ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-gray-800 focus:border-[#D30014] rounded-lg text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                >
                  <option value="All">⚡ {t.allStatus}</option>
                  <option value="Active">{t.active}</option>
                  <option value="Inactive">{t.inactive}</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setProvinceFilter("All");
                  setStatusFilter("All");
                }}
                className="w-full py-2.5 bg-black hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-bold text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Clear Filters" : "إعادة تعيين الفلاتر"}</span>
              </button>

            </div>

            {activeTab === "members" && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs font-medium text-gray-400 border-t border-gray-900">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-red-500/10 text-red-400 border border-red-500/20">
                    {filteredMembers.length} {lang === "en" ? (filteredMembers.length === 1 ? "Member Found" : "Members Found") : "مشترك"}
                  </span>
                  <span>
                    {lang === "en"
                      ? `Showing ${filteredMembers.length} of ${allMembers.length} total members`
                      : `عرض ${filteredMembers.length} من أصل ${allMembers.length} مشترك مسجل`}
                  </span>
                </div>
                {searchQuery && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-300">
                    <span className="text-gray-500">{lang === "en" ? "Filtered by:" : "تصفية حسب:"}</span>
                    <span className="px-2 py-0.5 bg-[#D30014]/20 border border-[#D30014]/40 text-white rounded text-[11px] font-mono font-bold flex items-center gap-1">
                      "{searchQuery}"
                      <button onClick={() => setSearchQuery("")} className="hover:text-red-300 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------- SECTION 2: MEMBERS TAB (B2C) ----------------- */}
        {!isLoading && activeTab === "members" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden shadow-lg shadow-black/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-bold bg-black/40">
                    <th className="py-4 px-6">{t.tblFullName}</th>
                    <th className="py-4 px-6">{t.tblCardId}</th>
                    <th className="py-4 px-6">{t.tblProvince}</th>
                    <th className="py-4 px-6">{lang === "en" ? "Duration" : "مدة الاشتراك"}</th>
                    <th className="py-4 px-6">{t.tblRegDate}</th>
                    <th className="py-4 px-6">{t.tblExpDate}</th>
                    <th className="py-4 px-6 text-center">{t.tblStatus}</th>
                    <th className="py-4 px-6 text-right">{t.tblActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-white">{m.fullName}</div>
                        <div className="text-xs text-gray-500 font-bold font-mono mt-0.5">{m.fullNameAr}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[#D30014] font-black tracking-wider">
                        {m.cardId}
                      </td>
                      <td className="py-4 px-6">
                        {lang === "en" ? m.province : m.provinceAr}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-xs font-extrabold text-white">
                          {m.durationMonths === 12 || m.feePaidIqd === 50000
                            ? (lang === "en" ? "1 Year" : "سنة واحدة من تاريخ التسجيل")
                            : (lang === "en" ? "6 Months" : "6 أشهر من تاريخ التسجيل")}
                        </div>
                        <div className="text-[10px] text-green-400 font-mono font-bold mt-0.5">
                          {(m.feePaidIqd !== undefined ? m.feePaidIqd : (m.durationMonths === 12 ? 50000 : 25000)).toLocaleString()} IQD
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                        {m.registrationDate}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                        {m.expiryDate}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isViewer ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black ${
                            isMemberActive(m)
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isMemberActive(m) ? "bg-green-400" : "bg-red-500"}`}></span>
                            {isMemberActive(m) ? t.active : t.inactive}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleMemberStatus(m)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black cursor-pointer hover:scale-105 transition-all ${
                            isMemberActive(m)
                              ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                          }`}
                            title={lang === "en" ? "Click to Activate / Deactivate" : "انقر للتفعيل أو التعطيل"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isMemberActive(m) ? "bg-green-400" : "bg-red-500"}`}></span>
                            {isMemberActive(m) ? t.active : t.inactive}
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isViewer ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] font-bold text-gray-500 bg-black/60 px-2.5 py-1 rounded border border-gray-800">
                              {lang === "en" ? "Audited" : "معاينة فقط"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleMemberStatus(m)}
                              className={`p-1.5 border rounded text-xs font-bold transition-all cursor-pointer ${
                                isMemberActive(m)
                                  ? "bg-amber-500/10 hover:bg-amber-500 border-amber-500/20 text-amber-400 hover:text-black"
                                  : "bg-green-500/10 hover:bg-green-500 border-green-500/20 text-green-400 hover:text-black"
                              }`}
                              title={isMemberActive(m) ? (lang === "en" ? "Deactivate Account" : "تعطيل الحساب") : (lang === "en" ? "Activate Account" : "تفعيل الحساب")}
                            >
                              {isMemberActive(m) ? (lang === "en" ? "Deactivate" : "تعطيل") : (lang === "en" ? "Activate" : "تفعيل")}
                            </button>
                            <button
                              onClick={() => handleEditMemberClick(m)}
                              className="p-1.5 bg-gray-800/40 hover:bg-gray-800 border border-gray-700/60 rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
                              title={t.edit}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(m.id)}
                              className="p-1.5 bg-red-500/5 hover:bg-[#D30014] border border-red-500/10 text-red-400 hover:text-white transition-colors cursor-pointer"
                              title={t.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500">
                            <Search className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="text-white font-bold text-sm">
                            {searchQuery
                              ? (lang === "en" ? `No members found matching "${searchQuery}"` : `لم يتم العثور على مشتركين مطابقين لـ "${searchQuery}"`)
                              : (lang === "en" ? "No member records found matching the active filters." : "لا توجد سجلات مشتركين مطابقة للفلاتر المحددة.")}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- SECTION 3: PARTNERS TAB (B2B) ----------------- */}
        {!isLoading && activeTab === "partners" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-bold">
                    <th className="py-4 px-6">{t.tblCompanyName}</th>
                    <th className="py-4 px-6">{t.tblSector}</th>
                    <th className="py-4 px-6">{t.tblProvince}</th>
                    <th className="py-4 px-6">{t.tblVideo}</th>
                    <th className="py-4 px-6">{t.tblFees}</th>
                    <th className="py-4 px-6 text-center">{t.tblStatus}</th>
                    <th className="py-4 px-6 text-right">{t.tblActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredPartners.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={p.logoUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop"} 
                            alt={p.companyName}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-800 bg-black flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-extrabold text-white">{p.companyName}</div>
                            <div className="text-xs text-gray-500 font-bold mt-0.5">{p.companyNameAr}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs font-black uppercase text-gray-400">
                        {lang === "en" ? p.sector : p.sectorAr}
                      </td>
                      <td className="py-4 px-6">
                        {lang === "en" ? p.province : p.provinceAr}
                      </td>
                      <td className="py-4 px-6">
                        {p.promoVideoUrl ? (
                          <button
                            onClick={() => setActiveVideoUrl(p.promoVideoUrl)}
                            className="flex items-center gap-1 text-xs text-[#D30014] bg-[#D30014]/10 border border-[#D30014]/25 hover:bg-[#D30014] hover:text-white px-2 py-1 rounded font-bold transition-all"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{t.watchPromo}</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <VideoOff className="w-3.5 h-3.5" />
                            <span>No Video</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs font-mono font-bold text-white">
                        {(p.feePaidIqd || (p.feePaidUsd ? p.feePaidUsd * 1500 : 150000)).toLocaleString()} IQD
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => !isViewer && handleTogglePartnerStatus(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black cursor-pointer hover:scale-105 transition-all ${
                            isPartnerActive(p)
                              ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPartnerActive(p) ? "bg-green-400" : "bg-red-500"}`}></span>
                          {isPartnerActive(p) ? t.active : t.inactive}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isViewer && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleTogglePartnerStatus(p)}
                              className={`p-1.5 border rounded text-xs font-bold transition-all cursor-pointer ${
                                isPartnerActive(p)
                                  ? "bg-amber-500/10 hover:bg-amber-500 border-amber-500/20 text-amber-400 hover:text-black"
                                  : "bg-green-500/10 hover:bg-green-500 border-green-500/20 text-green-400 hover:text-black"
                              }`}
                            >
                              {isPartnerActive(p) ? (lang === "en" ? "Deactivate" : "تعطيل") : (lang === "en" ? "Activate" : "تفعيل")}
                            </button>
                            <button
                              onClick={() => handleEditPartnerClick(p)}
                              className="p-1.5 bg-gray-800/40 hover:bg-gray-800 border border-gray-700/60 rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePartner(p.id)}
                              className="p-1.5 bg-red-500/5 hover:bg-[#D30014] border border-red-500/10 text-red-400 hover:text-white transition-colors cursor-pointer"
                            >
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

        {/* ----------------- SECTION 4: BRANDING TAB ----------------- */}
        {!isLoading && activeTab === "branding" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 sm:p-8" id="branding-settings-panel">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
                {lang === "en" ? "Dynamic Ownership & Branding Systems" : "إعدادات الهوية والشركات المالكة"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-semibold">
                {lang === "en" 
                  ? "Configure the names, descriptions, and logos of the owning corporations. Changes instantly sync and propagate to the public footer."
                  : "قم بتهيئة أسماء وأوصاف وشعارات الشركات المالكة للمنظومة. تنعكس التغييرات فوراً في أسفل الموقع."}
              </p>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-8 text-xs sm:text-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Company 1 Configuration */}
                <div className="bg-black/40 border border-gray-900 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="border-b border-gray-900 pb-3 mb-2 flex justify-between items-center">
                    <h3 className="text-sm font-black text-[#D30014] uppercase tracking-wider">
                      {lang === "en" ? "Owning Entity 1 (Marketing)" : "الجهة المالكة الأولى (التسويق)"}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Company Name (English)" : "اسم الشركة (بالإنكليزية)"} *</label>
                      <input
                        type="text"
                        required
                        id="entity1-name-en"
                        value={brandingForm.company1Name}
                        onChange={(e) => setBrandingForm({ ...brandingForm, company1Name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Company Name (Arabic)" : "اسم الشركة (بالعربية)"} *</label>
                      <input
                        type="text"
                        required
                        id="entity1-name-ar"
                        value={brandingForm.company1NameAr}
                        onChange={(e) => setBrandingForm({ ...brandingForm, company1NameAr: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                      />
                    </div>
                  </div>

                  <input type="hidden" id="entity1-desc-en" value={brandingForm.company1Desc} />
                  <input type="hidden" id="entity1-desc-ar" value={brandingForm.company1DescAr} />

                  <div>
                    <label className="block text-gray-400 font-bold mb-2">{lang === "en" ? "Corporate Logo Asset" : "شعار الشركة"}</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/60 p-4 rounded-xl border border-gray-900">
                      <div className="w-16 h-16 rounded-xl bg-black border border-gray-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {brandingForm.company1Logo ? (
                          <img src={brandingForm.company1Logo} alt="Preview 1" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-gray-600 font-black">No Logo</span>
                        )}
                      </div>
                      <div className="w-full space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, "company1Logo")}
                          className="hidden"
                          id="company1-logo-file"
                        />
                        <label
                          htmlFor="company1-logo-file"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          {lang === "en" ? "Upload Custom Image" : "رفع شعار مخصص"}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company 2 Configuration */}
                <div className="bg-black/40 border border-gray-900 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="border-b border-gray-900 pb-3 mb-2 flex justify-between items-center">
                    <h3 className="text-sm font-black text-[#D30014] uppercase tracking-wider">
                      {lang === "en" ? "Owning Entity 2 (Technology)" : "الجهة المالكة الثانية (التكنولوجيا)"}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Company Name (English)" : "اسم الشركة (بالإنكليزية)"} *</label>
                      <input
                        type="text"
                        required
                        id="entity2-name-en"
                        value={brandingForm.company2Name}
                        onChange={(e) => setBrandingForm({ ...brandingForm, company2Name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Company Name (Arabic)" : "اسم الشركة (بالعربية)"} *</label>
                      <input
                        type="text"
                        required
                        id="entity2-name-ar"
                        value={brandingForm.company2NameAr}
                        onChange={(e) => setBrandingForm({ ...brandingForm, company2NameAr: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                      />
                    </div>
                  </div>

                  <input type="hidden" id="entity2-desc-en" value={brandingForm.company2Desc} />
                  <input type="hidden" id="entity2-desc-ar" value={brandingForm.company2DescAr} />

                  <div>
                    <label className="block text-gray-400 font-bold mb-2">{lang === "en" ? "Corporate Logo Asset" : "شعار الشركة"}</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/60 p-4 rounded-xl border border-gray-900">
                      <div className="w-16 h-16 rounded-xl bg-black border border-gray-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {brandingForm.company2Logo ? (
                          <img src={brandingForm.company2Logo} alt="Preview 2" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-gray-600 font-black">No Logo</span>
                        )}
                      </div>
                      <div className="w-full space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, "company2Logo")}
                          className="hidden"
                          id="company2-logo-file"
                        />
                        <label
                          htmlFor="company2-logo-file"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          {lang === "en" ? "Upload Custom Image" : "رفع شعار مخصص"}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-4 border-t border-gray-900">
                {!isViewer && (
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#D30014] hover:bg-[#b00010] text-white text-xs sm:text-sm font-extrabold rounded-lg shadow-lg cursor-pointer"
                  >
                    {lang === "en" ? "Save Dynamic Brand Configuration" : "حفظ إعدادات الهوية والشركات المالكة"}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* CARDS ASSET MANAGEMENT TAB */}
        {activeTab === "cards" && (
          <div className="space-y-6" id="cards-management-panel">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121212] border border-gray-800 p-6 rounded-2xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-5 bg-[#D30014] rounded-sm"></span>
                  {lang === "en" ? "Card Asset Management Ledger" : "سجل إدارة الأصول الرقمية والبطاقات"}
                </h2>
              </div>
              {!isViewer && (
                <button
                  onClick={handleGenerateSequentialCard}
                  className="flex items-center gap-2 px-5 py-3 bg-[#D30014] hover:bg-[#b00010] text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "en" ? "Generate Sequential Card" : "توليد بطاقة متسلسلة"}</span>
                </button>
              )}
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-900 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-black uppercase tracking-wider">
                  {lang === "en" ? "Active Serial Keys" : "المفاتيح التسلسلية النشطة"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-bold">
                      <th className="py-4 px-6">{lang === "en" ? "Card Serial" : "الرقم المسلسل"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Status" : "الحالة"}</th>
                      <th className="py-4 px-6 text-right">{lang === "en" ? "Actions" : "العمليات"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                    {cards.map((card: any) => (
                      <tr key={card.id} className="hover:bg-white/[0.01]">
                        <td className="py-4 px-6 font-mono font-bold text-white text-base">{card.cardId}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${card.status === "Active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"}`}>
                            {card.status === "Active" ? "نشطة" : "معطلة"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {!isViewer && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditCard(card)} className="p-2 bg-gray-800 text-white rounded cursor-pointer">
                                <Edit3 className="w-4 h-4 text-[#D30014]" />
                              </button>
                              <button onClick={() => handleDeleteCard(card.id)} className="p-2 bg-red-500/10 text-red-500 rounded cursor-pointer">
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
          </div>
        )}

        {/* ----------------- SECTION 6: VIEWER / AUDITOR ACCOUNTS (MASTER ADMIN ONLY) ----------------- */}
        {!isLoading && activeTab === "viewers" && !isViewer && (
          <div className="space-y-8" id="viewers-management-panel">
            <div className="bg-[#121212] border border-gray-800 p-6 sm:p-8 rounded-2xl space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#D30014]" />
                {lang === "en" ? "Auditor & Read-Only Accounts Management" : "إدارة حسابات المراقبة والتدقيق (صلاحية الاطلاع والطباعة فقط)"}
              </h2>

              <form onSubmit={handleCreateViewerAccount} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  required
                  placeholder={lang === "en" ? "Username" : "اسم المستخدم"}
                  value={viewerForm.username}
                  onChange={(e) => setViewerForm({ ...viewerForm, username: e.target.value })}
                  className="px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder={lang === "en" ? "Password" : "كلمة المرور"}
                  value={viewerForm.password}
                  onChange={(e) => setViewerForm({ ...viewerForm, password: e.target.value })}
                  className="px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none text-xs"
                />
                <input
                  type="text"
                  placeholder={lang === "en" ? "Auditor Name" : "اسم المراقب أو الجهة"}
                  value={viewerForm.name}
                  onChange={(e) => setViewerForm({ ...viewerForm, name: e.target.value })}
                  className="px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none text-xs"
                />
                <button
                  type="submit"
                  disabled={viewerLoading}
                  className="px-6 py-2.5 bg-[#D30014] text-white text-xs font-extrabold rounded-lg cursor-pointer"
                >
                  {lang === "en" ? "Create Account" : "إنشاء الحساب"}
                </button>
              </form>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-gray-800 bg-[#0d0d0d]">
                <h3 className="text-base font-black text-white">
                  {lang === "en" ? "Active Auditor Accounts" : "حسابات المراقبة والتدقيق الفعالة"}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-bold">
                      <th className="py-4 px-6">{lang === "en" ? "Username" : "اسم المستخدم"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Password" : "كلمة المرور"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Name" : "اسم المراقب"}</th>
                      <th className="py-4 px-6 text-right">{lang === "en" ? "Actions" : "الإجراءات"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-xs sm:text-sm font-semibold text-gray-300">
                    {viewerAccounts.map((account) => (
                      <tr key={account.id}>
                        <td className="py-4 px-6 font-mono font-black text-white">{account.username}</td>
                        <td className="py-4 px-6 font-mono text-amber-300">{account.password}</td>
                        <td className="py-4 px-6 font-bold text-white">{account.name || "—"}</td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleDeleteViewerAccount(account.id, account.username)}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                      <option key={idx} value={p.en}>{p.en}</option>
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
                <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Subscription Duration" : "مدة الاشتراك"} *</label>
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
                  <option value={6}>{lang === "en" ? "6 Months - 25,000 IQD" : "6 أشهر من تاريخ التسجيل - 25,000 د.ع"}</option>
                  <option value={12}>{lang === "en" ? "1 Year - 50,000 IQD" : "سنة واحدة من تاريخ التسجيل - 50,000 د.ع"}</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Nearest Landmark" : "أقرب نقطة دالة"}</label>
                <input
                  type="text"
                  value={memberForm.nearestLandmark || ""}
                  onChange={(e) => setMemberForm({ ...memberForm, nearestLandmark: e.target.value })}
                  placeholder={lang === "en" ? "e.g. Near Dijlah Mall" : "مثال: قرب دجلة مول"}
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowMemberForm(false)}
                  className="px-5 py-2.5 bg-[#121212] hover:bg-gray-950 border border-gray-800 text-gray-300 font-bold rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white font-bold rounded-lg cursor-pointer"
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
              {editingPartner ? "Edit B2B Partner Details" : "Establish New B2B Partner Contract"}
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
                  className="px-5 py-2.5 bg-[#121212] hover:bg-gray-950 border border-gray-800 text-gray-300 font-bold rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white font-bold rounded-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-lg p-6 sm:p-8 relative shadow-2xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#D30014] rounded-sm"></span>
              {editingCard ? "Modify Card Asset Details" : "Register New Card Asset"}
            </h3>

            <form onSubmit={handleSaveCard} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Card Serial ID" : "الرقم المسلسل للبطاقة"} *</label>
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
                  className="px-5 py-2.5 bg-[#121212] hover:bg-gray-950 border border-gray-800 text-gray-300 font-bold rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white font-bold rounded-lg cursor-pointer"
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
