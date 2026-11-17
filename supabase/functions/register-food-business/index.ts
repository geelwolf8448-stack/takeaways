import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const auth = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const provinces = new Set([
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
]);
const businessTypes = new Set([
  "restaurant", "takeaway_shop", "home_based_takeaway", "inyama_shop", "coffee_shop",
]);

const text = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

const strongPassword = (value: string) =>
  value.length >= 12 && [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length >= 3;

const saPhone = (value: unknown) => {
  const digits = text(value, 40).replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return "27" + digits.slice(1);
  return /^27\d{9}$/.test(digits) ? digits : "";
};

const coordinates = (latitude: unknown, longitude: unknown) => {
  const lat = typeof latitude === "number" ? latitude : Number.NaN;
  const lon = typeof longitude === "number" ? longitude : Number.NaN;
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
    ? { latitude: lat, longitude: lon }
    : null;
};

const normaliseMenu = (value: unknown) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;
  const menu = value.map((item) => {
    const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const name = text(entry.name, 120);
    const category = text(entry.category, 40) || "Menu";
    const description = text(entry.description, 400);
    const price = typeof entry.price === "number" ? entry.price : Number(entry.price);
    const imageUrl = text(entry.image_url, 2000);
    if (!name || !Number.isFinite(price) || price < 0 || price > 100000 || (imageUrl && !/^https:\/\//i.test(imageUrl))) return null;
    return { name, category, description, price: Math.round(price * 100) / 100, image_url: imageUrl };
  });
  return menu.every(Boolean) ? menu : null;
};

async function fingerprint(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  return forwarded.split(",")[0].trim().slice(0, 100) || "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });

  try {
    const body = await req.json();
    if (text(body.website, 200)) {
      return reply(200, { message: "Thank you. Your application is being reviewed." });
    }

    const ownerName = text(body.ownerName, 120);
    const ownerPhone = saPhone(body.ownerPhone);
    const email = text(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const businessName = text(body.businessName, 120);
    const businessType = text(body.businessType, 40);
    const area = text(body.area, 100);
    const province = text(body.province, 40);
    const category = text(body.category, 60);
    const whatsapp = saPhone(body.whatsapp);
    const menu = normaliseMenu(body.menu);
    const location = coordinates(body.latitude, body.longitude);

    if (
      ownerName.length < 2 || !ownerPhone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !strongPassword(password) || password.length > 128 || businessName.length < 2 || !businessTypes.has(businessType) ||
      area.length < 2 || !provinces.has(province) || category.length < 2 || !whatsapp || !menu || !location
    ) {
      return reply(400, { error: "Please check the owner, business, menu and exact location details." });
    }

    const [emailFingerprint, ipFingerprint] = await Promise.all([fingerprint(email), fingerprint(clientIp(req))]);
    const { data: permitted, error: rateError } = await admin.rpc("record_restaurant_registration_attempt", {
      p_email_fingerprint: emailFingerprint,
      p_ip_fingerprint: ipFingerprint,
    });
    if (rateError) {
      console.error("Restaurant application rate-limit check failed.", rateError.code);
      return reply(503, { error: "The application service is temporarily unavailable. Please try again later." });
    }
    if (permitted !== true) {
      return reply(429, { error: "Please wait before submitting another application." });
    }

    const { data: signup, error: signupError } = await auth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://geelwolf8448-stack.github.io/takeaways/restaurant-portal.html",
        data: { full_name: ownerName, phone: ownerPhone },
      },
    });
    if (signupError || !signup.user || (Array.isArray(signup.user.identities) && signup.user.identities.length === 0)) {
      return reply(409, { error: "This email already has an account. Use the Restaurant Portal sign-in or contact support." });
    }

    const { error: applicationError } = await admin.from("partner_applications").insert({
      restaurant_name: businessName,
      area,
      province,
      category,
      whatsapp,
      menu,
      status: "pending",
      permission_confirmed: true,
      owner_user_id: signup.user.id,
      owner_name: ownerName,
      owner_phone: ownerPhone,
      owner_email: email,
      owner_email_confirmed_at: signup.user.email_confirmed_at || null,
      business_type: businessType,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    if (applicationError) {
      console.error("Restaurant application insert failed.", applicationError.code);
      return reply(503, { error: "Your owner account was created, but the application could not be saved. Contact support before trying again." });
    }

    return reply(201, {
      message: "Application received. Check your email and confirm your owner address. Your restaurant remains private until Takeaways Tonight verifies and approves it.",
    });
  } catch (error) {
    console.error("Restaurant application request failed.");
    return reply(400, { error: "The application could not be processed. Please check your details and try again." });
  }
});
