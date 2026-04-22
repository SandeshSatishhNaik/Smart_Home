# Smart Home Dashboard Voice Assistant Plan and Tech Stack

## 1. Goal
Add an AI-style voice assistant to the dashboard as an additional control method, while preserving all existing manual switch behavior.

## 2. Non-Interruption Rules
- Manual switch flow remains unchanged.
- Existing MQTT topics and payload formats remain unchanged.
- Existing Firebase logging remains unchanged.
- Existing analytics logic remains unchanged.
- If voice is unavailable, dashboard still works exactly as today.

## 3. Current Baseline (What Already Exists)
- Frontend: multi-page HTML, CSS, vanilla JavaScript.
- Real-time control: MQTT over WebSockets via MQTT.js.
- Auth and data logging: Firebase Auth and Realtime Database.
- Relay control flow: dashboard publishes command to home relay set topics and waits for relay state topics.
- Alerting and UX feedback: existing alert system in JavaScript.
- User settings persistence: localStorage.

## 4. Target Feature Scope
### V1 Scope (recommended first release)
- Voice commands for relay control:
- Turn on Light, Fan, TV, Plug.
- Turn off Light, Fan, TV, Plug.
- Support appliance custom names from Settings.
- Spoken acknowledgement on command receipt.
- Spoken confirmation only after MQTT state confirmation.
- Spoken failure if confirmation timeout occurs.
- Push-to-talk mic interaction.

### V1.1 Scope (enhancement)
- Command synonyms and flexible phrases.
- Optional all on and all off commands with confirmation.
- Assistant response style tuning.
- Better confidence handling and duplicate command suppression.

### V2 Scope (optional)
- Status query commands.
- Hinglish command support.
- Always-listening mode with wake phrase and strict safety controls.
- Optional cloud AI intent classification through secure backend proxy.

## 5. High-Level Architecture
### Components
- Voice UI layer in dashboard page.
- Speech input engine using browser speech recognition.
- Command parser for intent and target appliance extraction.
- Command dispatcher that reuses existing relay control path.
- Confirmation watcher bound to MQTT relay state updates.
- Speech output engine using browser text-to-speech.
- Voice settings manager backed by localStorage.

### Principle
Voice is only an input adapter and response layer. Core control logic stays in the current relay and MQTT pipeline.

## 6. End-to-End Command Lifecycle
1. User presses mic and speaks command.
2. Speech recognition returns transcript and confidence score.
3. Parser extracts action and appliance target.
4. Assistant speaks acknowledgement, for example: Yes, turning on fan.
5. Dispatcher triggers existing relay control function.
6. Existing MQTT publish runs as normal.
7. On incoming relay state confirmation, assistant speaks final confirmation, for example: Fan is turned on now.
8. If confirmation does not arrive before timeout, assistant speaks failure message.

## 7. Detailed Implementation Plan
### Phase 0: Preparation and Contracts
- Freeze current behavior as baseline.
- Define voice command grammar and synonyms.
- Define confirmation timeout window and cooldown policy.
- Define voice settings keys in localStorage.

### Phase 1: Core Voice Assistant (V1)
- Add assistant panel to dashboard UI.
- Add mic button, listening state, transcript preview, assistant response line.
- Add speech recognition wrapper with robust error handling.
- Add parser for on off appliance commands.
- Reuse existing relay control path from dashboard logic.
- Add confirmation watcher based on MQTT relay state updates.
- Add speech synthesis for acknowledgement and final status.
- Add fallback behavior for unsupported browsers.

### Phase 2: UX and Safety Hardening (V1.1)
- Add confidence threshold and unclear command handling.
- Add duplicate command cooldown window.
- Add optional confirmation for bulk commands.
- Add improved response templates and accessibility labels.

### Phase 3: Settings and Personalization
- Add voice enable toggle in settings.
- Add voice response enable toggle in settings.
- Add language selector if needed.
- Add strict mode toggle for confidence policy.

### Phase 4: Quality, Regression, and Release
- Manual control regression tests.
- Voice command functional tests across all appliances.
- MQTT confirmation timeout tests.
- Browser support and graceful fallback tests.
- Final readme updates and rollout notes.

## 8. File-Level Change Plan
- index.html: add assistant UI panel and module include.
- css/dashboard.css: add assistant panel styles and responsive states.
- js/dashboard.js: expose safe relay command entrypoint for voice reuse.
- js/mqttclient.js: emit relay confirmation events for voice watcher.
- js/alerts.js: optional helper for assistant alert style reuse.
- js/utils.js: optional text normalization helpers.
- settings.html: add voice preferences controls.
- readme.md: document feature behavior and browser requirements.
- New file js/voice-assistant.js: speech recognition, parser, dispatcher bridge, and speech synthesis.

## 9. Proposed Tech Stack
### Existing Stack Retained
- HTML5 for page structure.
- CSS3 for UI and responsive layout.
- Vanilla JavaScript for app logic.
- Firebase Web SDK for authentication and logging data.
- MQTT.js for device command and telemetry transport.
- Chart.js for analytics charts.

### New Browser Technologies
- Web Speech API SpeechRecognition or webkitSpeechRecognition for voice input.
- Web Speech API SpeechSynthesis for assistant spoken responses.
- Custom browser event bus using CustomEvent for relay state confirmations.
- localStorage for voice preferences and personalization.

### Optional Future Stack for Advanced AI
- Lightweight backend proxy service for LLM intent parsing.
- Secure API key storage in backend only.
- Optional cloud speech services for multilingual high accuracy mode.

## 10. Command and Intent Model
### Intent Types
- DEVICE_ON
- DEVICE_OFF
- UNKNOWN

### Device Mapping
- Relay 1 mapped to Light and custom alias.
- Relay 2 mapped to Fan and custom alias.
- Relay 3 mapped to TV and custom alias.
- Relay 4 mapped to Plug and custom alias.

### Example Accepted Commands
- Turn on fan
- Switch off light
- Fan on
- TV off
- Turn on bedroom light

## 11. Reliability and Safety Controls
- Confidence threshold gate.
- Duplicate suppression window.
- Command execution lock while pending confirmation.
- Confirmation timeout with user feedback.
- No auto execution for ambiguous commands.
- Manual controls always available regardless of voice state.

## 12. Security and Privacy Notes
- Voice processing is browser side for V1.
- No raw voice data persisted in Firebase by default.
- Transcript logging disabled by default.
- Existing exposed credentials should be rotated before production rollout.

## 13. Testing Strategy
### Functional Tests
- Each appliance on off via voice command.
- Manual and voice interleaving without state corruption.
- Custom appliance names recognized correctly.
- Spoken acknowledgement and spoken confirmation sequence works.

### Failure Tests
- Mic permission denied.
- Unsupported browser.
- MQTT disconnected during command.
- Relay confirmation timeout.
- Low confidence transcript.

### Regression Tests
- Existing manual switches unchanged.
- Existing sensor cards unchanged.
- Existing analytics and logging unchanged.

## 14. Acceptance Criteria
- Voice can control all four relays using natural command variations.
- Assistant speaks acknowledgement immediately.
- Assistant speaks final confirmation only after relay state confirmation.
- Manual control remains unchanged and fully functional.
- Unsupported browser shows fallback and does not break dashboard usage.
- No regressions in current MQTT and Firebase flows.

## 15. Estimated Delivery Plan
- Day 1: Phase 0 and Phase 1 core implementation.
- Day 2: Phase 2 hardening and Phase 3 settings integration.
- Day 3: Phase 4 testing, polish, and documentation.

## 16. Review Checklist for Your Approval
- Scope acceptable for V1.
- Command vocabulary acceptable.
- Response style acceptable.
- Timeout behavior acceptable.
- Push-to-talk default acceptable.
- Settings options acceptable.

## 17. Recommended V1 Defaults
- Interaction mode: push-to-talk.
- Language: English.
- Voice feedback: enabled.
- Confidence threshold: medium strict.
- Confirmation timeout: 5 to 8 seconds.
- Duplicate suppression window: 1.5 to 2 seconds.
