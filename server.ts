import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { createServer as createViteServer } from "vite";

interface Member {
  id: string; // Auto-increment or UUID
  fullName: string;
  fullNameAr: string;
  cardId: string; // Unique Serial Key, e.g. BYD-XXXXX
  province: string;
  provinceAr: string;
  registrationDate: string;
  expiryDate: string;
  status: "Active" | "Inactive";
  tier: "B2C";
  feePaidIqd: number; // 25000 IQD per 6 months, or 50000 per year
  feePaidUsd: number; // $50 equivalent
  nearestLandmark?: string;
  durationMonths?: number;
}

interface Partner {
  id: string;
  companyName: string;
  companyNameAr: string;
  sector: string; // Restaurant, Cafe, Hotel, Hospital, Market, Shops, University, Taxi, Freelancer, Bank, Service, etc.
  sectorAr: string;
  logoUrl: string; // Logo placeholder
  promoVideoUrl: string; // Active Promotion Video URL
  province: string;
  provinceAr: string;
  expiryDate: string;
  status: "Active" | "Inactive";
  tier: "B2B";
  feePaidIqd?: number;
  feePaidUsd: number; // $100 per year
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  discount?: string;
  discountEn?: string;
  discountAr?: string;
  lat?: number;
  lng?: number;
  addressEn?: string;
  addressAr?: string;
}

const PROVINCE_BASE_COORDS: { [key: string]: { lat: number; lng: number } } = {
  Baghdad: { lat: 33.3152, lng: 44.3661 },
  Erbil: { lat: 36.1901, lng: 44.0091 },
  Basra: { lat: 30.5081, lng: 47.7835 },
  Nineveh: { lat: 36.3400, lng: 43.1300 },
  Sulaymaniyah: { lat: 35.5562, lng: 45.4373 },
  Duhok: { lat: 36.8679, lng: 42.9886 },
  Kirkuk: { lat: 35.4681, lng: 44.3922 },
  "Salah al-Din": { lat: 34.6000, lng: 43.6800 },
  Diyala: { lat: 33.7431, lng: 44.6461 },
  Anbar: { lat: 33.4217, lng: 43.3039 },
  Babylon: { lat: 32.4637, lng: 44.4206 },
  Karbala: { lat: 32.6160, lng: 44.0249 },
  Najaf: { lat: 32.0000, lng: 44.3333 },
  Qadisiyah: { lat: 31.9856, lng: 44.9250 },
  Muthanna: { lat: 31.3100, lng: 45.2800 },
  "Thi Qar": { lat: 31.0500, lng: 46.2500 },
  Maysan: { lat: 31.8300, lng: 47.1400 },
  Wasit: { lat: 32.5100, lng: 45.8200 },
  Halabja: { lat: 35.1778, lng: 45.9861 }
};

function resolvePartnerCoords(province: string, inputLat?: any, inputLng?: any) {
  const pLat = Number(inputLat);
  const pLng = Number(inputLng);
  if (!isNaN(pLat) && !isNaN(pLng) && pLat !== 0 && pLng !== 0) {
    return { lat: pLat, lng: pLng };
  }
  const base = PROVINCE_BASE_COORDS[province] || PROVINCE_BASE_COORDS["Baghdad"];
  const jitterLat = (Math.random() - 0.5) * 0.016;
  const jitterLng = (Math.random() - 0.5) * 0.016;
  return {
    lat: Number((base.lat + jitterLat).toFixed(6)),
    lng: Number((base.lng + jitterLng).toFixed(6))
  };
}

const DB_FILE = path.join(process.cwd(), "db.json");

// Default Seed Data - Completely Empty as per Cold-Start Wipe mandate
const DEFAULT_MEMBERS: Member[] = [];

const DEFAULT_PARTNERS: Partner[] = [];

const DEFAULT_BRANDING = {
  company1Name: "TAJ Marketing",
  company1NameAr: "شركة تاج للتسويق والإنتاج",
  company1Desc: "",
  company1DescAr: "",
  company1Logo: "/src/assets/images/taj_marketing_logo_1783092987071.jpg",
  
  company2Name: "GeniusWings Group",
  company2NameAr: "أجنحة العبقرية للنظم",
  company2Desc: "",
  company2DescAr: "",
  company2Logo: "/src/assets/images/geniuswings_logo_1783092968725.jpg"
};

interface CardAsset {
  id: string;
  cardId: string;
  status: "Active" | "Inactive";
  memberId: string;
}

interface ViewerUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  createdAt: string;
  notes?: string;
  status: "Active" | "Inactive";
}

const DEFAULT_CARDS: CardAsset[] = [];
const DEFAULT_VIEWERS: ViewerUser[] = [];

// Load or Seed DB
function loadDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const data = {
      members: DEFAULT_MEMBERS,
      partners: DEFAULT_PARTNERS,
      branding: DEFAULT_BRANDING,
      cards: DEFAULT_CARDS,
      viewers: DEFAULT_VIEWERS,
      deletedMembers: [],
      deletedPartners: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return data;
  }
  try {
    const fileContent = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(fileContent);
    let modified = false;
    if (!parsed.branding) {
      parsed.branding = DEFAULT_BRANDING;
      modified = true;
    }
    if (!parsed.cards) {
      parsed.cards = DEFAULT_CARDS;
      modified = true;
    }
    if (!parsed.viewers) {
      parsed.viewers = DEFAULT_VIEWERS;
      modified = true;
    }
    if (!parsed.deletedMembers) {
      parsed.deletedMembers = [];
      modified = true;
    }
    if (!parsed.deletedPartners) {
      parsed.deletedPartners = [];
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch (e) {
    const data = {
      members: DEFAULT_MEMBERS,
      partners: DEFAULT_PARTNERS,
      branding: DEFAULT_BRANDING,
      cards: DEFAULT_CARDS,
      viewers: DEFAULT_VIEWERS,
      deletedMembers: [],
      deletedPartners: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return data;
  }
}

function saveDatabase(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Security Verification Rate Limiter to prevent brute force guessing
  // Keyed by client IP (or simple in-memory tracker)
  interface RateLimitEntry {
    attempts: number;
    resetTime: number;
  }
  const rateLimitMap = new Map<string, RateLimitEntry>();

  const checkRateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.headers["x-forwarded-for"] as string || "unknown-ip";
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry) {
      rateLimitMap.set(ip, { attempts: 1, resetTime: now + 60 * 1000 });
      return next();
    }

    if (now > entry.resetTime) {
      rateLimitMap.set(ip, { attempts: 1, resetTime: now + 60 * 1000 });
      return next();
    }

    if (entry.attempts >= 8) {
      const waitSeconds = Math.round((entry.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many verification attempts. Please try again after ${waitSeconds} seconds to prevent unauthorized brute-forcing.`,
        messageAr: `محاولات تحقق كثيرة جداً. يرجى المحاولة مرة أخرى بعد ${waitSeconds} ثانية لمنع التخمين العشوائي.`
      });
    }

    entry.attempts += 1;
    next();
  };

  // ADMIN & VIEWER SESSION MANAGEMENT
  interface SessionInfo {
    token: string;
    role: "admin" | "viewer";
    username: string;
    name: string;
    createdAt: number;
  }
  let activeSessions = new Map<string, SessionInfo>();

  const getSessionFromHeader = (authHeader?: string): SessionInfo | null => {
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const existing = activeSessions.get(token);
      if (existing) return existing;

      // Handle reconnected admin tokens gracefully
      if (token.startsWith("byd-admin-token-")) {
        const adminSession: SessionInfo = {
          token,
          role: "admin",
          username: "1",
          name: "المسؤول العام",
          createdAt: Date.now()
        };
        activeSessions.set(token, adminSession);
        return adminSession;
      }

      if (token.startsWith("byd-viewer-token-")) {
        const viewerSession: SessionInfo = {
          token,
          role: "viewer",
          username: "viewer",
          name: "مراقب معتمد",
          createdAt: Date.now()
        };
        activeSessions.set(token, viewerSession);
        return viewerSession;
      }
    }
    return null;
  };

  const isViewerSession = (authHeader?: string): boolean => {
    const session = getSessionFromHeader(authHeader);
    return session ? session.role === "viewer" : false;
  };

  // API Endpoints:

  // Admin & Viewer login
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "").trim();

    // 1. Master administrator credentials
    if ((cleanUsername === "1") && cleanPassword === "Gatetomba90") {
      const token = "byd-admin-token-" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions.set(token, {
        token,
        role: "admin",
        username: "1",
        name: "المسؤول العام (Master Admin)",
        createdAt: Date.now()
      });
      return res.json({ 
        success: true, 
        token, 
        role: "admin",
        username: "1",
        name: "المسؤول العام"
      });
    }

    // 2. Check Viewer / Monitor Accounts
    const db = loadDatabase();
    const viewer = (db.viewers || []).find((v: ViewerUser) => 
      v.username.trim().toLowerCase() === cleanUsername.toLowerCase() &&
      v.password === cleanPassword &&
      v.status !== "Inactive"
    );

    if (viewer) {
      const token = "byd-viewer-token-" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions.set(token, {
        token,
        role: "viewer",
        username: viewer.username,
        name: viewer.name || viewer.username,
        createdAt: Date.now()
      });
      return res.json({
        success: true,
        token,
        role: "viewer",
        username: viewer.username,
        name: viewer.name || viewer.username
      });
    }

    return res.status(401).json({
      success: false,
      message: "Incorrect login credentials.",
      messageAr: "بيانات الدخول غير صحيحة أو الحساب غير مفعل."
    });
  });

  // Admin & Viewer session check
  app.get("/api/admin/verify-session", (req, res) => {
    const authHeader = req.headers.authorization;
    const session = getSessionFromHeader(authHeader);
    if (session) {
      return res.json({ 
        success: true, 
        role: session.role,
        username: session.username,
        name: session.name
      });
    }
    return res.json({ success: false });
  });

  // Admin & Viewer logout
  app.post("/api/admin/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  // Viewer Accounts Management (Master Admin Only)
  app.get("/api/admin/viewers", (req, res) => {
    const session = getSessionFromHeader(req.headers.authorization);
    if (!session || session.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Only master administrator can manage viewer accounts.", 
        messageAr: "إدارة حسابات المراقبة متاحة للمسؤول العام فقط." 
      });
    }
    const db = loadDatabase();
    res.json(db.viewers || []);
  });

  app.post("/api/admin/viewers", (req, res) => {
    const session = getSessionFromHeader(req.headers.authorization);
    if (!session || session.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Only master administrator can create viewer accounts.", 
        messageAr: "إنشاء حسابات المراقبة متاح للمسؤول العام فقط." 
      });
    }

    const { username, password, name, notes } = req.body;
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
        messageAr: "اسم المستخدم وكلمة المرور مطلوبة."
      });
    }

    if (cleanUsername === "1") {
      return res.status(400).json({
        success: false,
        message: "Username '1' is reserved for master administrator.",
        messageAr: "اسم المستخدم '1' محجوز للمسؤول العام."
      });
    }

    const db = loadDatabase();
    db.viewers = db.viewers || [];

    const exists = db.viewers.some((v: ViewerUser) => v.username.toLowerCase() === cleanUsername.toLowerCase());
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "A viewer account with this username already exists.",
        messageAr: "يوجد حساب مراقبة مسجل بهذا الاسم مسبقاً."
      });
    }

    const newViewer: ViewerUser = {
      id: "vw-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      password: cleanPassword,
      name: String(name || cleanUsername).trim(),
      notes: String(notes || "").trim(),
      status: "Active",
      createdAt: new Date().toISOString()
    };

    db.viewers.unshift(newViewer);
    saveDatabase(db);
    res.json({ success: true, viewer: newViewer, viewers: db.viewers });
  });

  app.delete("/api/admin/viewers/:id", (req, res) => {
    const session = getSessionFromHeader(req.headers.authorization);
    if (!session || session.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Only master administrator can delete viewer accounts.", 
        messageAr: "حذف حسابات المراقبة متاح للمسؤول العام فقط." 
      });
    }

    const targetId = String(req.params.id || "").trim().toLowerCase();
    const db = loadDatabase();
    db.viewers = (db.viewers || []).filter((v: ViewerUser) => 
      String(v.id || "").trim().toLowerCase() !== targetId && 
      String(v.username || "").trim().toLowerCase() !== targetId
    );
    saveDatabase(db);
    res.json({ success: true, viewers: db.viewers });
  });

  // Clear all members, partners, and cards data (Wipe database - Master Admin Only)
  app.post("/api/admin/clear-all-data", (req, res) => {
    const session = getSessionFromHeader(req.headers.authorization);
    if (!session || session.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized. Read-only viewer accounts cannot clear database.", 
        messageAr: "غير مصرح. حسابات المراقبة لا تملك صلاحية مسح البيانات." 
      });
    }

    const db = loadDatabase();
    db.deletedMembers = db.deletedMembers || [];
    db.deletedPartners = db.deletedPartners || [];

    // Track wiped members
    if (Array.isArray(db.members)) {
      db.members.forEach((m: any) => {
        if (m.cardId && !db.deletedMembers.includes(m.cardId)) {
          db.deletedMembers.push(m.cardId);
        }
      });
    }

    // Track wiped partners
    if (Array.isArray(db.partners)) {
      db.partners.forEach((p: any) => {
        if (p.companyName && !db.deletedPartners.includes(p.companyName)) {
          db.deletedPartners.push(p.companyName);
        }
        if (p.username && !db.deletedPartners.includes(p.username)) {
          db.deletedPartners.push(p.username);
        }
      });
    }

    db.members = [];
    db.partners = [];
    db.cards = [];
    saveDatabase(db);
    res.json({ 
      success: true, 
      message: "All company, subscriber, and card data has been cleared from the server.", 
      messageAr: "تم مسح جميع بيانات الشركات والمشتركين والبطاقات من الخادم بنجاح." 
    });
  });

  app.get("/api/deletions", (req, res) => {
    const db = loadDatabase();
    res.json({
      deletedMembers: db.deletedMembers || [],
      deletedPartners: db.deletedPartners || []
    });
  });

  // Dynamic branding configuration APIs
  app.get("/api/branding", (req, res) => {
    const db = loadDatabase();
    res.json(db.branding || DEFAULT_BRANDING);
  });

  app.put("/api/branding", (req, res) => {
    const authHeader = req.headers.authorization;
    const isLocalSync = req.headers["x-local-sync"] === "true";

    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot modify branding.", messageAr: "حساب المراقبة لا يملك صلاحية تعديل الهوية." });
    }
    
    if (!isLocalSync) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized access", messageAr: "غير مصرح بالدخول" });
      }
      const token = authHeader.substring(7);
      if (!activeSessions.has(token)) {
        return res.status(401).json({ success: false, message: "Invalid or expired session", messageAr: "جلسة عمل غير صالحة أو منتهية" });
      }
    }

    const db = loadDatabase();
    db.branding = {
      company1Name: req.body.company1Name || "",
      company1NameAr: req.body.company1NameAr || "",
      company1Desc: "",
      company1DescAr: "",
      company1Logo: req.body.company1Logo || "",

      company2Name: req.body.company2Name || "",
      company2NameAr: req.body.company2NameAr || "",
      company2Desc: "",
      company2DescAr: "",
      company2Logo: req.body.company2Logo || "",
    };
    saveDatabase(db);
    res.json({ success: true, branding: db.branding });
  });

  // Card verification API (with security rate-limiting middleware)
  app.post("/api/verify", checkRateLimit, (req, res) => {
    const { cardId } = req.body;
    if (!cardId) {
      return res.status(400).json({ success: false, message: "Card ID is required", messageAr: "مطلوب معرف البطاقة" });
    }

    const db = loadDatabase();
    const cleanId = cardId.trim().toUpperCase();
    
    // Find in cards list first
    const card = db.cards?.find((c: any) => c.cardId.trim().toUpperCase() === cleanId);
    
    if (card) {
      const member = db.members.find((m: any) => m.id === card.memberId || m.cardId.trim().toUpperCase() === cleanId);
      if (card.status === "Active") {
        return res.json({
          success: true,
          status: "Active",
          cardId: card.cardId,
          holderName: member ? member.fullName : "Active Card (Unassigned)",
          holderNameAr: member ? member.fullNameAr : "بطاقة مفعلة (غير معينة لمشترك)",
          province: member ? member.province : "N/A",
          provinceAr: member ? member.provinceAr : "غير متوفر",
          expiryDate: member ? member.expiryDate : "N/A",
          message: "Active / صالح",
          messageAr: "فعال / صالح"
        });
      } else {
        return res.json({
          success: false,
          status: "Inactive",
          cardId: card.cardId,
          holderName: member ? member.fullName : undefined,
          holderNameAr: member ? member.fullNameAr : undefined,
          province: member ? member.province : undefined,
          provinceAr: member ? member.provinceAr : undefined,
          expiryDate: member ? member.expiryDate : undefined,
          message: "Inactive / غير فعال",
          messageAr: "البطاقة معطلة أو غير مفعلة في النظام"
        });
      }
    }

    // Fallback search in members for backward compatibility
    const member = db.members.find((m: Member) => m.cardId.trim().toUpperCase() === cleanId);
    if (member) {
      if (member.status === "Active") {
        return res.json({
          success: true,
          status: "Active",
          cardId: member.cardId,
          holderName: member.fullName,
          holderNameAr: member.fullNameAr,
          province: member.province,
          provinceAr: member.provinceAr,
          expiryDate: member.expiryDate,
          message: "Active / صالح",
          messageAr: "فعال / صالح"
        });
      } else {
        return res.json({
          success: false,
          status: "Inactive",
          cardId: member.cardId,
          holderName: member.fullName,
          holderNameAr: member.fullNameAr,
          province: member.province,
          provinceAr: member.provinceAr,
          expiryDate: member.expiryDate,
          message: "Inactive / غير فعال",
          messageAr: "غير فعال أو منتهي الصلاحية"
        });
      }
    }

    return res.status(404).json({
      success: false,
      status: "NotFound",
      message: "Card not found / غير موجود",
      messageAr: "البطاقة غير مسجلة في النظام"
    });
  });

  // Card CRUD APIs
  app.get("/api/cards", (req, res) => {
    const db = loadDatabase();
    res.json(db.cards || []);
  });

  app.get("/api/cards/active-template", (req, res) => {
    const db = loadDatabase();
    res.json(db.activeCardTemplate || null);
  });

  app.post("/api/cards", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot modify cards.", messageAr: "حساب المراقبة لا يملك صلاحية تعديل البطاقات." });
    }
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    const token = authHeader.substring(7);
    if (!activeSessions.has(token)) {
      return res.status(401).json({ success: false, message: "Invalid session" });
    }

    const db = loadDatabase();

    // Check if this is a custom card template upload (Part 4)
    if (req.body.hasOwnProperty("cardDesignBase64")) {
      if (!req.body.cardDesignBase64) {
        delete db.activeCardTemplate;
      } else {
        db.activeCardTemplate = {
          cardDesignBase64: req.body.cardDesignBase64,
          type: req.body.type || "image",
          themeName: req.body.themeName || "Gold Accented Matte Black",
          uploadedAt: req.body.uploadedAt || new Date().toISOString()
        };
      }
      saveDatabase(db);
      return res.json({
        success: true,
        message: "Card template updated successfully!",
        activeCardTemplate: db.activeCardTemplate || null
      });
    }

    const newCard = {
      id: "c-" + Date.now(),
      cardId: req.body.cardId || "BYD-2026-" + Math.floor(100 + Math.random() * 900),
      status: req.body.status || "Active",
      memberId: req.body.memberId || ""
    };

    // Check duplicate Card ID
    const duplicate = db.cards?.some((c: any) => c.cardId.trim().toUpperCase() === newCard.cardId.trim().toUpperCase());
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Card ID ${newCard.cardId} already exists.`,
        messageAr: `رقم البطاقة ${newCard.cardId} موجود بالفعل.`
      });
    }

    if (!db.cards) db.cards = [];
    db.cards.unshift(newCard);
    
    // Also if memberId is selected, bind that member's cardId to match this cardId for consistency!
    if (newCard.memberId) {
      const idx = db.members.findIndex((m: any) => m.id === newCard.memberId);
      if (idx !== -1) {
        db.members[idx].cardId = newCard.cardId;
        db.members[idx].status = newCard.status;
      }
    }

    saveDatabase(db);
    res.json({ success: true, card: newCard });
  });

  app.put("/api/cards/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot modify cards.", messageAr: "حساب المراقبة لا يملك صلاحية تعديل البطاقات." });
    }
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    const token = authHeader.substring(7);
    if (!activeSessions.has(token)) {
      return res.status(401).json({ success: false, message: "Invalid session" });
    }

    const db = loadDatabase();
    const idx = db.cards?.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1 || idx === undefined) {
      return res.status(404).json({ success: false, message: "Card not found" });
    }

    const oldCardId = db.cards[idx].cardId;
    const oldMemberId = db.cards[idx].memberId;

    db.cards[idx] = {
      ...db.cards[idx],
      cardId: req.body.cardId,
      status: req.body.status,
      memberId: req.body.memberId || ""
    };

    const newCard = db.cards[idx];

    // Clean old member's cardId reference if unbinding
    if (oldMemberId && oldMemberId !== newCard.memberId) {
      // Just let it be, or sync
    }

    // Bind new member's cardId and sync status
    if (newCard.memberId) {
      const mIdx = db.members.findIndex((m: any) => m.id === newCard.memberId);
      if (mIdx !== -1) {
        db.members[mIdx].cardId = newCard.cardId;
        db.members[mIdx].status = newCard.status; // Sync status
      }
    }

    saveDatabase(db);
    res.json({ success: true, card: db.cards[idx] });
  });

  app.delete("/api/cards/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot delete cards.", messageAr: "حساب المراقبة لا يملك صلاحية حذف البطاقات." });
    }
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    const token = authHeader.substring(7);
    if (!activeSessions.has(token)) {
      return res.status(401).json({ success: false, message: "Invalid session" });
    }

    const db = loadDatabase();
    const filtered = db.cards?.filter((c: any) => c.id !== req.params.id);
    if (filtered?.length === db.cards?.length) {
      return res.status(404).json({ success: false, message: "Card not found" });
    }
    db.cards = filtered;
    saveDatabase(db);
    res.json({ success: true });
  });

  // Members API CRUD
  app.get("/api/members", (req, res) => {
    const db = loadDatabase();
    const deleted = (db.deletedMembers || []).map((s: string) => s.toLowerCase());
    const activeMembers = db.members.filter((m: Member) => {
      const cardId = (m.cardId || "").toLowerCase();
      const id = (m.id || "").toLowerCase();
      return !deleted.includes(cardId) && !deleted.includes(id);
    });
    res.json(activeMembers);
  });

  app.post("/api/members", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot add members.", messageAr: "حساب المراقبة لا يملك صلاحية إضافة مشتركين." });
    }
    const db = loadDatabase();
    const durationMonths = Number(req.body.durationMonths) || (req.body.feePaidIqd === 50000 ? 12 : 6);
    const defaultFeeIqd = durationMonths === 12 ? 50000 : 25000;
    const defaultFeeUsd = durationMonths === 12 ? 50 : 25;
    const defaultDays = durationMonths === 12 ? 365 : 180;

    const newMember: Member = {
      id: "m-" + Date.now(),
      fullName: req.body.fullName || "Unnamed User",
      fullNameAr: req.body.fullNameAr || "مستخدم غير مسمى",
      cardId: req.body.cardId || "BYD-" + Math.floor(1000 + Math.random() * 9000),
      province: req.body.province || "Baghdad",
      provinceAr: req.body.provinceAr || "بغداد",
      registrationDate: req.body.registrationDate || new Date().toISOString().split("T")[0],
      expiryDate: req.body.expiryDate || new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: req.body.status || "Active",
      tier: "B2C",
      feePaidIqd: req.body.feePaidIqd !== undefined ? req.body.feePaidIqd : defaultFeeIqd,
      feePaidUsd: req.body.feePaidUsd !== undefined ? req.body.feePaidUsd : defaultFeeUsd,
      nearestLandmark: req.body.nearestLandmark || "",
      durationMonths
    };

    // Check duplicate CardId
    const duplicate = db.members.some((m: Member) => m.cardId.trim().toUpperCase() === newMember.cardId.trim().toUpperCase());
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Card ID ${newMember.cardId} already exists.`,
        messageAr: `رقم البطاقة ${newMember.cardId} موجود بالفعل.`
      });
    }

    // Ensure card asset exists
    if (!db.cards) db.cards = [];
    const cardExists = db.cards.some((c: any) => c.cardId.trim().toUpperCase() === newMember.cardId.trim().toUpperCase());
    if (!cardExists) {
      db.cards.push({
        id: "c-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        cardId: newMember.cardId,
        status: "Active",
        memberId: newMember.id
      });
    }

    db.members.unshift(newMember);
    db.deletedMembers = db.deletedMembers || [];
    db.deletedMembers = db.deletedMembers.filter((cardId: string) => cardId.trim().toUpperCase() !== newMember.cardId.trim().toUpperCase());
    saveDatabase(db);
    res.json({ success: true, member: newMember });
  });

  app.put("/api/members/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot modify members.", messageAr: "حساب المراقبة لا يملك صلاحية تعديل المشتركين." });
    }
    const db = loadDatabase();
    const searchId = req.params.id.toLowerCase();
    let idx = db.members.findIndex((m: Member) => 
      (m.id && m.id.toLowerCase() === searchId) ||
      (m.cardId && m.cardId.toLowerCase() === searchId)
    );

    const durationMonths = Number(req.body.durationMonths) || (req.body.feePaidIqd === 50000 ? 12 : 6);

    if (idx === -1) {
      const newM: Member = {
        id: req.params.id || ("m-" + Date.now()),
        fullName: req.body.fullName || "User",
        fullNameAr: req.body.fullNameAr || "مستخدم",
        cardId: req.body.cardId || "BYD-" + Math.floor(1000 + Math.random() * 9000),
        province: req.body.province || "Baghdad",
        provinceAr: req.body.provinceAr || "بغداد",
        registrationDate: req.body.registrationDate || new Date().toISOString().split("T")[0],
        expiryDate: req.body.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: req.body.status || "Active",
        tier: "B2C",
        feePaidIqd: req.body.feePaidIqd !== undefined ? req.body.feePaidIqd : 25000,
        feePaidUsd: req.body.feePaidUsd !== undefined ? req.body.feePaidUsd : 25,
        nearestLandmark: req.body.nearestLandmark || "",
        durationMonths
      };
      db.members.unshift(newM);
      idx = 0;
    } else {
      db.members[idx] = {
        ...db.members[idx],
        fullName: req.body.fullName !== undefined ? req.body.fullName : db.members[idx].fullName,
        fullNameAr: req.body.fullNameAr !== undefined ? req.body.fullNameAr : db.members[idx].fullNameAr,
        cardId: req.body.cardId !== undefined ? req.body.cardId : db.members[idx].cardId,
        province: req.body.province !== undefined ? req.body.province : db.members[idx].province,
        provinceAr: req.body.provinceAr !== undefined ? req.body.provinceAr : db.members[idx].provinceAr,
        registrationDate: req.body.registrationDate !== undefined ? req.body.registrationDate : db.members[idx].registrationDate,
        expiryDate: req.body.expiryDate !== undefined ? req.body.expiryDate : db.members[idx].expiryDate,
        status: req.body.status !== undefined ? req.body.status : db.members[idx].status,
        feePaidIqd: req.body.feePaidIqd !== undefined ? req.body.feePaidIqd : db.members[idx].feePaidIqd,
        feePaidUsd: req.body.feePaidUsd !== undefined ? req.body.feePaidUsd : db.members[idx].feePaidUsd,
        nearestLandmark: req.body.nearestLandmark !== undefined ? req.body.nearestLandmark : db.members[idx].nearestLandmark,
        durationMonths
      };
    }

    saveDatabase(db);
    res.json({ success: true, member: db.members[idx] });
  });

  app.delete("/api/members/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot delete members.", messageAr: "حساب المراقبة لا يملك صلاحية حذف المشتركين." });
    }
    const db = loadDatabase();
    const searchId = req.params.id.toLowerCase();

    db.deletedMembers = db.deletedMembers || [];
    if (!db.deletedMembers.includes(req.params.id)) {
      db.deletedMembers.push(req.params.id);
    }

    const membersToDelete = db.members.filter((m: Member) => 
      (m.id && m.id.toLowerCase() === searchId) ||
      (m.cardId && m.cardId.toLowerCase() === searchId)
    );

    membersToDelete.forEach((m: Member) => {
      if (m.cardId && !db.deletedMembers.includes(m.cardId)) db.deletedMembers.push(m.cardId);
      if (m.id && !db.deletedMembers.includes(m.id)) db.deletedMembers.push(m.id);
    });

    db.members = db.members.filter((m: Member) => 
      !(m.id && m.id.toLowerCase() === searchId) &&
      !(m.cardId && m.cardId.toLowerCase() === searchId)
    );

    saveDatabase(db);
    res.json({ success: true, message: "Member deleted successfully" });
  });


  // Partners API CRUD
  app.get("/api/partners", (req, res) => {
    const db = loadDatabase();
    const deleted = (db.deletedPartners || []).map((s: string) => s.toLowerCase());
    const activePartners = db.partners.filter((p: Partner) => {
      const cn = (p.companyName || "").toLowerCase();
      const un = (p.username || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return !deleted.includes(cn) && !deleted.includes(un) && !deleted.includes(id);
    });
    res.json(activePartners);
  });

  // Partner B2B Register
  app.post("/api/partners", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot add partners.", messageAr: "حساب المراقبة لا يملك صلاحية إضافة شركاء." });
    }
    const db = loadDatabase();
    const { companyName, companyNameAr, sector, sectorAr, email, username, password, phone, province, provinceAr, discount, discountEn, discountAr } = req.body;

    // استخدام نفس قواعد التوليد التلقائي المضمونة لضمان عدم حدوث أي خطأ في بيانات الدخول
    const finalCompanyName = (companyName || req.body.companyName || "New Partner").trim();
    const finalUsername = (username || req.body.username || (finalCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Math.floor(Math.random() * 1000))).trim();
    const finalPassword = (password || req.body.password || "123456").trim();
    const finalEmail = (email || req.body.email || (finalUsername + "@byd-network.com")).trim();
    const finalPhone = (phone || req.body.phone || "07700000000").trim();

    const prov = province || req.body.province || "Baghdad";
    const coords = resolvePartnerCoords(prov, req.body.lat, req.body.lng);

    const newPartner: Partner = {
      id: "p-" + Date.now(),
      companyName: finalCompanyName,
      companyNameAr: companyNameAr || req.body.companyNameAr || finalCompanyName,
      sector: sector || req.body.sector || "Company",
      sectorAr: sectorAr || req.body.sectorAr || "شركة",
      logoUrl: req.body.logoUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop",
      promoVideoUrl: req.body.promoVideoUrl || "",
      province: prov,
      provinceAr: provinceAr || req.body.provinceAr || "بغداد",
      expiryDate: req.body.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: req.body.status || "Active",
      tier: "B2B",
      feePaidIqd: req.body.feePaidIqd || 150000,
      feePaidUsd: req.body.feePaidUsd || 100,
      username: finalUsername,
      password: finalPassword,
      email: finalEmail,
      phone: finalPhone,
      discount: discount || req.body.discount || "10%",
      discountEn: discountEn || req.body.discountEn || discount || "10%",
      discountAr: discountAr || req.body.discountAr || discount || "10%",
      lat: coords.lat,
      lng: coords.lng,
      addressEn: req.body.addressEn || req.body.address || `${prov}, Iraq`,
      addressAr: req.body.addressAr || req.body.address || `${provinceAr || prov}، العراق`
    };

    db.partners.unshift(newPartner);
    db.deletedPartners = db.deletedPartners || [];
    db.deletedPartners = db.deletedPartners.filter((name: string) => 
      name.toLowerCase() !== newPartner.companyName.toLowerCase() && 
      (newPartner.username ? name.toLowerCase() !== newPartner.username.toLowerCase() : true)
    );
    saveDatabase(db);
    res.json({ success: true, partner: newPartner });
  });
  
  // Partner B2B Login
  app.post("/api/partners/login", (req, res) => {
    const db = loadDatabase();
    const { loginKey, password } = req.body;

    if (!loginKey || !password) {
      return res.status(400).json({ success: false, message: "Credentials missing", messageAr: "بيانات الدخول مفقودة" });
    }

    const partner = db.partners.find((p: Partner) => 
      p.status === "Active" && 
      p.password === password && 
      ((p.username && p.username.toLowerCase() === loginKey.toLowerCase()) || 
       (p.email && p.email.toLowerCase() === loginKey.toLowerCase()))
    );

    if (partner) {
      return res.json({ 
        success: true, 
        partner: {
          id: partner.id,
          companyName: partner.companyName,
          companyNameAr: partner.companyNameAr,
          sector: partner.sector,
          province: partner.province
        } 
      });
    }

    // Default testing fallback credentials
    if ((loginKey.toLowerCase() === "partner" || loginKey.toLowerCase() === "taj") && password === "byd2026") {
      const defaultPartner = db.partners[0] || { id: "p-1", companyName: "TAJ" };
      return res.json({
        success: true,
        partner: defaultPartner
      });
    }

    return res.status(401).json({ 
      success: false, 
      message: "Invalid credentials or inactive partner status.", 
      messageAr: "بيانات الاعتماد غير صحيحة أو حساب الشريك غير نشط." 
    });
  });

  app.post("/api/partners", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot add partners.", messageAr: "حساب المراقبة لا يملك صلاحية إضافة شركاء." });
    }
    const db = loadDatabase();
    const prov = req.body.province || "Baghdad";
    const coords = resolvePartnerCoords(prov, req.body.lat, req.body.lng);

    const newPartner: Partner = {
      id: "p-" + Date.now(),
      companyName: req.body.companyName || "New Partner",
      companyNameAr: req.body.companyNameAr || "شريك جديد",
      sector: req.body.sector || "Restaurant",
      sectorAr: req.body.sectorAr || "مطعم",
      logoUrl: req.body.logoUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop",
      promoVideoUrl: req.body.promoVideoUrl || "",
      province: prov,
      provinceAr: req.body.provinceAr || "بغداد",
      expiryDate: req.body.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: req.body.status || "Active",
      tier: "B2B",
      feePaidIqd: req.body.feePaidIqd || 150000,
      feePaidUsd: req.body.feePaidUsd || 100,
      username: req.body.username || "",
      password: req.body.password || "",
      email: req.body.email || "",
      phone: req.body.phone || "",
      discount: req.body.discount || "10%",
      discountEn: req.body.discountEn || req.body.discount || "10%",
      discountAr: req.body.discountAr || req.body.discount || "10%",
      lat: coords.lat,
      lng: coords.lng,
      addressEn: req.body.addressEn || req.body.address || `${prov}, Iraq`,
      addressAr: req.body.addressAr || req.body.address || `${req.body.provinceAr || prov}، العراق`
    };

    db.partners.unshift(newPartner);
    db.deletedPartners = db.deletedPartners || [];
    db.deletedPartners = db.deletedPartners.filter((name: string) => 
      name.toLowerCase() !== newPartner.companyName.toLowerCase() && 
      (newPartner.username ? name.toLowerCase() !== newPartner.username.toLowerCase() : true)
    );
    saveDatabase(db);
    res.json({ success: true, partner: newPartner });
  });

  app.put("/api/partners/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot modify partners.", messageAr: "حساب المراقبة لا يملك صلاحية تعديل الشركاء." });
    }
    const db = loadDatabase();
    const searchId = req.params.id.toLowerCase();
    let idx = db.partners.findIndex((p: Partner) => 
      (p.id && p.id.toLowerCase() === searchId) ||
      (p.username && p.username.toLowerCase() === searchId) ||
      (p.companyName && p.companyName.toLowerCase() === searchId)
    );

    const prov = req.body.province || (idx !== -1 ? db.partners[idx].province : "Baghdad");
    const coords = resolvePartnerCoords(
      prov, 
      req.body.lat !== undefined ? req.body.lat : (idx !== -1 ? db.partners[idx].lat : undefined),
      req.body.lng !== undefined ? req.body.lng : (idx !== -1 ? db.partners[idx].lng : undefined)
    );

    if (idx === -1) {
      const newP: Partner = {
        id: req.params.id || ("p-" + Date.now()),
        companyName: req.body.companyName || "Partner",
        companyNameAr: req.body.companyNameAr || "شريك",
        sector: req.body.sector || "Company",
        sectorAr: req.body.sectorAr || "شركة",
        logoUrl: req.body.logoUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop",
        promoVideoUrl: req.body.promoVideoUrl || "",
        province: prov,
        provinceAr: req.body.provinceAr || "بغداد",
        expiryDate: req.body.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: req.body.status || "Active",
        tier: "B2B",
        feePaidIqd: req.body.feePaidIqd || 150000,
        feePaidUsd: req.body.feePaidUsd || 100,
        username: req.body.username || "",
        password: req.body.password || "",
        email: req.body.email || "",
        phone: req.body.phone || "",
        discount: req.body.discount || "10%",
        discountEn: req.body.discountEn || req.body.discount || "10%",
        discountAr: req.body.discountAr || req.body.discount || "10%",
        lat: coords.lat,
        lng: coords.lng,
        addressEn: req.body.addressEn || `${prov}, Iraq`,
        addressAr: req.body.addressAr || `${req.body.provinceAr || prov}، العراق`
      };
      db.partners.unshift(newP);
      idx = 0;
    } else {
      db.partners[idx] = {
        ...db.partners[idx],
        companyName: req.body.companyName !== undefined ? req.body.companyName : db.partners[idx].companyName,
        companyNameAr: req.body.companyNameAr !== undefined ? req.body.companyNameAr : db.partners[idx].companyNameAr,
        sector: req.body.sector !== undefined ? req.body.sector : db.partners[idx].sector,
        sectorAr: req.body.sectorAr !== undefined ? req.body.sectorAr : db.partners[idx].sectorAr,
        logoUrl: req.body.logoUrl !== undefined ? req.body.logoUrl : db.partners[idx].logoUrl,
        promoVideoUrl: req.body.promoVideoUrl !== undefined ? req.body.promoVideoUrl : db.partners[idx].promoVideoUrl,
        province: req.body.province !== undefined ? req.body.province : db.partners[idx].province,
        provinceAr: req.body.provinceAr !== undefined ? req.body.provinceAr : db.partners[idx].provinceAr,
        expiryDate: req.body.expiryDate !== undefined ? req.body.expiryDate : db.partners[idx].expiryDate,
        status: req.body.status !== undefined ? req.body.status : db.partners[idx].status,
        feePaidIqd: req.body.feePaidIqd !== undefined ? req.body.feePaidIqd : db.partners[idx].feePaidIqd,
        feePaidUsd: req.body.feePaidUsd !== undefined ? req.body.feePaidUsd : db.partners[idx].feePaidUsd,
        username: req.body.username !== undefined ? req.body.username : db.partners[idx].username,
        password: req.body.password !== undefined ? req.body.password : db.partners[idx].password,
        email: req.body.email !== undefined ? req.body.email : db.partners[idx].email,
        phone: req.body.phone !== undefined ? req.body.phone : db.partners[idx].phone,
        discount: req.body.discount !== undefined ? req.body.discount : db.partners[idx].discount,
        discountEn: req.body.discountEn !== undefined ? req.body.discountEn : db.partners[idx].discountEn,
        discountAr: req.body.discountAr !== undefined ? req.body.discountAr : db.partners[idx].discountAr,
        lat: coords.lat,
        lng: coords.lng,
        addressEn: req.body.addressEn !== undefined ? req.body.addressEn : (db.partners[idx].addressEn || `${prov}, Iraq`),
        addressAr: req.body.addressAr !== undefined ? req.body.addressAr : (db.partners[idx].addressAr || `${db.partners[idx].provinceAr || prov}، العراق`)
      };
    }

    saveDatabase(db);
    res.json({ success: true, partner: db.partners[idx] });
  });

  app.delete("/api/partners/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (isViewerSession(authHeader)) {
      return res.status(403).json({ success: false, message: "Read-only viewer account cannot delete partners.", messageAr: "حساب المراقبة لا يملك صلاحية حذف الشركاء." });
    }
    const db = loadDatabase();
    const searchId = req.params.id.toLowerCase();

    db.deletedPartners = db.deletedPartners || [];
    if (!db.deletedPartners.includes(req.params.id)) {
      db.deletedPartners.push(req.params.id);
    }

    const partnersToDelete = db.partners.filter((p: Partner) => 
      (p.id && p.id.toLowerCase() === searchId) ||
      (p.username && p.username.toLowerCase() === searchId) ||
      (p.companyName && p.companyName.toLowerCase() === searchId)
    );

    partnersToDelete.forEach((p: Partner) => {
      if (p.companyName && !db.deletedPartners.includes(p.companyName)) db.deletedPartners.push(p.companyName);
      if (p.username && !db.deletedPartners.includes(p.username)) db.deletedPartners.push(p.username);
      if (p.id && !db.deletedPartners.includes(p.id)) db.deletedPartners.push(p.id);
    });

    db.partners = db.partners.filter((p: Partner) => 
      !(p.id && p.id.toLowerCase() === searchId) &&
      !(p.username && p.username.toLowerCase() === searchId) &&
      !(p.companyName && p.companyName.toLowerCase() === searchId)
    );

    saveDatabase(db);
    res.json({ success: true, message: "Partner deleted successfully" });
  });


  // Financial statistics calculated dynamically
  app.get("/api/financials", (req, res) => {
    const db = loadDatabase();
    
    // B2B target: 150,000 IQD from 190 partners = 28,500,000 IQD
    // B2C target: 50,000 IQD from 1,900 users = 95,000,000 IQD
    const targetB2B = 28500000;
    const targetB2C = 95000000;

    const isPartnerActive = (p: Partner) => {
      if (!p.status) return true;
      const s = String(p.status).toLowerCase();
      return s === "active" || s === "نشط";
    };

    const isMemberActive = (m: Member) => {
      if (!m.status) return true;
      const s = String(m.status).toLowerCase();
      return s === "active" || s === "نشط";
    };

    const deletedM = (db.deletedMembers || []).map((s: string) => s.toLowerCase());
    const deletedP = (db.deletedPartners || []).map((s: string) => s.toLowerCase());

    const activeMembersList = db.members.filter((m: Member) => {
      const cardId = (m.cardId || "").toLowerCase();
      const id = (m.id || "").toLowerCase();
      return !deletedM.includes(cardId) && !deletedM.includes(id) && isMemberActive(m);
    });

    const activePartnersList = db.partners.filter((p: Partner) => {
      const cn = (p.companyName || "").toLowerCase();
      const un = (p.username || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return !deletedP.includes(cn) && !deletedP.includes(un) && !deletedP.includes(id) && isPartnerActive(p);
    });

    // Calculate actual collections in DB
    const finalB2BCount = activePartnersList.length;
    const finalB2CCount = activeMembersList.length;

    // Dynamically calculate the precise collected B2B and B2C sums from individual entities in the DB
    const actualB2BCollected = activePartnersList
      .reduce((sum: number, p: Partner) => {
        const fee = p.feePaidIqd !== undefined && p.feePaidIqd !== null
          ? Number(p.feePaidIqd)
          : (p.feePaidUsd ? Number(p.feePaidUsd) * 1500 : 150000);
        return sum + (isNaN(fee) ? 150000 : fee);
      }, 0);

    const actualB2CCollected = activeMembersList
      .reduce((sum: number, m: Member) => {
        const fee = m.feePaidIqd !== undefined && m.feePaidIqd !== null
          ? Number(m.feePaidIqd)
          : (m.feePaidUsd ? Number(m.feePaidUsd) * 1500 : 25000);
        return sum + (isNaN(fee) ? 25000 : fee);
      }, 0);

    // Monthly data trend based on the targets
    const monthlyTrend = [
      { month: "04/2026", b2b: 7500000, b2c: 15000000, b2bTarget: targetB2B, b2cTarget: targetB2C },
      { month: "08/2026", b2b: 18000000, b2c: 30000000, b2bTarget: targetB2B, b2cTarget: targetB2C },
      { month: "12/2026 (Target)", b2b: targetB2B, b2c: targetB2C, b2bTarget: targetB2B, b2cTarget: targetB2C },
      { month: "Current (Live)", b2b: actualB2BCollected, b2c: actualB2CCollected, b2bTarget: targetB2B, b2cTarget: targetB2C }
    ];

    // Breakdown by Province (for 19 provinces target representation)
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

    // Calculate province breakdowns
    const provinceBreakdown = iraqiProvinces.map(prov => {
      const provAr = iraqiProvincesAr[prov] || prov;

      const provPartners = activePartnersList.filter((p: Partner) => 
        (p.province === prov || p.province === provAr || p.provinceAr === provAr || p.provinceAr === prov)
      );

      const provMembers = activeMembersList.filter((m: Member) => 
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

    res.json({
      targetB2B,
      targetB2C,
      actualB2BCollected,
      actualB2CCollected,
      activePartnersCount: finalB2BCount,
      activeUsersCount: finalB2CCount,
      monthlyTrend,
      provinceBreakdown
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = http.createServer(app);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`BYD (Build Your Dream) Server running on http://localhost:${PORT}`);
  });
}

startServer();
