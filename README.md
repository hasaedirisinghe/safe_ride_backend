# SafeRide-LK Backend

Production-oriented Firebase backend for school-bus trips, RFID attendance, live bus location, parent notifications, and role-scoped access. It uses TypeScript, Express, Cloud Functions v2, Firestore, Firebase Authentication, Firebase Cloud Messaging, Zod, and Vitest.

## Architecture

The deployable source is under `functions/src`. Routes validate and authorize each request, controllers translate HTTP input/output, services own business transactions, and repositories isolate persistence concerns such as bus location. The mobile app never receives RFID UIDs, device hashes, or device credentials. All client writes to operational collections are denied by Firestore rules.

One v2 HTTPS function named `api` hosts `/api/v1`. A Firestore-created trigger named `dispatchNotification` delivers queued notifications independently of attendance transactions.

## Prerequisites

- Node.js 22
- npm
- Firebase CLI (`npm install` installs a project-local CLI)
- A Firebase project on the Blaze plan for production Cloud Functions, outbound FCM work, Cloud Build, Artifact Registry, and Secret Manager-backed configuration
- Java for the Firebase Emulator Suite

The main cost drivers are function invocations/compute, Firestore document reads and writes, stored audit history, Cloud Build/Artifact Registry, logging, and network egress. FCM itself has no per-message charge, but surrounding backend work may be billable. Configure budgets and alerts before production deployment.

## Install and configure

```bash
cp .firebaserc.example .firebaserc
cp functions/.env.example functions/.env
cd functions
npm install
```

Replace the example Firebase project ID. Firebase Functions automatically loads supported `.env` files. Set `ALLOWED_ORIGINS` to a comma-separated allow-list in production. `SAFERIDE_FUNCTION_REGION` is a Firebase parameter and defaults to `asia-south1`.

Never commit a service-account file. Local emulators use Application Default Credentials supplied by Firebase tooling. Production Functions use their managed service identity. Device credentials are returned exactly once by provisioning/rotation APIs and must be stored securely by the provisioning operator.

## Local emulators and seed data

From the repository root:

```bash
npx --prefix functions firebase emulators:start --project saferide-lk-3500b --only auth,firestore,functions
```

In another terminal, with emulator variables printed by the CLI available:

```bash
cd functions
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=saferide-lk-3500b npm run seed
```

The seed command refuses to run unless both emulators are configured. It creates fictional admin, parent, driver, bus, student, card, and device records and prints the local-only credentials. For an optional header-based auth shortcut, set `APP_ENV=development`, `FUNCTIONS_EMULATOR=true`, and `ENABLE_EMULATOR_AUTH=true`. This shortcut is structurally disabled in production. Prefer real Auth Emulator ID tokens for integration work.

After an RFID boarding test, reset the fictional attendance state and start a fresh pickup trip with:

```bash
cd functions
npm run reset:demo
```

This command works only against the local emulators. It clears demo trips, attendance events, scan idempotency records, and notifications, returns `device-demo` to `BOARDING` mode, and starts a new active pickup trip. Base records such as users, students, buses, devices, and RFID registrations are preserved.

## Build and test

```bash
cd functions
npm run build
npm test
npm run test:rules
```

`npm test` runs isolated unit tests. `test:rules` starts the Firestore emulator and verifies cross-parent isolation, backend-only writes, and sensitive collection denial. Use `npm run serve` for a build followed by the emulator suite.

## Authentication

Mobile requests use `Authorization: Bearer <Firebase-ID-token>`. Roles are Firebase custom claims set only by admin backend operations: `ADMIN`, `PARENT`, or `DRIVER`.

Devices receive a credential shaped as `<deviceId>.<random-secret>` and send it as a bearer token. Firestore stores only an scrypt hash. Credentials are independent per device, rotatable, revocable through the device `enabled` field, and never usable as a Firebase client credential.

## API contract

Base emulator URL:

```text
http://127.0.0.1:5001/<project-id>/asia-south1/api/api/v1
```

All successes contain `success`, `message`, `data`, and `timestamp`. Errors contain `success: false`, a stable `error.code`, a safe `error.message`, and `timestamp`.

### Parent and student

```text
GET   /parents/me
GET   /parents/me/students?limit=20
GET   /parents/me/notifications?limit=20
PATCH /parents/me/notifications/:id/read
GET   /students/:id
GET   /students/:id/attendance?limit=20
GET   /students/:id/current-status
GET   /students/:id/current-trip
POST  /notifications/tokens
DELETE /notifications/tokens
```

Parents can access only students linked by `parentIds`. Token body: `{"token":"<FCM token>","platform":"android"}`.

### Driver, trips, buses, and GPS

```text
GET  /drivers/me
GET  /drivers/me/bus
GET  /drivers/me/students
POST /trips/start
POST /trips/:id/complete
POST /trips/:id/confirm-dropoff
GET  /buses/:id
GET  /buses/:id/location
GET  /buses/:id/active-trip
POST /buses/:id/location
```

Trip start body: `{"busId":"bus-demo","tripType":"PICKUP"}`. Only one active trip per bus is enforced by the transactional `activeTripByBus` lock. Completion is blocked while any student remains `ON_BUS`.

Location updates accept an assigned driver token or that bus's device credential:

```json
{
  "latitude": 6.9271,
  "longitude": 79.8612,
  "speed": 32.5,
  "heading": 135,
  "recordedAt": "2026-10-17T08:20:00Z"
}
```

Older/equal samples cannot overwrite newer data. ETA is intentionally unavailable because the MVP has no route model.

### RFID device

```bash
curl -X POST "$BASE/devices/rfid/scan" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer device-demo.local-device-secret' \
  -d '{"deviceId":"device-demo","eventId":"device-demo_000001","cardUid":"04A1B2C3","scannedAt":"2026-10-17T08:15:00Z"}'
```

```text
POST /devices/rfid/scan
POST /devices/heartbeat
```

The server derives bus, trip, student, and event type. Each device has a trusted `scanMode`: `BOARDING` permits only `NOT_BOARDED -> ON_BUS`; `EXIT` permits only `ON_BUS -> EXITED`. A driver confirms `EXITED -> DROPPED_OFF`. `eventId` is idempotent per device, a short repeat window rejects accidental rescans, and transaction retries cannot duplicate attendance or notifications.

### Administration

```text
POST  /admin/parents
POST  /admin/students
POST  /admin/drivers
POST  /admin/buses
POST  /admin/rfid-cards
PATCH /admin/rfid-cards/:id
POST  /admin/devices
PATCH /admin/devices/:id
POST  /admin/devices/:id/rotate-credential
POST  /admin/assign-student
POST  /admin/assign-driver
GET   /admin/trips?limit=20
GET   /admin/attendance-events?limit=20
GET   /admin/device-scan-events?limit=20
```

Example device provisioning body:

```json
{"id":"device-001","busId":"bus-001","firmwareVersion":"1.0.0","scanMode":"BOARDING"}
```

Parent/driver creation can reference an existing `firebaseUid`, or provide email and a temporary password for server-side Auth creation. Clients can never submit their own role.

More copy/paste examples are in [examples/api.http](examples/api.http) and a Postman collection is in [examples/SafeRide-LK.postman_collection.json](examples/SafeRide-LK.postman_collection.json).

## Parent app integration and real-time listeners

The parent app may subscribe read-only to:

- `students/{studentId}` for a linked child
- `studentTripStatus/{tripId_studentId}` for linked child status
- `buses/{busId}`, `busLocations/{busId}`, and `trips/{tripId}` when `parentBusAccess/{firebaseUid_busId}` exists
- `notifications` where `parentId` equals the parent's profile document ID
- `attendanceEvents` for linked children

The backend maintains `parentBusAccess` when student bus assignments change. Direct client writes are denied everywhere. Operational mutations must use the REST API. Query constraints must match the rule constraints; a broad collection query is rejected even if its eventual results would be allowed.

## ESP connection

Provision the device through the admin endpoint, save the one-time credential in protected flash/NVS, and send HTTPS JSON with a stable monotonically unique `eventId`. Queue scans while offline and retry the exact same payload/event ID until a definitive response. Never store Firebase service-account credentials or use the RFID UID as a secret. The ESP clock should be synchronized; timestamps more than 24 hours from server receipt are rejected.

## Deployment

```bash
cp .firebaserc.example .firebaserc  # then set the intended project
cd functions && npm run build && npm test && cd ..
npx --prefix functions firebase deploy --only firestore:rules,firestore:indexes
npx --prefix functions firebase deploy --only functions
```

Deployment requires an explicit human choice of Firebase project. This repository does not deploy automatically. Configure the runtime service account with least privilege, restrict allowed origins, enable App Check where appropriate for mobile traffic, set retention/TTL policies for raw scan audit data, and monitor rejected scans, rate limits, and notification failures.

## Known MVP boundaries

- A physical entrance cannot infer intent, so entrance devices use an explicit server-stored scan mode. Use separate modes/devices or an authorized operational mode change when boarding and exiting happen at the same reader.
- In-memory HTTP rate limiting is per Cloud Functions instance. Add API Gateway/Cloud Armor for global production abuse controls.
- Notification delivery is retried by the event infrastructure when the trigger throws; permanent invalid tokens are deleted. A scheduled dead-letter reprocessor is not included.
- Location stores only the latest point in Firestore. The repository interface allows a later Realtime Database implementation.
- ETA is not fabricated and is returned as unavailable by omission/null until route and traffic inputs exist.

