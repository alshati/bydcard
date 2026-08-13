export function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    console.warn(`localStorage.setItem failed for key '${key}'. Attempting quota recovery...`, e);
    // 1. Clear non-essential heavy cache
    try {
      localStorage.removeItem("BYD_CARD_MEDIA");
      localStorage.removeItem("BYD_CARD_TEMPLATE_ACTIVE_STATE");
    } catch (_) {}

    // 2. Try setting again
    try {
      localStorage.setItem(key, value);
      return;
    } catch (_) {}

    // 3. Sanitize large base64 strings if data is JSON
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const sanitized = parsed.map((item: any) => {
          const clone = { ...item };
          if (typeof clone.logoUrl === "string" && clone.logoUrl.startsWith("data:") && clone.logoUrl.length > 30000) {
            clone.logoUrl = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop";
          }
          if (typeof clone.promoVideoUrl === "string" && clone.promoVideoUrl.startsWith("data:")) {
            clone.promoVideoUrl = "";
          }
          if (typeof clone.cardDesignBase64 === "string" && clone.cardDesignBase64.length > 30000) {
            delete clone.cardDesignBase64;
          }
          return clone;
        });
        localStorage.setItem(key, JSON.stringify(sanitized));
      } else if (typeof parsed === "object" && parsed !== null) {
        const clone = { ...parsed };
        if (typeof clone.cardDesignBase64 === "string" && clone.cardDesignBase64.length > 30000) {
          delete clone.cardDesignBase64;
        }
        localStorage.setItem(key, JSON.stringify(clone));
      }
    } catch (parseErr) {
      console.error(`Unable to save key '${key}' to localStorage:`, parseErr);
    }
  }
}
