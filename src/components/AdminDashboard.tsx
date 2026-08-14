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

  // Viewer Accounts State (for Master Admin) - FIXED: Loaded safely from localStorage
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
      entity1NameEn: (document.getElementById('entity1-name-en') as HTMLInputElement).value,
      entity1NameAr: (document.getElementById('entity1-name-ar') as HTMLInputElement).value,
      entity1DescEn: (document.getElementById('entity1-desc-en') as HTMLInputElement).value,
      entity1DescAr: (document.getElementById('entity1-desc-ar') as HTMLInputElement).value,
      entity1Logo: globalEntity1Base64Str,
      entity2NameEn: (document.getElementById('entity2-name-en') as HTMLInputElement).value,
      entity2NameAr: (document.getElementById('entity2-name-ar') as HTMLInputElement).value,
      entity2DescEn: (document.getElementById('entity2-desc-en') as HTMLInputElement).value,
      entity2DescAr: (document.getElementById('entity2-desc-ar') as HTMLInputElement).value,
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

  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
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

      if (membersRes?.ok) setMembers(await membersRes.json());
      if (partnersRes?.ok) setPartners(await partnersRes.json());
      if (finRes?.ok) {
        const fData = await finRes.json();
        if (fData) setFinancials(fData);
      }
      if (cardsRes?.ok) setCards(await cardsRes.json());
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

  // FIXED: Viewer account creation handling local fallback smoothly
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

    try {
      const res = await fetch("/api/admin/viewers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify(newViewer)
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (Array.isArray(data.viewers)) {
          setViewerAccounts(data.viewers);
          safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(data.viewers));
        } else {
          const updated = [newViewer, ...viewerAccounts];
          setViewerAccounts(updated);
          safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(updated));
        }
        setViewerForm({ username: "", password: "", name: "", notes: "" });
        setViewerMsg({
          type: "success",
          text: lang === "en" ? "Monitoring account created successfully!" : "تم إنشاء حساب المراقبة بنجاح وبشكل فوري!"
        });
      } else {
        const updated = [newViewer, ...viewerAccounts];
        setViewerAccounts(updated);
        safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(updated));
        setViewerForm({ username: "", password: "", name: "", notes: "" });
        setViewerMsg({ type: "success", text: "تم إنشاء حساب المراقبة محلياً بنجاح!" });
      }
    } catch (err) {
      const updated = [newViewer, ...viewerAccounts];
      setViewerAccounts(updated);
      safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(updated));
      setViewerForm({ username: "", password: "", name: "", notes: "" });
      setViewerMsg({ type: "success", text: "تم إنشاء حساب المراقبة محلياً بنجاح!" });
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDeleteViewerAccount = async (id: string, username: string) => {
    if (!window.confirm(lang === "en" ? `Are you sure you want to delete auditor account '${username}'?` : `هل أنت متأكد من حذف حساب المراقبة '${username}'؟`)) {
      return;
    }

    const previousAccounts = [...viewerAccounts];
    const updated = viewerAccounts.filter((v) => v.id !== id && v.username !== username);
    setViewerAccounts(updated);
    safeSetLocalStorage("byd-viewer-accounts", JSON.stringify(updated));

    const token = adminToken || localStorage.getItem("byd-admin-token") || "";

    try {
      await fetch(`/api/admin/viewers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
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

  // FIXED: Member save handles local storage seamlessly with robust fallback
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
      await res.json().catch(() => ({}));
    } catch (err) {
      console.warn("API request failed, executing local fallback save:", err);
    }

    try {
      const registered = { ...body, feePaidIqd: body.feePaidIqd !== undefined ? body.feePaidIqd : 25000 };

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

      const usersArray = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");
      const idxU = usersArray.findIndex(isMatchMember);
      if (idxU > -1) {
        usersArray[idxU] = registered;
      } else {
        usersArray.push(registered);
      }
      safeSetLocalStorage("BYD_USERS", JSON.stringify(usersArray));

      window.dispatchEvent(new Event("storage-sync-updated"));
      alert(t.successSave || "تم الحفظ بنجاح!");
    } catch (e) {
      console.error("Local storage B2C admin backup error:", e);
    }

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

    const cleanCompanyName = partnerForm.companyName.trim();
    const fallbackUsername = partnerForm.username?.trim() || (cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Math.floor(Math.random() * 1000));
    const fallbackPassword = partnerForm.password?.trim() || "123456";
    const fallbackEmail = partnerForm.email?.trim() || (fallbackUsername + "@byd-network.com");
    const fallbackPhone = partnerForm.phone?.trim() || "07700000000";
    const fallbackDiscount = partnerForm.discount?.trim() || "10%";

    const body = {
      id: editingPartner?.id || "p-" + Date.now(),
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
      await res.json().catch(() => ({}));
    } catch (err) {
      console.warn("API request failed, executing local fallback save:", err);
    }

    try {
      const registered = { ...body, feePaidIqd: body.feePaidIqd !== undefined ? body.feePaidIqd : 150000 };

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

      const companiesArray = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");
      const idxC = companiesArray.findIndex(isMatchPartner);
      if (idxC > -1) {
        companiesArray[idxC] = registered;
      } else {
        companiesArray.push(registered);
      }
      safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(companiesArray));

      window.dispatchEvent(new Event("storage-sync-updated"));
      alert(t.successSave || "تم الحفظ بنجاح!");
    } catch (e) {
      console.error("Local storage B2B admin backup error:", e);
    }

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
      expiryDate: partner.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
      await res.json().catch(() => ({}));
    } catch (err) {
      console.warn("API request failed, executing local fallback save for card:", err);
    }

    try {
      const cardsList = JSON.parse(localStorage.getItem("byd-cards") || "[]");
      const idx = cardsList.findIndex((c: any) => c && c.cardId === cardForm.cardId);
      const newCard = { id: editingCard?.id || "c-" + Date.now(), ...cardForm };
      if (idx > -1) cardsList[idx] = newCard; else cardsList.unshift(newCard);
      safeSetLocalStorage("byd-cards", JSON.stringify(cardsList));
      setCards(cardsList);

      window.dispatchEvent(new Event("storage-sync-updated"));
      alert(lang === "en" ? "Card saved successfully!" : "تم حفظ البطاقة بنجاح!");
      setShowCardForm(false);
      setEditingCard(null);
      resetCardForm();
      loadAllData();
    } catch (err) {
      console.error(err);
      alert(lang === "en" ? "Network error saving card" : "خطأ في حفظ البطاقة محلياً");
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm(lang === "en" ? "Are you sure you want to delete this Card?" : "هل أنت متأكد من حذف هذه البطاقة؟")) {
      return;
    }

    try {
      const cardsList = JSON.parse(localStorage.getItem("byd-cards") || "[]").filter((c: any) => c.id !== id);
      safeSetLocalStorage("byd-cards", JSON.stringify(cardsList));
      setCards(cardsList);
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
      await fetch("/api/admin/clear-all-data", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      });
    } catch (err) {
      console.warn("API clear failed, continuing local clear:", err);
    }

    localStorage.setItem("byd-custom-members", JSON.stringify([]));
    localStorage.setItem("BYD_USERS", JSON.stringify([]));
    localStorage.setItem("byd-custom-partners", JSON.stringify([]));
    localStorage.setItem("BYD_COMPANIES", JSON.stringify([]));
    localStorage.setItem("byd-cards", JSON.stringify([]));

    setLocalMembersList([]);
    setLocalPartnersList([]);
    setCards([]);

    window.dispatchEvent(new Event("storage-sync-updated"));
    window.dispatchEvent(new Event("storage"));

    alert((t as any).successClearAll || "All records have been cleared successfully!");
    loadAllData();
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
                >
                  <FileText className="w-4 h-4" />
                  <span>{lang === "en" ? "Export Comprehensive Statistics PDF" : "تصدير تقرير الإحصائيات الشامل PDF"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#D30014]" />
                  {lang === "en" ? "Revenue Breakdown vs Target" : "مقارنة المبالغ المحصلة مقابل المستهدفة"}
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={getRevenueComparisonData()} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff" }} />
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
                    <AreaChart data={getLiveMonthlyTrend()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="month" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff" }} />
                      <Legend />
                      <Area type="monotone" dataKey="b2c" stroke="#D30014" fillOpacity={1} fill="#D30014" name="B2C (Members)" />
                      <Area type="monotone" dataKey="b2b" stroke="#8884d8" fillOpacity={1} fill="#8884d8" name="B2B (Partners)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- FILTER CONTROLS FOR CRUD TABLES ----------------- */}
        {!isLoading && activeTab !== "analytics" && activeTab !== "branding" && activeTab !== "cards" && activeTab !== "viewers" && (
          <div className="bg-[#121212] border border-gray-800 p-6 rounded-xl mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
              <h3 className="text-lg font-black">
                {activeTab === "members" ? "B2C Members Registry" : "B2B Partners Registry"}
              </h3>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
                <button
                  onClick={() => activeTab === "members" ? handleExportMembersCSV() : handleExportPartnersCSV()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] hover:bg-red-700 text-white font-bold rounded-lg text-xs sm:text-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير CSV</span>
                </button>

                <button onClick={handleExportToExcel} className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg text-xs sm:text-sm cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير إكسل</span>
                </button>

                <button onClick={handleExportToPDF} className="flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs sm:text-sm cursor-pointer">
                  <CreditCard className="w-4 h-4" />
                  <span>تصدير PDF</span>
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
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#D30014] text-white font-bold rounded-lg text-xs sm:text-sm hover:bg-[#b00010] cursor-pointer"
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
                  type="text"
                  placeholder="ابحث بالاسم أو رقم البطاقة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-black border border-gray-800 rounded-lg text-xs font-bold text-white outline-none"
                />
              </div>

              <div className="relative">
                <select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-gray-800 rounded-lg text-xs font-bold text-white outline-none cursor-pointer"
                >
                  <option value="All">🌍 جميع المحافظات</option>
                  {provincesList.map((p, idx) => (
                    <option key={idx} value={p.en}>{lang === "en" ? p.en : p.ar}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-gray-800 rounded-lg text-xs font-bold text-white outline-none cursor-pointer"
                >
                  <option value="All">⚡ جميع الحالات</option>
                  <option value="Active">فعال</option>
                  <option value="Inactive">غير فعال</option>
                </select>
              </div>

              <button
                onClick={() => { setSearchQuery(""); setProvinceFilter("All"); setStatusFilter("All"); }}
                className="w-full py-2.5 bg-black hover:bg-gray-900 border border-gray-800 text-xs font-bold text-gray-400 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تعيين الفلاتر</span>
              </button>
            </div>
          </div>
        )}

        {/* ----------------- SECTION 2: MEMBERS TAB (B2C) ----------------- */}
        {!isLoading && activeTab === "members" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold bg-black/40">
                    <th className="py-4 px-6">الاسم الكامل</th>
                    <th className="py-4 px-6">رقم البطاقة</th>
                    <th className="py-4 px-6">المحافظة</th>
                    <th className="py-4 px-6 text-center">الحالة</th>
                    <th className="py-4 px-6 text-right">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-white">{m.fullName}</div>
                        <div className="text-xs text-gray-500 font-mono">{m.fullNameAr}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[#D30014] font-black">{m.cardId}</td>
                      <td className="py-4 px-6">{m.provinceAr || m.province}</td>
                      <td className="py-4 px-6 text-center">
                        <button onClick={() => !isViewer && handleToggleMemberStatus(m)} className={`px-2.5 py-1 rounded text-xs font-black cursor-pointer ${isMemberActive(m) ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"}`}>
                          {isMemberActive(m) ? "فعال" : "غير فعال"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isViewer && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditMemberClick(m)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded cursor-pointer" title="تعديل">
                              <Edit3 className="w-4 h-4 text-[#D30014]" />
                            </button>
                            <button onClick={() => handleDeleteMember(m.id)} className="p-1.5 bg-red-500/10 hover:bg-[#D30014] text-red-400 rounded cursor-pointer" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-500 font-bold">لا توجد سجلات أعضاء</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- SECTION 3: PARTNERS TAB (B2B) ----------------- */}
        {!isLoading && activeTab === "partners" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase font-bold bg-black/40">
                    <th className="py-4 px-6">اسم الشركة</th>
                    <th className="py-4 px-6">القطاع</th>
                    <th className="py-4 px-6">المحافظة</th>
                    <th className="py-4 px-6 text-center">الحالة</th>
                    <th className="py-4 px-6 text-right">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-sm font-semibold text-gray-300">
                  {filteredPartners.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6 font-bold text-white">{p.companyName}</td>
                      <td className="py-4 px-6 text-xs text-gray-400">{p.sectorAr || p.sector}</td>
                      <td className="py-4 px-6">{p.provinceAr || p.province}</td>
                      <td className="py-4 px-6 text-center">
                        <button onClick={() => !isViewer && handleTogglePartnerStatus(p)} className={`px-2.5 py-1 rounded text-xs font-black cursor-pointer ${isPartnerActive(p) ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"}`}>
                          {isPartnerActive(p) ? "فعال" : "غير فعال"}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isViewer && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditPartnerClick(p)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded cursor-pointer" title="تعديل">
                              <Edit3 className="w-4 h-4 text-[#D30014]" />
                            </button>
                            <button onClick={() => handleDeletePartner(p.id)} className="p-1.5 bg-red-500/10 hover:bg-[#D30014] text-red-400 rounded cursor-pointer" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPartners.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-500 font-bold">لا توجد شركات مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- SECTION 4: BRANDING TAB ----------------- */}
        {!isLoading && activeTab === "branding" && (
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

        {/* ----------------- SECTION 5: CARDS TAB ----------------- */}
        {!isLoading && activeTab === "cards" && (
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
                    <tr><td colSpan={3} className="py-12 text-center text-gray-500 font-bold">لا توجد بطاقات مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- SECTION 6: VIEWERS TAB ----------------- */}
        {!isLoading && activeTab === "viewers" && !isViewer && (
          <div className="space-y-8">
            <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-black text-white mb-4">إدارة حسابات المراقبة والتدقيق</h2>
              {viewerMsg && (
                <div className={`p-3 rounded-lg mb-4 text-xs font-bold ${viewerMsg.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {viewerMsg.text}
                </div>
              )}
              <form onSubmit={handleCreateViewerAccount} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input type="text" required placeholder="اسم المستخدم" value={viewerForm.username} onChange={(e) => setViewerForm({ ...viewerForm, username: e.target.value })} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                <input type="text" required placeholder="كلمة المرور" value={viewerForm.password} onChange={(e) => setViewerForm({ ...viewerForm, password: e.target.value })} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                <input type="text" placeholder="اسم المراقب" value={viewerForm.name} onChange={(e) => setViewerForm({ ...viewerForm, name: e.target.value })} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white font-bold text-xs" />
                <button type="submit" disabled={viewerLoading} className="px-6 py-2 bg-[#D30014] text-white text-xs font-bold rounded-lg cursor-pointer">
                  {viewerLoading ? "جاري الإنشاء..." : "إنشاء الحساب"}
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
                    <tr><td colSpan={4} className="py-12 text-center text-gray-500 font-bold">لا توجد حسابات مراقبة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
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
