#!/usr/bin/env node
"use strict";

// Static release gate: catches broken inline JavaScript and missing launch-critical wiring.
// It does not replace live Supabase, WhatsApp, browser, or Android device testing.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
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
check("demo cards are not labelled as confirmed featured partners", !/Our featured restaurants/.test(publicPage.html));
check("orders are restricted to approved non-demo records", /r\.isDemo!==false/.test(publicPage.html) && /is_published=eq\.true/.test(publicPage.html));
check("WhatsApp order request is generated", /https:\/\/wa\.me\//.test(publicPage.html) && /No payment has been made/.test(publicPage.html));
check("public page explains WhatsApp requests are not secure in-app checkout", /Signed-in customers can submit an order request and notify the restaurant on WhatsApp/.test(publicPage.html) && /marketplace-api/.test(publicPage.html) && !/secure checkout are being prepared/.test(publicPage.html));
check("pending checkout survives email sign-in in another browser tab", /localStorage\.setItem\("tt_pending_checkout"/.test(publicPage.html) && /Date\.now\(\)-saved\.savedAt>30\*60\*1000/.test(publicPage.html));
check("pending checkout is cleared after order submission", /localStorage\.removeItem\("tt_pending_checkout"/.test(publicPage.html));
check("South African customer and restaurant phone numbers are validated", /\^27\\d\{9\}\$/.test(publicPage.html));
check("delivery address is required for delivery", /fulfilment==="Delivery"&&!address/.test(publicPage.html));
check("partner application requires permission declaration", /rConsent/.test(publicPage.html) && /permission_confirmed:true/.test(publicPage.html));
check("partner applications remain pending until admin approval", /status:"pending"/.test(publicPage.html) && /will not appear in the public directory unless approved/.test(publicPage.html));
check("public directory fetch filters published restaurants", /is_published=eq\.true/.test(publicPage.html));
check("privacy and terms pages are linked", /privacy\.html/.test(publicPage.html) && /terms\.html/.test(publicPage.html));
check("privacy notice describes saved customer orders", /order history/.test(read("privacy.html")) && /delivery address/.test(read("privacy.html")));
check("terms distinguish order requests from restaurant acceptance", /not an accepted order/.test(read("terms.html")));
check("mobile navigation does not advertise unfinished favourites/orders/settings tabs", !/Favourites|>Orders<|>Settings</.test(publicPage.html));
check("mobile navigation links to real sections", /href="#restaurants"/.test(publicPage.html) && /href="#campaigns"/.test(publicPage.html) && /href="#owners"/.test(publicPage.html));

const admin = compileInlineScripts("admin.html");
check("admin portal inline JavaScript compiles", admin.count > 0);
check("admin uses passwordless email sign-in", /signInWithOtp/.test(admin.html) && /shouldCreateUser:false/.test(admin.html));
check("admin checks explicit allowlist", /admin_users/.test(admin.html) && /review_partner_application/.test(admin.html));
check("admin can review restaurant owner access requests", /review_owner_request/.test(admin.html) && /ownerRequests/.test(admin.html));
check("admin has marketplace reporting", /commission_ledger/.test(admin.html) && /marketplaceOverview/.test(admin.html));
check("admin has no password field", !/<input[^>]+type=["']password["']/i.test(admin.html));

check("admin shows SMTP troubleshooting for delivery errors", /Supabase Dashboard → Logs → Auth Logs/.test(admin.html));

const callback = compileInlineScripts("reset-password.html");
check("sign-in callback JavaScript compiles", callback.count > 0);
check("sign-in callback returns to admin portal", /admin\.html/.test(callback.html));

const account = compileInlineScripts("account.html");
check("customer account inline JavaScript compiles", account.count > 0);
check("customer accounts use passwordless email sign-in", /signInWithOtp/.test(account.html) && /shouldCreateUser:true/.test(account.html));
check("customer portal displays private order history", /marketplace_orders/.test(account.html) && /customer_id/.test(account.html));
check("customer portal preserves checkout return after email sign-in", /return=checkout/.test(account.html) && /emailRedirectTo/.test(account.html));
check("customer magic links route back into native Android app", /za.co.takeawaystonight.app:\/\/auth\/callback\?target=account/.test(account.html));

const restaurantPortal = compileInlineScripts("restaurant-portal.html");
check("restaurant owner portal inline JavaScript compiles", restaurantPortal.count > 0);
check("restaurant owners request verified access", /restaurant_owner_requests/.test(restaurantPortal.html));
check("restaurant-owner magic links route back into native Android app", /za.co.takeawaystonight.app:\/\/auth\/callback\?target=restaurant/.test(restaurantPortal.html));
check("restaurant owner portal uses server-side order updates", /marketplace-api/.test(restaurantPortal.html) && /update_order/.test(restaurantPortal.html));
check("restaurant owners can update their menu and contact details", /saveListing/.test(restaurantPortal.html) && /commission_ledger/.test(restaurantPortal.html));
check("web and native pages load the shared auth deep-link handler", /native-auth\.js/.test(publicPage.html) && /native-auth\.js/.test(account.html) && /native-auth\.js/.test(restaurantPortal.html));
const nativeAuth = read("native-auth.js");
check("native auth handler restores Supabase sessions from app links", /App\.addListener\("appUrlOpen"/.test(nativeAuth) && /App\.getLaunchUrl\(\)/.test(nativeAuth) && /client\.auth\.setSession/.test(nativeAuth));
const packageJson = JSON.parse(read("package.json"));
check("Capacitor App plugin is installed for native deep links", Boolean(packageJson.dependencies["@capacitor/app"]));
const marketplaceApi = read("supabase/functions/marketplace-api/index.ts");
check("marketplace API validates the signed-in customer", /auth.getUser\(token\)/.test(marketplaceApi));
check("marketplace API calculates prices from the published menu", /normalizedMenu/.test(marketplaceApi) && /suppliedPriceCents !== unitPriceCents/.test(marketplaceApi));
check("marketplace API binds idempotency keys to the customer", /eq\("customer_id", user.id\)/.test(marketplaceApi));
check("marketplace API restricts order status transitions and owner approvals", /update_order/.test(marketplaceApi) && /review_owner_request/.test(marketplaceApi));
check("marketplace API only grants owner access to published restaurants", /restaurantRow\.is_published/.test(marketplaceApi));

const worker = read("service-worker.js");
new vm.Script(worker, { filename: "service-worker.js" });
check("service worker JavaScript compiles", true);
for (const file of ["manifest.webmanifest", "config.js", "logo.svg", "icon.svg", "privacy.html", "terms.html", "account.html", "restaurant-portal.html"]) {
  check(file + " exists", fs.existsSync(path.join(root, file)));
}
const config = read("config.js");
const configuredKey = (config.match(/supabaseAnonKey:\s*["']([^"']+)["']/) || [])[1] || "";
check("browser config uses only a public Supabase publishable/anon key", /^(sb_publishable_|eyJ)/.test(configuredKey) && !/(service_role|sb_secret)/i.test(configuredKey));


const manifest = JSON.parse(read("manifest.webmanifest"));
check("PWA manifest is valid JSON and uses the black/gold brand", manifest.name.includes("Takeaways Tonight?") && manifest.background_color === "#020202" && manifest.theme_color === "#ffd900");
check("PWA manifest icon exists", fs.existsSync(path.join(root, manifest.icons[0].src)));
check("service worker cache includes the secure sign-in callback", /reset-password\.html/.test(worker));
check("service worker cache includes customer and restaurant portals", /account\.html/.test(worker) && /restaurant-portal\.html/.test(worker));
check("service worker cache includes native auth handler", /native-auth\.js/.test(worker));
const prep = read("scripts/prepare-web.js");
check("Android web bundle includes the service worker", /"service-worker\.js"/.test(prep));
check("Android web bundle includes admin and callback pages referenced by cache", /"admin\.html"/.test(prep) && /"reset-password\.html"/.test(prep));
check("Android web bundle includes customer and restaurant portals", /"account\.html"/.test(prep) && /"restaurant-portal\.html"/.test(prep));
check("Android web bundle includes native auth handler", /"native-auth\.js"/.test(prep));
const releaseScript = read("scripts/configure-android-release.js");
new vm.Script(releaseScript, { filename: "scripts/configure-android-release.js" });
check("Android signing configuration script compiles", true);
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "takeaways-android-signing-"));
try {
  const fixtureGradle = path.join(fixtureDir, "app", "build.gradle");
  fs.mkdirSync(path.dirname(fixtureGradle), { recursive: true });
  fs.writeFileSync(fixtureGradle, `plugins { id 'com.android.application' }
android {
  namespace 'za.co.takeawaystonight.app'
  defaultConfig {
    applicationId 'za.co.takeawaystonight.app'
    minSdk 23
    targetSdk 35
    versionCode 1
    versionName '1.0'
  }
  buildTypes {
    release {
      minifyEnabled false
    }
  }
}`);
  const signingTest = spawnSync(process.execPath, [path.join(root, "scripts/configure-android-release.js")], {
    cwd: fixtureDir,
    encoding: "utf8",
    env: {
      ...process.env,
      ANDROID_GRADLE_FILE: fixtureGradle,
      ANDROID_KEYSTORE_PATH: path.join(fixtureDir, "upload-key.jks"),
      ANDROID_KEYSTORE_PASSWORD: "test-keystore-password",
      ANDROID_KEY_ALIAS: "test-alias",
      ANDROID_KEY_PASSWORD: "test-key-password",
      ANDROID_VERSION_CODE: "2",
      ANDROID_VERSION_NAME: "1.2.3"
    }
  });
  const configuredGradle = fs.readFileSync(fixtureGradle, "utf8");
  check("Android signing script patches a Gradle release fixture", signingTest.status === 0);
  check("Android signing fixture gets release signing and version metadata", /signingConfig signingConfigs\.release/.test(configuredGradle) && /versionCode 2/.test(configuredGradle) && /versionName "1.2.3"/.test(configuredGradle));
  check("Android signing secrets are referenced from environment, not embedded", configuredGradle.includes('System.getenv("ANDROID_KEYSTORE_PASSWORD")') && !configuredGradle.includes("test-keystore-password"));
  const fixtureManifest = path.join(fixtureDir, "AndroidManifest.xml");
  const fixtureStrings = path.join(fixtureDir, "strings.xml");
  fs.writeFileSync(fixtureManifest, '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity"></activity></application></manifest>');
  fs.writeFileSync(fixtureStrings, '<resources><string name="app_name">Test</string><string name="custom_url_scheme">za.co.test</string></resources>');
  const deepLinkTest = spawnSync(process.execPath, [path.join(root, "scripts/configure-android-deeplinks.js")], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ANDROID_MANIFEST_FILE: fixtureManifest, ANDROID_STRINGS_FILE: fixtureStrings, ANDROID_DEEP_LINK_SCHEME: "za.co.takeawaystonight.app" }
  });
  const configuredManifest = fs.readFileSync(fixtureManifest, "utf8");
  const configuredStrings = fs.readFileSync(fixtureStrings, "utf8");
  check("Android deep-link script patches manifest and scheme fixture", deepLinkTest.status === 0);
  check("Android deep-link intent filter uses the custom scheme", configuredManifest.includes('android:name="android.intent.action.VIEW"') && configuredManifest.includes('android:scheme="@string/custom_url_scheme"'));
  check("Android custom URL scheme is configured", configuredStrings.includes('<string name="custom_url_scheme">za.co.takeawaystonight.app</string>'));
} finally {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}
const callbackSource = callback.html;
check("magic-link callback verifies Supabase magiclink tokens as magiclink", /type:"magiclink"/.test(callbackSource));
check("email OTP callback supports email token type", /type:"email"/.test(callbackSource));
for (const file of ["LAUNCH-KIT.md", "ANDROID-RELEASE.md", "RESTAURANT-AGREEMENT-TEMPLATE.md", ".github/workflows/android-release.yml"]) {
  check(file + " exists", fs.existsSync(path.join(root, file)));
}

const signedWorkflow = read(".github/workflows/android-release.yml");
check("signed Android workflow is manual and verifies the AAB signature", /workflow_dispatch:/.test(signedWorkflow) && /jarsigner -verify/.test(signedWorkflow));
for (const secret of ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]) {
  check("signed workflow uses " + secret, signedWorkflow.includes(secret));
}

console.log("Takeaways Tonight? static release checks passed: " + checks.length);
for (const item of checks) console.log("PASS " + item);
