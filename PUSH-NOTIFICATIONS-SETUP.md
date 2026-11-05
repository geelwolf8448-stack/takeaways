# Takeaways Tonight? — Android background order notifications

## What has been implemented

The restaurant portal now uses the Capacitor Push Notifications plugin for native Android registration. A verified restaurant team member can opt in from the restaurant portal. The device's FCM registration token is stored in the private `restaurant_push_tokens` table under that signed-in user. When a customer submits a new order, the `marketplace-api` Edge Function looks up approved restaurant team members and sends a generic Android notification through Firebase Cloud Messaging (FCM).

The notification does not include the customer's name, phone number, address, notes or order contents. It only says that a new order number is waiting. The owner must open the app and sign in to view the order.

## External setup still required

Push delivery cannot work until the platform owner completes the following Firebase setup. These are configuration credentials and must never be pasted into ChatGPT or committed to the repository.

### 1. Create the Firebase Android app

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a Firebase project for Takeaways Tonight? or select the project already created for it.
3. Add an Android app with this exact package name: `za.co.takeawaystonight.app`.
4. Download `google-services.json`.
5. Add that file to the root of the GitHub repository `geelwolf8448-stack/takeaways` and commit it. This is the Firebase client configuration file; do not substitute a service-account private key. The signed and debug Android workflows copy it into `android/app/`.
6. Confirm the JSON includes the exact Android package name `za.co.takeawaystonight.app`.
7. The build workflow runs `scripts/configure-firebase-android.js`, which validates the package name and adds Google's Gradle plugin (version 4.5.0) to the generated Android project. Do not manually edit generated Gradle files.
8. Confirm Firebase Cloud Messaging is enabled for the project.

### 2. Add the server credential to Supabase

1. In Firebase Console, open **Project settings → Service accounts**.
2. Generate a new private key for the Firebase service account. Keep the downloaded JSON file private.
3. Confirm the service account has permission to send Firebase Cloud Messaging messages (Firebase Cloud Messaging API Admin).
4. Open the [Supabase Edge Function secrets page](https://supabase.com/dashboard/project/xsrmtokfrqdyfbrqljsm/functions/secrets).
5. Add one secret:
   - Name: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Value: the complete contents of the Firebase service-account JSON file.
6. Do not add this private JSON file to GitHub, email it, or paste it into a chat. Store an offline backup securely and restrict access.

The Edge Function uses this credential to obtain short-lived OAuth access tokens and send FCM HTTP v1 messages. The private key is never sent to the Android app.

### 3. Build and test on a real Android phone

1. Add `google-services.json` to the repository root.
2. Run the Android debug build from **Actions → Build Takeaways Tonight Android**.
3. Install the generated debug APK on a physical Android phone with Google Play services.
4. Sign in to the restaurant portal using a user whose restaurant access has been approved.
5. Tap **Enable background order notifications** and allow Android notification permission.
6. Confirm the portal reports that background notifications are enabled.
7. Submit a test order using a separate customer account.
8. Test notification delivery with the restaurant app open, in the background, and fully closed.
9. Tap the notification and confirm it opens the restaurant portal. Confirm that the order can only be viewed after the owner signs in.
10. Repeat after signing out and signing back in. Signing out removes that user's stored device token.

Use a test restaurant and dummy customer information. Do not use real customer details in test orders.

## Important limitations

- The Firebase project, `google-services.json`, and Supabase service-account secret are not yet configured by this code change. Until those steps are completed and a real device test passes, background notifications must be described as **implemented but awaiting Firebase setup and device verification**, not live.
- Android push is the target of this implementation. iOS/APNs is not configured.
- The public website's browser notifications are only best-effort while the restaurant portal is open. They are not a replacement for native Android FCM push.
- Android users can disable notifications in system settings. Battery restrictions, lack of network connectivity and device settings can delay delivery.
- The app should still be checked periodically when an order is expected; push delivery is not a guaranteed substitute for the restaurant's normal order-monitoring process.

## Technical safeguards

- Push tokens are stored in a table with Row Level Security. A signed-in user can register and read only their own token rows; registration requires verified restaurant membership.
- Only the server-side Edge Function reads tokens for sending messages.
- Expired/unregistered device tokens are removed after Firebase reports them as invalid.
- Push messages deliberately omit customer personal information.
- Signing out deletes the user's token row and unregisters the app on that device.
