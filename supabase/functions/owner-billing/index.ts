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
const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Membership = { restaurant_id: string; member_role: string };

async function signedInUser(req: Request) {
  const bearer = req.headers.get("Authorization") ?? "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token) return { error: reply(401, { error: "Please sign in to your restaurant dashboard." }) };
  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return { error: reply(401, { error: "Your sign-in session is invalid or expired." }) };
  return { user: data.user };
}

async function ownerMemberships(userId: string) {
  const { data, error } = await db.from("restaurant_members")
    .select("restaurant_id,member_role")
    .eq("user_id", userId)
    .in("member_role", ["owner", "manager"]);
  if (error) throw new Error("Could not load your restaurant access.");
  return (data ?? []) as Membership[];
}

async function getMyBilling(userId: string) {
  const memberships = await ownerMemberships(userId);
  const restaurantIds = memberships.map(entry => entry.restaurant_id);
  if (!restaurantIds.length) {
    return reply(200, {
      businesses: [],
      platform_payment_collection_enabled: false,
      message: "Your pilot details will appear when you have owner or manager access to a restaurant. No platform payment is collected from this dashboard.",
    });
  }

  const [{ data: restaurants, error: restaurantError }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
    db.from("restaurants").select("id,name").in("id", restaurantIds),
    db.from("billing_subscriptions").select("id,restaurant_id,status,pilot_started_at,pilot_ends_at,cancelled_at").in("restaurant_id", restaurantIds),
  ]);
  if (restaurantError || subscriptionError) throw new Error("Could not load your pilot details.");
  const byRestaurant = new Map((subscriptions ?? []).map(entry => [String(entry.restaurant_id), entry]));
  const restaurantNames = new Map((restaurants ?? []).map(entry => [String(entry.id), String(entry.name ?? "Your restaurant")]));

  return reply(200, {
    businesses: memberships.map(membership => ({
      restaurant_id: membership.restaurant_id,
      restaurant_name: restaurantNames.get(membership.restaurant_id) ?? "Your restaurant",
      member_role: membership.member_role,
      subscription: byRestaurant.get(membership.restaurant_id) ?? null,
    })),
    platform_payment_collection_enabled: false,
    message: "Platform continuation billing is being rebuilt. No platform payment is collected from this dashboard.",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });
  try {
    const auth = await signedInUser(req);
    if (auth.error) return auth.error;
    const body = await req.json();
    if (String(body.action ?? "") === "get_my_billing") return await getMyBilling(auth.user!.id);
    return reply(400, { error: "This platform-plan action is unavailable while billing is being rebuilt." });
  } catch (error) {
    console.error("Owner plan status error", error);
    return reply(500, { error: "Your pilot details could not be loaded right now. Please try again." });
  }
});
