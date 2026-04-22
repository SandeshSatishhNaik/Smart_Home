#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "credentials.h" // 🔥 Security: Credentials stored in ignored file

/* ================= WIFI ================= */
const char* ssid = WIFI_SSID;
const char* pass = WIFI_PASS;

/* ================= MQTT (HiveMQ Cloud) ================= */
const char* mqtt_server = MQTT_SERVER;
const int   mqtt_port   = MQTT_PORT;
const char* mqtt_user   = MQTT_USER;
const char* mqtt_pass   = MQTT_PASS;

/* ================= MQTT TOPICS ================= */
const char* STATUS_TOPIC = "home/status"; // 🔥 NEW: For Online/Offline tracking
const char* GAS_TOPIC    = "home/sensor/gas";
const char* MOTION_TOPIC = "home/sensor/motion";

const char* RELAY_SET_TOPIC[4] = {
  "home/relay1/set",
  "home/relay2/set",
  "home/relay3/set",
  "home/relay4/set"
};

const char* RELAY_STATE_TOPIC[4] = {
  "home/relay1/state",
  "home/relay2/state",
  "home/relay3/state",
  "home/relay4/state"
};

/* ================= GPIO (SAFE PINS) ================= */
const int relayPin[4] = {26, 27, 25, 33};   // ACTIVE-LOW relays
const int PIR_PIN = 32;
const int MQ2_PIN = 34;                    // ADC only

/* ================= GAS LOGIC ================= */
const int GAS_THRESHOLD = 400;  
const int NUM_SAMPLES = 10;    
const unsigned long GAS_SUSTAIN_TIME = 10000;  // 10s high to confirm leak
bool gasLeakActive = false;
unsigned long leakStartTime = 0;
float baseline = 0;  // Auto-detected in setup

/* ================= PIR LOGIC ================= */
const unsigned long PIR_DEBOUNCE = 300;
int lastPirState = -1;
unsigned long lastPirTime = 0;

/* ================= RELAY STATE ================= */
bool relayState[4] = {false, false, false, false};

/* ================= MQTT CLIENT ================= */
WiFiClientSecure espClient;
PubSubClient client(espClient);

/* ================= UTILITY: AVERAGE ADC READ ================= */
float readAveragedMQ2() {
  long sum = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += analogRead(MQ2_PIN);
    delay(10);
  }
  return (float)sum / NUM_SAMPLES;
}

/* ================= WIFI ================= */
void setup_wifi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid,pass);

  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 30000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
  }
}

/* ================= RELAY STATE SYNC ================= */
void publishRelayStates() {
  for (int i = 0; i < 4; i++) {
    StaticJsonDocument<64> doc;
    doc["state"] = relayState[i] ? "ON" : "OFF";
    char payload[64];
    serializeJson(doc, payload);
    client.publish(RELAY_STATE_TOPIC[i], payload, true); // retained
    Serial.printf("[SYNC] Relay %d: %s\n", i+1, relayState[i] ? "ON" : "OFF");
  }
}

/* ================= MQTT CALLBACK ================= */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  payload[length] = '\0';
  String msg = String((char*)payload);
  Serial.printf("[MQTT INCOMING] Topic: %s | Payload: %s\n", topic, msg.c_str());

  for (int i = 0; i < 4; i++) {
    if (String(topic) == RELAY_SET_TOPIC[i]) {
      StaticJsonDocument<64> doc;
      if (deserializeJson(doc, msg) == DeserializationError::Ok) {
        bool newState = (doc["state"] == "ON");
        if (newState != relayState[i]) {
          relayState[i] = newState;
          digitalWrite(relayPin[i], relayState[i] ? LOW : HIGH);
          
          StaticJsonDocument<64> resp;
          resp["state"] = relayState[i] ? "ON" : "OFF";
          char out[64];
          serializeJson(resp, out);
          client.publish(RELAY_STATE_TOPIC[i], out, true);
        }
      }
    }
  }
}

/* ================= MQTT RECONNECT ================= */
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    // 🔥 ENHANCED: Connect with Last Will and Testament (LWT)
    if (client.connect("ESP32-SMART-HOME", mqtt_user, mqtt_pass, STATUS_TOPIC, 1, true, "OFFLINE")) {
      Serial.println("connected");
      
      client.publish(STATUS_TOPIC, "ONLINE", true);

      for (int i = 0; i < 4; i++) {
        client.subscribe(RELAY_SET_TOPIC[i]);
      }

      publishRelayStates(); 
    } else {
      Serial.print("failed, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

/* ================= SETUP ================= */
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 Smart Home Boot ===");

  for (int i = 0; i < 4; i++) {
    pinMode(relayPin[i], OUTPUT);
    digitalWrite(relayPin[i], HIGH); // OFF
    Serial.printf("Relay %d (Pin %d): Initialized OFF\n", i+1, relayPin[i]);
  }

  pinMode(PIR_PIN, INPUT);
  pinMode(MQ2_PIN, INPUT);

  // MQ2 WARM-UP (60s)
  Serial.println("=== MQ2 Warm-Up (60s) ===");
  unsigned long warmUpStart = millis();
  while (millis() - warmUpStart < 60000) {
    if ((millis() - warmUpStart) % 10000 < 1000) {
      Serial.printf("Warming up... %ds\n", (int)((millis() - warmUpStart) / 1000));
    }
    delay(1000);
  }

  // AUTO-CALIBRATE BASELINE
  Serial.println("=== Calibrating MQ2 Baseline (10s) ===");
  float sumBaseline = 0;
  for (int i = 0; i < 10; i++) {
    sumBaseline += readAveragedMQ2();
    delay(1000);
    Serial.print(".");
  }
  baseline = sumBaseline / 10.0;
  Serial.printf("\nBaseline detected: %.0f\n", baseline);

  setup_wifi();

  espClient.setInsecure(); 
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  // MANUAL RELAY TEST
  Serial.println("=== MANUAL RELAY TEST ===");
  for (int i = 0; i < 4; i++) {
    digitalWrite(relayPin[i], LOW); delay(500);
    digitalWrite(relayPin[i], HIGH); delay(500);
  }

  reconnect();
  Serial.println("System Ready");
}

/* ================= LOOP ================= */
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();

  // HEARTBEAT
  static unsigned long lastHeartbeat = 0;
  if (now - lastHeartbeat > 30000) {
    lastHeartbeat = now;
    client.publish(STATUS_TOPIC, "ONLINE", true);
  }

  /* -------- MQ-2 GAS SENSOR -------- */
  static unsigned long lastGasRead = 0;
  if (now - lastGasRead > 2000) {
    lastGasRead = now;
    float rawValue = readAveragedMQ2();
    
    if (rawValue > GAS_THRESHOLD) {
      if (!gasLeakActive) leakStartTime = now;
      if (now - leakStartTime >= GAS_SUSTAIN_TIME) {
        if (!gasLeakActive) {
          gasLeakActive = true;
          StaticJsonDocument<128> doc;
          doc["value"] = rawValue;
          doc["leak"] = true; 
          doc["baseline"] = baseline;
          char payload[128];
          serializeJson(doc, payload);
          client.publish(GAS_TOPIC, payload);
          Serial.printf("[GAS ALERT] Leak confirmed: %.0f\n", rawValue);
        }
      }
    } else if (gasLeakActive) {
      gasLeakActive = false;
      StaticJsonDocument<128> doc;
      doc["value"] = rawValue;
      doc["leak"] = false;
      doc["baseline"] = baseline;
      char payload[128];
      serializeJson(doc, payload);
      client.publish(GAS_TOPIC, payload);
      Serial.println("[GAS CLEARED]");
    }
  }

  /* -------- PIR MOTION SENSOR -------- */
  int pirState = digitalRead(PIR_PIN);
  static int lastPirState = -1;
  static unsigned long lastPirTime = 0;

  if (pirState != lastPirState && (now - lastPirTime > PIR_DEBOUNCE)) {
    lastPirState = pirState;
    lastPirTime = now;
    StaticJsonDocument<64> doc;
    doc["motion"] = pirState;
    char payload[64];
    serializeJson(doc, payload);
    client.publish(MOTION_TOPIC, payload);
    Serial.println(pirState ? "[PIR] Motion Detected" : "[PIR] Clear");
  }

  delay(200);
}
