# SHOPIX

## AI-Powered Smart Receipt & Shopping Assistant

SHOPIX is a web application for organizing shopping receipts, tracking expenses, managing warranties, receiving reminders, and reviewing spending analytics.

### Features

- Receipt scanning and metadata capture
- OCR text extraction
- Expense dashboard
- Warranty tracker with 30, 7, and 1 day push reminders
- Monthly expense reports delivered through web push
- In-app notification centre backed by Firestore
- Per-browser push registration and per-account notification preferences
- Installable PWA metadata
- Unified light theme
- Responsive dashboard and shared account header
- Search, filtering, and multi-currency reports
- Live previous-month and month-to-date analytics
- Account cleanup for receipts, warranties, tokens, preferences, and notification history

### Team

- Dhruvi
- Farjana
- Radhika
- Angel

### Technology

- HTML, CSS, and JavaScript
- Firebase Authentication, Firestore, Storage, and Realtime Database
- Firebase Cloud Functions v2 and Cloud Scheduler
- Firebase Cloud Messaging web push
- Tesseract.js for OCR
- Local Storage for small UI preferences such as avatar settings

## Notification Architecture

Two scheduled Cloud Functions run in `asia-south1` using the `Asia/Kolkata` timezone:

| Function | Schedule | Purpose |
| --- | --- | --- |
| `sendMonthlyExpenseReports` | `0 9 1 * *` | Creates a previous-month report notification on the 1st at 09:00 India time. |
| `sendWarrantyReminders` | `0 9 * * *` | Creates reminders exactly 30, 7, and 1 days before warranty expiry. |

Monthly reports are created for every account unless the user has turned off `monthlyReports`. Email verification is not required. Warranty reminders are controlled by the account-level `warrantyReminders` preference.

Push delivery is only attempted when all of these are true:

- The account has `pushEnabled: true`.
- The relevant category preference is enabled.
- At least one push token is stored for the account.
- The notification does not already exist.

Notifications use deterministic document IDs so scheduler retries cannot create or send duplicates:

```text
monthly_report_{YYYY-MM}
warranty_{warrantyId}_{expiryDate}_30|7|1
```

Push payloads contain only a generic title, generic body, notification ID, type, and internal route. Receipt totals and product names remain inside the authenticated app.

## Firestore Data Model

```text
users/{uid}/pushTokens/{sha256Fid}
users/{uid}/notificationPreferences/settings
users/{uid}/notifications/{notificationId}
```

### Push tokens

Each browser registration is stored under a SHA-256 hash of its Firebase Installation ID:

- `fid`: Firebase Installation ID
- `type`: `web`
- `userAgent`
- `createdAt`, `updatedAt`, `lastSeenAt`

Invalid or expired FIDs are removed after FCM rejects them during multicast delivery.

### Preferences

`notificationPreferences/settings` contains:

- `pushEnabled`: defaults to `false`
- `monthlyReports`: defaults to `true`
- `warrantyReminders`: defaults to `true`
- `updatedAt`

### Notifications

Notification documents include:

- `type`: `monthly_report` or `warranty_reminder`
- `title`, `message`, `route`
- `createdAt`
- `readAt`
- Push delivery status and error details
- Monthly `periodKey` or warranty `warrantyId`, `expiryDate`, and `stage`

There is no `monthlyReports` collection. Reports are calculated directly from receipts so the current month can remain live and month-to-date.

## Billing and Free-Tier Limits

FCM web push does not require a paid messaging provider. The scheduled functions still require the Firebase Blaze plan because Cloud Functions and Cloud Scheduler are billable Google Cloud services.

As of the current Google Cloud pricing documentation:

- Cloud Scheduler includes three free jobs per billing account.
- Additional Cloud Scheduler jobs cost approximately `$0.10` per job per 31 days.
- This project uses two scheduled jobs, so the scheduler jobs fit within the free allowance.
- Cloud Functions has a free usage tier, but invocations, compute time, and related services can incur charges above that tier.
- Firebase and Google Cloud pricing can change; verify the current pricing before enabling billing.

Do not enable billing or deploy scheduled functions until the project owner has approved the Blaze plan and the expected usage.

## Setup and Deployment

### Prerequisites

- Node.js 22 for Cloud Functions
- Firebase CLI access to project `shopix-f1fee`
- Firebase Authentication with the required sign-in providers
- A Firebase project approved for the Blaze plan
- Firebase Cloud Messaging enabled
- A Web Push certificate public key

Install and authenticate the Firebase CLI:

```powershell
npx firebase-tools@latest login
npx firebase-tools@latest use shopix-f1fee
```

### 1. Configure Web Push

1. Open Firebase Console > Project settings > Cloud Messaging.
2. Under Web Push certificates, generate or select a key pair.
3. Copy the public key into `FCM_VAPID_KEY` in `js/notifications.js`.
4. Keep the private key in Firebase; never place it in frontend code.

The app ships with an empty `FCM_VAPID_KEY`. Until it is filled in, the Settings page reports that push setup is required and registration is disabled.

The service worker must be available from the site root:

```text
/firebase-messaging-sw.js
```

It uses the notification payload and `webpush.fcmOptions.link` for click navigation. The manifest is served from `/manifest.webmanifest` and declares the existing logo as a 1024x1024 WebP image.

If Firebase Hosting is used, verify that the repository's hosting configuration serves these files from the root, sends JavaScript and Web App Manifest MIME types correctly, and does not cache the service worker indefinitely. `firebase.json` currently configures Functions and Firestore but does not contain a Hosting section.

### 2. Configure Function Parameters

The functions use one parameter:

- `APP_BASE_URL`: public app URL, default `https://shopix-f1fee.web.app`

For repeatable deployments, create `functions/.env.shopix-f1fee` locally:

```dotenv
APP_BASE_URL="https://shopix-f1fee.web.app"
```

`functions/.env.*` files are ignored by Git. No email provider secret or API key is required.

### 3. Install, Test, and Deploy

```powershell
npm install --prefix functions
npm test --prefix functions
npm run lint --prefix functions
```

Deploy the functions and Firestore rules:

```powershell
npx firebase-tools@latest deploy --only functions,firestore:rules
```

The first deployment may ask to enable billing and required APIs. After deployment, scheduled functions can be run manually from the Firebase Console. A manual monthly run creates notifications for every eligible account, so use it carefully.

The frontend is static and must also be deployed through the project's existing hosting path. This repository does not configure Firebase Hosting automatically.

### 4. Verify

- Confirm both scheduled functions appear in the Firebase Console.
- Confirm the schedules use `Asia/Kolkata` and the intended 09:00 run time.
- Sign in and open Settings > Notifications.
- Grant browser notification permission and verify the browser token appears under `users/{uid}/pushTokens`.
- Check that category preferences persist after a reload.
- Test in-app notification history after a scheduled function run.
- Open a notification and confirm it routes to the intended internal page.

## Local Development

Serve the frontend over HTTP rather than opening files directly:

```powershell
npx http-server . -p 5500
```

Firebase emulators are configured for Auth, Functions, and Firestore:

```powershell
npx firebase-tools@latest emulators:start
```

The emulators require Java. Real FCM delivery cannot be tested from localhost without a valid VAPID key and browser notification permission.

Function tests use Node's built-in test runner and do not require Firebase credentials or an FCM key:

```powershell
npm test --prefix functions
npm run lint --prefix functions
```

## Security and Privacy

- `firestore.rules` restricts user data to the authenticated owner.
- Push token document IDs must be 64-character lowercase SHA-256 hashes.
- Clients can create, update, and delete only their own push tokens.
- Clients can read and write only the allowed notification preference fields.
- Clients cannot create notification documents. They can mark an existing notification read by setting `readAt` to the server timestamp.
- Notification routes are validated against an allowlist of internal SHOPIX pages.
- The VAPID public key is safe to ship; the Web Push private key stays in Firebase.
- Cloud Functions use the Firebase Admin SDK and do not expose service-account credentials to the browser.
- Account deletion removes receipts, warranties, push tokens, preferences, notifications, Storage files, and Realtime Database data owned by the user.
- Push payloads avoid receipt totals, product names, and other sensitive purchase details.

## Operational Notes

- Monthly notifications are created for all accounts, including accounts with no receipts, unless the user disables monthly reports.
- Warranty reminders are not backfilled when a user enables them after a 30, 7, or 1 day stage has passed.
- There is no 0-day warranty reminder.
- Notification creation and push delivery are separate: a notification can exist in the app even if the browser rejects its push message.
- FCM delivery depends on browser and operating-system support, notification permission, network conditions, and device power-saving behavior.
- Browser permission and a push registration are required separately in each browser or installed PWA. The account-level `pushEnabled` setting controls delivery for all of that account's registered browsers.
- The manifest makes the app installable, but this repository does not include a general offline-caching service worker.
