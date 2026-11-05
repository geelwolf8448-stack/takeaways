# Takeaways Tonight? — information security incident response plan

**Working operational plan.** Have a South African privacy attorney review the notification, legal privilege, reporting and evidence-retention steps. This document is not a substitute for POPIA advice.

## 1. What counts as an incident

Examples include a lost device with an active owner session, unauthorised access to customer or restaurant records, leaked API/service credentials, exposed database rows, compromised email or GitHub access, malware, accidental publication of private applications, or an unauthorised disclosure by a service provider.

## 2. Immediate response

1. Record the date/time discovered, reporter, systems affected and what is known. Do not delete logs or evidence.
2. Protect people first. If there is an immediate safety risk, use the appropriate emergency response.
3. Contain the incident: revoke compromised sessions, disable affected accounts, rotate exposed credentials, restrict access, pause affected functionality or take a vulnerable listing/page offline.
4. Preserve relevant logs, screenshots, request IDs and a timeline in a restricted location. Do not copy unnecessary personal information into public tickets or chats.
5. Contact the relevant service provider through its official security channel and obtain an incident reference.
6. Notify the proprietor and proposed Information Officer immediately.

## 3. Assess impact

Determine:
- what personal information and data subjects may be affected;
- whether the information was accessed, copied, altered, lost or made unavailable;
- whether passwords, tokens, contact details, order information, delivery addresses or financial information were involved;
- the number and type of people affected, as far as can reasonably be established;
- whether the information is encrypted or otherwise protected;
- likely harm, fraud, impersonation, harassment or safety consequences;
- which service providers and systems were involved; and
- what containment and recovery actions have been completed.

## 4. POPIA notification decision

The Information Officer must obtain prompt legal advice and assess section 22 of POPIA. Where there are reasonable grounds to believe that personal information has been accessed or acquired by an unauthorised person, the responsible party must notify the Information Regulator and affected data subjects as soon as reasonably possible, subject to the Act and any lawful delay or exception. Do not wait for every forensic detail before obtaining advice about notification.

Use the Information Regulator's official reporting channel and follow its current instructions: https://inforegulator.org.za/.

The notice to affected people should be clear and practical. It should explain what happened, what information may be involved, what the operator is doing, what people can do to protect themselves, and how to contact the Information Officer. Do not speculate or minimise the incident.

## 5. Recovery

- Close the vulnerability and test the fix before restoring affected functionality.
- Rotate keys and secrets that may have been exposed.
- Revoke active sessions and reset access where appropriate.
- Verify database policies and public pages after the fix.
- Check backups and restore only clean, verified data.
- Monitor for repeat access and suspicious activity.
- Record lessons learned and assign corrective actions with owners and due dates.

## 6. Incident register

| Field | Record |
|---|---|
| Incident reference | [UNIQUE REFERENCE] |
| Date/time discovered | [DATE / TIME / TIME ZONE] |
| Reported by | [NAME / ROLE] |
| Systems affected | [SYSTEMS] |
| Information involved | [CATEGORIES ONLY — MINIMISE COPIES] |
| Containment actions | [DETAILS] |
| Service provider reference | [REFERENCE] |
| Risk assessment | [DETAILS] |
| Legal advice obtained | [DATE / ADVISER] |
| Regulator notification | [DECISION / DATE / REFERENCE] |
| Data-subject notification | [DECISION / DATE / METHOD] |
| Recovery actions | [DETAILS] |
| Lessons and prevention | [ACTIONS / OWNER / DUE DATE] |

## 7. Contacts to complete before launch

- Proprietor: Antione Els — [verified telephone and email]
- Information Officer: [registration confirmation and monitored contact]
- Privacy/legal adviser: [name and emergency contact]
- Supabase support/security channel: [current project support route]
- GitHub account recovery/security contact: [verified route]
- Firebase support/security contact: [verified route]
