/*
 *  SMART HOME CREDENTIALS TEMPLATE
 *  Rename this file to 'credentials.h' and fill in your details.
 *  The 'credentials.h' file is already in .gitignore to keep your secrets safe.
 */

#ifndef CREDENTIALS_H
#define CREDENTIALS_H

// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// MQTT (HiveMQ Cloud) Credentials
const char* MQTT_SERVER = "YOUR_HIVEMQ_URL.s1.eu.hivemq.cloud";
const int   MQTT_PORT   = 8883;
const char* MQTT_USER   = "YOUR_MQTT_USERNAME";
const char* MQTT_PASS   = "YOUR_MQTT_PASSWORD";

#endif
