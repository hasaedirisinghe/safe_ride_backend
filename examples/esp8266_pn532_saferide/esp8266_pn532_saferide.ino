#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <SPI.h>
#include <PN532_SPI.h>
#include <PN532.h>
#include <time.h>

#define PN532_SS D0

// Replace these values before uploading to the ESP8266.
const char* WIFI_SSID = "Dialog 4G E01";
const char* WIFI_PASSWORD = "6BgfF84Q";
const char* MAC_LAN_IP = "192.168.8.101";

// Local emulator-only identity created by `npm run seed`.
const char* PROJECT_ID = "saferide-lk-3500b";
const char* DEVICE_ID = "device-demo";
const char* DEVICE_CREDENTIAL = "device-demo.local-device-secret";

PN532_SPI pn532spi(SPI, PN532_SS);
PN532 nfc(pn532spi);

bool pn532Ready = false;
String lastUid;
unsigned long lastScanSentAt = 0;

String apiUrl() {
  return String("http://") + MAC_LAN_IP +
    ":5001/" + PROJECT_ID +
    "/asia-south1/api/api/v1/devices/rfid/scan";
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("ESP IP: ");
  Serial.println(WiFi.localIP());
}

bool syncClock() {
  // The API requires a UTC ISO-8601 timestamp. NTP supplies UTC epoch time.
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Synchronizing clock");

  const unsigned long startedAt = millis();
  while (time(nullptr) < 1700000000 && millis() - startedAt < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  return time(nullptr) >= 1700000000;
}

String uidToHex(const uint8_t* uid, uint8_t uidLength) {
  String result;
  result.reserve(uidLength * 2);

  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }

  result.toUpperCase();
  return result;
}

String utcTimestamp(time_t value) {
  struct tm utc;
  gmtime_r(&value, &utc);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return String(buffer);
}

void sendScan(const String& cardUid) {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  const time_t scannedAt = time(nullptr);
  if (scannedAt < 1700000000) {
    Serial.println("Scan not sent: clock is not synchronized.");
    return;
  }

  const String eventId = String(DEVICE_ID) + "-" +
    String((unsigned long)scannedAt) + "-" + String(millis());
  const String body = String("{\"deviceId\":\"") + DEVICE_ID +
    "\",\"eventId\":\"" + eventId +
    "\",\"cardUid\":\"" + cardUid +
    "\",\"scannedAt\":\"" + utcTimestamp(scannedAt) + "\"}";

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(10000);

  if (!http.begin(client, apiUrl())) {
    Serial.println("Could not create HTTP request.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_CREDENTIAL);

  const int statusCode = http.POST(body);
  const String response = http.getString();

  Serial.printf("API status: %d\n", statusCode);
  Serial.println(response);
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  connectWifi();
  if (!syncClock()) {
    Serial.println("NTP failed. Restart after checking internet access.");
  }

  Serial.println("Starting PN532 SPI reader...");
  SPI.begin();
  nfc.begin();
  delay(500);

  if (!nfc.getFirmwareVersion()) {
    Serial.println("PN532 not found. Check SPI wiring and board switches.");
    return;
  }

  pn532Ready = true;
  nfc.SAMConfig();
  Serial.println("Ready to scan cards.");
}

void loop() {
  if (!pn532Ready) {
    delay(1000);
    return;
  }

  uint8_t uid[7];
  uint8_t uidLength = 0;

  if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength)) {
    const String cardUid = uidToHex(uid, uidLength);
    Serial.println("Card UID: " + cardUid);

    // Avoid repeatedly submitting the same card while it remains on the reader.
    if (cardUid != lastUid || millis() - lastScanSentAt >= 12000) {
      lastUid = cardUid;
      lastScanSentAt = millis();
      sendScan(cardUid);
    } else {
      Serial.println("Repeated local scan ignored.");
    }

    delay(750);
  }
}
