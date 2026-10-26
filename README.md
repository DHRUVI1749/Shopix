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
- Deduplicated foreground in-app notification toasts
- Dry-run inspection for scheduled notification jobs
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
- GitHub Actions scheduled jobs with the Firebase Admin SDK
- Firebase Cloud Messaging web push
- Tesseract.js for OCR
- Local Storage for small UI preferences such as avatar settings

## Notification Architecture

Two scheduled GitHub Actions jobs run at 09:00 India time using the `Asia/Kolkata` timezone:

| Job | Schedule | Purpose |
| --- | --- | --- |
| `monthly` | `0 9 1 * *` | Creates a previous-month report notification on the 1st. |
| `warranty` | `0 9 * * *` | Creates reminders exactly 30, 7, and 1 days before warranty expiry. |

The workflow is `.github/workflows/scheduled-notifications.yml`. It invokes `functions/src/run-notifications.js` with the Firebase Admin SDK. Authentication uses GitHub OIDC and Google Cloud Workload Identity Federation, so no service-account key is stored in GitHub. The Cloud Functions scheduler code remains in `functions/src/index.js` for reference, and the current `firebase.json` does not deploy Functions. If an older Functions deployment exists in the project, delete it and any remaining scheduler jobs before relying on GitHub Actions; removing deployment configuration does not undeploy running functions.

Monthly reports are created for every account unless the user has turned off `monthlyReports`. Email verification is not required. Warranty reminders are controlled by the account-level `warrantyReminders` preference.

Push delivery is only attempted when all of these are true:

- The account has `pushEnabled: true`.
- The relevant category preference is enabled.
- At least one push token is stored for the account.
- The notification does not already exist.

Notifications use deterministic document IDs so normal scheduler retries cannot create duplicates while the notification document exists:

```text
monthly_report_{YYYY-MM}
warranty_{warrantyId}_{expiryDate}_30|7|1
```

Push payloads contain only a generic title, generic body, notification ID, type, and internal route. Receipt totals and product names remain inside the authenticated app.

Manual workflow runs have a `dry_run` input that defaults to `true`. A dry run reads notification preferences, warranty due dates, existing notification IDs, and push-token availability, then logs aggregate counts. It does not write notification documents or send FCM messages. Set `dry_run` to `false` explicitly to perform a real manual run. Scheduled runs are always real. The runner also refuses to start without `--dry-run` or `--execute`, so a bare local command cannot accidentally send notifications.

Foreground FCM messages are shown as in-app toasts only while the page is visible and the relevant account preferences are enabled. The toast is deduplicated by notification ID, does not create a second browser notification, and marks the notification read when opened. Background messages continue to be displayed by `firebase-messaging-sw.js`.

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

When the account has push enabled and the browser has already granted notification permission, authenticated pages refresh the FID registration on app startup. The SDK performs the FCM backend sync at most weekly, and the current FID is stored again on each refresh.

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

The notification design is intended to run without Firebase Blaze:

- The repository is public, so standard GitHub-hosted Actions runners are free.
- Workload Identity Federation and IAM are free.
- FCM web push is free.
- Firebase Authentication is no-cost for standard usage.
- Firestore Spark includes 1 GiB stored, 50K reads per day, and 20K writes per day.

With roughly five users, the daily preference and warranty scan is well below the Spark read and write limits. Recheck the limits if the user count grows substantially. Do not enable Blaze for these notification jobs. GitHub Actions scheduling is not a real-time service and can be delayed, so the jobs should be treated as best-effort reminders.

## Setup and Deployment

### Prerequisites

- Node.js 22
- Firebase project `shopix-f1fee` on the Spark plan
- Firebase Authentication with the required sign-in providers
- Firestore, Cloud Messaging, and Firebase Hosting enabled
- A Web Push certificate public key
- Access to change GitHub Actions repository variables

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

The public key is already configured in `js/notifications.js`. The private key remains in Firebase.

The service worker must be available from the site root:

```text
/firebase-messaging-sw.js
```

It uses the notification payload and `webpush.fcmOptions.link` for click navigation. If a same-origin app window is already open, the SDK focuses it and posts a `notification-clicked` message; `js/notifications.js` listens for that message and routes to the allowlisted internal page. The manifest is served from `/manifest.webmanifest` and declares the existing logo as a 1024x1024 WebP image. `firebase.json` configures Hosting and Firestore rules, and serves `.mjs` files with a JavaScript MIME type for the foreground notification helper.

### 2. Configure Google Cloud Workload Identity Federation

Do not create a service-account JSON key. Run these commands once in Google Cloud Shell or another authenticated shell. These IAM services do not require Blaze.

```bash
PROJECT_ID="shopix-f1fee"
REPO="DHRUVI1749/Shopix"
SA_NAME="shopix-notifications"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL="github"
PROVIDER="shopix"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

gcloud iam service-accounts create "$SA_NAME" \
  --project "$PROJECT_ID" \
  --display-name "SHOPIX GitHub notifications"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$SA_EMAIL" \
  --role "roles/datastore.user"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$SA_EMAIL" \
  --role "roles/firebaseauth.viewer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$SA_EMAIL" \
  --role "roles/firebasecloudmessaging.admin"

gcloud iam workload-identity-pools create "$POOL" \
  --project "$PROJECT_ID" \
  --location global \
  --display-name "GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
  --project "$PROJECT_ID" \
  --location global \
  --workload-identity-pool "$POOL" \
  --display-name "SHOPIX repository" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition "assertion.repository == '${REPO}' && assertion.ref == 'refs/heads/main'" \
  --issuer-uri "https://token.actions.githubusercontent.com"

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project "$PROJECT_ID" \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}"
```

Then add repository variables under Settings > Secrets and variables > Actions > Variables:

| Variable | Value |
| --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/shopix` |
| `GCP_SERVICE_ACCOUNT` | `shopix-notifications@shopix-f1fee.iam.gserviceaccount.com` |

The workflow sets `GCP_PROJECT_ID=shopix-f1fee` and `APP_BASE_URL=https://shopix-f1fee.web.app`. It also sets `FIRESTORE_PREFER_REST=true` so Firestore uses its REST transport with Workload Identity Federation external-account credentials. Update `APP_BASE_URL` in the workflow if the production URL changes.

### 3. Install, Test, and Run Manually

```powershell
npm ci --prefix functions
npm test --prefix functions
npm run lint --prefix functions
```

To inspect locally with Application Default Credentials:

```powershell
$env:GCP_PROJECT_ID="shopix-f1fee"
$env:APP_BASE_URL="https://shopix-f1fee.web.app"
$env:FIRESTORE_PREFER_REST="true"
node functions/src/run-notifications.js warranty --dry-run
```

Use `monthly` or `all` instead of `warranty` when needed. A dry run performs the same reads and logs `wouldCreate`, `wouldSend`, `pushTargets`, `alreadyExists`, and `skipped`, but performs no writes and sends no pushes.

To perform a real local run, replace `--dry-run` with `--execute`. The runner intentionally fails without one of those flags.

To trigger the workflow from GitHub, open Actions > Scheduled notifications > Run workflow, choose `all`, `warranty`, or `monthly`, and leave `dry_run` enabled for the first run. Set `dry_run` to `false` only when you intentionally want a real manual run. Scheduled runs are not affected by the manual dry-run default.

### 4. Deploy Static Site and Rules

```powershell
npx firebase-tools@latest deploy --only hosting,firestore:rules
```

No Functions deployment is needed. Do not run `firebase deploy --only functions` on the Spark plan.

### 5. Verify

- Confirm the Scheduled notifications workflow succeeds from Actions > Scheduled notifications.
- Confirm the workflow's two cron entries use `timezone: Asia/Kolkata` and the intended 09:00 run time.
- Confirm no legacy Cloud Functions or Cloud Scheduler jobs are still running for this project.
- Run a manual workflow with `dry_run` enabled and confirm its logs report expected counts without creating notifications or sending pushes.
- Sign in and open Settings > Notifications.
- Grant browser notification permission and verify the browser FID registration appears under `users/{uid}/pushTokens`.
- Check that category preferences persist after a reload.
- Test in-app notification history after a scheduled workflow run.
- Open a notification and confirm it routes to the intended internal page.
- With the app visible, confirm a foreground push produces one in-app toast, no duplicate browser notification, and no toast for disabled categories.
- Confirm a background push still uses the service-worker notification and opens the intended route, both when the app is closed and when another app page is already open.

### 6. Safest First Activation

1. Run `npm test --prefix functions`, `npm run lint --prefix functions`, and review the deployment diff without committing or deploying yet.
2. Deploy only the static site and rules after review:

   ```powershell
   npx firebase-tools@latest deploy --only hosting,firestore:rules
   ```

3. Confirm in Google Cloud that no legacy Functions or Cloud Scheduler jobs remain. Do not run `firebase deploy --only functions`.
4. Add the Workload Identity Federation repository variables and confirm the WIF condition still allows only `refs/heads/main`.
5. Manually run the workflow with `all` and `dry_run` enabled. Confirm the logs contain aggregate counts, no user identifiers, no FCM tokens, and no Firestore writes.
6. Perform one controlled real run only after the dry run matches expectations. Use a dedicated test account with a due warranty if possible; otherwise note that a real `monthly` run creates one notification per account.
7. Verify one foreground toast and one background notification on a real device. Then allow the scheduled runs to continue automatically.

## Local Development

Serve the frontend over HTTP rather than opening files directly:

```powershell
npx http-server . -p 5500
```

Firebase emulators are configured for Auth and Firestore:

```powershell
npx firebase-tools@latest emulators:start
```

The emulators require Java. Real FCM delivery cannot be tested from localhost without a valid VAPID key and browser notification permission.

Notification tests use Node's built-in test runner and do not require Firebase credentials or an FCM key:

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
- GitHub Actions uses OIDC and Workload Identity Federation; no service-account JSON key is stored in GitHub or exposed to the browser.
- Account deletion removes receipts, warranties, push tokens, preferences, notifications, Storage files, and Realtime Database data owned by the user.
- Push payloads avoid receipt totals, product names, and other sensitive purchase details.

## Operational Notes

- Monthly notifications are created for all accounts, including accounts with no receipts, unless the user disables monthly reports.
- Reminder timing is fixed to `Asia/Kolkata`; per-user timezone scheduling is not implemented.
- GitHub Actions schedules are best-effort and can be delayed; there is no Cloud Scheduler retry loop.
- Push delivery is not retried after a partial failure. Rerunning the workflow only sends notifications that do not already exist.
- Manual workflow runs default to `dry_run=true`. Real manual runs require selecting `dry_run=false`, and the runner additionally requires `--execute`. Scheduled runs execute automatically.
- Successful dry-run summary logs contain aggregate counts only; they do not include FIDs, tokens, email addresses, or user identifiers.
- `FIRESTORE_PREFER_REST=true` avoids the Firestore gRPC path for Workload Identity Federation external-account credentials. Keep it set unless the runner's Firestore operations are changed to methods that require gRPC.
- Deleting a notification document removes its idempotency record; a later rerun can recreate and resend that notification.
- Foreground FCM messages appear as deduplicated in-app toasts only while the page is visible and preferences allow the category. They do not create a second browser notification. Background messages continue through the service worker.
- If Functions were previously deployed, confirm they and their scheduler jobs are deleted. Removing them from `firebase.json` does not undeploy them.
- Public-repository scheduled workflows are disabled after 60 days without repository activity. Keep the repository active or re-enable the workflow if it is paused.
- Manual workflow runs must use the `main` branch because the WIF condition restricts OIDC to `refs/heads/main`.
- Warranty reminders are not backfilled when a user enables them after a 30, 7, or 1 day stage has passed.
- There is no 0-day warranty reminder.
- Notification creation and push delivery are separate: a notification can exist in the app even if the browser rejects its push message.
- FCM delivery depends on browser and operating-system support, notification permission, network conditions, and device power-saving behavior.
- Browser permission and a push registration are required separately in each browser or installed PWA. The account-level `pushEnabled` setting controls delivery for all of that account's registered browsers.
- The manifest makes the app installable, but this repository does not include a general offline-caching service worker.
