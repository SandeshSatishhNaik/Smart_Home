// Voice assistant for dashboard relay control.
(function () {
	const STORAGE_KEYS = {
		assistantEnabled: 'voiceAssistantEnabled',
		voiceReplyEnabled: 'voiceAssistantSpeechEnabled',
		browserVoiceName: 'voiceAssistantBrowserVoiceName',
		talkMode: 'voiceAssistantTalkMode'
	};

	const COMMAND_COOLDOWN_MS = 1800;
	const CONFIRMATION_TIMEOUT_MS = 7000;
	const MIN_CONFIDENCE = 0.45;

	const DEVICE_DEFAULTS = {
		1: 'Light',
		2: 'Fan',
		3: 'TV',
		4: 'Plug'
	};

	const DEVICE_SYNONYMS = {
		1: ['lamp'],
		2: ['blower'],
		3: ['television'],
		4: ['socket', 'outlet']
	};

	class DashboardVoiceAssistant {
		constructor() {
			this.panel = document.getElementById('voiceAssistantPanel');
			this.settingsPanel = document.getElementById('voiceSettingsPanel');
			if (!this.panel && !this.settingsPanel) {
				return;
			}

			this.toggleButton = document.getElementById('voiceToggleBtn');
			this.toggleText = document.getElementById('voiceToggleText');
			this.statusElement = document.getElementById('voiceStatus');
			this.transcriptElement = document.getElementById('voiceTranscript');
			this.replyElement = document.getElementById('voiceReply');
			this.assistantToggle = document.getElementById('voiceAssistantEnabled');
			this.voiceReplyToggle = document.getElementById('voiceReplyToggle');
 			this.voiceModeSelect = document.getElementById('voiceModeSelect');
			this.voiceBrowserSelect = document.getElementById('voiceBrowserSelect');

			this.pendingCommand = null;
			this.commandQueue = [];
			this.lastCommandSignature = '';
			this.lastCommandAt = 0;
			this.isListening = false;
			this.ignoreNextClick = false;
			this.pointerTalkActive = false;

			this.isAssistantEnabled = this.readBoolean(STORAGE_KEYS.assistantEnabled, true);
			this.isVoiceReplyEnabled = this.readBoolean(STORAGE_KEYS.voiceReplyEnabled, true);
			this.browserVoiceName = (localStorage.getItem(STORAGE_KEYS.browserVoiceName) || '').trim();
			this.talkMode = this.readTalkMode(localStorage.getItem(STORAGE_KEYS.talkMode));

			const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
			this.supportsRecognition = typeof RecognitionCtor !== 'undefined';
			this.supportsBrowserSynthesis = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
			this.supportsSynthesis = this.supportsBrowserSynthesis;
			this.speechVoice = null;

			if (this.supportsRecognition) {
				this.recognition = new RecognitionCtor();
				this.configureRecognition();
			}

			if (this.supportsBrowserSynthesis) {
				this.configureSynthesis();
			}

			this.bindEvents();
			this.refreshToggleUI();

			window.addEventListener('relay-state-confirmed', (event) => {
				this.handleRelayConfirmation(event.detail || {});
			});

			document.addEventListener('visibilitychange', () => {
				if (document.hidden && this.isListening) {
					this.stopListening();
				}
			});

			if (!this.supportsRecognition) {
				this.setStatus('Voice recognition is not supported in this browser.', 'error');
				this.setReply('Manual controls are active. Try Chrome or Edge for voice control.');
				if (this.toggleButton) {
					this.toggleButton.disabled = true;
				}
			}

			if (!this.supportsSynthesis && this.voiceReplyToggle) {
				this.voiceReplyToggle.checked = false;
				this.voiceReplyToggle.disabled = true;
				this.isVoiceReplyEnabled = false;
				localStorage.setItem(STORAGE_KEYS.voiceReplyEnabled, 'false');
			}
		}

		bindEvents() {
			this.syncControlsFromState();

			if (this.toggleButton) {
				this.toggleButton.addEventListener('click', () => {
					if (this.talkMode === 'hold' && this.ignoreNextClick) {
						this.ignoreNextClick = false;
						return;
					}

					if (!this.isAssistantEnabled) {
						this.setStatus('Enable assistant to use voice commands.', 'error');
						return;
					}

					if (!this.supportsRecognition) {
						return;
					}

					if (this.isHoldMode()) {
						if (this.isListening) {
							this.stopListening();
						} else {
							this.startListening();
						}
						return;
					}

					if (this.isListening) {
						this.stopListening();
					} else {
						this.startListening();
					}
				});

				this.toggleButton.addEventListener('pointerdown', () => {
					if (!this.isHoldMode() || !this.isAssistantEnabled || !this.supportsRecognition) {
						return;
					}

					this.ignoreNextClick = true;
					this.pointerTalkActive = true;
					if (!this.isListening) {
						this.startListening();
					}
				});

				window.addEventListener('pointerup', () => {
					if (this.isHoldMode() && this.pointerTalkActive && this.isListening) {
						this.stopListening();
					}
					this.pointerTalkActive = false;
				});

				window.addEventListener('pointercancel', () => {
					if (this.isHoldMode() && this.isListening) {
						this.stopListening();
					}
					this.pointerTalkActive = false;
				});
			}

			if (this.assistantToggle) {
				this.assistantToggle.checked = this.isAssistantEnabled;
				this.assistantToggle.addEventListener('change', (event) => {
					this.isAssistantEnabled = event.target.checked;
					localStorage.setItem(STORAGE_KEYS.assistantEnabled, String(this.isAssistantEnabled));

					if (!this.isAssistantEnabled) {
						this.stopListening();
						this.stopSpeechPlayback();
						this.clearPendingCommand();
						this.commandQueue = [];
						this.setStatus('Assistant disabled.', 'error');
						this.setReply('Manual control remains active.');
					} else {
						this.setStatus('Assistant enabled.', 'success');
						this.setReply('Assistant is ready. Say: turn on fan.');
					}

					this.refreshToggleUI();
					this.emitStateChange();
				});
			}

			if (this.voiceReplyToggle) {
				this.voiceReplyToggle.checked = this.isVoiceReplyEnabled;
				this.voiceReplyToggle.addEventListener('change', (event) => {
					this.isVoiceReplyEnabled = event.target.checked;
					localStorage.setItem(STORAGE_KEYS.voiceReplyEnabled, String(this.isVoiceReplyEnabled));
					if (!this.isVoiceReplyEnabled) {
						this.stopSpeechPlayback();
					}
					this.setStatus(this.isVoiceReplyEnabled ? 'Voice reply enabled.' : 'Voice reply muted.', 'success');
					this.emitStateChange();
				});
			}

			if (this.voiceModeSelect) {
				this.voiceModeSelect.value = this.talkMode;
				this.voiceModeSelect.addEventListener('change', (event) => {
					this.talkMode = this.readTalkMode(event.target.value);
					localStorage.setItem(STORAGE_KEYS.talkMode, this.talkMode);
					this.refreshToggleUI();
					this.emitStateChange();
				});
			}

			if (this.voiceBrowserSelect) {
				this.voiceBrowserSelect.value = this.browserVoiceName;
				this.voiceBrowserSelect.addEventListener('change', (event) => {
					this.browserVoiceName = event.target.value.trim();
					if (this.browserVoiceName) {
						localStorage.setItem(STORAGE_KEYS.browserVoiceName, this.browserVoiceName);
					} else {
						localStorage.removeItem(STORAGE_KEYS.browserVoiceName);
					}
					this.speechVoice = null;
					this.setStatus(this.browserVoiceName ? 'Voice updated.' : 'Best available voice selected.', 'success');
					this.emitStateChange();
				});
			}

			this.emitStateChange();
		}

		syncControlsFromState() {
			if (this.assistantToggle) {
				this.assistantToggle.checked = this.isAssistantEnabled;
			}

			if (this.voiceReplyToggle) {
				this.voiceReplyToggle.checked = this.isVoiceReplyEnabled;
			}

			if (this.voiceModeSelect) {
				this.voiceModeSelect.value = this.talkMode;
			}

			if (this.voiceBrowserSelect) {
				this.voiceBrowserSelect.value = this.browserVoiceName;
			}

			this.refreshToggleUI();
		}

		readTalkMode(value) {
			return value === 'hold' ? 'hold' : 'tap';
		}

		isHoldMode() {
			return this.talkMode === 'hold';
		}

		emitStateChange() {
			window.dispatchEvent(new CustomEvent('voice-assistant-state-changed', {
				detail: {
					assistantEnabled: this.isAssistantEnabled,
					voiceReplyEnabled: this.isVoiceReplyEnabled,
					voiceName: this.browserVoiceName || '',
					talkMode: this.talkMode
				}
			}));

			if (typeof window.updateDashboardSummary === 'function') {
				window.updateDashboardSummary();
			}
		}

		configureRecognition() {
			this.recognition.lang = 'en-US';
			this.recognition.continuous = false;
			this.recognition.interimResults = false;
			this.recognition.maxAlternatives = 1;

			this.recognition.onstart = () => {
				this.isListening = true;
				this.setStatus('Listening...', 'listening');
				this.setReply('Speak now.');
				this.refreshToggleUI();
			};

			this.recognition.onresult = (event) => {
				const firstResult = event.results?.[0]?.[0];
				if (!firstResult) {
					this.setStatus('No voice input detected. Try again.', 'error');
					return;
				}

				this.handleTranscript(firstResult.transcript, firstResult.confidence);
			};

			this.recognition.onerror = (event) => {
				let message = 'Voice recognition error.';

				if (event.error === 'not-allowed') {
					message = 'Microphone permission denied.';
				} else if (event.error === 'no-speech') {
					message = 'No speech detected. Please try again.';
				} else if (event.error === 'network') {
					message = 'Network error during voice recognition.';
				}

				this.setStatus(message, 'error');
				this.setReply('You can keep using manual switches anytime.');
			};

			this.recognition.onend = () => {
				this.isListening = false;
				if (this.isAssistantEnabled) {
					this.setStatus('Idle', '');
				}
				this.refreshToggleUI();
			};
		}

		configureSynthesis() {
			const loadVoices = () => {
				const voices = window.speechSynthesis.getVoices();
				this.populateVoiceOptions(voices);
				this.speechVoice = this.resolveSelectedVoice(voices);
			};

			loadVoices();

			if (typeof window.speechSynthesis.addEventListener === 'function') {
				window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
			} else {
				window.speechSynthesis.onvoiceschanged = loadVoices;
			}
		}

		pickBestVoice(voices) {
			if (!Array.isArray(voices) || voices.length === 0) {
				return null;
			}

			const englishVoices = voices.filter((voice) => /^en(-|_)/i.test(voice.lang || ''));
			const candidates = englishVoices.length > 0 ? englishVoices : voices;

			let bestVoice = candidates[0];
			let bestScore = this.scoreVoice(candidates[0], 0);

			candidates.forEach((voice, index) => {
				const score = this.scoreVoice(voice, index);
				if (score > bestScore) {
					bestScore = score;
					bestVoice = voice;
				}
			});

			return bestVoice;
		}

		populateVoiceOptions(voices) {
			if (!this.voiceBrowserSelect || !Array.isArray(voices)) {
				return;
			}

			const currentSelection = this.browserVoiceName;
			const sortedVoices = [...voices].sort((left, right) => {
				const leftScore = this.scoreVoice(left, voices.indexOf(left));
				const rightScore = this.scoreVoice(right, voices.indexOf(right));
				return rightScore - leftScore;
			});

			const fragment = document.createDocumentFragment();
			const bestOption = document.createElement('option');
			bestOption.value = '';
			bestOption.textContent = 'Best available voice';
			fragment.appendChild(bestOption);

			sortedVoices.forEach((voice) => {
				const option = document.createElement('option');
				option.value = voice.name;
				option.textContent = `${voice.name}${voice.lang ? ` (${voice.lang})` : ''}`;
				fragment.appendChild(option);
			});

			this.voiceBrowserSelect.replaceChildren(fragment);

			if (currentSelection && sortedVoices.some((voice) => voice.name === currentSelection)) {
				this.voiceBrowserSelect.value = currentSelection;
			} else {
				this.voiceBrowserSelect.value = '';
			}
		}

		resolveSelectedVoice(voices) {
			if (!Array.isArray(voices) || voices.length === 0) {
				return null;
			}

			if (this.browserVoiceName) {
				const selected = voices.find((voice) => voice.name === this.browserVoiceName);
				if (selected) {
					return selected;
				}
			}

			return this.pickBestVoice(voices);
		}

		scoreVoice(voice, index) {
			const name = (voice?.name || '').toLowerCase();
			const lang = (voice?.lang || '').toLowerCase();
			let score = 0;

			// Priority 1: High-fidelity Neural/Natural voices (The "Gold Standard")
			if (/natural|neural|online|google us english|aria|guy|jenny/.test(name)) {
				score += 500; // Force these to the top
			}

			// Priority 2: Regional preference
			if (lang.startsWith('en-us')) {
				score += 50;
			} else if (lang.startsWith('en-gb')) {
				score += 40;
			} else if (lang.startsWith('en')) {
				score += 30;
			}

			// Priority 3: Premium engine indicators
			if (/enhanced|premium|wavenet|studio|multilingual/.test(name)) {
				score += 100;
			}

			// Negative: Avoid legacy robotic engines
			if (/espeak|festival|robot|compact|default|microsoft david|microsoft zira/.test(name)) {
				score -= 200;
			}

			return score;
		}

		formatSpeechText(message) {
			let text = String(message || '').trim();
			
			// Add natural pauses for the TTS engine
			text = text.replace(/([.!?])\s*/g, '$1... ');
			text = text.replace(/,/g, ',... ');
			
			text = text.replace(/\bON\b/g, 'on').replace(/\bOFF\b/g, 'off');
			if (text && !/[.!?]$/.test(text)) {
				text += '.';
			}
			return text;
		}

		startListening() {
			try {
				this.recognition.start();
			} catch (error) {
				this.setStatus('Unable to start voice recognition right now.', 'error');
			}
		}

		stopListening() {
			if (!this.recognition) {
				return;
			}

			try {
				this.recognition.stop();
			} catch (error) {
				// no-op
			}
		}

		// ── Universal Semantic Engine (No longer dependent on fixed sentences) ──
		getSemanticKnowledge() {
			return {
				devices: [
					{ id: 1, label: 'Light', weights: ['light', 'lamp', 'bulb', 'dark', 'see', 'room', 'main', 'illuminate', 'bright'] },
					{ id: 2, label: 'Fan', weights: ['fan', 'cooler', 'hot', 'warm', 'sweat', 'stuffy', 'air', 'wind', 'breeze', 'blow'] },
					{ id: 3, label: 'TV', weights: ['tv', 'television', 'movie', 'cinema', 'screen', 'news', 'show', 'netflix', 'entertainment'] },
					{ id: 4, label: 'Plug', weights: ['plug', 'socket', 'outlet', 'charge', 'phone', 'battery', 'power', 'laptop', 'adapter'] }
				],
				intents: {
					ON: ['on', 'start', 'activate', 'enable', 'open', 'up', 'high', 'home', 'back', 'running'],
					OFF: ['off', 'stop', 'deactivate', 'disable', 'close', 'down', 'low', 'leaving', 'goodbye', 'sleep', 'bye', 'charged']
				},
				globals: {
					ALL: ['everything', 'all', 'house', 'system', 'entire']
				}
			};
		}

		handleTranscript(rawTranscript, confidence) {
			this.transcriptElement.textContent = `Heard: "${rawTranscript}"`;
			if (confidence < MIN_CONFIDENCE) {
				this.respond("I'm not completely sure I understood. Could you say that again?", 'error', true);
				return;
			}

			// 1. Tokenization & Cleaning
			const tokens = rawTranscript.toLowerCase().split(/\s+/).map(t => t.replace(/[^a-z0-9]/g, ''));
			const knowledge = this.getSemanticKnowledge();

			// 2. Global Check
			const isGlobal = tokens.some(t => knowledge.globals.ALL.includes(t));
			const globalState = this.determineState(tokens, knowledge.intents);

			if (isGlobal && globalState !== null) {
				this.handleGlobalCommand(globalState);
				return;
			}

			// 3. Multi-Device Weighted Scoring
			const deviceScores = knowledge.devices.map(dev => {
				const score = tokens.reduce((acc, token) => acc + (dev.weights.includes(token) ? 1 : 0), 0);
				return { ...dev, score };
			});

			// Filter devices that were actually mentioned (score > 0)
			const targetedDevices = deviceScores.filter(d => d.score > 0);

			if (targetedDevices.length > 0) {
				// Sort by score to find the most likely candidates
				targetedDevices.sort((a, b) => b.score - a.score);
				
				// Handle multiple devices if they have high enough individual scores
				const topScore = targetedDevices[0].score;
				const confirmedDevices = targetedDevices.filter(d => d.score >= topScore || d.score >= 2);

				const desiredState = this.determineState(tokens, knowledge.intents);

				if (desiredState !== null) {
					confirmedDevices.forEach(dev => {
						this.executeCommand({ relayNumber: dev.id, deviceLabel: dev.label, desiredState });
					});
				} else {
					// Toggle Fallback
					confirmedDevices.forEach(dev => {
						const currentState = window.hardwareStatus?.relays?.[dev.id - 1]?.state;
						this.executeCommand({ relayNumber: dev.id, deviceLabel: dev.label, desiredState: !currentState });
					});
				}
			} else {
				// 4. Pure Contextual Intelligence (No device names, just feelings/scenarios)
				this.handlePureContext(tokens, knowledge);
			}
		}

		determineState(tokens, intents) {
			let onWeight = tokens.reduce((acc, t) => acc + (intents.ON.includes(t) ? 1 : 0), 0);
			let offWeight = tokens.reduce((acc, t) => acc + (intents.OFF.includes(t) ? 1 : 0), 0);
			
			if (onWeight > offWeight) return true;
			if (offWeight > onWeight) return false;
			return null;
		}

		handlePureContext(tokens, knowledge) {
			const text = tokens.join(' ');
			
			// Thermal Context
			if (tokens.some(t => ['hot', 'warm', 'sweat', 'stuffy'].includes(t))) {
				this.executeCommand({ relayNumber: 2, deviceLabel: 'Fan', desiredState: true });
				return;
			}
			if (tokens.some(t => ['cold', 'freezing', 'chilly'].includes(t))) {
				this.executeCommand({ relayNumber: 2, deviceLabel: 'Fan', desiredState: false });
				return;
			}
			// Visual Context
			if (tokens.some(t => ['dark', 'blind', 'night'].includes(t))) {
				this.executeCommand({ relayNumber: 1, deviceLabel: 'Light', desiredState: true });
				return;
			}
			// Utility Context
			if (tokens.some(t => ['charge', 'battery', 'power'].includes(t))) {
				this.executeCommand({ relayNumber: 4, deviceLabel: 'Plug', desiredState: true });
				return;
			}
			
			this.respond("I heard you, but I'm not sure how to help. You can tell me to control the Light, Fan, TV, or Plug.", 'error', true);
		}

		handleGlobalCommand(state) {
			const response = state ? "Understood. Powering up the entire house." : "Safety first. Shutting down all systems. Goodbye!";
			this.respond(response, 'listening', true);
			
			for (let i = 1; i <= 4; i++) {
				if (typeof window.toggleRelay === 'function') {
					window.toggleRelay(i, state);
				}
			}
		}

		normalizeSemanticInput(text) {
			return text.toLowerCase()
				.replace(/\b(please|can you|would you|mind|hey|assistant|ok|okay|the|a|an|i|want|to)\b/g, '')
				.replace(/\s+/g, ' ')
				.trim();
		}

		handleGlobalCommand(state) {
			const response = state ? "Understood. Powering up the entire house." : "Safety first. Shutting down all systems. Goodbye!";
			this.respond(response, 'listening', true);
			
			for (let i = 1; i <= 4; i++) {
				if (typeof window.toggleRelay === 'function') {
					window.toggleRelay(i, state);
				}
			}
		}

		extractDevice(text) {
			const devices = this.getDeviceAliases();
			let bestMatch = null;
			let maxScore = 0;

			devices.forEach((device) => {
				device.aliases.forEach((alias) => {
					if (text.includes(alias)) {
						const score = alias.length;
						if (score > maxScore) {
							maxScore = score;
							bestMatch = device;
						}
					}
				});
			});

			return bestMatch;
		}

		getDeviceAliases() {
			const devices = [];

			for (let relayNumber = 1; relayNumber <= 4; relayNumber++) {
				const defaultName = DEVICE_DEFAULTS[relayNumber];
				const customName = (localStorage.getItem(`relay${relayNumber}Name`) || '').trim();
				const displayName = customName || defaultName;

				const aliases = new Set([
					defaultName.toLowerCase(),
					`relay ${relayNumber}`,
					`relay${relayNumber}`
				]);

				(DEVICE_SYNONYMS[relayNumber] || []).forEach((alias) => aliases.add(alias));

				if (customName) {
					aliases.add(customName.toLowerCase());
				}

				devices.push({
					relayNumber,
					deviceLabel: displayName,
					aliases: Array.from(aliases)
				});
			}

			return devices;
		}

		containsAlias(text, alias) {
			const escaped = alias
				.split(/\s+/)
				.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
				.join('\\s+');

			const pattern = new RegExp(`\\b${escaped}\\b`);
			return pattern.test(text);
		}

		executeCommand(command) {
			const confirmedState = window.hardwareStatus?.relays?.[command.relayNumber - 1]?.state;
			if (typeof confirmedState === 'boolean' && confirmedState === command.desiredState) {
				const stateText = command.desiredState ? 'on' : 'off';
				this.respond(`${command.deviceLabel} is already turned ${stateText}.`, 'success', true);
				this.processNextCommand();
				return;
			}

			const actionText = command.desiredState ? 'on' : 'off';
			this.respond(`Yes, the ${command.deviceLabel} is turning ${actionText}.`, 'listening', true);

			this.pendingCommand = {
				relayNumber: command.relayNumber,
				desiredState: command.desiredState,
				deviceLabel: command.deviceLabel,
				createdAt: Date.now(),
				timeoutId: setTimeout(() => {
					this.handleCommandTimeout();
				}, CONFIRMATION_TIMEOUT_MS)
			};

			if (typeof window.toggleRelay === 'function') {
				window.toggleRelay(command.relayNumber, command.desiredState);
				this.setStatus(`Waiting for ${command.deviceLabel} confirmation...`, 'listening');
			} else {
				this.clearPendingCommand();
				this.respond('Control pipeline unavailable right now.', 'error', true);
				this.processNextCommand();
			}
		}

		handleRelayConfirmation(detail) {
			if (!this.pendingCommand) {
				return;
			}

			if (detail.relayNumber !== this.pendingCommand.relayNumber) {
				return;
			}

			if (typeof detail.timestamp === 'number' && detail.timestamp + 250 < this.pendingCommand.createdAt) {
				return;
			}

			if (detail.isOn !== this.pendingCommand.desiredState) {
				return;
			}

			const finalStateText = detail.isOn ? 'on' : 'off';
			const deviceLabel = this.pendingCommand.deviceLabel;

			this.clearPendingCommand();
			this.respond(`${deviceLabel} is turned ${finalStateText} now.`, 'success', true);
			this.processNextCommand();
		}

		handleCommandTimeout() {
			if (!this.pendingCommand) {
				return;
			}

			const deviceLabel = this.pendingCommand.deviceLabel;
			this.clearPendingCommand();
			this.respond(`I could not confirm ${deviceLabel} state. Please check connection.`, 'error', true);
			this.processNextCommand();
		}

		clearPendingCommand() {
			if (!this.pendingCommand) {
				return;
			}

			clearTimeout(this.pendingCommand.timeoutId);
			this.pendingCommand = null;
		}

		respond(message, statusClass, speakReply) {
			this.setReply(message);
			this.setStatus(statusClass === 'listening' ? 'Processing command...' : message, statusClass);

			if (speakReply && this.isAssistantEnabled && this.isVoiceReplyEnabled && this.supportsSynthesis) {
				this.speak(message);
			}
		}

		speak(message) {
			const text = this.formatSpeechText(message);
			if (!text) {
				return;
			}

			this.stopSpeechPlayback();

			if (this.supportsBrowserSynthesis) {
				this.speakWithBrowser(text);
			}
		}

		speakWithBrowser(text) {
			if (!this.supportsBrowserSynthesis) {
				return;
			}

			const utterance = new SpeechSynthesisUtterance(text);
			const selectedVoice = this.speechVoice || this.resolveSelectedVoice(window.speechSynthesis.getVoices());
			if (selectedVoice) {
				utterance.voice = selectedVoice;
				utterance.lang = selectedVoice.lang || 'en-US';
			} else {
				utterance.lang = 'en-US';
			}

			utterance.rate = 0.88; // Slightly slower is much more human-like for synthesized speech
			utterance.pitch = 1.0;
			utterance.volume = 1.0;
			window.speechSynthesis.speak(utterance);
		}

		stopSpeechPlayback() {
			if (this.supportsBrowserSynthesis) {
				window.speechSynthesis.cancel();
			}
		}

		refreshToggleUI() {
			if (!this.toggleButton) {
				return;
			}

			this.toggleButton.disabled = !this.isAssistantEnabled || !this.supportsRecognition;
			const idleLabel = this.isHoldMode() ? 'Hold to Talk' : 'Tap to Talk';
			const activeLabel = this.isHoldMode() ? 'Release to Stop' : 'Stop Listening';
			if (this.toggleText) {
				this.toggleText.textContent = this.isListening ? activeLabel : idleLabel;
			}
			this.toggleButton.setAttribute('aria-label', this.isHoldMode() ? 'Press and hold to talk' : 'Tap to talk');
			this.toggleButton.classList.toggle('listening', this.isListening);
			if (this.panel) {
				this.panel.classList.toggle('active-glow', this.isListening);
			}
		}

		setStatus(text, variant) {
			if (!this.statusElement) {
				return;
			}

			this.statusElement.textContent = text;
			this.statusElement.className = 'voice-status';
			if (variant) {
				this.statusElement.classList.add(variant);
			}
		}

		setReply(text) {
			if (!this.replyElement) {
				return;
			}

			this.replyElement.textContent = text;
		}

		normalizeText(text) {
			return String(text || '')
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}

		readBoolean(key, defaultValue) {
			const stored = localStorage.getItem(key);
			if (stored === null) {
				return defaultValue;
			}
			return stored === 'true';
		}

		// ── Testing & Simulation Engine (For developer override) ──
		testInput(text) {
			console.log(`[Voice Assistant] Simulating input: "${text}"`);
			this.handleTranscript(text, 1.0); // Full confidence for simulation
		}
	}

	function initializeVoiceAssistant() {
		const assistant = new DashboardVoiceAssistant();
		window.voiceAssistant = assistant;

		// GLOBAL OVERRIDE: Allow testing via Console
		window.simulateVoice = (text) => {
			if (assistant && typeof assistant.testInput === 'function') {
				assistant.testInput(text);
			} else {
				console.error("Voice Assistant not initialized.");
			}
		};

		console.log("Voice Assistant Semantic Engine Ready. Use simulateVoice('command') to test.");
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeVoiceAssistant);
	} else {
		initializeVoiceAssistant();
	}
})();
