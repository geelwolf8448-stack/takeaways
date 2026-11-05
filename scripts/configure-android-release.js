#!/usr/bin/env node
"use strict";

// Applies release signing from ephemeral GitHub Actions environment variables.
// No keystore or signing password is written into source control.
const fs = require("node:fs");
const path = require("node:path");
const gradlePath = path.resolve(process.env.ANDROID_GRADLE_FILE || "android/app/build.gradle");
const required = ["ANDROID_KEYSTORE_PATH", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) throw new Error("Missing required signing environment variable: " + key);
}
const versionCode = process.env.ANDROID_VERSION_CODE || "1";
const versionName = process.env.ANDROID_VERSION_NAME || "1.0.0";
if (!/^\d+$/.test(versionCode)) throw new Error("ANDROID_VERSION_CODE must be a positive integer.");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versionName)) throw new Error("ANDROID_VERSION_NAME must use semantic version format, e.g. 1.0.0.");

let gradle = fs.readFileSync(gradlePath, "utf8");
if (!/android\s*\{/.test(gradle)) throw new Error("Could not find android { } block in generated app/build.gradle.");
if (!/buildTypes\s*\{\s*release\s*\{/.test(gradle)) throw new Error("Could not find release build type in generated app/build.gradle.");

if (!/signingConfigs\s*\{\s*release\s*\{/.test(gradle)) {
  gradle = gradle.replace(/android\s*\{/, match => match + `
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
`);
}
if (!/signingConfig\s+signingConfigs\.release/.test(gradle)) {
  gradle = gradle.replace(/(buildTypes\s*\{\s*release\s*\{)/, "$1\n            signingConfig signingConfigs.release");
}

const defaultConfig = gradle.match(/defaultConfig\s*\{[\s\S]*?\n\s*\}/);
if (!defaultConfig) throw new Error("Could not find defaultConfig block.");
let block = defaultConfig[0];
if (/versionCode\s+\d+/.test(block)) block = block.replace(/versionCode\s+\d+/, "versionCode " + versionCode);
else block = block.replace(/defaultConfig\s*\{/, "$&\n        versionCode " + versionCode);
if (/versionName\s+["'][^"']+["']/.test(block)) block = block.replace(/versionName\s+["'][^"']+["']/, 'versionName "' + versionName + '"');
else block = block.replace(/defaultConfig\s*\{/, '$&\n        versionName "' + versionName + '"');
gradle = gradle.replace(defaultConfig[0], block);
fs.writeFileSync(gradlePath, gradle);

const androidDir = path.resolve(path.dirname(gradlePath), "..");
const variablesPath = path.join(androidDir, "variables.gradle");
const targetSdk = process.env.ANDROID_TARGET_SDK || "36";
const compileSdk = process.env.ANDROID_COMPILE_SDK || "36";
if (!/^\\d+$/.test(targetSdk) || !/^\\d+$/.test(compileSdk)) {
  throw new Error("ANDROID_TARGET_SDK and ANDROID_COMPILE_SDK must be numeric API levels.");
}
if (fs.existsSync(variablesPath)) {
  let variables = fs.readFileSync(variablesPath, "utf8");
  if (!/compileSdkVersion\\s*=\\s*\\d+/.test(variables) || !/targetSdkVersion\\s*=\\s*\\d+/.test(variables)) {
    throw new Error("Could not find compileSdkVersion and targetSdkVersion in android/variables.gradle.");
  }
  variables = variables.replace(/compileSdkVersion\\s*=\\s*\\d+/, "compileSdkVersion = " + compileSdk);
  variables = variables.replace(/targetSdkVersion\\s*=\\s*\\d+/, "targetSdkVersion = " + targetSdk);
  fs.writeFileSync(variablesPath, variables);
  console.log("Configured Android compile/target SDK API " + compileSdk + "/" + targetSdk + ".");
} else {
  console.warn("Android variables.gradle not found; SDK level was not changed in this fixture.");
}
console.log("Configured signed Android release " + versionName + " (" + versionCode + "). Keystore remains outside source control.");
