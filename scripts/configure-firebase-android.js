#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const appId = "za.co.takeawaystonight.app";
const configPath = path.resolve(process.env.FIREBASE_CONFIG_PATH || "android/app/google-services.json");
const rootGradlePath = path.resolve(process.env.ANDROID_ROOT_GRADLE_FILE || "android/build.gradle");
const appGradlePath = path.resolve(process.env.ANDROID_APP_GRADLE_FILE || "android/app/build.gradle");
const pluginVersion = process.env.GOOGLE_SERVICES_PLUGIN_VERSION || "4.5.0";

if (!fs.existsSync(configPath)) throw new Error("Firebase google-services.json is missing: " + configPath);
if (!fs.existsSync(rootGradlePath) || !fs.existsSync(appGradlePath)) {
  throw new Error("Generated Android Gradle files are missing. Run npx cap sync android first.");
}

const firebase = JSON.parse(fs.readFileSync(configPath, "utf8"));
const configuredPackages = (firebase.client || [])
  .map(client => client.client_info?.android_client_info?.package_name)
  .filter(Boolean);
if (!configuredPackages.includes(appId)) {
  throw new Error("google-services.json does not contain the Android package " + appId + ". Found: " + configuredPackages.join(", "));
}
if (!firebase.project_info?.project_id) throw new Error("google-services.json has no Firebase project_id.");

let rootGradle = fs.readFileSync(rootGradlePath, "utf8");
let appGradle = fs.readFileSync(appGradlePath, "utf8");

if (!appGradle.includes("com.google.gms.google-services")) {
  if (/plugins\s*\{/.test(appGradle)) {
    appGradle = appGradle.replace(/plugins\s*\{/, match => match + "\n    id 'com.google.gms.google-services' version '" + pluginVersion + "'");
  } else {
    if (!/buildscript\s*\{/.test(rootGradle)) {
      throw new Error("Cannot configure Google Services plugin: android/build.gradle has no buildscript block.");
    }
    if (!rootGradle.includes("com.google.gms:google-services")) {
      const dependenciesPattern = /(buildscript\s*\{[\s\S]*?dependencies\s*\{)/;
      if (!dependenciesPattern.test(rootGradle)) throw new Error("Cannot find buildscript dependencies in android/build.gradle.");
      rootGradle = rootGradle.replace(dependenciesPattern, "$1\n        classpath 'com.google.gms:google-services:" + pluginVersion + "'");
    }
    const androidPlugin = /apply plugin:\s*['"]com\.android\.application['"]/;
    if (!androidPlugin.test(appGradle)) {
      throw new Error("Cannot find the Android application plugin in android/app/build.gradle.");
    }
    appGradle = appGradle.replace(androidPlugin, match => match + "\napply plugin: 'com.google.gms.google-services'");
  }
}

fs.writeFileSync(rootGradlePath, rootGradle);
fs.writeFileSync(appGradlePath, appGradle);
console.log("Configured Google Services Gradle plugin " + pluginVersion + " for Firebase project " + firebase.project_info.project_id + ".");
