import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function administrator(req: Request) {
  const bearer = req.headers.get("Authorization") ?? "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token) return { error: reply(401, { error: "Administrator sign-in is required." }) };
  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return { error: reply(401, { error: "Your sign-in session is invalid or expired." }) };
  const [{ data: adminUser }, { data: platformAdmin }] = await Promise.all([
    admin.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle(),
    admin.from("platform_admins").select("user_id").eq("user_id", data.user.id).maybeSingle(),
  ]);
  if (!adminUser && !platformAdmin) return { error: reply(403, { error: "Platform administrator access is required." }) };
  return { user: data.user };
}

async function listBilling() {
  const [{ data: restaurants, error: restaurantsError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    admin.from("restaurants").select("id,name,area,province,category,is_published").order("name"),
    admin.from("billing_subscriptions").select("id,restaurant_id,status,pilot_started_at,pilot_ends_at,cancelled_at").order("created_at", { ascending: false }),
  ]);
  if (restaurantsError || subscriptionsError) throw new Error("Could not load platform pilot records.");
  const byRestaurant = new Map((subscriptions ?? []).map(entry => [String(entry.restaurant_id), entry]));
  return reply(200, {
    restaurants: (restaurants ?? []).map(restaurant => ({
      ...restaurant,
      subscription: byRestaurant.get(String(restaurant.id)) ?? null,
    })),
  });
}

async function startTrial(restaurantId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(restaurantId)) return reply(400, { error: "Choose a valid food business." });
  const { data: restaurant, error: restaurantError } = await admin.from("restaurants")
    .select("id,is_published").eq("id", restaurantId).maybeSingle();
  if (restaurantError || !restaurant || restaurant.is_published !== true) {
    return reply(404, { error: "Only an approved and published food business can start a pilot." });
  }
  const { data: existing, error: existingError } = await admin.from("billing_subscriptions")
    .select("id,pilot_started_at").eq("restaurant_id", restaurantId).maybeSingle();
  if (existingError) throw new Error("Could not check the existing pilot record.");
  if (existing?.pilot_started_at) return reply(409, { error: "This business has already started its 14-day pilot. The pilot cannot be restarted." });

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
  const { error: saveError } = await admin.from("billing_subscriptions").upsert({
    restaurant_id: restaurantId,
    status: "trialing",
    currency: "ZAR",
    admin_fee_amount_cents: 25000,
    monthly_amount_cents: 50000,
    pilot_started_at: startedAt.toISOString(),
    pilot_ends_at: endsAt.toISOString(),
    next_billing_at: null,
    updated_at: startedAt.toISOString(),
  }, { onConflict: "restaurant_id" });
  if (saveError) throw new Error("Could not start the 14-day pilot.");
  return reply(200, { message: "The 14-day pilot has started. No platform payment or invoice has been created." });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });
  try {
    const access = await administrator(req);
    if (access.error) return access.error;
    const body = await req.json();
    const action = String(body.action ?? "");
    if (action === "payment_config_status") {
      return reply(200, {
        payment_collection_enabled: false,
        message: "No platform payment provider is active. No platform payment can be collected.",
      });
    }
    if (action === "list_billing") return await listBilling();
    if (action === "start_trial") return await startTrial(String(body.restaurantId ?? ""));
    return reply(400, { error: "This platform-plan action is unavailable while billing is being rebuilt." });
  } catch (error) {
    console.error("Platform plan error", error);
    return reply(500, { error: "Platform plan records could not be loaded right now." });
  }
});
