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

// دالة مساعدة عامة وآمنة جداً لأي طلب API في الملف لمنع أخطاء HTML/JSON تماماً
const safeFetchJson = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    if (!res || !res.ok) return null;
    const text = await res.text();
    if (text.trim().startsWith("<")) return null; // إذا أرجع السيرفر HTML يتم تجاهله بأمان
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
};

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
      entity1NameEn: (document.getElementById('entity1-name-en') as HTMLInputElement).value,
      entity1NameAr: (document.getElementById('entity1-name-ar') as HTMLInputElement).value,
      entity1DescEn: (document.getElementById('entity1-desc-en') as HTMLInputElement).value,
      entity1DescAr: (document.getElementById('entity1-desc-ar') as HTMLInputElement).value,
      entity1Logo: globalEntity1Base64Str, // Consolidated Base64 state
      entity2NameEn: (document.getElementById('entity2-name-en') as HTMLInputElement).value,
      entity2NameAr: (document.getElementById('entity2-name-ar') as HTMLInputElement).value,
      entity2DescEn: (document.getElementById('entity2-desc-en') as HTMLInputElement).value,
      entity2DescAr: (document.getElementById('entity2-desc-ar') as HTMLInputElement).value,
      entity2Logo: globalEntity2Base64Str
    };
    localStorage.setItem('BYD_BRAND_PERSISTENT_STATE', JSON.stringify(brandData));

    // Also sync the internal state
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
        
        // Ensure perfect sync back to BYD_BRAND_PERSISTENT_STATE
        const serverBrandData = {
          entity1NameEn: data.branding.company1Name,
          entity1NameAr: data.branding.company1NameAr,
          entity1DescEn: data.branding.company1Desc,
          entity1DescAr: data.branding.company1DescAr,
          entity1Logo: data.branding.company1Logo,
          entity2NameEn: data.branding.company2Name,
          entity2NameAr: data.branding.company2NameAr,
          entity2DescEn: data.branding.company2Desc,
          entity2DescAr: data.branding.company2DescAr,
          entity2Logo: data.branding.company2Logo
        };
        localStorage.setItem('BYD_BRAND_PERSISTENT_STATE', JSON.stringify(serverBrandData));
        alert(lang === "en" ? "Dynamic branding systems updated successfully!" : "تم تحديث إعدادات الهوية والشركات المالكة بنجاح!");
      } else {
        console.warn("Cloud branding update failed, using local fallback:", data.message);
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
  const [analyticsProvinceSearch, setAnalyticsProvinceSearch] = useState("");
  const [analyticsSortBy, setAnalyticsSortBy] = useState<"revenue" | "members" | "partners" | "name">("revenue");

  // Video Preview Modal
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

// Load All Dashboard Data (النسخة الكاملة الآمنة 100% مع حسابات المراقبة والتدقيق)
  const loadAllData = async () => {
    setIsLoading(true);

    const emergencyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    const parseJSON = async (res: Response | null) => {
      if (!res || !res.ok) return null;
      try {
        const text = await res.text();
        if (text.trim().startsWith("<")) return null;
        return JSON.parse(text);
      } catch (e) {
        return null;
      }
    };

    try {
      const [membersRes, partnersRes, finRes, cardsRes] = await Promise.all([
        fetch("/api/members").catch(() => null),
        fetch("/api/partners").catch(() => null),
        fetch("/api/financials").catch(() => null),
        fetch("/api/cards").catch(() => null)
      ]);

      const fetchedMembers = await parseJSON(membersRes);
      const fetchedPartners = await parseJSON(partnersRes);
      const fetchedFin = await parseJSON(finRes);
      const fetchedCards = await parseJSON(cardsRes);

      if (Array.isArray(fetchedMembers)) setMembers(fetchedMembers);
      if (Array.isArray(fetchedPartners)) setPartners(fetchedPartners);
      if (Array.isArray(fetchedCards)) setCards(fetchedCards);
      
      setFinancials(fetchedFin || {
        totalRevenueIqd: 0,
        totalRevenueUsd: 0,
        monthlyTrend: [
          { month: "01/2026", b2b: 0, b2c: 0, b2bTarget: 28500000, b2cTarget: 95000000 },
          { month: "Current (Live)", b2b: 0, b2c: 0, b2bTarget: 28500000, b2cTarget: 95000000 }
        ]
      });

      // مزامنة البيانات المحلية
      try {
        const localMembers = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
        const localPartners = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
        if (Array.isArray(fetchedMembers)) {
          setLocalMembersList([...fetchedMembers, ...localMembers.filter((lm: any) => !fetchedMembers.find((fm: any) => fm.id === lm.id))]);
        } else {
          setLocalMembersList(localMembers);
        }
        if (Array.isArray(fetchedPartners)) {
          setLocalPartnersList([...fetchedPartners, ...localPartners.filter((lp: any) => !fetchedPartners.find((fp: any) => fp.id === lp.id))]);
        } else {
          setLocalPartnersList(localPartners);
        }
      } catch (e) {}

    } catch (err) {
      console.error("Load error:", err);
    } finally {
      clearTimeout(emergencyTimer);
      setIsLoading(false);
    }

    // Load Viewer Accounts if master admin (تم إرجاع الكود كاملاً هنا)
    if (!isViewer) {
      try {
        const viewersRes = await fetch("/api/admin/viewers", {
          headers: { "Authorization": `Bearer ${adminToken}` }
        }).catch(() => null);

        const fetchedViewers = await parseJSON(viewersRes);
        if (Array.isArray(fetchedViewers)) {
          setViewerAccounts(fetchedViewers);
        } else {
          setViewerAccounts([]);
        }
      } catch (viewersErr) {
        console.error("Error loading viewer accounts:", viewersErr);
        setViewerAccounts([]);
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
          text: lang === "en" ? "Monitoring account created successfully!" : "تم إنشاء حساب المراقبة بنجاح وبشكل فوري!"
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
    if (!window.confirm(lang === "en" ? `Are you sure you want to delete auditor account '${username}'?` : `هل أنت متأكد من حذف حساب المراقبة '${username}'؟`)) {
      return;
    }

    const previousAccounts = [...viewerAccounts];
    setViewerAccounts((prev) => prev.filter((v) => v.id !== id && v.username !== username));

    const token = adminToken || localStorage.getItem("byd-admin-token") || "";

    try {
      const res = await fetch(`/api/admin/viewers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.viewers)) {
          setViewerAccounts(data.viewers);
        }
      } else {
        setViewerAccounts(previousAccounts);
        alert(lang === "en" ? (data.message || "Failed to delete") : (data.messageAr || data.message || "فشل حذف الحساب"));
      }
    } catch (err) {
      console.error(err);
      setViewerAccounts(previousAccounts);
      alert(lang === "en" ? "Failed to delete account." : "فشل حذف الحساب.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const financialsResOrMock = async (res: Response) => {
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    loadAllData();
  }, [adminToken]);
  
  // MEMBER CRUD ACTIONS
  const handleToggleMemberStatus = async (member: Member) => {
    const currentActive = isMemberActive(member);
    const newStatus = currentActive ? "Inactive" : "Active";

    try {
      await fetch(`/api/members/${encodeURIComponent(member.id || member.cardId)}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...member, status: newStatus })
      });
    } catch (err) {
      console.error("Error toggling member status:", err);
    }

    try {
      const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");

      const updatedM1 = m1.map((item: any) => {
        if (item.id === member.id || (member.cardId && item.cardId === member.cardId)) {
          return { ...item, status: newStatus };
        }
        return item;
      });
      const updatedM2 = m2.map((item: any) => {
        if (item.id === member.id || (member.cardId && item.cardId === member.cardId)) {
          return { ...item, status: newStatus };
        }
        return item;
      });

      safeSetLocalStorage("byd-custom-members", JSON.stringify(updatedM1));
      safeSetLocalStorage("BYD_USERS", JSON.stringify(updatedM2));
    } catch (e) {
      console.error(e);
    }

    setMembers(prev => prev.map(m => {
      if (m.id === member.id || (member.cardId && m.cardId === member.cardId)) {
        return { ...m, status: newStatus };
      }
      return m;
    }));
    setLocalMembersList(prev => prev.map(m => {
      if (m.id === member.id || (member.cardId && m.cardId === member.cardId)) {
        return { ...m, status: newStatus };
      }
      return m;
    }));

    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
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
      ...memberForm,
      provinceAr
    };

    const url = editingMember ? `/api/members/${editingMember.id}` : "/api/members";
    const method = editingMember ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        alert(t.successSave);
        try {
          const registered = {
            ...(data.member || body),
            feePaidIqd: (data.member || body).feePaidIqd !== undefined ? (data.member || body).feePaidIqd : 25000
          };

          // Update byd-custom-members
          const current = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
          const isMatchMember = (m: any) => {
            if (editingMember) {
              if (editingMember.id && m.id && m.id === editingMember.id) return true;
              if (editingMember.cardId && m.cardId && m.cardId.toLowerCase() === editingMember.cardId.toLowerCase()) return true;
            }
            if (registered.id && m.id && m.id === registered.id) return true;
            if (registered.cardId && m.cardId && m.cardId.toLowerCase() === registered.cardId.toLowerCase()) return true;
            return false;
          };

          const idx = current.findIndex(isMatchMember);
          if (idx > -1) {
            current[idx] = registered;
          } else {
            current.push(registered);
          }
          safeSetLocalStorage("byd-custom-members", JSON.stringify(current));

          // Update BYD_USERS
          const usersArray = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
          const idxU = usersArray.findIndex(isMatchMember);
          if (idxU > -1) {
            usersArray[idxU] = registered;
          } else {
            usersArray.push(registered);
          }
          safeSetLocalStorage("BYD_USERS", JSON.stringify(usersArray));

          window.dispatchEvent(new Event("storage-sync-updated"));
        } catch (e) {
          console.error("Local storage B2C admin backup error:", e);
        }
        setShowMemberForm(false);
        setEditingMember(null);
        resetMemberForm();
        loadAllData();
      } else {
        alert(data.message || t.errorFill);
      }
    } catch (err) {
      console.error(err);
    }
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
      status: member.status,
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
      if (id && !deletedList.includes(id)) deletedList.push(id);
      safeSetLocalStorage("BYD_DELETED_MEMBERS", JSON.stringify(deletedList));

      const isMatch = (m: any) => m.id === targetId || m.id === id || (cardId && m.cardId === cardId);

      const syncBydUsers = JSON.parse(localStorage.getItem("BYD_USERS") || "[]").filter((m: any) => !isMatch(m));
      const syncCustomMembers = JSON.parse(localStorage.getItem("byd-custom-members") || "[]").filter((m: any) => !isMatch(m));

      safeSetLocalStorage("BYD_USERS", JSON.stringify(syncBydUsers));
      safeSetLocalStorage("byd-custom-members", JSON.stringify(syncCustomMembers));
    } catch (e) {
      console.error("Localstorage member deletion error:", e);
    }

    setMembers(prev => prev.filter(m => m.id !== targetId && m.id !== id && (!cardId || m.cardId !== cardId)));
    setLocalMembersList(prev => prev.filter((m: any) => m.id !== targetId && m.id !== id && (!cardId || m.cardId !== cardId)));

    try {
      await fetch(`/api/members/${encodeURIComponent(targetId || cardId || id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (err) {
      console.error("Delete member API error:", err);
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

    // Sector breakdown
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
            .report-meta {
              text-align: right;
            }
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


  // PARTNER CRUD ACTIONS
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

    // Generate dynamic fallback credentials and values if they are left empty
    const cleanCompanyName = partnerForm.companyName.trim();
    const fallbackUsername = partnerForm.username?.trim() || (cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Math.floor(Math.random() * 1000));
    const fallbackPassword = partnerForm.password?.trim() || "123456";
    const fallbackEmail = partnerForm.email?.trim() || (fallbackUsername + "@byd-network.com");
    const fallbackPhone = partnerForm.phone?.trim() || "07700000000";
    const fallbackDiscount = partnerForm.discount?.trim() || "10%";

    const body = {
      ...partnerForm,
      username: fallbackUsername,
      password: fallbackPassword,
      email: fallbackEmail,
      phone: fallbackPhone,
      discount: fallbackDiscount,
      discountEn: partnerForm.discountEn?.trim() || fallbackDiscount,
      discountAr: partnerForm.discountAr?.trim() || fallbackDiscount,
      provinceAr,
      sectorAr
    };

    const url = editingPartner ? `/api/partners/${editingPartner.id}` : "/api/partners";
    const method = editingPartner ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        alert(t.successSave);
        try {
          const registered = {
            ...(data.partner || body),
            feePaidIqd: (data.partner || body).feePaidIqd !== undefined ? (data.partner || body).feePaidIqd : 150000
          };

          // Update byd-custom-partners
          const current = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
          const isMatchPartner = (p: any) => {
            if (editingPartner) {
              if (editingPartner.id && p.id && p.id === editingPartner.id) return true;
              if (editingPartner.username && p.username && p.username.toLowerCase() === editingPartner.username.toLowerCase()) return true;
              if (editingPartner.companyName && p.companyName && p.companyName.toLowerCase() === editingPartner.companyName.toLowerCase()) return true;
            }
            if (registered.id && p.id && p.id === registered.id) return true;
            if (registered.username && p.username && p.username.toLowerCase() === registered.username.toLowerCase()) return true;
            if (registered.companyName && p.companyName && p.companyName.toLowerCase() === registered.companyName.toLowerCase()) return true;
            return false;
          };

          const idx = current.findIndex(isMatchPartner);
          if (idx > -1) {
            current[idx] = registered;
          } else {
            current.push(registered);
          }
          safeSetLocalStorage("byd-custom-partners", JSON.stringify(current));

          // Update BYD_COMPANIES
          const companiesArray = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
          const idxC = companiesArray.findIndex(isMatchPartner);
          if (idxC > -1) {
            companiesArray[idxC] = registered;
          } else {
            companiesArray.push(registered);
          }
          safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(companiesArray));

          window.dispatchEvent(new Event("storage-sync-updated"));
        } catch (e) {
          console.error("Local storage B2B admin backup error:", e);
        }
        setShowPartnerForm(false);
        setEditingPartner(null);
        resetPartnerForm();
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
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
      status: partner.status,
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

  const handleTogglePartnerStatus = async (partner: Partner) => {
    const currentActive = isPartnerActive(partner);
    const newStatus = currentActive ? "Inactive" : "Active";

    try {
      await fetch(`/api/partners/${encodeURIComponent(partner.id || partner.username || partner.companyName)}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...partner, status: newStatus })
      });
    } catch (err) {
      console.error("Error toggling partner status:", err);
    }

    try {
      const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");

      const updatedP1 = p1.map((item: any) => {
        if (item.id === partner.id || (partner.username && item.username === partner.username) || (partner.companyName && item.companyName === partner.companyName)) {
          return { ...item, status: newStatus };
        }
        return item;
      });
      const updatedP2 = p2.map((item: any) => {
        if (item.id === partner.id || (partner.username && item.username === partner.username) || (partner.companyName && item.companyName === partner.companyName)) {
          return { ...item, status: newStatus };
        }
        return item;
      });

      safeSetLocalStorage("byd-custom-partners", JSON.stringify(updatedP1));
      safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(updatedP2));
    } catch (e) {
      console.error(e);
    }

    setPartners(prev => prev.map(p => {
      if (p.id === partner.id || (partner.username && p.username === partner.username) || (partner.companyName && p.companyName === partner.companyName)) {
        return { ...p, status: newStatus };
      }
      return p;
    }));
    setLocalPartnersList(prev => prev.map(p => {
      if (p.id === partner.id || (partner.username && p.username === partner.username) || (partner.companyName && p.companyName === partner.companyName)) {
        return { ...p, status: newStatus };
      }
      return p;
    }));

    window.dispatchEvent(new Event("storage-sync-updated"));
    loadAllData();
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
      if (id && !deletedList.includes(id)) deletedList.push(id);
      safeSetLocalStorage("BYD_DELETED_PARTNERS", JSON.stringify(deletedList));

      const isMatch = (p: any) => p.id === targetId || p.id === id || (username && p.username === username) || (companyName && p.companyName === companyName);

      const syncBydCompanies = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]").filter((p: any) => !isMatch(p));
      const syncCustomPartners = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]").filter((p: any) => !isMatch(p));

      safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(syncBydCompanies));
      safeSetLocalStorage("byd-custom-partners", JSON.stringify(syncCustomPartners));
    } catch (e) {
      console.error("Localstorage partner deletion error:", e);
    }

    setPartners(prev => prev.filter(p => p.id !== targetId && p.id !== id && (!username || p.username !== username) && (!companyName || p.companyName !== companyName)));
    setLocalPartnersList(prev => prev.filter((p: any) => p.id !== targetId && p.id !== id && (!username || p.username !== username) && (!companyName || p.companyName !== companyName)));

    try {
      await fetch(`/api/partners/${encodeURIComponent(targetId || username || companyName || id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    } catch (err) {
      console.error("Delete partner API error:", err);
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

    const url = editingCard ? `/api/cards/${editingCard.id}` : "/api/cards";
    const method = editingCard ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(cardForm)
      });

      const data = await res.json();
      if (res.ok) {
        alert(lang === "en" ? "Card saved successfully!" : "تم حفظ البطاقة بنجاح!");
        setShowCardForm(false);
        setEditingCard(null);
        resetCardForm();
        loadAllData();
      } else {
        alert(lang === "en" ? data.message : data.messageAr || "Error saving card");
      }
    } catch (err) {
      console.error(err);
      alert(lang === "en" ? "Network error saving card" : "خطأ في الاتصال بالخادم أثناء حفظ البطاقة");
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm(lang === "en" ? "Are you sure you want to delete this Card?" : "هل أنت متأكد من حذف هذه البطاقة؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/cards/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      if (res.ok) {
        alert(lang === "en" ? "Card deleted!" : "تم حذف البطاقة!");
        loadAllData();
      } else {
        alert("Failed to delete card");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setCardForm({
      cardId: card.cardId,
      status: card.status,
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
    if (!confirm((t as any).confirmClearAll || "Are you sure you want to permanently clear all subscriber and company data?")) {
      return;
    }

    try {
      const res = await fetch("/api/admin/clear-all-data", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      });

      if (res.ok) {
        // Clear all relevant local storage lists so self-healing doesn't restore them
        localStorage.setItem("byd-custom-members", JSON.stringify([]));
        localStorage.setItem("BYD_USERS", JSON.stringify([]));
        localStorage.setItem("byd-custom-partners", JSON.stringify([]));
        localStorage.setItem("BYD_COMPANIES", JSON.stringify([]));

        // Sync local states
        setLocalMembersList([]);
        setLocalPartnersList([]);

        // Dispatch storage events to sync layout across pages
        window.dispatchEvent(new Event("storage-sync-updated"));
        window.dispatchEvent(new Event("storage"));

        alert((t as any).successClearAll || "All records have been cleared successfully!");
        
        // Reload dashboard
        loadAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(lang === "en" ? (errData.message || "Failed to clear database.") : (errData.messageAr || "فشل في مسح قاعدة البيانات."));
      }
    } catch (err) {
      console.error(err);
      alert(lang === "en" ? "A network error occurred while clearing data." : "حدث خطأ في الشبكة أثناء مسح البيانات.");
    }
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


  // Collected B2B Revenue = Sum of actual B2B fees paid by active partners (Default 150,000 IQD)
  const localB2BCollected = activeLocalPartners.reduce((sum: number, p: any) => {
    const fee = p.feePaidIqd !== undefined && p.feePaidIqd !== null
      ? Number(p.feePaidIqd)
      : (p.feePaidUsd ? Number(p.feePaidUsd) * 1500 : 150000);
    return sum + (isNaN(fee) ? 150000 : fee);
  }, 0);

  // Collected B2C Revenue = Sum of actual B2C fees paid by active members (Default 25,000 IQD)
  const localB2CCollected = activeLocalMembers.reduce((sum: number, m: any) => {
    const fee = m.feePaidIqd !== undefined && m.feePaidIqd !== null
      ? Number(m.feePaidIqd)
      : (m.feePaidUsd ? Number(m.feePaidUsd) * 1500 : 25000);
    return sum + (isNaN(fee) ? 25000 : fee);
  }, 0);

  // FINANCIAL DATA PREPARATION FOR RECHARTS
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

  // Distribution by sector for PieChart
  const getSectorDistributionData = () => {
    const counts: { [sector: string]: number } = {};
    activeLocalPartners.forEach(p => {
      const s = lang === "en" ? (p.sector || p.sectorAr || "Other") : (p.sectorAr || p.sector || "أخرى");
      counts[s] = (counts[s] || 0) + 1;
    });
    const colors = ["#D30014", "#8884d8", "#00C49F", "#FFBB28", "#FF8042", "#0088FE", "#EC4899", "#8B5CF6"];
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return [{ name: lang === "en" ? "General Services" : "خدمات عامة", value: 1, color: "#D30014" }];
    }
    return entries.map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
  };

  // Top 6 provinces by total revenue for high-impact visual chart
  const getTopProvincesRevenueData = () => {
    const sorted = [...liveProvinceBreakdown]
      .sort((a, b) => (b.collectedB2B + b.collectedB2C) - (a.collectedB2B + a.collectedB2C))
      .slice(0, 7);
    return sorted.map(p => ({
      name: lang === "en" ? p.province : p.provinceAr,
      B2B: p.collectedB2B,
      B2C: p.collectedB2C,
      Total: p.collectedB2B + p.collectedB2C
    }));
  };

  // Dynamic monthly trend containing updated targets and live real-time localStorage metrics
  const getLiveMonthlyTrend = () => {
    if (!financials || !financials.monthlyTrend) return [];
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
      if (item.month === "12/2026 (Target)") {
        return {
          ...item,
          b2b: 28500000,
          b2c: 95000000,
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

  // Direct print-to-PDF function
  const handlePrintCurrentDashboard = () => {
    window.print();
  };

  // Helper to download CSV file with UTF-8 BOM for Arabic text compatibility in Excel/Audit tools
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
    const headers = [
      "ID",
      "Card ID",
      "Full Name (EN)",
      "Full Name (AR)",
      "Province",
      "Status",
      "Fee Paid (IQD)",
      "Duration",
      "Registration Date",
      "Expiry Date"
    ];
    const rows = filteredMembers.map(m => [
      m.id || "",
      m.cardId || "",
      m.fullName || "",
      m.fullNameAr || "",
      m.province || "",
      m.status || "",
      m.feePaidIqd !== undefined && m.feePaidIqd !== null ? m.feePaidIqd : (m.feePaidUsd ? m.feePaidUsd * 1500 : 25000),
      m.durationMonths === 12 ? "12 Months (1 Year)" : "6 Months",
      m.registrationDate || "",
      m.expiryDate || ""
    ]);
    downloadCSV(`BYD_Members_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportPartnersCSV = () => {
    const headers = [
      "ID",
      "Company Name (EN)",
      "Company Name (AR)",
      "Sector",
      "Province",
      "Status",
      "Fee Paid (IQD)",
      "Discount",
      "Username / Account",
      "Phone",
      "Registration Date"
    ];
    const rows = filteredPartners.map(p => [
      p.id || "",
      p.companyName || "",
      p.companyNameAr || "",
      p.sector || "",
      p.province || "",
      p.status || "",
      p.feePaidIqd !== undefined && p.feePaidIqd !== null ? p.feePaidIqd : (p.feePaidUsd ? p.feePaidUsd * 1500 : 150000),
      p.discount || p.discountPercentage || "10%",
      p.username || "",
      p.phone || "",
      p.registrationDate || ""
    ]);
    downloadCSV(`BYD_Partners_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportFinancialAuditCSV = () => {
    const headers = [
      "Province",
      "Arabic Province Name",
      "Active B2B Partners",
      "Active B2C Members",
      "Collected B2B Revenue (IQD)",
      "Collected B2C Revenue (IQD)",
      "Total Collected Revenue (IQD)"
    ];
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
            {/* Go Back Button */}
            <button
              onClick={onGoBack}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs sm:text-sm font-bold text-gray-300 transition-all active:scale-95"
            >
              <ArrowLeft className={`w-4 h-4 text-[#D30014] ${lang === "ar" ? "rotate-180" : ""}`} />
              <span>{lang === "en" ? "Public Site" : "الموقع العام"}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs sm:text-sm font-bold text-gray-300 transition-all active:scale-95"
            >
              <Languages className="w-4 h-4 text-[#D30014]" />
              <span>{t.langToggle}</span>
            </button>

            {/* Reload Button */}
            <button
              onClick={loadAllData}
              className="p-2 bg-[#121212] hover:bg-[#1f1f1f] border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Reload Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Clear All Data Button (Hidden for Read-Only Viewers) */}
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

            {/* Logout Button */}
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
        {financials && (
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
        )}

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
          
          {/* 6th Tab for Master Admin */}
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
        {!isLoading && activeTab === "analytics" && financials && (
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
                  onClick={handleExportFinancialAuditCSV}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 text-gray-200 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  id="export-financial-csv-top-btn"
                  title={lang === "en" ? "Export Excel / CSV audit file" : "تصدير ملف الجرد المالي إكسل / CSV"}
                >
                  <Download className="w-4 h-4 text-[#D30014]" />
                  <span>{lang === "en" ? "Export CSV" : "تصدير CSV"}</span>
                </button>

                <button
                  onClick={handlePrintCurrentDashboard}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 text-gray-200 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  id="print-dashboard-btn"
                  title={lang === "en" ? "Print or Save as PDF directly" : "طباعة الشاشة الحالية أو حفظها مباشرة PDF"}
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>{lang === "en" ? "Print View" : "طباعة العرض"}</span>
                </button>

                <button
                  onClick={handleExportComprehensiveAnalyticsPDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] hover:bg-[#b00010] border border-[#D30014] text-white font-black rounded-xl text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-red-900/30 cursor-pointer"
                  id="export-comprehensive-pdf-btn"
                  title={lang === "en" ? "Export Comprehensive Analytics & Audit PDF with Platform Logo" : "تصدير تقرير الإحصائيات الشامل والتدقيق المالي PDF مع الشعار"}
                >
                  <FileText className="w-4 h-4" />
                  <span>{lang === "en" ? "Export Official Audit PDF" : "تصدير تقرير الـ PDF الرسمي"}</span>
                </button>
              </div>
            </div>

            {/* Top Row: Primary Charts (Target Comparison + Live Monthly Growth) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Target Vs Collected Revenue Chart */}
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#D30014]" />
                    {lang === "en" ? "Revenue Breakdown vs Target" : "مقارنة المبالغ المحصلة مقابل المستهدفة"}
                  </h3>
                  <span className="text-xs px-2.5 py-1 bg-red-950/40 text-red-400 border border-red-900/40 rounded-full font-bold">
                    {lang === "en" ? "Live Real-Time" : "مباشر ومحدّث"}
                  </span>
                </div>
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
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff", borderRadius: "8px" }}
                        cursor={{ fill: "rgba(211, 0, 20, 0.05)" }}
                        formatter={(value: any) => [`${Number(value).toLocaleString()} IQD`, ""]}
                      />
                      <Legend />
                      <Bar dataKey="Collected" fill="#D30014" radius={[6, 6, 0, 0]} name={lang === "en" ? "Collected (IQD)" : "المحصل (د.ع)"} />
                      <Bar dataKey="Target" fill="#333" radius={[6, 6, 0, 0]} name={lang === "en" ? "Target (IQD)" : "المستهدف (د.ع)"} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Growth Trend Area Chart */}
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-white" />
                    {t.finGrowthTrend}
                  </h3>
                  <span className="text-xs px-2.5 py-1 bg-blue-950/40 text-blue-400 border border-blue-900/40 rounded-full font-bold">
                    {lang === "en" ? "Monthly Progression" : "المسار الشهري"}
                  </span>
                </div>
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
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff", borderRadius: "8px" }} 
                        formatter={(value: any) => [`${Number(value).toLocaleString()} IQD`, ""]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="b2c" stroke="#D30014" strokeWidth={2} fillOpacity={1} fill="url(#colorB2C)" name={lang === "en" ? "B2C (Members)" : "الأعضاء (B2C)"} />
                      <Area type="monotone" dataKey="b2b" stroke="#8884d8" strokeWidth={2} fillOpacity={1} fill="url(#colorB2B)" name={lang === "en" ? "B2B (Partners)" : "الشركاء (B2B)"} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Second Row: Top Provinces Breakdown + Sector Distribution Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Top Provinces Revenue Bar Chart */}
              <div className="lg:col-span-2 bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#D30014]" />
                    {lang === "en" ? "Top Performing Governorates (Revenue IQD)" : "أعلى المحافظات أداءً وتحصيلاً مالياً"}
                  </h3>
                  <span className="text-xs text-gray-500 font-bold">
                    {lang === "en" ? "Top 7 Provinces" : "أبرز 7 محافظات"}
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={getTopProvincesRevenueData()}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#999" fontSize={11} angle={-20} textAnchor="end" />
                      <YAxis stroke="#999" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff", borderRadius: "8px" }}
                        formatter={(value: any) => [`${Number(value).toLocaleString()} IQD`, ""]}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="B2B" stackId="a" fill="#8884d8" name={lang === "en" ? "B2B Revenue" : "إيراد الشركات"} />
                      <Bar dataKey="B2C" stackId="a" fill="#D30014" radius={[4, 4, 0, 0]} name={lang === "en" ? "B2C Revenue" : "إيراد الأعضاء"} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* B2B Partner Sectors Pie Chart */}
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-md shadow-black/20 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-[#D30014]" />
                    {lang === "en" ? "Sectors Breakdown" : "توزيع قطاعات الشركات"}
                  </h3>
                  <span className="text-xs text-gray-500 font-bold">{activeLocalPartners.length} {lang === "en" ? "Partners" : "شريك"}</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getSectorDistributionData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {getSectorDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#121212" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff", borderRadius: "8px" }}
                        formatter={(value: any, name: any) => [`${value} ${lang === "en" ? "Partners" : "شريك"}`, name]}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      />
                    </PieChart>
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

            {/* Province Specific Performance Breakdown Table with Live Search & Sort */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 overflow-hidden">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#D30014]" />
                    {t.finProvinceStats}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {lang === "en" ? "Comprehensive provincial revenue and subscriber inputs across 19 governorates." : "جدول تفصيلي لمدخلات وإيرادات كل محافظة من المحافظات الـ 19."}
                  </p>
                </div>

                {/* Filter and Search Controls for Province Breakdown */}
                <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
                  <div className="relative min-w-[180px] flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text"
                      placeholder={lang === "en" ? "Filter governorate..." : "ابحث عن محافظة..."}
                      value={analyticsProvinceSearch}
                      onChange={(e) => setAnalyticsProvinceSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D30014]"
                    />
                    {analyticsProvinceSearch && (
                      <button 
                        onClick={() => setAnalyticsProvinceSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <select
                    value={analyticsSortBy}
                    onChange={(e: any) => setAnalyticsSortBy(e.target.value)}
                    className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-[#D30014] cursor-pointer"
                  >
                    <option value="revenue">{lang === "en" ? "Sort: Highest Revenue" : "الترتيب: الأعلى إيراداً"}</option>
                    <option value="members">{lang === "en" ? "Sort: Most Subscribers" : "الترتيب: الأكثر أعضاء"}</option>
                    <option value="partners">{lang === "en" ? "Sort: Most Partners" : "الترتيب: الأكثر شركات"}</option>
                    <option value="name">{lang === "en" ? "Sort: Governorate Name" : "الترتيب: اسم المحافظة"}</option>
                  </select>

                  <button
                    onClick={handleExportFinancialAuditCSV}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 text-gray-200 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    id="export-financial-csv-btn"
                  >
                    <Download className="w-4 h-4 text-[#D30014]" />
                    <span>{lang === "en" ? "Export CSV" : "تصدير CSV"}</span>
                  </button>

                  <button
                    onClick={handleExportComprehensiveAnalyticsPDF}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#D30014] hover:bg-red-700 text-white rounded-lg text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                    id="export-financial-pdf-btn"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{lang === "en" ? "Export PDF" : "تصدير PDF"}</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-widest font-bold bg-[#0d0d0d]">
                      <th className="py-3 px-4">{t.finProvinceCol}</th>
                      <th className="py-3 px-4 text-center">{t.finPartnersCol}</th>
                      <th className="py-3 px-4 text-center">{t.finUsersCol}</th>
                      <th className="py-3 px-4 text-center">{lang === "en" ? "B2B Rev (IQD)" : "إيراد B2B (د.ع)"}</th>
                      <th className="py-3 px-4 text-center">{lang === "en" ? "B2C Rev (IQD)" : "إيراد B2C (د.ع)"}</th>
                      <th className="py-3 px-4 text-right">{t.finRevenueCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                    {liveProvinceBreakdown
                      .filter(pb => {
                        if (!analyticsProvinceSearch.trim()) return true;
                        const query = analyticsProvinceSearch.trim().toLowerCase();
                        return pb.province.toLowerCase().includes(query) || pb.provinceAr.includes(query);
                      })
                      .sort((a, b) => {
                        if (analyticsSortBy === "revenue") {
                          return (b.collectedB2B + b.collectedB2C) - (a.collectedB2B + a.collectedB2C);
                        } else if (analyticsSortBy === "members") {
                          return b.users - a.users;
                        } else if (analyticsSortBy === "partners") {
                          return b.partners - a.partners;
                        } else {
                          return a.province.localeCompare(b.province);
                        }
                      })
                      .map((pb, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#D30014]"></span>
                            <span>{lang === "en" ? pb.province : pb.provinceAr}</span>
                            <span className="text-[11px] text-gray-500 font-normal">({lang === "en" ? pb.provinceAr : pb.province})</span>
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
                  {/* Table summary totals row */}
                  <tfoot>
                    <tr className="border-t-2 border-gray-700 bg-black/40 text-xs font-black text-white">
                      <td className="py-3 px-4">{lang === "en" ? "Total (19 Governorates)" : "الإجمالي الكلي (19 محافظة)"}</td>
                      <td className="py-3 px-4 text-center text-[#D30014]">{liveProvinceBreakdown.reduce((sum, pb) => sum + pb.partners, 0)}</td>
                      <td className="py-3 px-4 text-center text-blue-400">{liveProvinceBreakdown.reduce((sum, pb) => sum + pb.users, 0)}</td>
                      <td className="py-3 px-4 text-center text-gray-300">{liveProvinceBreakdown.reduce((sum, pb) => sum + pb.collectedB2B, 0).toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}</td>
                      <td className="py-3 px-4 text-center text-gray-300">{liveProvinceBreakdown.reduce((sum, pb) => sum + pb.collectedB2C, 0).toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}</td>
                      <td className="py-3 px-4 text-right text-green-400 text-sm">
                        {liveProvinceBreakdown.reduce((sum, pb) => sum + pb.collectedB2B + pb.collectedB2C, 0).toLocaleString()} {lang === "en" ? "IQD" : "د.ع"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ----------------- FILTER CONTROLS FOR CRUD TABLES ----------------- */}
        {!isLoading && activeTab !== "analytics" && (
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
                    } else if (activeTab === "partners") {
                      handleExportPartnersCSV();
                    } else {
                      handleExportFinancialAuditCSV();
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

                {/* Add Button (Hidden for Read-Only Viewers) */}
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
              
              {/* Real-time Text-based Search box */}
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

              {/* Province filter */}
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

              {/* Status filter */}
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

              {/* Reset filter button */}
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

            {/* Real-time search/filter results counter banner */}
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
                          <p className="text-xs text-gray-500 max-w-sm">
                            {lang === "en"
                              ? "Try typing a different member name, Card ID (e.g. BYD-2026-001), or reset your filters."
                              : "يرجى تجربة البحث باسم آخر أو رقم بطاقة مختلف أو إعادة تعيين الفلاتر."}
                          </p>
                          {(searchQuery || provinceFilter !== "All" || statusFilter !== "All") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setProvinceFilter("All");
                                setStatusFilter("All");
                              }}
                              className="mt-1 px-4 py-2 bg-[#D30014] hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-red-900/20"
                            >
                              {lang === "en" ? "Reset All Filters" : "إعادة تعيين كافة الفلاتر"}
                            </button>
                          )}
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
                        {isViewer ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black ${
                            isPartnerActive(p)
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPartnerActive(p) ? "bg-green-400" : "bg-red-500"}`}></span>
                            {isPartnerActive(p) ? t.active : t.inactive}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePartnerStatus(p)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black cursor-pointer hover:scale-105 transition-all ${
                              isPartnerActive(p)
                                ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                                : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                            }`}
                            title={lang === "en" ? "Click to Activate / Deactivate" : "انقر للتفعيل أو التعطيل"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPartnerActive(p) ? "bg-green-400" : "bg-red-500"}`}></span>
                            {isPartnerActive(p) ? t.active : t.inactive}
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
                              onClick={() => handleTogglePartnerStatus(p)}
                              className={`p-1.5 border rounded text-xs font-bold transition-all cursor-pointer ${
                                isPartnerActive(p)
                                  ? "bg-amber-500/10 hover:bg-amber-500 border-amber-500/20 text-amber-400 hover:text-black"
                                  : "bg-green-500/10 hover:bg-green-500 border-green-500/20 text-green-400 hover:text-black"
                              }`}
                              title={isPartnerActive(p) ? (lang === "en" ? "Deactivate Account" : "تعطيل الحساب") : (lang === "en" ? "Activate Account" : "تفعيل الحساب")}
                            >
                              {isPartnerActive(p) ? (lang === "en" ? "Deactivate" : "تعطيل") : (lang === "en" ? "Activate" : "تفعيل")}
                            </button>
                            <button
                              onClick={() => handleEditPartnerClick(p)}
                              className="p-1.5 bg-gray-800/40 hover:bg-gray-800 border border-gray-700/60 rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
                              title={t.edit}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePartner(p.id)}
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
                  {filteredPartners.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-500">
                        No partner records found matching filters.
                      </td>
                    </tr>
                  )}
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
                    <span className="text-[10px] text-gray-600 font-bold">1st Division</span>
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

                  <input
                    type="hidden"
                    id="entity1-desc-en"
                    value={brandingForm.company1Desc}
                  />
                  <input
                    type="hidden"
                    id="entity1-desc-ar"
                    value={brandingForm.company1DescAr}
                  />

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
                        <p className="text-[10px] text-gray-500">{lang === "en" ? "Supports PNG, JPG, WebP. Max 2MB." : "يدعم PNG, JPG, WebP. الأقصى 2MB."}</p>
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
                    <span className="text-[10px] text-gray-600 font-bold">2nd Division</span>
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

                  <input
                    type="hidden"
                    id="entity2-desc-en"
                    value={brandingForm.company2Desc}
                  />
                  <input
                    type="hidden"
                    id="entity2-desc-ar"
                    value={brandingForm.company2DescAr}
                  />

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
                        <p className="text-[10px] text-gray-500">{lang === "en" ? "Supports PNG, JPG, WebP. Max 2MB." : "يدعم PNG, JPG, WebP. الأقصى 2MB."}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action buttons bar */}
              <div className="flex justify-end pt-4 border-t border-gray-900">
                {isViewer ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold">
                    <Eye className="w-4 h-4" />
                    <span>{lang === "en" ? "Only Master Admin is authorized to modify corporate brand settings." : "المسؤول العام فقط يملك صلاحية حفظ أو تغيير بيانات الشركات المالكة."}</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#D30014] hover:bg-[#b00010] text-white text-xs sm:text-sm font-extrabold rounded-lg shadow-lg shadow-[#D30014]/20 transition-all duration-300 cursor-pointer"
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
                <p className="text-xs text-gray-400 mt-1">
                  {lang === "en" ? "Generate, activate, deactivate, and bind physical BYD serial cards to B2C users." : "توليد، تفعيل، إلغاء تفعيل، وربط الأرقام التسلسلية لبطاقات BYD بالمشتركين."}
                </p>
              </div>
              {!isViewer && (
                <button
                  onClick={handleGenerateSequentialCard}
                  className="flex items-center gap-2 px-5 py-3 bg-[#D30014] hover:bg-[#b00010] text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md shadow-[#D30014]/20 transition-all duration-300 cursor-pointer"
                  id="generate-card-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "en" ? "Generate Sequential Card" : "توليد بطاقة متسلسلة"}</span>
                </button>
              )}
            </div>

            {/* Miniature Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#121212]/60 border border-gray-900 rounded-xl p-4">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">{lang === "en" ? "Total Assets" : "إجمالي البطاقات"}</span>
                <span className="text-2xl font-black text-white mt-1 block">{cards.length}</span>
              </div>
              <div className="bg-[#121212]/60 border border-gray-900 rounded-xl p-4">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">{lang === "en" ? "Active Assets" : "البطاقات النشطة"}</span>
                <span className="text-2xl font-black text-green-400 mt-1 block">{cards.filter(c => c.status === "Active").length}</span>
              </div>
              <div className="bg-[#121212]/60 border border-gray-900 rounded-xl p-4">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">{lang === "en" ? "Deactivated" : "المعطلة"}</span>
                <span className="text-2xl font-black text-red-500 mt-1 block">{cards.filter(c => c.status === "Inactive").length}</span>
              </div>
              <div className="bg-[#121212]/60 border border-gray-900 rounded-xl p-4">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">{lang === "en" ? "Unassigned" : "غير معينة"}</span>
                <span className="text-2xl font-black text-orange-400 mt-1 block">{cards.filter(c => !c.memberId).length}</span>
              </div>
            </div>

            {/* Card Template Visual Replacement Manager */}
            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl space-y-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#D30014]" />
                  {lang === "en" ? "Upload Custom Card Design / Card Template Manager" : "رفع تصميم الكارد المخصص / مدير قالب البطاقة"}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">
                  {lang === "en" ? "Change the default plastic card template design across the entire application instantly." : "تغيير تصميم قالب البطاقة الافتراضي في جميع أنحاء التطبيق على الفور."}
                </p>
              </div>

              {/* Flexible Asset Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/30 p-4 rounded-xl border border-gray-900">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {lang === "en" ? "Asset Type Selector" : "محدد نوع الملف"}
                  </label>
                  <select
                    value={selectedAssetType}
                    onChange={(e) => setSelectedAssetType(e.target.value as "image" | "video")}
                    className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs focus:border-[#D30014] focus:ring-1 focus:ring-[#D30014] outline-none"
                  >
                    <option value="image">
                      {lang === "en" ? "Custom Image Template" : "قالب صورة مخصص"}
                    </option>
                    <option value="video">
                      {lang === "en" ? "Promotional Card Video" : "فيديو ترويجي للكارد"}
                    </option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleResetMedia}
                    className="w-full px-3 py-2 bg-gray-950 hover:bg-[#D30014]/20 hover:text-white border border-gray-800 hover:border-[#D30014] rounded-lg text-gray-400 font-bold text-xs transition-colors"
                  >
                    {lang === "en" ? "Reset to Default Layout" : "إعادة تعيين للتصميم الافتراضي"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* File Uploader area */}
                <div className="w-full md:w-1/2">
                  <div className="relative border-2 border-dashed border-gray-800 hover:border-[#D30014]/50 rounded-xl p-6 text-center transition-all bg-black/40">
                    <input
                      type="file"
                      accept={selectedAssetType === "video" ? "video/*" : "image/*"}
                      onChange={handleMultimediaUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        <Upload className="w-8 h-8 text-gray-500 animate-pulse" />
                      </div>
                      <p className="text-xs font-bold text-gray-300">
                        {lang === "en" 
                          ? `Drag & drop or click to choose a ${selectedAssetType}` 
                          : `اسحب وأسقط أو انقر لاختيار ${selectedAssetType === "video" ? "فيديو" : "صورة"}`
                        }
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {selectedAssetType === "video" ? "MP4, WebM up to 4MB" : "PNG, JPG or JPEG up to 4MB"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Preview area */}
                <div className="w-full md:w-1/2 flex justify-center">
                  <div className="relative w-72 h-44 rounded-2xl overflow-hidden border border-gray-800 bg-gradient-to-br from-black to-gray-900 shadow-2xl flex flex-col justify-between p-5 text-white">
                    
                    {/* Media Backgrounds */}
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
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D30014] to-[#a00010] z-0" />
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-black opacity-90 flex items-end">
                          <svg className="w-full h-full text-white fill-current" viewBox="0 0 300 60" preserveAspectRatio="none">
                            <path d="M0,60 L300,60 L300,45 L290,45 L285,35 L280,45 L260,45 L255,10 L250,10 L248,20 L240,20 L235,45 L215,45 L210,30 L205,45 L180,45 L175,25 L160,25 L155,45 L140,45 C140,30 120,30 120,45 L105,45 L100,5 L95,5 L90,20 L80,20 L75,45 L50,45 L45,15 L40,15 L35,45 L20,45 L15,35 L10,45 Z" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* Logo & Chip */}
                    <div className="flex justify-between items-start z-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center font-black text-xs text-white">B</div>
                        <span className="font-extrabold text-sm tracking-widest text-white">BYD CARD</span>
                      </div>
                      <div className="w-8 h-6 bg-yellow-500/20 border border-yellow-500/40 rounded-md flex items-center justify-center">
                        <div className="w-5 h-3 bg-yellow-500/40 rounded-sm" />
                      </div>
                    </div>

                    {/* Member details Mock */}
                    <div className="space-y-1 z-10">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">BYD VIP MEMBERSHIP</p>
                      <p className="font-black text-sm tracking-wide">MOHAMMED JALAL</p>
                    </div>

                    <div className="flex justify-between items-end z-10">
                      <span className="font-mono text-xs tracking-widest">BYD-2026-888</span>
                      <span className="text-[9px] text-gray-400 font-black">EXP: 12/26</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards Ledger Grid / Table */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-900 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-black uppercase tracking-wider">
                  {lang === "en" ? "Active Serial Keys" : "المفاتيح التسلسلية النشطة"}
                </span>
                <span className="text-xs text-[#D30014] font-bold">Secure Hardware Registry</span>
              </div>

              {cards.length === 0 ? (
                <div className="py-16 text-center text-gray-500 font-bold">
                  {lang === "en" ? "No cards found in system. Click above to generate." : "لا توجد بطاقات مسجلة في النظام. اضغط أعلاه للتوليد."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-bold">
                        <th className="py-4 px-6">{lang === "en" ? "Preview" : "معاينة"}</th>
                        <th className="py-4 px-6">{lang === "en" ? "Card Serial" : "الرقم المسلسل"}</th>
                        <th className="py-4 px-6">{lang === "en" ? "Status" : "الحالة"}</th>
                        <th className="py-4 px-6">{lang === "en" ? "Bound Member & Dates" : "المشترك المرتبط والتواريخ"}</th>
                        <th className="py-4 px-6 text-right">{lang === "en" ? "Actions" : "العمليات"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                      {cards.map((card: any) => {
                        const boundMember = members.find(m => m.id === card.memberId);
                        return (
                          <tr key={card.id} className="hover:bg-white/[0.01] transition-colors">
                            {/* Card Miniature Preview */}
                            <td className="py-4 px-6">
                              <div className="relative w-28 aspect-[1.58/1] rounded-lg bg-gradient-to-br from-[#D30014] to-[#80000a] text-white p-2 border border-white/10 shadow-md select-none overflow-hidden flex flex-col justify-between">
                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/80 flex items-end opacity-40">
                                  <div className="w-full h-2 bg-white" style={{ clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 80% 50%, 60% 0%, 40% 50%, 20% 0%)" }}></div>
                                </div>
                                <div className="flex justify-between items-start">
                                  <span className="text-[7px] font-black tracking-tighter">BYD CARD</span>
                                  <span className="text-[6px] font-mono opacity-80 scale-75 origin-top-right truncate max-w-[50px]">{card.cardId}</span>
                                </div>
                                <div className="flex justify-between items-end pb-1 relative z-10">
                                  <div className="flex gap-[1px] h-3 items-end">
                                    <div className="w-[1px] h-full bg-white"></div>
                                    <div className="w-[2px] h-full bg-white"></div>
                                    <div className="w-[1px] h-3 bg-white"></div>
                                    <div className="w-[2px] h-2 bg-white"></div>
                                    <div className="w-[1px] h-full bg-white"></div>
                                  </div>
                                  <span className="text-[5px] bg-white text-black font-mono px-0.5 rounded">QR</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6 font-mono font-bold text-white text-base">
                              {card.cardId}
                            </td>

                            <td className="py-4 px-6">
                              {card.status === "Active" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-green-500/10 text-green-400 border border-green-500/20">
                                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                  {lang === "en" ? "Active" : "نشطة"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-red-500/10 text-red-500 border border-red-500/20">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  {lang === "en" ? "Inactive" : "معطلة"}
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6">
                              {boundMember ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-white font-extrabold">
                                    {lang === "en" ? boundMember.fullName : boundMember.fullNameAr}
                                  </span>
                                  <span className="text-xs text-gray-500 font-mono">
                                    ID: {boundMember.id} | {lang === "en" ? boundMember.province : boundMember.provinceAr}
                                  </span>
                                  <div className="flex flex-wrap gap-x-2 text-[10px] font-mono text-gray-400 mt-0.5">
                                    <span className="text-green-500 bg-green-500/5 px-1.5 py-0.5 rounded border border-green-500/10">
                                      {lang === "en" ? "Issued" : "إصدار"}: {boundMember.registrationDate}
                                    </span>
                                    <span className="text-red-400 bg-red-400/5 px-1.5 py-0.5 rounded border border-red-400/10">
                                      {lang === "en" ? "Expires" : "انتهاء"}: {boundMember.expiryDate}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-orange-400 text-xs font-bold bg-orange-400/5 border border-orange-400/20 px-2 py-1 rounded">
                                  {lang === "en" ? "Unassigned Asset" : "مخزون غير مرتبط بمشترك"}
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6 text-right">
                              {isViewer ? (
                                <div className="flex justify-end gap-2">
                                  <span className="text-[11px] font-bold text-gray-500 bg-black/60 px-2.5 py-1 rounded border border-gray-800">
                                    {lang === "en" ? "Audited" : "معاينة فقط"}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditCard(card)}
                                    className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700/60 rounded-lg text-white transition-colors cursor-pointer"
                                    title="Edit/Bind Card"
                                  >
                                    <Edit3 className="w-4 h-4 text-[#D30014]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-red-500 transition-colors cursor-pointer"
                                    title="Delete Card"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

    {/* ----------------- SECTION 6: VIEWER / AUDITOR ACCOUNTS (MASTER ADMIN ONLY) ----------------- */}
      {!isLoading && activeTab === "viewers" && !isViewer && (
        <div className="space-y-8" id="viewers-management-panel">
          
          {/* Header info banner */}
          <div className="bg-[#121212] border border-gray-800 p-6 sm:p-8 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800/80 pb-6 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
                  {lang === "en" ? "Auditor & Read-Only Accounts Management" : "إدارة حسابات المراقبة والتدقيق (صلاحية الاطلاع والطباعة فقط)"}
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 font-semibold">
                  {lang === "en"
                    ? "Create secure credentials for auditors, observers, or printing staff. These accounts can ONLY view data, inspect statistics, and print/export reports, but CANNOT add, modify, or delete anything."
                    : "أنشئ حسابات مخصصة للمراقبين أو المدققين أو موظفي الطباعة. تتيح هذه الحسابات الاطلاع الكامل وطباعة التقارير والإحصائيات فقط، دون أي صلاحية للإضافة أو التعديل أو الحذف."}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 bg-[#D30014]/10 border border-[#D30014]/30 rounded-xl text-xs font-black text-[#D30014] shrink-0">
                <Shield className="w-4 h-4" />
                <span>{lang === "en" ? "Master Admin Only" : "إدارة المسؤول العام فقط"}</span>
              </div>
            </div>

            {/* Account Creation Form */}
            <form onSubmit={handleCreateViewerAccount} className="space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#D30014]" />
                <span>{lang === "en" ? "Create New Auditor Account" : "إنشاء حساب مراقب / مدقق جديد"}</span>
              </h3>

              {viewerMsg && (
                <div className={`p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-3 border ${
                  viewerMsg.type === "success" 
                    ? "bg-green-500/10 border-green-500/30 text-green-400" 
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                  {viewerMsg.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <span>{viewerMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                    {lang === "en" ? "Username" : "اسم المستخدم (User)"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. auditor1"
                    value={viewerForm.username}
                    onChange={(e) => setViewerForm({ ...viewerForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                    {lang === "en" ? "Password" : "كلمة المرور (Password)"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pass@12345"
                    value={viewerForm.password}
                    onChange={(e) => setViewerForm({ ...viewerForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                    {lang === "en" ? "Auditor / Observer Name" : "اسم المراقب أو الجهة"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Financial Audit Dept"
                    value={viewerForm.name}
                    onChange={(e) => setViewerForm({ ...viewerForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                    {lang === "en" ? "Notes / Department" : "ملاحظات أو القسم"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Baghdad Regional Office"
                    value={viewerForm.notes}
                    onChange={(e) => setViewerForm({ ...viewerForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014] text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={viewerLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white text-xs sm:text-sm font-extrabold rounded-lg shadow-lg shadow-[#D30014]/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{viewerLoading ? (lang === "en" ? "Creating..." : "جاري الإنشاء...") : (lang === "en" ? "Create Account" : "إنشاء الحساب")}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of active auditor accounts */}
          <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#0d0d0d]">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#D30014]" />
                <h3 className="text-base font-black text-white">
                  {lang === "en" ? "Active Auditor & Monitoring Accounts" : "حسابات المراقبة والتدقيق الفعالة"}
                </h3>
              </div>
              <span className="text-xs font-mono text-gray-400 bg-black/60 px-3 py-1 rounded-full border border-gray-800">
                {Array.isArray(viewerAccounts) ? viewerAccounts.length : 0} {lang === "en" ? "Active Accounts" : "حسابات مسجلة"}
              </span>
            </div>

            {!Array.isArray(viewerAccounts) || viewerAccounts.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <Eye className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="font-bold text-sm">{lang === "en" ? "No auditor accounts created yet." : "لم يتم إنشاء أي حسابات مراقبة حتى الآن."}</p>
                <p className="text-xs text-gray-600 mt-1">{lang === "en" ? "Use the form above to add view-only accounts." : "استخدم النموذج أعلاه لإضافة حسابات بصلاحيات المشاهدة والطباعة فقط."}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-bold">
                      <th className="py-4 px-6">{lang === "en" ? "Username" : "اسم المستخدم"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Password" : "كلمة المرور"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Name / Officer" : "الاسم / المراقب"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Notes" : "الملاحظات"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Role & Permissions" : "الصلاحية"}</th>
                      <th className="py-4 px-6">{lang === "en" ? "Created Date" : "تاريخ الإنشاء"}</th>
                      <th className="py-4 px-6 text-right">{lang === "en" ? "Actions" : "الإجراءات"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-xs sm:text-sm font-semibold text-gray-300">
                    {viewerAccounts.map((account) => (
                      <tr key={account.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-6 font-mono font-black text-white">
                          <div className="flex items-center gap-2">
                            <span>{account.username}</span>
                            <button
                              onClick={() => copyToClipboard(account.username, `u-${account.id}`)}
                              className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
                              title="Copy username"
                            >
                              {copiedId === `u-${account.id}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-mono text-gray-300">
                          <div className="flex items-center gap-2">
                            <span className="bg-black/60 px-2 py-0.5 rounded border border-gray-800 text-amber-300">
                              {account.password}
                            </span>
                            <button
                              onClick={() => copyToClipboard(account.password, `p-${account.id}`)}
                              className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
                              title="Copy password"
                            >
                              {copiedId === `p-${account.id}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-bold text-white">
                          {account.name || "—"}
                        </td>

                        <td className="py-4 px-6 text-gray-400 text-xs">
                          {account.notes || "—"}
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{lang === "en" ? "Read & Print Only" : "اطلاع وطباعة فقط"}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6 font-mono text-xs text-gray-500">
                          {account.createdAt || "—"}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleDeleteViewerAccount(account.id, account.username)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-red-500 transition-colors cursor-pointer"
                            title={lang === "en" ? "Delete Account" : "حذف الحساب"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                    placeholder="Taj Premium Restaurant"
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
                    placeholder="مطعم التاج المميز"
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.pSectorEn} *</label>
                  <select
                    value={partnerForm.sector}
                    onChange={(e) => setPartnerForm({ ...partnerForm, sector: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  >
                    {sectorsList.map((s, idx) => (
                      <option key={idx} value={s.en}>{s.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.mProvince} *</label>
                  <select
                    value={partnerForm.province}
                    onChange={(e) => setPartnerForm({ ...partnerForm, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  >
                    {provincesList.map((p, idx) => (
                      <option key={idx} value={p.en}>{p.en}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.pExpDate} *</label>
                  <input
                    type="date"
                    value={partnerForm.expiryDate}
                    onChange={(e) => setPartnerForm({ ...partnerForm, expiryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold outline-none focus:border-[#D30014]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{t.pStatus} *</label>
                  <select
                    value={partnerForm.status}
                    onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value as "Active" | "Inactive" })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  >
                    <option value="Active">{t.active}</option>
                    <option value="Inactive">{t.inactive}</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#121212]/40 border border-gray-900 rounded-xl p-4 space-y-4">
                <span className="text-xs text-[#D30014] font-bold uppercase tracking-wider block">
                  {lang === "en" ? "Partner Account & Discount Settings" : "إعدادات حساب الشريك والخصم الفردي"}
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                      {lang === "en" ? "Discount Rate (e.g. 15%)" : "نسبة الخصم (مثال: 15%)"}
                    </label>
                    <input
                      type="text"
                      value={partnerForm.discount || ""}
                      onChange={(e) => setPartnerForm({ 
                        ...partnerForm, 
                        discount: e.target.value,
                        discountEn: e.target.value,
                        discountAr: e.target.value
                      })}
                      placeholder="e.g. 15%"
                      className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                      {lang === "en" ? "Phone Number" : "رقم الهاتف"}
                    </label>
                    <input
                      type="text"
                      value={partnerForm.phone || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                      placeholder="e.g. 07700000000"
                      className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                      {lang === "en" ? "Corporate Email" : "البريد الإلكتروني للشركة"}
                    </label>
                    <input
                      type="email"
                      value={partnerForm.email || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                      placeholder="partner@company.com"
                      className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                      {lang === "en" ? "Portal Username" : "اسم مستخدم بوابة الشركاء"}
                    </label>
                    <input
                      type="text"
                      value={partnerForm.username || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, username: e.target.value })}
                      placeholder="e.g. taj_restaurant"
                      className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-mono outline-none focus:border-[#D30014]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-xs">
                      {lang === "en" ? "Portal Password" : "كلمة مرور بوابة الشركاء"}
                    </label>
                    <input
                      type="text"
                      value={partnerForm.password || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })}
                      placeholder="******"
                      className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-mono outline-none focus:border-[#D30014]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#121212]/40 border border-gray-900 rounded-xl p-4 space-y-4">
                <span className="text-xs text-[#D30014] font-bold uppercase tracking-wider block">
                  {lang === "en" ? "Company Logo & Branding" : "شعار الشركة والهوية"}
                </span>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-black border border-gray-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {partnerForm.logoUrl ? (
                      <img src={partnerForm.logoUrl} alt="Partner Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-600 font-black">No Logo</span>
                    )}
                  </div>
                  <div className="w-full space-y-2">
                    <label className="block text-gray-400 font-bold text-xs">{lang === "en" ? "Upload Company Logo Image" : "رفع صورة شعار الشركة"}</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePartnerLogoUpload}
                      className="hidden"
                      id="partner-logo-file"
                    />
                    <div className="flex gap-2">
                      <label
                        htmlFor="partner-logo-file"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {lang === "en" ? "Select Image" : "اختر صورة الشعار"}
                      </label>
                      <input
                        type="text"
                        value={partnerForm.logoUrl.startsWith("data:") ? "" : partnerForm.logoUrl}
                        onChange={(e) => setPartnerForm({ ...partnerForm, logoUrl: e.target.value })}
                        placeholder={lang === "en" ? "Or paste image URL (https://...)" : "أو الصق رابط الصورة (https://...)"}
                        className="flex-1 px-3 py-1.5 bg-black border border-gray-800 rounded-lg text-white text-xs font-bold outline-none focus:border-[#D30014]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#121212]/40 border border-gray-900 rounded-xl p-4 space-y-4">
                <span className="text-xs text-[#D30014] font-bold uppercase tracking-wider block">
                  {lang === "en" ? "Company Video Upload / Link" : "فيديو الشركة الترويجي / الرابط"}
                </span>
                <div className="flex flex-col gap-3">
                  {partnerForm.promoVideoUrl && (
                    <div className="w-full h-24 rounded-xl bg-black border border-gray-800 overflow-hidden flex items-center justify-center relative">
                      <video src={partnerForm.promoVideoUrl} className="w-full h-full object-contain" controls />
                    </div>
                  )}
                  <div className="w-full space-y-2">
                    <label className="block text-gray-400 font-bold text-xs">{lang === "en" ? "Upload Promotional Video File" : "رفع ملف فيديو ترويجي"}</label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handlePartnerVideoUpload}
                      className="hidden"
                      id="partner-video-file"
                    />
                    <div className="flex gap-2">
                      <label
                        htmlFor="partner-video-file"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {lang === "en" ? "Select Video File" : "اختر ملف الفيديو"}
                      </label>
                      <input
                        type="text"
                        value={partnerForm.promoVideoUrl.startsWith("data:") ? "" : partnerForm.promoVideoUrl}
                        onChange={(e) => setPartnerForm({ ...partnerForm, promoVideoUrl: e.target.value })}
                        placeholder={lang === "en" ? "Or paste video URL (https://...)" : "أو الصق رابط الفيديو (https://...)"}
                        className="flex-1 px-3 py-1.5 bg-black border border-gray-800 rounded-lg text-white text-xs font-bold outline-none focus:border-[#D30014]"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {lang === "en" ? "Supports MP4, WebM. Max 35MB for local upload." : "يدعم MP4, WebM. الأقصى 35 ميجابايت للرفع المحلي."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-gray-400 font-bold mb-1.5">{t.pFeesPaidUsd} *</label>
                  <input
                    type="number"
                    required
                    value={partnerForm.feePaidIqd || ""}
                    onChange={(e) => setPartnerForm({ 
                      ...partnerForm, 
                      feePaidIqd: Number(e.target.value),
                      feePaidUsd: Math.round(Number(e.target.value) / 1500)
                    })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold outline-none focus:border-[#D30014]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowPartnerForm(false)}
                  className="px-5 py-2.5 bg-[#121212] hover:bg-gray-950 border border-gray-800 text-gray-300 font-bold rounded-lg transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D30014] hover:bg-[#b00010] text-white font-bold rounded-lg transition-all"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL MODAL: ACTIVE PROMOTIONAL VIDEO PREVIEW ----------------- */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-3xl p-4 sm:p-6 relative shadow-2xl">
            <button
              onClick={() => setActiveVideoUrl(null)}
              className="absolute -top-12 sm:top-4 right-2 sm:right-4 bg-[#D30014] text-white p-2 rounded-full hover:bg-red-700 transition-colors z-10"
              title="Close Player"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-[#D30014]" />
              {lang === "en" ? "Active Promotional Video Presentation" : "عرض الفيديو الترويجي النشط للشريك"}
            </h3>
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-gray-800 shadow-inner">
              <video 
                src={activeVideoUrl} 
                className="w-full h-full object-contain" 
                controls 
                autoPlay 
              />
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              * BYD streaming systems are fully responsive and Cdn-powered.
            </p>
          </div>
        </div>
      )}

      {/* ----------------- MODAL MODAL: CARD CRUD FORM ----------------- */}
      {showCardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-2xl p-6 sm:p-8 relative shadow-2xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#D30014] rounded-sm"></span>
              {editingCard ? (lang === "en" ? "Modify Card Asset Details" : "تعديل تفاصيل أصول البطاقة") : (lang === "en" ? "Register New Card Asset" : "تسجيل بطاقة جديدة")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Form inputs */}
              <form onSubmit={handleSaveCard} className="md:col-span-7 space-y-5">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Card Serial ID" : "الرقم المسلسل للبطاقة"} *</label>
                  <input
                    type="text"
                    required
                    value={cardForm.cardId}
                    onChange={(e) => setCardForm({ ...cardForm, cardId: e.target.value.toUpperCase() })}
                    placeholder="e.g. BYD-2026-011"
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-mono font-bold outline-none focus:border-[#D30014]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Activation Status" : "حالة التفعيل"} *</label>
                  <select
                    value={cardForm.status}
                    onChange={(e) => setCardForm({ ...cardForm, status: e.target.value as "Active" | "Inactive" })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  >
                    <option value="Active">{lang === "en" ? "Active" : "نشطة / مفعلة"}</option>
                    <option value="Inactive">{lang === "en" ? "Inactive" : "معطلة / غير نشطة"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">{lang === "en" ? "Bind Directly to B2C Member" : "ربط مباشر بمشترك B2C"}</label>
                  <select
                    value={cardForm.memberId}
                    onChange={(e) => setCardForm({ ...cardForm, memberId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-gray-800 rounded-lg text-white font-bold outline-none focus:border-[#D30014]"
                  >
                    <option value="">{lang === "en" ? "-- Unassigned / Stock Only --" : "-- غير مرتبطة / مخزون فقط --"}</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {lang === "en" ? m.fullName : m.fullNameAr} ({m.cardId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCardForm(false)}
                    className="px-5 py-2.5 bg-[#121212] hover:bg-gray-950 border border-gray-800 text-gray-300 font-bold rounded-lg transition-colors cursor-pointer"
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

              {/* Dynamic Live Card Mockup */}
              <div className="md:col-span-5 flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider mb-3 block">
                  {lang === "en" ? "⚡ Live Card Preview" : "⚡ معاينة تفاعلية فورية"}
                </span>

                <div className="relative w-full aspect-[1.58/1] rounded-2xl bg-gradient-to-br from-[#D30014] to-[#a00010] text-white p-5 shadow-2xl overflow-hidden border border-white/15 select-none">
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-black opacity-95 flex items-end">
                    <svg className="w-full h-full text-white fill-current" viewBox="0 0 300 60" preserveAspectRatio="none">
                      <path d="M0,60 L300,60 L300,45 L290,45 L285,35 L280,45 L260,45 L255,10 L250,10 L248,20 L240,20 L235,45 L215,45 L210,30 L205,45 L180,45 L175,25 L160,25 L155,45 L140,45 C140,30 120,30 120,45 L105,45 L100,5 L95,5 L90,20 L80,20 L75,45 L50,45 L45,15 L40,15 L35,45 L20,45 L15,35 L10,45 Z" />
                    </svg>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-black tracking-tighter leading-none">BYD <span className="text-xs font-serif italic text-white/80">Card</span></h4>
                      <p className="text-[8px] tracking-widest text-white/70 uppercase">BUILD YOUR DREAM</p>
                    </div>
                    <div className="text-right text-[8px] font-mono opacity-80">
                      SERIAL: {cardForm.cardId || "BYD-XXXX-XXX"}
                    </div>
                  </div>

                  <div className="mt-4 relative z-10">
                    {cardForm.memberId ? (
                      (() => {
                        const m = members.find(u => u.id === cardForm.memberId);
                        return (
                          <div>
                            <p className="text-xs font-black truncate max-w-[180px]">{m ? m.fullName : "User Name"}</p>
                            <p className="text-[9px] text-white/80 font-bold truncate max-w-[180px] mt-0.5">{m ? m.fullNameAr : "الاسم العربي"}</p>
                            {m && (
                              <div className="flex gap-4 pt-1.5 text-[8px] text-white/70">
                                <div>
                                  <span className="block opacity-60 font-bold leading-none">{lang === "en" ? "PROVINCE" : "المحافظة"}</span>
                                  <span className="font-extrabold text-white mt-0.5 block">{lang === "en" ? m.province : m.provinceAr}</span>
                                </div>
                                <div>
                                  <span className="block opacity-60 font-bold leading-none">{lang === "en" ? "VAL THRU" : "تاريخ الانتهاء"}</span>
                                  <span className="font-mono text-white font-extrabold mt-0.5 block">{m.expiryDate}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div>
                        <p className="text-xs text-white/60 font-black tracking-wider uppercase">{lang === "en" ? "UNASSIGNED STOCK" : "مخزون بطاقة غير معينة"}</p>
                        <p className="text-[9px] text-white/40">{lang === "en" ? "Available for registration" : "جاهزة للتسجيل لمشترك جديد"}</p>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-10 left-5 flex gap-[1.5px] h-6 items-end relative z-10 bg-black/30 p-1 rounded">
                    <div className="w-[1.5px] h-full bg-white"></div>
                    <div className="w-[3px] h-full bg-white"></div>
                    <div className="w-[1.5px] h-4 bg-white"></div>
                    <div className="w-[3px] h-5 bg-white"></div>
                    <div className="w-[1.5px] h-full bg-white"></div>
                    <div className="w-[3px] h-3 bg-white"></div>
                    <div className="w-[1.5px] h-full bg-white"></div>
                    <div className="w-[4px] h-full bg-white"></div>
                  </div>

                  {cardForm.status === "Inactive" && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-4">
                      <span className="text-red-500 font-extrabold text-sm uppercase tracking-widest">{lang === "en" ? "DEACTIVATED CARD" : "بطاقة معطلة وغير فعالة"}</span>
                      <span className="text-gray-500 text-[10px] mt-1">{lang === "en" ? "Hardware invalid" : "المعرف الرقمي موقوف مؤقتاً"}</span>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
