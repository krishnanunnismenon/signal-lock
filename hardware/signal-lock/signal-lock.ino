#include <Arduino.h>
#include "Quadrature.h"

// GPIO numbers, not physical pin positions; A=yellow, B=orange, common=GND.
// Raw channel order: G22/G19, G16/G5, G15/G21. Laptop maps to Accessory, Colour, Animal.
// Keep this order and direction: the laptop bridge handles the position/direction correction.
// The former Accessory yellow wire moved from G2 to G15:
// G2 remained LOW during diagnosis even with the yellow wire disconnected.
constexpr uint8_t ACTIVE_KNOBS = 3;
constexpr uint8_t PIN_A[3] = {22, 16, 15};
constexpr uint8_t PIN_B[3] = {19, 5, 21};
constexpr int8_t DIRECTION[3] = {1, 1, 1}; // Laptop bridge reverses these raw directions.
constexpr uint8_t TRANSITIONS_PER_CLICK[3] = {4, 4, 4}; // Some EC11 variants need 2.
Quadrature encoders[3];
char epoch[41] = "";
char incoming[64];
uint8_t incomingLength = 0;
bool incomingOverflow = false;
uint32_t sequence = 0;
uint32_t lastReady = 0;
bool inspectPins = false;
uint32_t lastPins = 0;
uint8_t previousAB[3];
uint32_t changesA[3] = {0, 0, 0};
uint32_t changesB[3] = {0, 0, 0};

uint8_t readAB(uint8_t index) {
  return (digitalRead(PIN_A[index]) << 1) | digitalRead(PIN_B[index]);
}

void resetTravel() {
  for (uint8_t i = 0; i < ACTIVE_KNOBS; i++) encoders[i].reset(readAB(i));
}

void receiveCommand() {
  if (strcmp(incoming, "STOP") == 0) {
    epoch[0] = '\0';
    inspectPins = false;
    resetTravel();
    return;
  }
  if (strcmp(incoming, "QUIET") == 0) { inspectPins = false; return; }
  if (strcmp(incoming, "WATCH") == 0) {
    if (strcmp(epoch, "monitor") == 0 && !inspectPins) {
      inspectPins = true;
      lastPins = millis() - 1000;
      for (uint8_t i = 0; i < ACTIVE_KNOBS; i++) {
        changesA[i] = changesB[i] = 0;
        previousAB[i] = readAB(i);
      }
    }
    return;
  }
  if (strncmp(incoming, "ARM ", 4) != 0) return;
  const char* value = incoming + 4;
  size_t length = strlen(value);
  if (length == 0 || length > 40) return;
  for (size_t i = 0; i < length; i++) {
    char c = value[i];
    if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
          (c >= '0' && c <= '9') || c == '-')) return;
  }
  if (strcmp(epoch, value) != 0) {
    inspectPins = false;
    strcpy(epoch, value);
    sequence = 0;
    resetTravel();
  }
}

void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < ACTIVE_KNOBS; i++) {
    pinMode(PIN_A[i], INPUT_PULLUP);
    pinMode(PIN_B[i], INPUT_PULLUP);
    encoders[i].transitionsPerClick = TRANSITIONS_PER_CLICK[i];
    previousAB[i] = readAB(i);
  }
  resetTravel();
  Serial.println("{\"v\":1,\"type\":\"ready\"}");
}

void loop() {
  // Bound each read pass so USB input cannot starve encoder sampling.
  for (uint8_t count = 0; count < 64 && Serial.available(); count++) {
    char c = Serial.read();
    if (c == '\n') {
      if (!incomingOverflow) { incoming[incomingLength] = '\0'; receiveCommand(); }
      incomingLength = 0;
      incomingOverflow = false;
    } else if (c != '\r' && !incomingOverflow) {
      if (incomingLength < sizeof(incoming) - 1) incoming[incomingLength++] = c;
      else incomingOverflow = true;
    }
  }
  for (uint8_t i = 0; i < ACTIVE_KNOBS; i++) {
    uint8_t ab = readAB(i);
    if ((previousAB[i] ^ ab) & 2) changesA[i]++;
    if ((previousAB[i] ^ ab) & 1) changesB[i]++;
    previousAB[i] = ab;
    int8_t step = encoders[i].sample(ab);
    if (step && epoch[0]) {
      char message[160];
      int length = snprintf(message, sizeof(message),
        "{\"v\":1,\"type\":\"turn\",\"epoch\":\"%s\",\"seq\":%lu,\"knob\":%u,\"delta\":%d}\n",
        epoch, static_cast<unsigned long>(++sequence), i, step * DIRECTION[i]);
      // No replay queue: a blocked USB connection drops input.
      if (length > 0 && length < static_cast<int>(sizeof(message)) && Serial.availableForWrite() >= length)
        Serial.write(reinterpret_cast<const uint8_t*>(message), length);
    }
  }
  if (inspectPins && millis() - lastPins >= 1000) {
    lastPins = millis();
    // One G15/G21 snapshot per second (now Animal), independent of decoded clicks.
    // Counters capture changes between snapshots, including contact bounce.
    constexpr uint8_t i = 2;
    if (ACTIVE_KNOBS > i) Serial.printf(
      "{\"v\":1,\"type\":\"pins\",\"knob\":2,\"pinA\":%u,\"pinB\":%u,\"a\":%u,\"b\":%u,\"changesA\":%lu,\"changesB\":%lu}\n",
      PIN_A[i], PIN_B[i], (previousAB[i] >> 1) & 1, previousAB[i] & 1,
      static_cast<unsigned long>(changesA[i]), static_cast<unsigned long>(changesB[i]));
  }
  if (!epoch[0] && millis() - lastReady >= 1000) {
    lastReady = millis();
    Serial.println("{\"v\":1,\"type\":\"ready\"}");
  }
  delay(1);
}
