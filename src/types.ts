export interface Member {
  id: string;
  fullName: string;
  fullNameAr: string;
  cardId: string;
  province: string;
  provinceAr: string;
  registrationDate: string;
  expiryDate: string;
  status: "Active" | "Inactive";
  tier: "B2C";
  feePaidIqd: number;
  feePaidUsd: number;
  nearestLandmark?: string;
  durationMonths?: number;
}

export interface Partner {
  id: string;
  companyName: string;
  companyNameAr: string;
  sector: string;
  sectorAr: string;
  logoUrl: string;
  promoVideoUrl: string;
  province: string;
  provinceAr: string;
  expiryDate: string;
  status: "Active" | "Inactive";
  tier: "B2B";
  feePaidIqd?: number;
  feePaidUsd: number;
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

export interface FinancialStats {
  targetB2B: number;
  targetB2C: number;
  actualB2BCollected: number;
  actualB2CCollected: number;
  activePartnersCount: number;
  activeUsersCount: number;
  monthlyTrend: {
    month: string;
    b2b: number;
    b2c: number;
    b2bTarget: number;
    b2cTarget: number;
  }[];
  provinceBreakdown: {
    province: string;
    provinceAr: string;
    partners: number;
    users: number;
    collectedB2B: number;
    collectedB2C: number;
    targetPartners: number;
    targetUsers: number;
  }[];
}

export type Language = "en" | "ar";

export interface Branding {
  company1Name: string;
  company1NameAr: string;
  company1Desc: string;
  company1DescAr: string;
  company1Logo: string;
  
  company2Name: string;
  company2NameAr: string;
  company2Desc: string;
  company2DescAr: string;
  company2Logo: string;
}

export interface CardAsset {
  id: string;
  cardId: string;
  status: "Active" | "Inactive";
  memberId: string;
}

export interface ViewerAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  createdAt: string;
  notes?: string;
  status: "Active" | "Inactive";
}
