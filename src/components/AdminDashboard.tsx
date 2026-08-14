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
  lang?: Language;
  setLang: (lang: Language) => void;
  adminToken?: string;
  onLogout: () => void;
  onGoBack: () => void;
  branding?: Branding | null;
  setBranding?: React.Dispatch<React.SetStateAction<Branding | null>>;
  userRole?: "admin" | "viewer";
  userName?: string;
}

export default function AdminDashboard({ 
  lang = "ar", 
  setLang, 
  adminToken = "", 
  onLogout, 
  onGoBack,
  branding,
  setBranding,
  userRole = "admin",
  userName = ""
}: AdminDashboardProps) {
  const currentLang = lang || "ar";
  const t = (translations && translations[currentLang]) ? translations[currentLang] : (translations?.ar || {});
  const isViewer = userRole === "viewer";

  const [activeTab, setActiveTab] = useState<"analytics" | "members" | "partners" | "branding" | "cards" | "viewers">("analytics");
  const [members, setMembers] = useState<Member[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [viewerAccounts, setViewerAccounts] = useState<ViewerAccount[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("byd-viewer-accounts") || "[]");
    } catch {
      return [];
    }
  });
  const [viewerForm, setViewerForm] = useState({ username: "", password: "", name: "", notes: "" });
  const [viewerMsg, setViewerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [memberForm, setMemberForm] = useState({ fullName: "", fullNameAr: "", cardId: "", province: "Baghdad", status: "Active", feePaidIqd: 25000, durationMonths: 6 });

  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [partnerForm, setPartnerForm] = useState({ companyName: "", companyNameAr: "", sector: "Restaurant", province: "Baghdad", status: "Active", feePaidIqd: 150000 });

  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({ cardId: "", status: "Active", memberId: "" });

  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadData = () => {
    try {
      const customM = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
      const customP = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
      const savedCards = JSON.parse(localStorage.getItem("byd-cards") || "[]");
      setMembers(Array.isArray(customM) ? customM : []);
      setPartners(Array.isArray(customP) ? customP : []);
      setCards(Array.isArray(savedCards) ? savedCards : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const localB2BCollected = partners.reduce((sum, p: any) => sum + (Number(p?.feePaidIqd) || 150000), 0);
  const localB2CCollected = members.reduce((sum, m: any) => sum + (Number(m?.feePaidIqd) || 25000), 0);

  const handleClearAllData = () => {
    if (!confirm("هل أنت متأكد من مسح كافة البيانات؟")) return;
    localStorage.setItem("byd-custom-members", JSON.stringify([]));
    localStorage.setItem("byd-custom-partners", JSON.stringify([]));
    localStorage.setItem("byd-cards", JSON.stringify([]));
    loadData();
    alert("تم مسح البيانات بنجاح!");
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-6 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-900 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#D30014] rounded-sm"></span>
              {t.adminHeader || "لوحة التحكم الإدارية BYD"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase tracking-wider mt-1">
              Secure BYD Card Administrative Control Panel (Safe Mode)
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onGoBack} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs font-bold text-gray-300 cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[#D30014]" />
              <span>الموقع العام</span>
            </button>
            <button onClick={() => setLang(currentLang === "en" ? "ar" : "en")} className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg text-xs font-bold text-gray-300 cursor-pointer">
              <Languages className="w-4 h-4 text-[#D30014]" />
              <span>{t.langToggle || "English"}</span>
            </button>
            {!isViewer && (
              <button onClick={handleClearAllData} className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white rounded-lg text-xs font-bold cursor-pointer">
                <Trash2 className="w-4 h-4" />
                <span>مسح البيانات</span>
              </button>
            )}
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-[#D30014] hover:text-white border border-red-500/20 text-red-500 rounded-lg text-xs font-bold cursor-pointer">
              <LogOut className="w-4 h-4" />
              <span>{t.adminLogout || "خروج"}</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">الأعضاء (B2C)</span>
            <p className="text-3xl font-black text-white mt-2">{members.length}</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">الشركاء (B2B)</span>
            <p className="text-3xl font-black text-white mt-2">{partners.length}</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">إيرادات الشركات</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2BCollected.toLocaleString()} د.ع</p>
          </div>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <span className="text-xs text-gray-500 font-black uppercase">إيرادات الأفراد</span>
            <p className="text-2xl font-black text-green-400 mt-2">{localB2CCollected.toLocaleString()} د.ع</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-2">
          <button onClick={() => setActiveTab("analytics")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "analytics" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>الإحصائيات والمالية</button>
          <button onClick={() => setActiveTab("members")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "members" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>إدارة الأعضاء (B2C)</button>
          <button onClick={() => setActiveTab("partners")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "partners" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>إدارة الشركاء (B2B)</button>
          <button onClick={() => setActiveTab("cards")} className={`px-5 py-3 text-sm font-black border-b-2 cursor-pointer ${activeTab === "cards" ? "border-[#D30014] text-white bg-[#121212]/50" : "border-transparent text-gray-500"}`}>إدارة البطاقات</button>
        </div>

        {/* Tab Content */}
        {activeTab === "analytics" && (
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-black mb-4">ملخص الأداء المالي المباشر</h2>
            <p className="text-sm text-gray-400">إجمالي الحصيلة العامة للمنظومة تبلغ: <strong className="text-green-400">{(localB2BCollected + localB2CCollected).toLocaleString()} دينار عراقي</strong>.</p>
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#121212] p-4 rounded-xl border border-gray-800">
              <span className="text-sm font-bold">قائمة الأعضاء المسجلين</span>
              {!isViewer && (
                <button onClick={() => setShowMemberForm(true)} className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">إضافة عضو</button>
              )}
            </div>
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 text-center text-gray-400">
              {members.length === 0 ? "لا توجد سجلات أعضاء حالياً." : `عدد الأعضاء الحاليين: ${members.length}`}
            </div>
          </div>
        )}

        {activeTab === "partners" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#121212] p-4 rounded-xl border border-gray-800">
              <span className="text-sm font-bold">قائمة الشركاء التجاريين</span>
              {!isViewer && (
                <button onClick={() => setShowPartnerForm(true)} className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">إضافة شريك</button>
              )}
            </div>
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 text-center text-gray-400">
              {partners.length === 0 ? "لا توجد سجلات شركاء حالياً." : `عدد الشركاء الحاليين: ${partners.length}`}
            </div>
          </div>
        )}

        {activeTab === "cards" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#121212] p-4 rounded-xl border border-gray-800">
              <span className="text-sm font-bold">إدارة الأصول والبطاقات</span>
              {!isViewer && (
                <button onClick={() => setShowCardForm(true)} className="px-4 py-2 bg-[#D30014] text-white font-bold rounded-lg text-xs cursor-pointer">توليد بطاقة</button>
              )}
            </div>
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 text-center text-gray-400">
              {cards.length === 0 ? "لا توجد بطاقات مسجلة حالياً." : `إجمالي البطاقات: ${cards.length}`}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
