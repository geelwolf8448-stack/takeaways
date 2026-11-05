# Takeaways Tonight? — personal information inventory and retention register

**Working document — not legal advice.** The proprietor and Information Officer must confirm actual processing, lawful bases, retention periods and safeguards with a South African privacy attorney. Do not treat suggested periods as statutory periods.

## 1. Platform and responsible party

- Operator: Takeaways Tonight?, operated by an individual sole proprietor.
- Proprietor: Antione Els.
- Proposed Information Officer: Antione Els; registration confirmation is still outstanding.
- Public privacy contact: [TO BE SUPPLIED]
- Business/service address: [TO BE CONFIRMED AND APPROVED FOR PUBLICATION]
- Hosting: GitHub Pages for the public site; Supabase project currently hosted in eu-west-1 (Ireland); Firebase/Google Cloud Messaging is being configured for Android push notifications.

## 2. Processing register

| Data category | Examples | Purpose | Access / recipient | Retention decision |
|---|---|---|---|---|
| Customer account | Email, name, mobile number | Sign-in, account and support | Customer, authorised platform administrator, Supabase | [Set period and deletion rule] |
| Customer order | Items, quantities, price, order status, fulfilment choice, delivery address and notes | Save and relay order request; order history | Customer, authorised restaurant team for that order, platform administrator | [Set period; consider accounting, dispute and legal needs] |
| Restaurant application | Business details, WhatsApp number, menu, permission declaration | Review and publish approved listing | Platform administrator; public only after approval | [Set period for approved/rejected applications] |
| Restaurant owner access | Name, phone, email, requested role, decision | Verify access to restaurant portal | Applicant and platform administrator; restaurant team only after approval | [Set period after decision or removal] |
| Push device registration | FCM device token, user ID, platform, timestamps | Send new-order alerts to verified restaurant team | User's own token record; server-side Edge Function for sending; Firebase/Google as delivery provider | Remove on sign-out, token invalidation or withdrawal; review stale-token cleanup |
| Security/admin records | Sign-in, permission and administrative events | Protect accounts, investigate misuse and maintain accountability | Restricted platform administrators and service providers as needed | [Set period and access restrictions] |
| Restaurant listing assets | Approved logo, menu, photos, hours, public contact | Publish approved restaurant listing | Public only after written approval | Remove or update when permission ends; keep evidence of approval as needed |

## 3. Data minimisation and safeguards

- Do not request or store payment card numbers, CVVs, banking passwords, OTPs or unnecessary identity documents.
- Push messages must not include customer names, phone numbers, delivery addresses, order notes or menu details.
- Keep Supabase service-role credentials, Firebase service-account private keys and signing keys outside browser code and GitHub.
- Restrict restaurant access to the relevant restaurant's orders and team.
- Keep commission ledger records private to platform administrators.
- Require written permission before publishing a restaurant's menu, photographs, logo, contact number or other supplied content.
- Use written operator/data-processing terms with service providers where required.
- Review access when an employee or restaurant representative leaves.

## 4. Cross-border processing review

Supabase is currently configured in the eu-west-1 region (Ireland). Firebase/Google services may also process device registration and notification delivery information. The Information Officer must document the relevant service-provider terms, locations, safeguards, lawful grounds and any cross-border transfer requirements under POPIA before commercial launch.

## 5. Retention and deletion schedule — approval required

The Information Officer must complete the following table after legal/accounting advice. Do not delete records that must lawfully be retained, and do not keep personal information indefinitely merely because storage is available.

| Record | Approved retention period | Trigger for deletion/anonymisation | Responsible person |
|---|---|---|---|
| Customer profile | [APPROVE] | Account closure / inactivity, subject to legal obligations | [NAME] |
| Customer order and support record | [APPROVE] | End of approved record period / dispute resolution | [NAME] |
| Partner application | [APPROVE] | End of application/appeal period | [NAME] |
| Restaurant owner access request | [APPROVE] | Access removed / end of approved record period | [NAME] |
| Push device token | Until sign-out, withdrawal, token invalidation or access removal | Delete token row and unregister device where appropriate | Platform administrator / automated process |
| Security and administrator logs | [APPROVE] | End of approved security/accountability period | [NAME] |
| Restaurant listing content | While permission and listing remain active | Remove from public listing when permission is withdrawn or listing ends | Platform administrator |

## 6. Data subject request process

Create a monitored privacy contact channel. Log requests for access, correction, objection, deletion or complaint; verify the requester proportionately; identify affected systems and service providers; apply current statutory timelines; document the response; and retain evidence of completion.

## 7. Review and sign-off

- Prepared by: [NAME]
- Reviewed by privacy attorney: [NAME / DATE]
- Approved by Information Officer: [NAME / DATE]
- Next review: [DATE]
