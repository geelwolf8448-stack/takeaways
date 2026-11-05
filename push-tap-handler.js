import { PushNotifications } from "https://esm.sh/@capacitor/push-notifications@7.0.7?deps=@capacitor/core@7.4.3";

if (window.Capacitor?.isNativePlatform?.()) {
  PushNotifications.addListener("pushNotificationActionPerformed", action => {
    if (action?.notification?.data?.screen === "orders") {
      window.location.href = "restaurant-portal.html";
    }
  }).catch(error => console.warn("Push tap handler could not start:", error));
}
