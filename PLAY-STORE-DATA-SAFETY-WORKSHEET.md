# Takeaways Tonight? — Google Play Data safety working sheet

**Do not submit this worksheet as the Play Console declaration.** Confirm every answer against the exact release build, live Supabase configuration, Firebase setup and current Play Console definitions.

## Data categories to review

| Data category | Current app purpose | Potential recipient / sharing | Release verification |
|---|---|---|---|
| Name, email address and phone number | Customer/restaurant owner accounts, sign-in and support | Supabase; restaurant receives only the order contact details needed to fulfil an order | Confirm all fields and account deletion flow |
| Order information | Items, quantities, price, order status, collection/delivery choice, delivery address and customer notes | Relevant restaurant team and platform administrator; Supabase | Confirm only the relevant restaurant can see each order |
| Device or other IDs | Android FCM registration token for optional restaurant-owner order alerts | Supabase and Firebase Cloud Messaging/Google | Confirm actual token storage, Firebase service and deletion on sign-out |
| Business information | Restaurant application, approved menu, photos, opening hours and public contact | Platform administrator; public only after partner approval | Confirm listing permission and removal process |
| Security/technical records | Authentication, access and security events | Supabase/GitHub or relevant service providers as configured | Confirm actual logs, retention and vendor terms |

## Important statements to verify

- Customers pay the restaurant directly. The platform does not collect customer card details or bank credentials.
- Do not classify the app as collecting precise device location unless the final build actually requests or receives it. Delivery addresses are entered by the customer and are separate from GPS location.
- The platform does not include advertising SDKs in the current feature set; verify the final dependencies before declaring this.
- Restaurant-owner push notifications are optional. Device registration tokens are used to deliver generic new-order alerts and should not contain customer order details.
- Restaurant teams should receive only order details needed to respond to their own restaurant's order requests.
- Commission records are for platform-administrator access only.

## Before completing the Play Console form

1. Review the exact release APK/AAB and dependency/SDK inventory.
2. Confirm the privacy policy URL is public, accurate and contains the Firebase notification disclosure.
3. Confirm the Supabase project region, Firebase processing terms and cross-border safeguards.
4. Test account sign-out, token removal, customer order access and restaurant access restrictions.
5. Confirm whether any analytics, crash reporting, email, hosting or support provider collects additional information.
6. Have the Information Officer and privacy attorney approve the declarations.
7. Keep a dated copy of the final answers and the build version they describe.
