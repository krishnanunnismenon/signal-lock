#include <Arduino.h>
#include "Quadrature.h"

// PROVISIONAL GPIO numbers for a classic ESP32-WROOM board, not physical pin positions.
// Confirm the board labels and encoder terminals before connecting anything.
constexpr uint8_t ACTIVE_KNOBS = 1; // Change to 3 after the first encoder is calibrated.
constexpr uint8_t PIN_A[3] = {32, 25, 18};
constexpr uint8_t PIN_B[3] = {33, 26, 19};
constexpr int8_t DIRECTION[3] = {1, 1, 1}; // Use -1 if clockwise goes backwards.
constexpr uint8_t TRANSITIONS_PER_CLICK[3] = {4, 4, 4}; // Some EC11 variants need 2.
Quadrature encoders[3];
char epoch[41] = "";
char incoming[64];
uint8_t incomingLength = 0;
bool incomingOverflow = false;
uint32_t sequence = 0;
uint32_t lastReady = 0;

uint8_t readAB(uint8_t index) {
  return (digitalRead(PIN_A[index]) << 1) | digitalRead(PIN_B[index]);
}

void resetTravel() {
  for (uint8_t i = 0; i < ACTIVE_KNOBS; i++) encoders[i].reset(readAB(i));
}

void receiveCommand() {
  if (strcmp(incoming, "STOP") == 0) {
    epoch[0] = '\0';
    resetTravel();
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
    int8_t step = encoders[i].sample(readAB(i));
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
  if (!epoch[0] && millis() - lastReady >= 1000) {
    lastReady = millis();
    Serial.println("{\"v\":1,\"type\":\"ready\"}");
  }
  delay(1);
}
