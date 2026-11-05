import { App } from "https://esm.sh/@capacitor/app@7.0.0";

const isNative = Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
if (isNative) {
  const client = window.TT_SUPABASE_CLIENT;
  const handledUrls = new Set();

  async function completeNativeSignIn(rawUrl) {
    if (!client || !rawUrl || handledUrls.has(rawUrl)) return;
    handledUrls.add(rawUrl);
    try {
      const url = new URL(rawUrl);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token") || url.searchParams.get("access_token");
      const refreshToken = hash.get("refresh_token") || url.searchParams.get("refresh_token");
      if (!accessToken || !refreshToken) {
        const error = hash.get("error_description") || url.searchParams.get("error_description");
        if (error) console.warn("Takeaways Tonight? sign-in link:", error);
        return;
      }

      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;

      const target = url.searchParams.get("target") === "restaurant"
        ? "restaurant-portal.html"
        : "account.html";
      const currentPage = location.pathname.split("/").pop() || "index.html";
      if (currentPage !== target) location.href = target;
    } catch (error) {
      console.error("Could not complete app sign-in:", error);
    }
  }

  App.addListener("appUrlOpen", ({ url }) => completeNativeSignIn(url));
  App.getLaunchUrl().then(result => {
    if (result?.url) completeNativeSignIn(result.url);
  }).catch(error => console.warn("Could not read app launch URL:", error));
}
