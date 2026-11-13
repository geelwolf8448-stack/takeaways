import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "npm:md5@2.3.0";

const corsHeaders = { "Content-Type": "application/json" };
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// PayFast's published ITN networks. Keep this list aligned with PayFast before enabling live billing.
const payfastNetworks = [
  ["197.97.145.144", 28],
  ["41.74.179.192", 27],
  ["102.216.36.0", 28],
  ["102.216.36.128", 28],
  ["144.126.193.139", 32],
] as const;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let output = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    output = ((output << 8) | Number(part)) >>> 0;
  }
  return output;
}

function fromPayfastNetwork(ip: string) {
  const value = ipv4ToInt(ip.trim());
  if (value === null) return false;
  return payfastNetworks.some(([network, bits]) => {
    const base = ipv4ToInt(network)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (base & mask);
  });
}

function payfastEncode(value: string) {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, char => "%" + char.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/gi, match => match.toUpperCase());
}

function cents(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : NaN;
}

function plusOneMonth() {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

type ResolvedPayment = {
  kind: "admin_fee" | "monthly_subscription";
  subscription: Record<string, unknown>;
  invoice: Record<string, unknown> | null;
};

async function resolvePayment(data: Record<string, string>, amountCents: number): Promise<ResolvedPayment | null> {
  const paymentReference = data.m_payment_id ?? "";
  const token = data.token ?? "";
  const { data: invoice, error: invoiceError } = paymentReference
    ? await db.from("billing_invoices").select("id,subscription_id,invoice_type,amount_cents,status,checkout_reference").eq("checkout_reference", paymentReference).maybeSingle()
    : { data: null, error: null };
  if (invoiceError) throw new Error("Could not look up the payment reference.");

  if (invoice) {
    const { data: subscription, error: subscriptionError } = await db.from("billing_subscriptions")
      .select("id,status,pilot_ends_at,admin_fee_amount_cents,monthly_amount_cents,payfast_subscription_token")
      .eq("id", invoice.subscription_id)
      .maybeSingle();
    if (subscriptionError || !subscription) return null;
    if (invoice.invoice_type === "admin_fee" && amountCents === invoice.amount_cents) {
      return { kind: "admin_fee", subscription, invoice };
    }
    if (token && subscription.payfast_subscription_token === token && amountCents === subscription.monthly_amount_cents) {
      return { kind: "monthly_subscription", subscription, invoice: null };
    }
  }

  if (!token) return null;
  const { data: subscription, error: subscriptionError } = await db.from("billing_subscriptions")
    .select("id,status,pilot_ends_at,admin_fee_amount_cents,monthly_amount_cents,payfast_subscription_token")
    .eq("payfast_subscription_token", token)
    .maybeSingle();
  if (subscriptionError || !subscription || amountCents !== subscription.monthly_amount_cents) return null;
  return { kind: "monthly_subscription", subscription, invoice: null };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply(405, { error: "POST only." });
  try {
    const mode = (Deno.env.get("PAYFAST_MODE") ?? "").toLowerCase();
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID") ?? "";
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";
    if (!merchantId || !passphrase || !["sandbox", "live"].includes(mode)) {
      return reply(503, { error: "Payment receiver is not configured." });
    }

    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const data: Record<string, string> = {};
    for (const [key, value] of params.entries()) data[key] = value;
    const sourceIp = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ??
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    if (!sourceIp || !fromPayfastNetwork(sourceIp)) return reply(403, { error: "Untrusted payment notification source." });
    if (!data.signature || !data.pf_payment_id || !data.merchant_id) {
      return reply(400, { error: "Required payment fields are missing." });
    }
    if (data.merchant_id !== merchantId) return reply(400, { error: "Merchant mismatch." });

    const signedPairs: string[] = [];
    for (const [key, value] of params.entries()) {
      if (key === "signature") break;
      signedPairs.push(key + "=" + payfastEncode(value));
    }
    const signedPayload = signedPairs.join("&");
    const expectedSignature = md5(signedPayload + "&passphrase=" + payfastEncode(passphrase));
    if (data.signature.toLowerCase() !== expectedSignature) return reply(400, { error: "Invalid payment signature." });

    const payfastHost = mode === "sandbox" ? "sandbox.payfast.co.za" : "www.payfast.co.za";
    const validation = await fetch("https://" + payfastHost + "/eng/query/validate", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: signedPayload,
    });
    if (!validation.ok || (await validation.text()).trim() !== "VALID") {
      return reply(400, { error: "PayFast server validation failed." });
    }

    const receivedCents = cents(data.amount_gross ?? "");
    if (!Number.isFinite(receivedCents)) return reply(400, { error: "Payment amount is invalid." });
    const resolved = await resolvePayment(data, receivedCents);
    if (!resolved) return reply(404, { error: "Payment reference, amount or subscription could not be verified." });

    const providerEventId = String(data.pf_payment_id);
    const { data: existingEvent } = await db.from("billing_payment_events")
      .select("id,processed_at").eq("provider_event_id", providerEventId).maybeSingle();
    if (existingEvent?.processed_at) return reply(200, { received: true, duplicate: true });
    if (!existingEvent) {
      const { error: eventError } = await db.from("billing_payment_events").insert({
        provider: "payfast",
        provider_event_id: providerEventId,
        invoice_id: resolved.invoice?.id ?? null,
        event_type: data.payment_status ?? "UNKNOWN",
        verification_status: "verified",
        amount_cents: receivedCents,
        received_at: new Date().toISOString(),
      });
      if (eventError && eventError.code !== "23505") {
        console.error("Could not record verified payment event", eventError);
        return reply(500, { error: "Could not record payment event." });
      }
    }

    const now = new Date().toISOString();
    if (data.payment_status === "COMPLETE") {
      if (resolved.kind === "admin_fee") {
        if (resolved.invoice) {
          const { error: invoiceError } = await db.from("billing_invoices").update({
            status: "paid",
            paid_at: now,
            provider_payment_id: providerEventId,
            updated_at: now,
          }).eq("id", resolved.invoice.id).neq("status", "paid");
          if (invoiceError) return reply(500, { error: "Payment verified but the invoice could not be updated." });
        }
        const period = plusOneMonth();
        const token = data.token ?? null;
        const { error: subscriptionError } = await db.from("billing_subscriptions").update({
          admin_fee_paid_at: now,
          status: token ? "active" : "admin_fee_paid",
          subscription_started_at: now,
          current_period_start: period.start,
          current_period_end: period.end,
          next_billing_at: period.end,
          payfast_subscription_token: token,
          payfast_subscription_status: token ? "active" : null,
          last_payment_at: now,
          last_payment_status: "COMPLETE",
          updated_at: now,
        }).eq("id", resolved.subscription.id);
        if (subscriptionError) return reply(500, { error: "Payment verified but the subscription could not be activated." });
      } else {
        const period = plusOneMonth();
        const { error: subscriptionError } = await db.from("billing_subscriptions").update({
          status: "active",
          current_period_start: period.start,
          current_period_end: period.end,
          next_billing_at: period.end,
          last_payment_at: now,
          last_payment_status: "COMPLETE",
          payfast_subscription_status: "active",
          updated_at: now,
        }).eq("id", resolved.subscription.id);
        if (subscriptionError) return reply(500, { error: "Recurring payment verified but the subscription could not be renewed." });
      }
    } else {
      const cancelled = data.payment_status === "CANCELLED";
      await db.from("billing_subscriptions").update({
        last_payment_status: data.payment_status ?? "UNKNOWN",
        payfast_subscription_status: cancelled ? "cancelled" : undefined,
        updated_at: now,
      }).eq("id", resolved.subscription.id);
    }

    await db.from("billing_payment_events").update({ processed_at: now, verification_status: "processed" })
      .eq("provider_event_id", providerEventId);
    return reply(200, { received: true });
  } catch (error) {
    console.error("PayFast ITN processing error", error);
    return reply(500, { error: "Payment notification processing failed." });
  }
});
