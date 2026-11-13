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
check("phone-install button uses the customer-facing Takeaways Tonight wording", /id="installAppButton"[^>]*>📲 Get Takeaways Tonight\? on your phone</.test(publicPage.html));
const requiredIds = [
  "search", "restaurants", "resultCount", "basketCount", "directoryStatus",
  "menuDialog", "menuContent", "basketDialog", "basketContent", "sendOrder",
  "customerName", "customerPhone", "fulfilment", "deliveryAddressField",
  "deliveryAddress", "orderNotes", "adminDialog", "rName", "rPhone",
  "rArea", "rCategory", "rMenu", "rConsent", "installAppButton"
];
for (const id of requiredIds) {
  check("public page has #" + id, (publicPage.html.includes('id="'+id+'"') || publicPage.html.includes("id='"+id+"'")));
}
check("public directory contains no demo listings and refuses demo baskets", !/Demo Burger Kitchen|Demo Pizza Corner|Demo Fish Shack/.test(publicPage.html) && /r=>r.id===id&&r.isDemo===false/.test(publicPage.html) && /restaurants\.find\(item=>item\.id===id&&item\.isDemo===false\)/.test(publicPage.html));
check("demo cards are not labelled as confirmed featured partners", !/Our featured restaurants/.test(publicPage.html));
check("orders are restricted to published real restaurant records", /r\.isDemo===false/.test(publicPage.html) && /is_published=eq\.true/.test(publicPage.html));
check("customer order receives live payment confirmation updates", /watchCustomerPayment\(order\.id,order\.order_number\)/.test(publicPage.html) && /postgres_changes/.test(publicPage.html) && /PAYMENT RECEIVED/.test(publicPage.html));
check("customer can enable browser payment notifications", /enableCustomerPaymentNotifications/.test(publicPage.html) && /Notification\.requestPermission\(\)/.test(publicPage.html));
check("checkout only shows payment methods configured by the restaurant", /acceptedPaymentMethods:Array\.isArray\(r\.accepted_payment_methods\)\?r\.accepted_payment_methods:\[\]/.test(publicPage.html) && /const methods=restaurant\?\.acceptedPaymentMethods\|\|\[\]/.test(publicPage.html));
check("WhatsApp order request is generated", /https:\/\/wa\.me\//.test(publicPage.html) && /No payment has been made/.test(publicPage.html));
check("customer guest checkout needs no email or account", /No customer account or email address is needed/.test(publicPage.html) && /signInAnonymously/.test(publicPage.html) && /marketplace-api/.test(publicPage.html));
check("customer checkout does not request an email sign-in", /signInAnonymously/.test(publicPage.html) && !/signInWithOtp/.test(publicPage.html));
check("order idempotency key is cleared after successful submission", /sessionStorage\.removeItem\("tt_order_idempotency"/.test(publicPage.html));
check("South African customer and restaurant phone numbers are validated", /\^27\\d\{9\}\$/.test(publicPage.html));
check("delivery address is required for delivery", /fulfilment==="Delivery"&&!address/.test(publicPage.html));
check("business registration requires explicit owner authorisation", /rConsent/.test(publicPage.html) && /if\(!document\.getElementById\("rConsent"\)\.checked\)/.test(publicPage.html));
check("business registration explains when the listing is published", /business will appear in the public directory immediately after successful registration/i.test(publicPage.html));
check("public directory fetch filters published restaurants", /is_published=eq\.true/.test(publicPage.html));
check("customer location is requested automatically without location or province controls and nearby restaurants are ranked first", /detectCustomerLocation\(\)\.then\(\(\)=>loadSharedRestaurants\(\)\)/.test(publicPage.html) && /list_nearby_food_businesses/.test(publicPage.html) && /Nearest businesses shown first/.test(publicPage.html) && !/Refresh my location|Choose your province|provinceFilters|choose a province/i.test(publicPage.html));
check("restaurant menu popup shows prices with plus-minus quantity controls before checkout", /renderMenuContent/.test(publicPage.html) && /changeMenuItemQuantity/.test(publicPage.html) && /menuItemQuantity/.test(publicPage.html) && /View basket & order/.test(publicPage.html));
check("privacy and terms pages are linked", /privacy\.html/.test(publicPage.html) && /terms\.html/.test(publicPage.html));
check("privacy notice describes saved customer orders", /order history/.test(read("privacy.html")) && /delivery address/.test(read("privacy.html")));
check("terms distinguish order requests from restaurant acceptance", /not an accepted order/.test(read("terms.html")));
check("mobile navigation does not advertise unfinished favourites/orders/settings tabs", !/Favourites|>Orders<|>Settings</.test(publicPage.html));
check("customer navigation opens one combined Find your food area directly below Food Wars", publicPage.html.indexOf('FOOD WARS') < publicPage.html.indexOf('id="explore"') && publicPage.html.indexOf('id="explore"') < publicPage.html.indexOf('id="search"') && publicPage.html.indexOf('id="search"') < publicPage.html.indexOf('id="filters"') && /<h2>Find your food<\/h2><p>Search by restaurant, meal or area — or choose a category\.<\/p>/.test(publicPage.html) && /href="#explore"/.test(publicPage.html) && /getElementById\('explore'\)\?\.scrollIntoView/.test(publicPage.html) && !/Restaurant specials & adverts/.test(publicPage.html));
check("customer campaign label uses Food Wars with a nationwide catchy prompt", /<small>FOOD WARS<\/small>/.test(publicPage.html) && /Who serves<br>it best\?/.test(publicPage.html) && !/South Coast<br>Food Wars/.test(publicPage.html) && !/COMMUNITY VOTE/.test(publicPage.html));
check("customer specials label does not use the outdated Tonight's Spotlight wording", /<small>SPECIALS<\/small>/.test(publicPage.html) && !/TONIGHT'S SPOTLIGHT/.test(publicPage.html));
check("customer start keeps one direct Explore and Order action without duplicate navigation", /EXPLORE & ORDER NOW/.test(publicPage.html) && !/<div class="poster-categories">/.test(publicPage.html) && !/<div class="feature-nav">/.test(publicPage.html) && !/<a class="primary" href="#explore">🛵 ORDER NOW<\/a>/.test(publicPage.html) && !/<nav class="mobile-dock"/.test(publicPage.html));
check("customer page does not repeat the Explore action above the restaurant list", !/<div class="section-ribbon" id="featured">/.test(publicPage.html) && !/Explore restaurants & menus/.test(publicPage.html));
check("customer page omits the nonessential How Takeaways Tonight works explainer", !/How Takeaways Tonight\? works/.test(publicPage.html) && !/1\. DISCOVER/.test(publicPage.html));
check("customer start has one phone-install action directly below Explore and Order without a duplicate install panel", /id="installAppButton"[^>]*>📲 Get Takeaways Tonight\? on your phone</.test(publicPage.html) && publicPage.html.indexOf('EXPLORE & ORDER NOW') < publicPage.html.indexOf('id="installAppButton"') && publicPage.html.indexOf('id="installAppButton"') < publicPage.html.indexOf('class="poster-region"') && !/<section id="installAppCard"/.test(publicPage.html) && !/id="installHint"/.test(publicPage.html));
check("customer search filters while typing without a duplicate search button", /oninput="render\(\)"/.test(publicPage.html) && !/<button onclick="render\(\)">Search<\/button>/.test(publicPage.html));
check("public customer page has no Takeaways Tonight support WhatsApp or QR contact shortcut", !/https:\/\/wa\.me\/27833149674/.test(publicPage.html) && !/<section id="contact"/.test(publicPage.html) && !/whatsapp-qr\.svg/.test(publicPage.html));

const admin = compileInlineScripts("admin.html");
check("admin portal inline JavaScript compiles", admin.count > 0);
check("admin uses passwordless email sign-in", /signInWithOtp/.test(admin.html) && /shouldCreateUser:false/.test(admin.html));
check("admin checks explicit allowlist", /admin_users/.test(admin.html) && /review_partner_application/.test(admin.html));
check("admin can review restaurant owner access requests", /review_owner_request/.test(admin.html) && /ownerRequests/.test(admin.html));
check("admin dashboard lists and receives realtime restaurant payment confirmations", /paymentNotifications/.test(admin.html) && /payment_received_at/.test(admin.html) && /postgres_changes/.test(admin.html) && /enablePaymentNotifications/.test(admin.html));
check("admin has order-only marketplace reporting", /marketplace_orders/.test(admin.html) && /marketplaceOverview/.test(admin.html));
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
check("restaurant portal has exactly one private restaurant-owner training demo", (restaurantPortal.html.match(/restaurant-owner-training-demo/g) || []).length === 1 && /id="ownerDemo" data-owner-demo="private"/.test(restaurantPortal.html) && /OWNER_DEMO_PROFILE/.test(restaurantPortal.html));
check("restaurant-owner training demo is loaded only for a signed-in owner and stored per owner browser", /if\(!session\?\.user\?\.id\)\{ownerDemo=null/.test(restaurantPortal.html) && /tt_owner_training_demo_v1_/.test(restaurantPortal.html) && /session\.user\.id/.test(restaurantPortal.html));
check("restaurant-owner training demo supports logos, menu categories, dish photos, descriptions and prices", /ownerDemoLogo/.test(restaurantPortal.html) && /ownerDemoNewCategory/.test(restaurantPortal.html) && /ownerDemoItemImage-/.test(restaurantPortal.html) && /Food description/.test(restaurantPortal.html) && /Price \(R\)/.test(restaurantPortal.html));
check("restaurant-owner training demo remains isolated from customer pages and live restaurant storage", !/restaurant-owner-training-demo/.test(publicPage.html) && !/ownerDemo/.test(publicPage.html) && /Practice changes are saved only on this laptop browser/.test(restaurantPortal.html));
check("restaurant portal can request browser notification permission", /Notification\.requestPermission\(\)/.test(restaurantPortal.html));
check("restaurant portal polls for new orders while signed in", /window\.setInterval\(\s*\(\s*\)\s*=>\s*\{\s*if\s*\(\s*session\s*&&\s*memberships\.length\s*\)\s*loadRestaurantsOrders\(\)\s*;\s*\}\s*,\s*15000\s*\)/.test(restaurantPortal.html));
check("new submitted orders trigger an in-dashboard alert and browser notification", /announceNewOrders\(data\|\|\[\]\)/.test(restaurantPortal.html) && /new Notification\("New Takeaways Tonight\? order"/.test(restaurantPortal.html));
check("restaurant owners request verified access", /restaurant_owner_requests/.test(restaurantPortal.html));
check("restaurant-owner magic links route back into native Android app", /za.co.takeawaystonight.app:\/\/auth\/callback\?target=restaurant/.test(restaurantPortal.html));
check("restaurant payment confirmation is only offered for Option 2 after the order is ready", /o\.status==="ready"&&o\.payment_confirmation_required&&!\["paid","paid_directly_to_restaurant"\]/.test(restaurantPortal.html));
check("restaurant owner or manager can choose Option 1 or Option 2", /Option 1 — Standard direct payment/.test(restaurantPortal.html) && /Option 2 — Restaurant confirms payment/.test(restaurantPortal.html) && /saveOrderSystemOption/.test(restaurantPortal.html));
check("restaurant order option is saved through an owner-manager protected API action", /set_restaurant_order_system_option/.test(restaurantPortal.html) && /action === "set_restaurant_order_system_option"/.test(read("supabase/functions/marketplace-api/index.ts")));
check("each order stores the restaurant payment-confirmation choice at submission", /payment_confirmation_required: restaurant\.order_system_option === "option_2"/.test(read("supabase/functions/marketplace-api/index.ts")) && /payment_confirmation_required/.test(restaurantPortal.html));
check("customer payment alerts are only started for Option 2 orders", /if\(order\.payment_confirmation_required\)\{showCustomerPaymentNotice/.test(publicPage.html));
check("restaurant portal warns that proof of payment alone is not confirmation", /A proof of payment alone is not confirmation/.test(restaurantPortal.html) && /PAYMENT RECEIVED/.test(restaurantPortal.html));
check("restaurant portal displays payment confirmation timestamp", /payment_received_at/.test(restaurantPortal.html));
check("restaurant portal loads native push registration module", /native-push\.js/.test(restaurantPortal.html));
const firebaseAndroidConfig = read("scripts/configure-firebase-android.js");
new vm.Script(firebaseAndroidConfig, { filename: "configure-firebase-android.js" });
check("Firebase Android Gradle configuration script compiles", true);
check("Firebase Android setup validates the app package name", /za\.co\.takeawaystonight\.app/.test(firebaseAndroidConfig));
check("Firebase Android setup applies the Google Services Gradle plugin", /com\.google\.gms\.google-services/.test(firebaseAndroidConfig));
const nativePush = read("native-push.js");
new vm.Script(nativePush.replace(/^import[^\n]*\n/, ""), { filename: "native-push.js" });
check("native Android push module JavaScript compiles", true);
const pushTapHandler = read("push-tap-handler.js");
new vm.Script(pushTapHandler.replace(/^import[^\n]*\n/, ""), { filename: "push-tap-handler.js" });
check("push tap handler JavaScript compiles", true);
check("public Android app loads push tap handler", /push-tap-handler\.js/.test(publicPage.html));
check("native push stores FCM tokens against the signed-in user", /restaurant_push_tokens/.test(nativePush) && /user_id: session\.user\.id/.test(nativePush));
check("native push requests permission and registers the Android device", /requestPermissions/.test(nativePush) && /PushNotifications\.register/.test(nativePush));
check("restaurant owner portal uses server-side order updates", /marketplace-api/.test(restaurantPortal.html) && /update_order/.test(restaurantPortal.html));
check("restaurant owners can manage menus, business images and accepted payment methods", /saveRestaurantMenu/.test(restaurantPortal.html) && /uploadBusinessImage/.test(restaurantPortal.html) && /savePaymentMethods/.test(restaurantPortal.html) && /data-payment-method/.test(restaurantPortal.html));
check("restaurant portal loads saved adverts when the dashboard opens and keeps view-only team members read-only", /Promise\.all\(\[loadRestaurantsOrders\(\),loadRestaurantAdverts\(\)\]\)/.test(restaurantPortal.html) && /View-only access\. Only the restaurant owner or manager can change adverts\./.test(restaurantPortal.html) && /Only the restaurant owner or manager can edit adverts\./.test(restaurantPortal.html));
check("restaurant portal does not expose internal fee reporting", !/feeLedger|feeArea/.test(restaurantPortal.html));
check("web and native pages load the shared auth deep-link handler", /native-auth\.js/.test(publicPage.html) && /native-auth\.js/.test(account.html) && /native-auth\.js/.test(restaurantPortal.html));
const nativeAuth = read("native-auth.js");
check("native auth handler restores Supabase sessions from app links", /App\.addListener\("appUrlOpen"/.test(nativeAuth) && /App\.getLaunchUrl\(\)/.test(nativeAuth) && /client\.auth\.setSession/.test(nativeAuth));
check("native auth handler prevents duplicate magic-link restoration", /handledUrls\.has\(rawUrl\)/.test(nativeAuth));
const packageJson = JSON.parse(read("package.json"));
check("Capacitor App plugin is installed for native deep links", Boolean(packageJson.dependencies["@capacitor/app"]));
check("Capacitor native push plugin is installed", packageJson.dependencies["@capacitor/push-notifications"] === "7.0.7");
const marketplaceApi = read("supabase/functions/marketplace-api/index.ts");
check("marketplace API validates the signed-in customer", /auth.getUser\(token\)/.test(marketplaceApi));
check("marketplace API calculates prices from the published menu", /normalizedMenu/.test(marketplaceApi) && /suppliedPriceCents !== unitPriceCents/.test(marketplaceApi));
check("marketplace API binds idempotency keys to the customer", /eq\("customer_id", user.id\)/.test(marketplaceApi));
check("marketplace API records verified payment time and confirming restaurant user", /payment_status: "paid"/.test(marketplaceApi) && /payment_received_at: new Date\(\)\.toISOString\(\)/.test(marketplaceApi) && /payment_received_by: user\.id/.test(marketplaceApi));
check("marketplace API only permits payment confirmation once order is ready", /order\.status !== "ready"/.test(marketplaceApi));
check("marketplace API does not default missing restaurant payment methods to all options", /restaurant\.accepted_payment_methods : \[\]/.test(marketplaceApi));
check("marketplace API restricts order status transitions and owner approvals", /update_order/.test(marketplaceApi) && /review_owner_request/.test(marketplaceApi));
check("marketplace API sends FCM order notifications server-side", /sendNewOrderPush/.test(marketplaceApi) && /FIREBASE_SERVICE_ACCOUNT_JSON/.test(marketplaceApi) && /fcm\.googleapis\.com/.test(marketplaceApi));
const orderChargePattern = new RegExp(["commis", "sion"].join("") + "(?:_ledger|_cents|_statement)|1500");
check("marketplace API contains no order-percentage calculation or reporting", !orderChargePattern.test(marketplaceApi));
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
check("Android web bundle includes native push module", /"native-push\.js"/.test(prep));
check("Android web bundle includes push tap handler", /"push-tap-handler\.js"/.test(prep));
check("service worker caches native push module", /native-push\.js/.test(worker));
check("service worker caches push tap handler", /push-tap-handler\.js/.test(worker));
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
  fs.writeFileSync(path.join(fixtureDir, "variables.gradle"), "ext {\\n  compileSdkVersion = 35\\n  targetSdkVersion = 35\\n}\\n");
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
  const configuredVariables = fs.readFileSync(path.join(fixtureDir, "variables.gradle"), "utf8");
  check("Android release script configures compile and target SDK API 36", /compileSdkVersion = 36/.test(configuredVariables) && /targetSdkVersion = 36/.test(configuredVariables));
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
check("sign-in callback supports Supabase magiclink tokens for legacy links", /requestedType==="email"\?"email":"magiclink"/.test(callbackSource) && /verifyOtp\(\{token_hash:tokenHash,type\}\)/.test(callbackSource));
check("email OTP callback supports email token type", /requestedType==="email"\?"email":"magiclink"/.test(callbackSource) && /verifyOtp\(\{token_hash:tokenHash,type\}\)/.test(callbackSource));
for (const file of ["LAUNCH-KIT.md", "ANDROID-RELEASE.md", "RESTAURANT-AGREEMENT-TEMPLATE.md", ".github/workflows/android-release.yml"]) {
  check(file + " exists", fs.existsSync(path.join(root, file)));
}

const signedWorkflow = read(".github/workflows/android-release.yml");
check("signed Android workflow is manual and verifies the AAB signature", /workflow_dispatch:/.test(signedWorkflow) && /jarsigner -verify/.test(signedWorkflow));
check("signed Android release requires Firebase client configuration", /google-services\.json/.test(signedWorkflow));
check("signed Android release configures API 36", /ANDROID_TARGET_SDK/.test(read("scripts/configure-android-release.js")) && /ANDROID_COMPILE_SDK/.test(read("scripts/configure-android-release.js")));
for (const secret of ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]) {
  check("signed workflow uses " + secret, signedWorkflow.includes(secret));
}

console.log("Takeaways Tonight? static release checks passed: " + checks.length);
for (const item of checks) console.log("PASS " + item);

