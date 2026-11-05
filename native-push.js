import { PushNotifications } from "https://esm.sh/@capacitor/push-notifications@7.0.7?deps=@capacitor/core@7.4.3";

const native = Boolean(window.Capacitor?.isNativePlatform?.());
let listenersAdded = false;
let busy = false;
const context = () => window.TT_PUSH_CONTEXT?.() || {};
const status = message => {
  const node = document.getElementById("notificationStatus");
  if (node) node.textContent = message;
};

async function saveToken(value) {
  const { sb, session, memberships } = context();
  if (!sb || !session?.user?.id || !memberships?.length) {
    status("Verified restaurant access is required before this device can receive order alerts.");
    return;
  }
  const { error } = await sb.from("restaurant_push_tokens").upsert({
    user_id: session.user.id,
    device_token: value,
    platform: "android",
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,device_token" });
  if (error) {
    console.error("Push token registration could not be saved:", error);
    status("Android registered, but secure device registration failed. Please try again.");
    return;
  }
  status("Background order notifications are enabled. You can close the app.");
  const button = document.getElementById("enableNotifications");
  if (button) button.textContent = "Background notifications enabled";
}

async function addListeners() {
  if (listenersAdded) return;
  listenersAdded = true;
  await PushNotifications.addListener("registration", token => saveToken(token.value));
  await PushNotifications.addListener("registrationError", error => {
    console.error("Push registration error:", error);
    status("Push registration failed. Firebase setup or Android notification permission needs attention.");
  });
  await PushNotifications.addListener("pushNotificationActionPerformed", action => {
    if (action?.notification?.data?.screen === "orders") {
      window.location.href = "restaurant-portal.html#orders";
    }
  });
  await PushNotifications.addListener("pushNotificationReceived", notification => {
    const alert = document.getElementById("orderAlert");
    if (alert) alert.textContent = notification?.body || "A new order has arrived.";
  });
}

async function registerDevice() {
  if (!native) throw new Error("Open the Android app to enable background notifications.");
  if (busy) return;
  if (!context().memberships?.length) throw new Error("Your restaurant access must be approved first.");
  busy = true;
  try {
    await addListeners();
    await PushNotifications.createChannel({
      id: "orders",
      name: "Restaurant orders",
      description: "New customer order requests",
      importance: 4,
      sound: "default",
      vibration: true
    });
    await PushNotifications.register();
    status("Connecting this device to restaurant order alerts…");
  } finally {
    busy = false;
  }
}

window.TT_NATIVE_PUSH = {
  async enable() {
    if (!native) throw new Error("Background push notifications are available in the Android app.");
    const permission = await PushNotifications.checkPermissions();
    const result = permission.receive === "granted" ? permission : await PushNotifications.requestPermissions();
    if (result.receive !== "granted") throw new Error("Please allow notifications for Takeaways Tonight? in Android settings.");
    await registerDevice();
  },
  async sync() {
    if (!native || !context().memberships?.length) return;
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive === "granted") await registerDevice();
  },
  async unregister() {
    if (native) await PushNotifications.unregister().catch(error => console.warn("Push unregister:", error));
  }
};
