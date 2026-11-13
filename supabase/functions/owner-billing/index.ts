import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "npm:md5@2.3.0";

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
type Subscription = {
  id: string;
  restaurant_id: string;
  status: string;
  currency: string;
  admin_fee_amount_cents: number;
  monthly_amount_cents: number;
  pilot_started_at: string | null;
  pilot_ends_at: string | null;
  admin_fee_paid_at: string | null;
  subscription_started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  cancelled_at: string | null;
  last_payment_at: string | null;
  last_payment_status: string | null;
};

function payfastConfiguration() {
  const mode = (Deno.env.get("PAYFAST_MODE") ?? "").toLowerCase();
  const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID") ?? "";
  const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY") ?? "";
  const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";
  const returnUrl = Deno.env.get("PAYFAST_RETURN_URL") ?? "";
  const cancelUrl = Deno.env.get("PAYFAST_CANCEL_URL") ?? "";
  const notifyUrl = Deno.env.get("PAYFAST_NOTIFY_URL") ?? "";
  const explicitlyEnabled = Deno.env.get("PAYFAST_LIVE_BILLING_ENABLED") === "true";
  const configured = Boolean(merchantId && merchantKey && passphrase && returnUrl && cancelUrl && notifyUrl);
  return {
    mode,
    merchantId,
    merchantKey,
    passphrase,
    returnUrl,
    cancelUrl,
    notifyUrl,
    onlinePaymentAvailable: configured && mode === "live" && explicitlyEnabled,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function payfastEncode(value: string) {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, char => "%" + char.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/gi, match => match.toUpperCase());
}

function nextMonthDate() {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return next.toISOString().slice(0, 10);
}

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
  const payment = payfastConfiguration();
  if (!restaurantIds.length) {
    return reply(200, {
      businesses: [],
      online_payment_available: payment.onlinePaymentAvailable,
      message: "Your trial and continuation details will appear when you have owner or manager access to a restaurant.",
    });
  }

  const [{ data: restaurants, error: restaurantError }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
    db.from("restaurants").select("id,name").in("id", restaurantIds),
    db.from("billing_subscriptions").select("id,restaurant_id,status,currency,admin_fee_amount_cents,monthly_amount_cents,pilot_started_at,pilot_ends_at,admin_fee_paid_at,subscription_started_at,current_period_start,current_period_end,next_billing_at,cancelled_at,last_payment_at,last_payment_status").in("restaurant_id", restaurantIds),
  ]);
  if (restaurantError || subscriptionError) throw new Error("Could not load your trial and subscription details.");
  const subscriptionRows = (subscriptions ?? []) as Subscription[];
  const subscriptionIds = subscriptionRows.map(entry => entry.id);
  const { data: invoices, error: invoiceError } = subscriptionIds.length
    ? await db.from("billing_invoices").select("id,subscription_id,invoice_type,amount_cents,currency,status,due_at,paid_at,created_at").in("subscription_id", subscriptionIds).in("invoice_type", ["admin_fee", "monthly_subscription"]).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (invoiceError) throw new Error("Could not load your continuation-payment details.");

  const byRestaurant = new Map(subscriptionRows.map(entry => [entry.restaurant_id, entry]));
  const bySubscription = new Map<string, Record<string, unknown>>();
  for (const invoice of (invoices ?? []) as Record<string, unknown>[]) {
    const id = String(invoice.subscription_id);
    if (!bySubscription.has(id) && invoice.invoice_type === "admin_fee") bySubscription.set(id, invoice);
  }
  const restaurantNames = new Map((restaurants ?? []).map((restaurant: Record<string, unknown>) => [String(restaurant.id), String(restaurant.name ?? "Restaurant")]));
  return reply(200, {
    businesses: memberships.map(membership => {
      const subscription = byRestaurant.get(membership.restaurant_id) ?? null;
      return {
        restaurant_id: membership.restaurant_id,
        restaurant_name: restaurantNames.get(membership.restaurant_id) ?? "Your restaurant",
        member_role: membership.member_role,
        subscription,
        admin_fee_invoice: subscription ? bySubscription.get(subscription.id) ?? null : null,
      };
    }),
    online_payment_available: payment.onlinePaymentAvailable,
    message: payment.onlinePaymentAvailable
      ? "Secure PayFast continuation payment is available to restaurant owners after the pilot ends."
      : "Secure continuation payment is not enabled yet. No payment can be taken from this dashboard until Takeaways Tonight enables its verified PayFast merchant account.",
  });
}

async function createContinuationCheckout(userId: string, body: Record<string, unknown>) {
  const payment = payfastConfiguration();
  if (!payment.onlinePaymentAvailable) {
    return reply(409, { error: "Secure online continuation payment is not enabled yet. No payment was started." });
  }
  const restaurantId = String(body.restaurantId ?? "");
  const payerEmail = String(body.payerEmail ?? "").trim().toLowerCase();
  if (!isUuid(restaurantId)) return reply(400, { error: "Choose a valid restaurant." });
  if (payerEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
    return reply(400, { error: "Enter a valid billing contact email address." });
  }
  const memberships = await ownerMemberships(userId);
  if (!memberships.some(entry => entry.restaurant_id === restaurantId && entry.member_role === "owner")) {
    return reply(403, { error: "Only the verified restaurant owner can start the continuation payment." });
  }
  const { data: subscription, error: subscriptionError } = await db.from("billing_subscriptions")
    .select("id,status,pilot_ends_at,admin_fee_amount_cents,monthly_amount_cents,currency")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (subscriptionError || !subscription) return reply(404, { error: "Your trial record could not be found." });
  if (!subscription.pilot_ends_at || new Date(subscription.pilot_ends_at).getTime() > Date.now()) {
    return reply(409, { error: "Your free 14-day pilot has not ended yet. No payment is due today." });
  }
  const { data: invoice, error: invoiceError } = await db.from("billing_invoices")
    .select("id,invoice_type,amount_cents,currency,status,due_at,checkout_reference")
    .eq("subscription_id", subscription.id)
    .eq("invoice_type", "admin_fee")
    .maybeSingle();
  if (invoiceError || !invoice) return reply(404, { error: "Your once-off administration invoice could not be found." });
  if (invoice.status !== "pending" || invoice.amount_cents !== 25000 || invoice.currency !== "ZAR") {
    return reply(409, { error: "This continuation payment is not available. Refresh your dashboard for the latest status." });
  }
  if (new Date(invoice.due_at).getTime() > Date.now()) {
    return reply(409, { error: "The R250 once-off administration fee is not due yet." });
  }

  const data: Record<string, string> = {
    merchant_id: payment.merchantId,
    merchant_key: payment.merchantKey,
    return_url: payment.returnUrl,
    cancel_url: payment.cancelUrl,
    notify_url: payment.notifyUrl,
    email_address: payerEmail,
    m_payment_id: String(invoice.checkout_reference),
    amount: "250.00",
    item_name: "Takeaways Tonight - Restaurant Continuation",
    item_description: "R250 once-off administration fee, then R500 monthly restaurant subscription.",
    subscription_type: "1",
    billing_date: nextMonthDate(),
    recurring_amount: "500.00",
    frequency: "3",
    cycles: "0",
    subscription_notify_buyer: "true",
  };
  const signatureString = Object.entries(data)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => key + "=" + payfastEncode(value))
    .join("&") + "&passphrase=" + payfastEncode(payment.passphrase);
  const form = new URLSearchParams({ ...data, signature: md5(signatureString) });
  const payfastResponse = await fetch("https://www.payfast.co.za/onsite/process", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const text = await payfastResponse.text();
  let result: Record<string, unknown> = {};
  try { result = JSON.parse(text); } catch { /* Provider error stays server-side. */ }
  const uuid = typeof result.uuid === "string" ? result.uuid : "";
  if (!payfastResponse.ok || !uuid) {
    console.error("PayFast live continuation checkout could not be created", payfastResponse.status, text.slice(0, 500));
    return reply(502, { error: "PayFast could not open a secure checkout. No payment was started. Please try again later." });
  }
  return reply(200, {
    uuid,
    amount: "250.00",
    message: "Secure PayFast checkout opened. The R500 monthly subscription begins one month after a successful continuation payment.",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });
  try {
    const auth = await signedInUser(req);
    if (auth.error) return auth.error;
    const body = await req.json();
    const action = String(body.action ?? "");
    if (action === "get_my_billing") return await getMyBilling(auth.user!.id);
    if (action === "create_continuation_checkout") return await createContinuationCheckout(auth.user!.id, body);
    return reply(400, { error: "Unknown owner billing action." });
  } catch (error) {
    console.error("Owner billing error", error);
    return reply(500, { error: "Your billing details could not be loaded right now. Please try again." });
  }
});
