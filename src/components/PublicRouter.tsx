import React from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import InfiniteCarousel from "./InfiniteCarousel";
import UserRegistration from "./UserRegistration";
import CardVerification from "./CardVerification";
import GoogleMapsSection from "./GoogleMapsSection";
import Footer from "./Footer";
import { Language, Branding } from "../types";

interface PublicRouterProps {
  lang: Language;
  setLang: (lang: Language) => void;
  branding: Branding | null;
}

export default function PublicRouter({
  lang,
  setLang,
  branding,
}: PublicRouterProps) {
  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans flex flex-col justify-between relative" id="public-router-root">
      {/* Public Navbar */}
      <Navbar
        lang={lang}
        setLang={setLang}
        isAdmin={false}
        isAdminLoggedIn={false}
        setShowAdminLogin={() => {}}
        setTab={() => {}}
        tab="landing"
        hideAdminTrigger={true}
      />

      {/* Main Content Sections */}
      <main className="flex-grow">
        <Hero lang={lang} />
        <InfiniteCarousel lang={lang} />
        <GoogleMapsSection lang={lang} />
        <UserRegistration lang={lang} />
        <CardVerification lang={lang} />
      </main>

      {/* Footer with Owning Companies (dynamic brand state) */}
      <Footer lang={lang} branding={branding} />
    </div>
  );
}
