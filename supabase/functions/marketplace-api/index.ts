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

let fcmAccessToken: { value: string; expiresAt: number } | null = null;
const base64Url = (input: string | Uint8Array) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

async function getFcmAccessToken(serviceAccount: Record<string, string>) {
  if (fcmAccessToken && fcmAccessToken.expiresAt > Date.now() + 60000) return fcmAccessToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + "." + claim;
  const pem = serviceAccount.private_key.replace(/\r/g, "").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), ch => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = unsigned + "." + base64Url(signature);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Firebase OAuth token request failed.");
  fcmAccessToken = { value: result.access_token, expiresAt: Date.now() + 3500000 };
  return result.access_token as string;
}

async function sendNewOrderPush(restaurantId: string, orderId: string, orderNumber: number) {
  const rawCredentials = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!rawCredentials) return;
  try {
    const serviceAccount = JSON.parse(rawCredentials);
    const { data: members, error: memberError } = await admin.from("restaurant_members")
      .select("user_id").eq("restaurant_id", restaurantId);
    if (memberError || !members?.length) return;
    const userIds = [...new Set(members.map((member: { user_id: string }) => member.user_id))];
    const { data: devices, error: deviceError } = await admin.from("restaurant_push_tokens")
      .select("id,device_token").in("user_id", userIds);
    if (deviceError || !devices?.length) return;
    const accessToken = await getFcmAccessToken(serviceAccount);
    await Promise.all(devices.map(async (device: { id: string; device_token: string }) => {
      const response = await fetch("https://fcm.googleapis.com/v1/projects/" + serviceAccount.project_id + "/messages:send", {
        method: "POST",
        headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: device.device_token,
            notification: {
              title: "New customer order",
              body: "Order #" + orderNumber + " is waiting. Open Takeaways Tonight? to review."
            },
            data: { screen: "orders", orderId, orderNumber: String(orderNumber) },
            android: { priority: "HIGH", notification: { channel_id: "orders", sound: "default" } }
          }
        })
      });
      if (!response.ok) {
        const details = await response.text();
        console.error("FCM send failed for a registered device:", response.status, details.slice(0, 500));
        if (response.status === 404 || details.includes("UNREGISTERED")) {
          await admin.from("restaurant_push_tokens").delete().eq("id", device.id);
        }
      }
    }));
  } catch (error) {
    console.error("Background order notification could not be sent:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return reply(401, { error: "Sign in is required." });

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return reply(401, { error: "Your sign-in session is invalid or expired." });
    const user = userData.user;

    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "create_order") {
      const restaurantId = String(body.restaurantId ?? "");
      const customerName = String(body.customerName ?? "").trim();
      const phoneInput = String(body.customerPhone ?? "").replace(/\D/g, "");
      const customerPhone = phoneInput.startsWith("0") ? "27" + phoneInput.slice(1) : phoneInput;
      const fulfilmentType = String(body.fulfilmentType ?? "");
      const deliveryAddress = String(body.deliveryAddress ?? "").trim();
      const customerNotes = String(body.notes ?? "").trim().slice(0, 1000);
      const idempotencyKey = String(body.idempotencyKey ?? "");
      const items = body.items;

      if (!/^[0-9a-f-]{36}$/i.test(restaurantId)) return reply(400, { error: "Choose a valid restaurant." });
      if (customerName.length < 2 || customerName.length > 120) return reply(400, { error: "Enter your full name." });
      if (!/^27\d{9}$/.test(customerPhone)) return reply(400, { error: "Enter a valid South African mobile number." });
      if (!["collection", "delivery"].includes(fulfilmentType)) return reply(400, { error: "Choose collection or delivery." });
      if (fulfilmentType === "delivery" && deliveryAddress.length < 5) return reply(400, { error: "Enter your delivery address." });
      if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return reply(400, { error: "Refresh your basket and try again." });
      if (!Array.isArray(items) || items.length < 1 || items.length > 30) return reply(400, { error: "Your basket is empty or too large." });

      const { data: existing } = await admin.from("marketplace_orders")
        .select("id,order_number,status,total_cents")
        .eq("idempotency_key", idempotencyKey)
        .eq("customer_id", user.id)
        .maybeSingle();
      if (existing) return reply(200, { order: existing, reused: true });

      const { data: restaurant, error: restaurantError } = await admin.from("restaurants")
        .select("id,name,menu,is_published")
        .eq("id", restaurantId).eq("is_published", true).maybeSingle();
      if (restaurantError || !restaurant) return reply(404, { error: "This restaurant is not currently accepting orders through the directory." });

      const menu = Array.isArray(restaurant.menu) ? restaurant.menu : [];
      const normalizedMenu = menu.map((entry: unknown) => {
        if (Array.isArray(entry) && entry.length >= 2) return { name: String(entry[0]), price: Number(entry[1]) };
        if (entry && typeof entry === "object") {
          const item = entry as Record<string, unknown>;
          return { name: String(item.name ?? item.title ?? ""), price: Number(item.price) };
        }
        return { name: "", price: NaN };
      });
      const orderItems: Array<{ item_name: string; quantity: number; unit_price_cents: number }> = [];
      let subtotalCents = 0;
      for (const raw of items) {
        const name = String(raw?.name ?? "").trim();
        const quantity = Number(raw?.quantity);
        if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
          return reply(400, { error: "One of the basket items is invalid." });
        }
        const menuItem = normalizedMenu.find((entry: {name:string;price:number}) =>
          entry.name === name && Number.isFinite(entry.price) && entry.price >= 0
        );
        if (!menuItem) return reply(400, { error: `"${name}" is no longer on this restaurant's menu. Refresh the menu.` });
        const unitPriceCents = Math.round(menuItem.price * 100);
        const suppliedPriceCents = Number(raw?.priceCents);
        if (!Number.isInteger(suppliedPriceCents) || suppliedPriceCents !== unitPriceCents) {
          return reply(409, { error: `The price for "${name}" has changed. Refresh the menu before submitting your order.` });
        }
        subtotalCents += unitPriceCents * quantity;
        orderItems.push({ item_name: name, quantity, unit_price_cents: unitPriceCents });
      }
      if (subtotalCents < 100 || subtotalCents > 2000000) return reply(400, { error: "The order total is outside the permitted range." });

      const { data: order, error: orderError } = await admin.from("marketplace_orders").insert({
        customer_id: user.id,
        restaurant_id: restaurant.id,
        status: "submitted",
        payment_method: "pay_restaurant_directly",
        payment_status: "not_paid",
        food_subtotal_cents: subtotalCents,
        delivery_fee_cents: 0,
        customer_name: customerName,
        customer_phone: customerPhone,
        fulfilment_type: fulfilmentType,
        delivery_address: fulfilmentType === "delivery" ? deliveryAddress : null,
        customer_notes: customerNotes,
        idempotency_key: idempotencyKey,
      }).select("id,order_number,status,total_cents,created_at").single();
      if (orderError || !order) {
        if (orderError?.code === "23505") {
          const { data: duplicate } = await admin.from("marketplace_orders")
            .select("id,order_number,status,total_cents,created_at")
            .eq("idempotency_key", idempotencyKey).eq("customer_id", user.id).maybeSingle();
          if (duplicate) return reply(200, { order: duplicate, reused: true });
        }
        console.error("Order insert failed", orderError);
        return reply(500, { error: "We could not save your order. Please try again." });
      }

      const { error: itemError } = await admin.from("marketplace_order_items").insert(
        orderItems.map(item => ({ ...item, order_id: order.id }))
      );
      if (itemError) {
        await admin.from("marketplace_orders").delete().eq("id", order.id);
        console.error("Order item insert failed", itemError);
        return reply(500, { error: "We could not save the items in your order. Please try again." });
      }
      await sendNewOrderPush(restaurant.id, order.id, order.order_number);
      return reply(201, {
        order,
        restaurantName: restaurant.name,
        paymentNotice: "No payment has been taken by Takeaways Tonight. The restaurant must confirm availability, delivery charges and payment directly with you.",
      });
    }

    if (action === "update_order") {
      const orderId = String(body.orderId ?? "");
      const nextStatus = String(body.status ?? "");
      const markPaid = body.markPaid === true;
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) return reply(400, { error: "Invalid order." });

      const { data: order, error: orderError } = await admin.from("marketplace_orders")
        .select("id,restaurant_id,status,payment_status")
        .eq("id", orderId).maybeSingle();
      if (orderError || !order) return reply(404, { error: "Order not found." });

      const [{ data: membership }, { data: adminRow }] = await Promise.all([
        admin.from("restaurant_members").select("member_role")
          .eq("restaurant_id", order.restaurant_id).eq("user_id", user.id).maybeSingle(),
        admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!membership && !adminRow) return reply(403, { error: "You are not authorised to manage this restaurant's orders." });

      if (markPaid) {
        if (!["accepted", "preparing", "ready"].includes(order.status)) return reply(409, { error: "The restaurant can only confirm direct payment after accepting the order." });
        const { data, error } = await admin.from("marketplace_orders")
          .update({ payment_status: "paid_directly_to_restaurant" })
          .eq("id", orderId).select("id,order_number,status,payment_status").single();
        if (error) return reply(400, { error: "Could not update the payment status." });
        return reply(200, { order: data });
      }

      const transitions: Record<string, string[]> = {
        submitted: ["accepted", "rejected"],
        accepted: ["preparing", "cancelled"],
        preparing: ["ready", "cancelled"],
        ready: ["completed", "cancelled"],
      };
      if (!transitions[order.status]?.includes(nextStatus)) return reply(409, { error: "That order-status change is not allowed." });
      if (nextStatus === "completed" && order.payment_status !== "paid_directly_to_restaurant") {
        return reply(409, { error: "Confirm that the customer paid the restaurant before completing the order." });
      }
      const { data, error } = await admin.from("marketplace_orders")
        .update({ status: nextStatus })
        .eq("id", orderId).select("id,order_number,status,payment_status,updated_at").single();
      if (error) {
        console.error("Order status update failed", error);
        return reply(400, { error: "Could not update the order status." });
      }
      return reply(200, { order: data });
    }

    if (action === "review_owner_request") {
      const requestId = String(body.requestId ?? "");
      const decision = String(body.decision ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["approved", "rejected"].includes(decision)) {
        return reply(400, { error: "Invalid ownership request review." });
      }
      const { data: adminRow } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
      if (!adminRow) return reply(403, { error: "Platform administrator access is required." });
      const { data: requestRow, error: requestError } = await admin.from("restaurant_owner_requests")
        .select("id,user_id,restaurant_id,role_requested,status")
        .eq("id", requestId).maybeSingle();
      if (requestError || !requestRow) return reply(404, { error: "Ownership request not found." });
      if (requestRow.status !== "pending") return reply(409, { error: "This request has already been reviewed." });

      const { data: restaurantRow } = await admin.from("restaurants")
        .select("id,is_published").eq("id", requestRow.restaurant_id).maybeSingle();
      if (!restaurantRow || !restaurantRow.is_published) {
        return reply(409, { error: "This restaurant is no longer published. The access request cannot be approved." });
      }

      if (decision === "approved") {
        const { error: memberError } = await admin.from("restaurant_members").upsert({
          restaurant_id: requestRow.restaurant_id,
          user_id: requestRow.user_id,
          member_role: requestRow.role_requested,
        }, { onConflict: "restaurant_id,user_id" });
        if (memberError) return reply(500, { error: "Could not add the restaurant team member." });
      }
      const { data, error } = await admin.from("restaurant_owner_requests")
        .update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", requestId).eq("status", "pending")
        .select("id,status,reviewed_at").single();
      if (error) return reply(500, { error: "Could not complete the ownership review." });
      return reply(200, { request: data });
    }

    return reply(400, { error: "Unknown marketplace action." });
  } catch (error) {
    console.error("Marketplace API error", error);
    return reply(500, { error: "Unexpected server error. Please try again." });
  }
});
