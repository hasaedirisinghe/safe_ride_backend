# ESP8266 + PN532 local API test

This example sends PN532 card UIDs to the SafeRide-LK RFID scan endpoint using the seeded local device credential.

## 1. Start and seed the emulators

From the backend root:

```bash
npx --prefix functions firebase emulators:start --project saferide-lk-3500b --only auth,firestore,functions
```

In a second terminal:

```bash
cd functions
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=saferide-lk-3500b npm run seed
```

## 2. Configure the sketch

Find the Mac's Wi-Fi address:

```bash
ipconfig getifaddr en0
```

Set `WIFI_SSID`, `WIFI_PASSWORD`, and `MAC_LAN_IP` in `esp8266_pn532_saferide.ino`. The ESP8266 and Mac must be on the same network. Do not use `127.0.0.1` in the sketch.

## 3. Register the physical card

Scan once and copy the UID printed by Serial Monitor. Register it against the demo student, replacing `YOUR_CARD_UID`:

```bash
curl -X POST http://127.0.0.1:5001/saferide-lk-3500b/asia-south1/api/api/v1/admin/rfid-cards \
  -H 'Content-Type: application/json' \
  -H 'x-emulator-uid: admin-demo' \
  -H 'x-emulator-role: ADMIN' \
  -d '{"cardUid":"YOUR_CARD_UID","studentId":"student-demo"}'
```

## 4. Start a trip

An RFID scan is accepted only while the device's bus has an active trip:

```bash
curl -X POST http://127.0.0.1:5001/saferide-lk-3500b/asia-south1/api/api/v1/trips/start \
  -H 'Content-Type: application/json' \
  -H 'x-emulator-uid: driver-demo' \
  -H 'x-emulator-role: DRIVER' \
  -d '{"busId":"bus-demo","tripType":"PICKUP"}'
```

Scan the registered card again. Serial Monitor should show HTTP `200` and an API response with `outcome: ACCEPTED`.

## Production note

The sketch intentionally uses plain HTTP only for a trusted local emulator network. A deployed API must use HTTPS with `WiFiClientSecure` and certificate validation. Provision a unique device through the admin API and store its returned credential securely; never use the demo credential in production.
