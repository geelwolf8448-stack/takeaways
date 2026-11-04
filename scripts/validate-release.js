#!/usr/bin/env node
"use strict";

// Static release gate: catches broken inline JavaScript and missing launch-critical wiring.
// It does not replace live Supabase, WhatsApp, browser, or Android device testing.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const checks = [];
function check(label, condition) {
  if (!condition) throw new Error("FAIL: " + label);
  checks.push(label);
}
function compileInlineScripts(file) {
  const html = read(file);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let count = 0;
  for (const match of scripts) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    if (!match[2].trim()) continue;
    new vm.Script(match[2], { filename: file + ":inline-script-" + (++count) });
  }
  return { html, count };
}

const publicPage = compileInlineScripts("index.html");
check("public page contains an inline application script", publicPage.count > 0);
const requiredIds = [
  "search", "restaurants", "resultCount", "basketCount", "directoryStatus",
  "menuDialog", "menuContent", "basketDialog", "basketContent", "sendOrder",
  "customerName", "customerPhone", "fulfilment", "deliveryAddressField",
  "deliveryAddress", "orderNotes", "adminDialog", "rName", "rPhone",
  "rArea", "rCategory", "rMenu", "rConsent", "installAppButton", "installHint"
];
for (const id of requiredIds) {
  check("public page has #" + id, (publicPage.html.includes('id="'+id+'"') || publicPage.html.includes("id='"+id+"'")));
}
check("demo listings are not treated as order-enabled", /Demo only/.test(publicPage.html) && /r\.isDemo!==false/.test(publicPage.html));
check("orders are restricted to approved non-demo records", /r\.isDemo!==false/.test(publicPage.html) && /is_published=eq\.true/.test(publicPage.html));
check("WhatsApp order request is generated", /https:\/\/wa\.me\//.test(publicPage.html) && /No payment has been made/.test(publicPage.html));
check("South African customer and restaurant phone numbers are validated", /\^27\\d\{9\}\$/.test(publicPage.html));
check("delivery address is required for delivery", /fulfilment==="Delivery"&&!address/.test(publicPage.html));
check("partner application requires permission declaration", /rConsent/.test(publicPage.html) && /permission_confirmed:true/.test(publicPage.html));
check("partner applications remain pending until admin approval", /status:"pending"/.test(publicPage.html) && /will not appear in the public directory unless approved/.test(publicPage.html));
check("public directory fetch filters published restaurants", /is_published=eq\.true/.test(publicPage.html));
check("privacy and terms pages are linked", /privacy\.html/.test(publicPage.html) && /terms\.html/.test(publicPage.html));
check("mobile navigation does not advertise unfinished favourites/orders/settings tabs", !/Favourites|>Orders<|>Settings</.test(publicPage.html));
check("mobile navigation links to real sections", /href="#restaurants"/.test(publicPage.html) && /href="#campaigns"/.test(publicPage.html) && /href="#owners"/.test(publicPage.html));

const admin = compileInlineScripts("admin.html");
check("admin portal inline JavaScript compiles", admin.count > 0);
check("admin uses passwordless email sign-in", /signInWithOtp/.test(admin.html) && /shouldCreateUser:false/.test(admin.html));
check("admin checks explicit allowlist", /admin_users/.test(admin.html) && /review_partner_application/.test(admin.html));
check("admin has no password field", !/<input[^>]+type=["']password["']/i.test(admin.html));

check("admin shows SMTP troubleshooting for delivery errors", /Supabase Dashboard → Logs → Auth Logs/.test(admin.html));

const callback = compileInlineScripts("reset-password.html");
check("sign-in callback JavaScript compiles", callback.count > 0);
check("sign-in callback returns to admin portal", /admin\.html/.test(callback.html));

const worker = read("service-worker.js");
new vm.Script(worker, { filename: "service-worker.js" });
check("service worker JavaScript compiles", true);
for (const file of ["manifest.webmanifest", "config.js", "logo.svg", "icon.svg", "privacy.html", "terms.html"]) {
  check(file + " exists", fs.existsSync(path.join(root, file)));
}
const config = read("config.js");
const configuredKey = (config.match(/supabaseAnonKey:\s*["']([^"']+)["']/) || [])[1] || "";
check("browser config uses only a public Supabase publishable/anon key", /^(sb_publishable_|eyJ)/.test(configuredKey) && !/(service_role|sb_secret)/i.test(configuredKey));


const manifest = JSON.parse(read("manifest.webmanifest"));
check("PWA manifest is valid JSON and uses the black/gold brand", manifest.name.includes("Takeaways Tonight?") && manifest.background_color === "#020202" && manifest.theme_color === "#ffd900");
check("PWA manifest icon exists", fs.existsSync(path.join(root, manifest.icons[0].src)));
check("service worker cache includes the secure sign-in callback", /reset-password\\.html/.test(worker));
const prep = read("scripts/prepare-web.js");
check("Android web bundle includes the service worker", /"service-worker\\.js"/.test(prep));
check("Android web bundle includes admin and callback pages referenced by cache", /"admin\\.html"/.test(prep) && /"reset-password\\.html"/.test(prep));
const releaseScript = read("scripts/configure-android-release.js");
new vm.Script(releaseScript, { filename: "scripts/configure-android-release.js" });
check("Android signing configuration script compiles", true);
const callbackSource = callback.html;
check("magic-link callback verifies Supabase magiclink tokens as magiclink", /type:"magiclink"/.test(callbackSource));
check("email OTP callback supports email token type", /type:"email"/.test(callbackSource));
for (const file of ["LAUNCH-KIT.md", "ANDROID-RELEASE.md", ".github/workflows/android-release.yml"]) {
  check(file + " exists", fs.existsSync(path.join(root, file)));
}

console.log("Takeaways Tonight? static release checks passed: " + checks.length);
for (const item of checks) console.log("PASS " + item);
