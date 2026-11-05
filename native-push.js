import { PushNotifications } from "https://esm.sh/@capacitor/push-notifications@7.0.7?deps=@capacitor/core@7.4.3";
window.TT_NATIVE_PUSH = { enable: async () => { await PushNotifications.requestPermissions(); await PushNotifications.register(); } };
