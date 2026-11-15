const headers = { "Content-Type": "application/json" };

// This endpoint remains only to safely reject requests sent to the former receiver URL.
Deno.serve(() => new Response(JSON.stringify({
  error: "This payment receiver has been retired. No payment can be accepted or processed.",
}), { status: 410, headers }));
