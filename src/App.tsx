import React, { useState, useEffect } from "react";
import PublicRouter from "./components/PublicRouter";
import PartnerRouter from "./components/PartnerRouter";
import SecureAdminRouter from "./components/SecureAdminRouter";
import { Language, Branding } from "./types";
import { safeSetLocalStorage } from "./lib/storage";

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("byd-lang");
    return (saved as Language) || "en";
  });

  const [branding, setBranding] = useState<Branding | null>(null);

  // Initialize and Seed Data block - Cold-Start Initialization
  useEffect(() => {
    if (!localStorage.getItem('BYD_COMPANIES')) safeSetLocalStorage('BYD_COMPANIES', JSON.stringify([]));
    if (!localStorage.getItem('BYD_USERS')) safeSetLocalStorage('BYD_USERS', JSON.stringify([]));
    if (!localStorage.getItem('byd-custom-members')) safeSetLocalStorage('byd-custom-members', JSON.stringify([]));
    if (!localStorage.getItem('byd-custom-partners')) safeSetLocalStorage('byd-custom-partners', JSON.stringify([]));

    const hasPersistentState = localStorage.getItem("BYD_BRAND_PERSISTENT_STATE");
    if (!hasPersistentState) {
      const defaultPersistentFormat = {
        entity1NameEn: "Babil Food Store",
        entity1NameAr: "مخزن بابل للأغذية",
        entity1DescEn: "B2B Partner",
        entity1DescAr: "شريك تجاري",
        entity1Logo: "",
        entity2NameEn: "Rafidain Cafe",
        entity2NameAr: "مقهى الرافدين",
        entity2DescEn: "B2C User Hub",
        entity2DescAr: "مركز مستخدمين",
        entity2Logo: ""
      };
      safeSetLocalStorage("BYD_BRAND_PERSISTENT_STATE", JSON.stringify(defaultPersistentFormat));
    }
    
    window.dispatchEvent(new Event("storage-sync-updated"));
  }, []);

  // Sync language with localStorage & set document direction
  useEffect(() => {
    safeSetLocalStorage("byd-lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  // Fetch dynamic branding configuration with immediate localStorage fallback
  useEffect(() => {
    const persistentSaved = localStorage.getItem("BYD_BRAND_PERSISTENT_STATE");
    const saved = localStorage.getItem("byd-custom-branding");
    
    if (persistentSaved) {
      try {
        const brandData = JSON.parse(persistentSaved);
        setBranding({
          company1Name: brandData.entity1NameEn || "",
          company1NameAr: brandData.entity1NameAr || "",
          company1Desc: brandData.entity1DescEn || "",
          company1DescAr: brandData.entity1DescAr || "",
          company1Logo: brandData.entity1Logo || "",
          company2Name: brandData.entity2NameEn || "",
          company2NameAr: brandData.entity2NameAr || "",
          company2Desc: brandData.entity2DescEn || "",
          company2DescAr: brandData.entity2DescAr || "",
          company2Logo: brandData.entity2Logo || ""
        });
      } catch (e) {
        console.error("Error parsing BYD_BRAND_PERSISTENT_STATE:", e);
      }
    } else if (saved) {
      try {
        setBranding(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved branding:", e);
      }
    }

    fetch("/api/branding")
      .then(res => res.json())
      .then(data => {
        const localCustomStr = localStorage.getItem("byd-custom-branding");
        if (localCustomStr) {
          try {
            const localCustom = JSON.parse(localCustomStr);
            // Check if server branding has default fallback names, and if local has different/custom names or base64 logos
            const isServerDefault = data.company1Name === "TAJ Marketing" && data.company2Name === "GeniusWings Group" && (!data.company1Logo || !data.company1Logo.startsWith("data:image"));
            const isLocalCustomized = localCustom.company1Name !== "TAJ Marketing" || localCustom.company2Name !== "GeniusWings Group" || (localCustom.company1Logo && localCustom.company1Logo.startsWith("data:image")) || (localCustom.company2Logo && localCustom.company2Logo.startsWith("data:image"));
            
            if (isServerDefault && isLocalCustomized) {
              console.log("Self-healing: Restoring custom local branding back to server...");
              fetch("/api/branding", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "x-local-sync": "true"
                },
                body: JSON.stringify(localCustom)
              }).catch(err => console.error("Error restoring branding to server:", err));
              
              setBranding(localCustom);
              return; // Retain custom local branding, prevent server defaults from overwriting
            }
          } catch (e) {
            console.error("Error parsing local custom branding during check:", e);
          }
        }

        if (data && data.company1Name) {
          setBranding(data);
          localStorage.setItem("byd-custom-branding", JSON.stringify(data));
          
          const persistentFormat = {
            entity1NameEn: data.company1Name,
            entity1NameAr: data.company1NameAr,
            entity1DescEn: data.company1Desc,
            entity1DescAr: data.company1DescAr,
            entity1Logo: data.company1Logo,
            entity2NameEn: data.company2Name,
            entity2NameAr: data.company2NameAr,
            entity2DescEn: data.company2Desc,
            entity2DescAr: data.company2DescAr,
            entity2Logo: data.company2Logo
          };
          localStorage.setItem("BYD_BRAND_PERSISTENT_STATE", JSON.stringify(persistentFormat));
        }
      })
      .catch(err => console.error("Error fetching branding:", err));
  }, []);

  // Self-healing synchronization and data restoration for ephemeral environments
  useEffect(() => {
    const syncDatabase = async () => {
      try {
        // Fetch current server data and deletions
        const [membersRes, partnersRes, deletionsRes] = await Promise.all([
          fetch("/api/members").then(res => res.json()),
          fetch("/api/partners").then(res => res.json()),
          fetch("/api/deletions").then(res => res.json()).catch(() => ({ deletedMembers: [], deletedPartners: [] }))
        ]);

        const serverMembers = Array.isArray(membersRes) ? membersRes : [];
        const serverPartners = Array.isArray(partnersRes) ? partnersRes : [];
        const deletedMembers = Array.isArray(deletionsRes?.deletedMembers) ? deletionsRes.deletedMembers : [];
        const deletedPartners = Array.isArray(deletionsRes?.deletedPartners) ? deletionsRes.deletedPartners : [];

        // Combine server and local deleted records
        const localDeletedM = JSON.parse(localStorage.getItem("BYD_DELETED_MEMBERS") || "[]");
        const localDeletedP = JSON.parse(localStorage.getItem("BYD_DELETED_PARTNERS") || "[]");

        const allDeletedMembers = Array.from(new Set([
          ...deletedMembers.map((s: string) => String(s).toLowerCase()),
          ...localDeletedM.map((s: string) => String(s).toLowerCase())
        ]));

        const allDeletedPartners = Array.from(new Set([
          ...deletedPartners.map((s: string) => String(s).toLowerCase()),
          ...localDeletedP.map((s: string) => String(s).toLowerCase())
        ]));

        const isMemberDeleted = (m: any) => {
          const cardId = (m.cardId || "").toLowerCase();
          const id = (m.id || "").toLowerCase();
          return allDeletedMembers.includes(cardId) || allDeletedMembers.includes(id);
        };

        const isPartnerDeleted = (p: any) => {
          const cn = (p.companyName || "").toLowerCase();
          const un = (p.username || "").toLowerCase();
          const id = (p.id || "").toLowerCase();
          return allDeletedPartners.includes(cn) || allDeletedPartners.includes(un) || allDeletedPartners.includes(id);
        };

        // Clean up deleted members from localStorage
        const m1 = JSON.parse(localStorage.getItem("byd-custom-members") || "[]").filter(
          (m: any) => !isMemberDeleted(m)
        );
        const m2 = JSON.parse(localStorage.getItem("BYD_USERS") || "[]").filter(
          (m: any) => !isMemberDeleted(m)
        );
        safeSetLocalStorage("byd-custom-members", JSON.stringify(m1));
        safeSetLocalStorage("BYD_USERS", JSON.stringify(m2));

        // Clean up deleted partners from localStorage
        const p1 = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]").filter(
          (p: any) => !isPartnerDeleted(p)
        );
        const p2 = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]").filter(
          (p: any) => !isPartnerDeleted(p)
        );
        safeSetLocalStorage("byd-custom-partners", JSON.stringify(p1));
        safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(p2));

        // 1. Sync B2C Members from Local to Server
        const localMembers = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
        const missingMembers = localMembers.filter((lm: any) => 
          !isMemberDeleted(lm) &&
          !serverMembers.some((sm: any) => 
            (sm.cardId && lm.cardId && sm.cardId.toLowerCase() === lm.cardId.toLowerCase()) ||
            (sm.id && lm.id && sm.id === lm.id)
          )
        );

        for (const member of missingMembers) {
          try {
            await fetch("/api/members", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(member)
            });
            console.log(`Auto-synchronized member to server: ${member.fullName}`);
          } catch (err) {
            console.error("Failed to sync member back:", err);
          }
        }

        // 2. Sync B2B Partners from Local to Server
        const localPartners = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
        const missingPartners = localPartners.filter((lp: any) => 
          !isPartnerDeleted(lp) &&
          !serverPartners.some((sp: any) => 
            (sp.companyName && lp.companyName && sp.companyName.toLowerCase() === lp.companyName.toLowerCase()) ||
            (sp.username && lp.username && sp.username.toLowerCase() === lp.username.toLowerCase()) ||
            (sp.id && lp.id && sp.id === lp.id)
          )
        );

        for (const partner of missingPartners) {
          try {
            await fetch("/api/partners/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(partner)
            });
            console.log(`Auto-synchronized partner to server: ${partner.companyName}`);
          } catch (err) {
            console.error("Failed to sync partner back:", err);
          }
        }

        // 3. Sync from Server to Local Storage (so Admin inputs and seeds are stored locally)
        let localMembersChanged = false;
        const currentLocalMembers = JSON.parse(localStorage.getItem("byd-custom-members") || "[]");
        const currentBydUsers = JSON.parse(localStorage.getItem("BYD_USERS") || "[]");

        let updatedCustomMembers = [...currentLocalMembers];
        let updatedBydUsers = [...currentBydUsers];

        serverMembers.forEach((sm: any) => {
          if (!isMemberDeleted(sm)) {
            if (!updatedCustomMembers.some((lm: any) => (sm.cardId && lm.cardId && sm.cardId.toLowerCase() === lm.cardId.toLowerCase()) || (sm.id && lm.id && sm.id === lm.id))) {
              updatedCustomMembers.push(sm);
              localMembersChanged = true;
            }
            if (!updatedBydUsers.some((lm: any) => (sm.cardId && lm.cardId && sm.cardId.toLowerCase() === lm.cardId.toLowerCase()) || (sm.id && lm.id && sm.id === lm.id))) {
              updatedBydUsers.push(sm);
              localMembersChanged = true;
            }
          }
        });

        if (localMembersChanged) {
          safeSetLocalStorage("byd-custom-members", JSON.stringify(updatedCustomMembers));
          safeSetLocalStorage("BYD_USERS", JSON.stringify(updatedBydUsers));
        }

        let localPartnersChanged = false;
        const currentLocalPartners = JSON.parse(localStorage.getItem("byd-custom-partners") || "[]");
        const currentBydCompanies = JSON.parse(localStorage.getItem("BYD_COMPANIES") || "[]");

        let updatedCustomPartners = [...currentLocalPartners];
        let updatedBydCompanies = [...currentBydCompanies];

        serverPartners.forEach((sp: any) => {
          if (!isPartnerDeleted(sp)) {
            if (!updatedCustomPartners.some((lp: any) => (sp.username && lp.username && sp.username.toLowerCase() === lp.username.toLowerCase()) || (sp.companyName && lp.companyName && sp.companyName.toLowerCase() === lp.companyName.toLowerCase()) || (sp.id && lp.id && sp.id === lp.id))) {
              updatedCustomPartners.push(sp);
              localPartnersChanged = true;
            }
            if (!updatedBydCompanies.some((lp: any) => (sp.username && lp.username && sp.username.toLowerCase() === lp.username.toLowerCase()) || (sp.companyName && lp.companyName && sp.companyName.toLowerCase() === lp.companyName.toLowerCase()) || (sp.id && lp.id && sp.id === lp.id))) {
              updatedBydCompanies.push(sp);
              localPartnersChanged = true;
            }
          }
        });

        if (localPartnersChanged) {
          safeSetLocalStorage("byd-custom-partners", JSON.stringify(updatedCustomPartners));
          safeSetLocalStorage("BYD_COMPANIES", JSON.stringify(updatedBydCompanies));
        }

        if (localMembersChanged || localPartnersChanged) {
          window.dispatchEvent(new Event("storage-sync-updated"));
          window.dispatchEvent(new Event("storage"));
        }

      } catch (e) {
        console.error("Database self-healing synchronization failed:", e);
      }
    };

    // Run sync after a brief delay to ensure server and main components are ready
    const timer = setTimeout(syncDatabase, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Simple physical & logical router
  const [currentRoute, setCurrentRoute] = useState(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === "/admin-secured-portal" || hash === "#/admin-secured-portal") {
      return "admin";
    }
    if (path === "/partners" || hash === "#/partners") {
      return "partners";
    }
    return "landing";
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === "/admin-secured-portal" || hash === "#/admin-secured-portal") {
        setCurrentRoute("admin");
      } else if (path === "/partners" || hash === "#/partners") {
        setCurrentRoute("partners");
      } else {
        setCurrentRoute("landing");
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    const interval = setInterval(handleLocationChange, 500);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  const handleUpdateBranding = (newBranding: Branding) => {
    setBranding(newBranding);
  };

  return (
    <>
      {currentRoute === "admin" && (
        <SecureAdminRouter
          lang={lang}
          setLang={setLang}
          branding={branding}
          setBranding={handleUpdateBranding}
        />
      )}

      {currentRoute === "partners" && (
        <PartnerRouter
          lang={lang}
          setLang={setLang}
          branding={branding}
        />
      )}

      {currentRoute !== "admin" && currentRoute !== "partners" && (
        <PublicRouter
          lang={lang}
          setLang={setLang}
          branding={branding}
        />
      )}
    </>
  );
}
