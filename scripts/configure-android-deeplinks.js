#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const manifestPath = process.env.ANDROID_MANIFEST_FILE || path.join("android", "app", "src", "main", "AndroidManifest.xml");
const stringsPath = process.env.ANDROID_STRINGS_FILE || path.join("android", "app", "src", "main", "res", "values", "strings.xml");
const scheme = process.env.ANDROID_DEEP_LINK_SCHEME || "takeawaystonight";

if (!/^[a-z][a-z0-9+.-]*$/i.test(scheme)) {
  throw new Error("ANDROID_DEEP_LINK_SCHEME must be a valid URL scheme.");
}
if (!fs.existsSync(manifestPath) || !fs.existsSync(stringsPath)) {
  throw new Error("Android manifest or strings.xml was not found. Run npx cap add android first.");
}

let manifest = fs.readFileSync(manifestPath, "utf8");
let strings = fs.readFileSync(stringsPath, "utf8");

const schemeTag = /<string\s+name=["']custom_url_scheme["'][^>]*>[\s\S]*?<\/string>/;
const newSchemeTag = '<string name="custom_url_scheme">' + scheme + '</string>';
if (schemeTag.test(strings)) {
  strings = strings.replace(schemeTag, newSchemeTag);
} else if (/<resources[^>]*>/.test(strings)) {
  strings = strings.replace(/<resources([^>]*)>/, '<resources$1>\n    ' + newSchemeTag);
} else {
  throw new Error("Could not locate the resources element in strings.xml.");
}

const hasIntent = /<intent-filter[\s\S]*?android\.intent\.action\.VIEW[\s\S]*?@string\/custom_url_scheme[\s\S]*?<\/intent-filter>/.test(manifest);
if (!hasIntent) {
  const filter = [
    "        <intent-filter>",
    '            <action android:name="android.intent.action.VIEW" />',
    '            <category android:name="android.intent.category.DEFAULT" />',
    '            <category android:name="android.intent.category.BROWSABLE" />',
    '            <data android:scheme="@string/custom_url_scheme" />',
    "        </intent-filter>"
  ].join("\n");
  if (!/<\/activity>/.test(manifest)) {
    throw new Error("Could not locate the Android activity element.");
  }
  manifest = manifest.replace(/<\/activity>/, filter + "\n    </activity>");
}

fs.writeFileSync(stringsPath, strings);
fs.writeFileSync(manifestPath, manifest);
console.log("Configured Android email sign-in deep link: " + scheme + "://auth/callback");
