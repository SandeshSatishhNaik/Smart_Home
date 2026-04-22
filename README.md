# 🌌 Smart Home Masterpiece: AI-Powered IoT Dashboard

[![Version](https://img.shields.io/badge/version-2.5.0-blueviolet.svg)](https://github.com/)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32-blue.svg)](https://www.espressif.com/)
[![MQTT](https://img.shields.io/badge/Broker-HiveMQ-orange.svg)](https://www.hivemq.com/)
[![Design](https://img.shields.io/badge/Design-Glassmorphism-pink.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS)

A high-fidelity, intelligent Smart Home command center. This project transforms a standard IoT dashboard into a premium experience featuring **Bento Grid layouts**, **Masterpiece 3D switches**, and a **Semantic Voice Assistant** that understands natural human intent.

---

## 🚀 Key Features

### 🧠 Semantic Voice Engine
Unlike standard assistants that rely on rigid commands, this engine uses **Weighted Semantic Scoring**.
- **Natural Intent**: Understands "I'm feeling hot" to turn on the fan or "It's too dark" to toggle lights.
- **Cognitive Scenarios**: Triggers multi-device scenes (e.g., "Movie Mode") with a single phrase.
- **Neural TTS**: High-fidelity, human-like voice responses with natural prosody.

### 💎 Premium "Masterpiece" UI
- **Glassmorphic Bento Grid**: A fully responsive layout that adapts from 4K desktops to smartphones.
- **3D Neumorphic Switches**: Custom-engineered toggle components with CSS-driven depth, glowing auras, and tactile feedback.
- **Dynamic Aura States**: Real-time visual feedback using hardware confirmation (MQTT state-sync).

### 🛡️ Industrial-Grade ESP32 Logic
- **MQ2 Auto-Calibration**: 60s warm-up and 10s baseline detection for precision gas sensing.
- **LWT (Last Will & Testament)**: Real-time "Online/Offline" tracking for reliable system monitoring.
- **Anti-False Positive PIR**: Debounced motion detection for accurate security logging.

---

## 📂 Project Structure

```bash
├── css/                   # Premium styles (Glassmorphism, Bento Grid)
├── js/                    # Core logic
│   ├── voice-assistant.js # Semantic NLU & Speech synthesis
│   ├── mqttClient.js      # High-performance HiveMQ integration
│   ├── dashboard.js       # UI state management
│   └── utils.js           # Shared hardware status & helpers
├── esp32_code/            # C++ Hardware Source
│   └── smart_home_esp32.ino
├── index.html             # Main Command Center
├── analytics.html         # Real-time Telemetry & Charts
└── DEPLOYMENT.md          # Setup & Configuration Guide
```

---

## 🛠️ Getting Started

### 1. Hardware Setup
- **Microcontroller**: ESP32 (WROOM-32 recommended)
- **Pins**: 
  - Relays: 26, 27, 25, 33 (Active-Low)
  - PIR Motion: 32
  - MQ2 Gas: 34

### 2. MQTT Configuration
This project is optimized for **HiveMQ Cloud**.
- Update your credentials in `js/mqttClient.js` for the dashboard.
- Update your credentials in `esp32_code/smart_home_esp32.ino` for the hardware.

### 3. Deployment
Simply serve the root directory via any static web server (VS Code Live Server, Nginx, or GitHub Pages).

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---

## 🤝 Acknowledgments
- **Google Fonts (Inter)** for modern typography.
- **HiveMQ** for reliable MQTT bridging.
- **Lucide Icons** for clean, scalable UI elements.

---
*Designed with ❤️ by the Smart Home Team.*