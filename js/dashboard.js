// Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard
    initializeDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start hardware status monitoring - now handled in utils.js
    // Listen for global status changes
    window.addEventListener('hardware-status-changed', (e) => {
        if (e.detail.status === 'offline') {
            updateESP32StatusUI();
            
            // UI Cleanup
            const gasVal = document.getElementById('gasValue');
            if (gasVal) gasVal.textContent = '---';
            const motionVal = document.getElementById('motionValue');
            if (motionVal) motionVal.textContent = 'Offline';
            
            updateDashboardSummary();
        }
    });

    window.addEventListener('voice-assistant-state-changed', updateDashboardSummary);
});

// Initialize dashboard
function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Load any saved settings
    loadSettings();
    
    // Load saved appliance names
    loadApplianceNames();

    updateDashboardSummary();
    
    // No periodic updates - all updates must come from MQTT messages
    // This ensures the dashboard only shows real data from ESP32
}

// Set up event listeners
function setupEventListeners() {
    // Relay toggle event listeners
    for (let i = 1; i <= 4; i++) {
        const relayElement = document.getElementById(`relay${i}`);
        if (relayElement) {
            relayElement.addEventListener('change', function() {
                toggleRelay(i, this.checked);
            });
        }
    }
    
    // Add any other event listeners here
        
        // Add event listener for logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logoutUser().then(() => {
                    window.location.href = 'login.html';
                }).catch(error => {
                    console.error('Logout error:', error);
                    errorAlert('Logout failed: ' + error.message);
                });
            });
        }
}

// Toggle relay state
function toggleRelay(relayNumber, state) {
    const topic = `home/relay${relayNumber}/set`;
    const message = { state: state ? 'ON' : 'OFF' };
    
    // Publish MQTT message
    publishMessage(topic, message);
    
    // DO NOT update UI immediately - wait for ESP32 confirmation
    // UI updates ONLY after receiving home/relayX/state
    
    // DO NOT log UI events - only log ESP32-confirmed data
}

// Update relay state in UI
function updateRelayState(relayNumber, isOn) {
    const relayElement = document.getElementById(`relay${relayNumber}`);
    if (relayElement) {
        // Update UI with confirmed state from ESP32
        relayElement.checked = isOn;
        // Save state to localStorage for persistence
        localStorage.setItem(`relay${relayNumber}State`, isOn);
    }

    updateRelayCardState(relayNumber, isOn);

    updateDashboardSummary();
}

// Load user settings
function loadSettings() {
    // Load appliance names
    for (let i = 1; i <= 4; i++) {
        const savedName = localStorage.getItem(`relay${i}Name`);
        if (savedName) {
            const nameElement = document.querySelector(`#relay${i}`).closest('.toggle-card').querySelector('h3');
            if (nameElement) {
                nameElement.textContent = savedName;
            }
        }
    }
    
    // DO NOT load relay states from localStorage
    // Relays must show "Unknown" until ESP32 confirms state
    // UI updates ONLY after receiving home/relayX/state
    
    // Load other settings as needed
}



// Set up periodic updates
function setupPeriodicUpdates() {
    // No periodic updates - all updates must come from MQTT messages
    // This ensures the dashboard only shows real data from ESP32
}

// Handle window resize for responsive design
window.addEventListener('resize', () => {
    // Add any resize handling logic here if needed
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible, refresh data if needed
        console.log('Dashboard page became visible');
    }
});



// Update ESP32 status in UI
function updateESP32StatusUI() {
    const badgeElement = document.getElementById('esp32StatusBadge');
    
    if (!badgeElement) return;
    
    badgeElement.classList.remove('online', 'offline', 'syncing');
    
    switch (hardwareStatus.esp32.status) {
        case 'online':
            badgeElement.classList.add('online');
            break;
        case 'offline':
            badgeElement.classList.add('offline');
            break;
        case 'syncing':
        default:
            badgeElement.classList.add('syncing');
            break;
    }

    updateDashboardSummary();
}

// Update relay status in UI
function updateRelayStatusUI(relayNumber) {
    const relayIndex = relayNumber - 1;
    const relay = hardwareStatus.relays[relayIndex];
    
    // Update connection status
    const connElement = document.getElementById(`relay${relayNumber}Connection`);
    const connIndicator = document.getElementById(`relay${relayNumber}ConnIndicator`);
    const connText = connElement?.querySelector('.status-text');
    
    if (connElement && connIndicator && connText) {
        if (relay.connected) {
            connIndicator.className = 'status-indicator green';
            connText.textContent = 'Connected';
        } else {
            connIndicator.className = 'status-indicator grey';
            connText.textContent = 'Disconnected';
        }
    }
    
    // Update state status
    const stateElement = document.getElementById(`relay${relayNumber}State`);
    const stateIndicator = document.getElementById(`relay${relayNumber}StateIndicator`);
    const stateText = stateElement?.querySelector('.status-text');
    
    if (stateElement && stateIndicator && stateText) {
        if (relay.connected && relay.state !== null) {
            if (relay.state) {
                stateIndicator.className = 'status-indicator green';
                stateText.textContent = 'ON';
            } else {
                stateIndicator.className = 'status-indicator red';
                stateText.textContent = 'OFF';
            }
        } else {
            stateIndicator.className = 'status-indicator grey';
            stateText.textContent = 'Unknown';
        }
    }

    updateDashboardSummary();
}

// Update gas sensor status in UI
function updateGasSensorStatusUI() {
    const badgeElement = document.getElementById('gasStatusBadge');
    
    if (!badgeElement) return;
    
    if (hardwareStatus.sensors.gas.active) {
        badgeElement.textContent = 'Active';
        badgeElement.className = 'sensor-status-badge safe';
    } else {
        badgeElement.textContent = 'No Data';
        badgeElement.className = 'sensor-status-badge warning';
    }

    updateDashboardSummary();
}

// Update motion sensor status in UI
function updateMotionSensorStatusUI() {
    const badgeElement = document.getElementById('motionStatusBadge');
    
    if (!badgeElement) return;
    
    if (hardwareStatus.sensors.motion.active) {
        badgeElement.textContent = 'Active';
        badgeElement.className = 'sensor-status-badge safe';
    } else {
        badgeElement.textContent = 'No Data';
        badgeElement.className = 'sensor-status-badge warning';
    }

    updateDashboardSummary();
}

function updateRelayCardState(relayNumber, isOn) {
    const relayElement = document.getElementById(`relay${relayNumber}`);
    const card = relayElement?.closest('.toggle-card');

    if (!card) {
        return;
    }

    card.classList.toggle('active', Boolean(isOn));
    
    // Also update the state text
    const stateText = document.getElementById(`relay${relayNumber}StateText`);
    if (stateText) {
        stateText.textContent = isOn ? 'ON' : 'OFF';
    }
}

function updateDashboardSummary() {
    const connectionEl = document.getElementById('summaryConnection');
    const relaysEl = document.getElementById('summaryRelays');
    const voiceEl = document.getElementById('summaryVoice');

    if (connectionEl) {
        let connectionText = 'Checking...';
        let connectionTone = 'warn';

        if (hardwareStatus.esp32.status === 'online') {
            connectionText = 'ESP32 online';
            connectionTone = 'good';
        } else if (hardwareStatus.esp32.status === 'offline') {
            connectionText = 'ESP32 offline';
            connectionTone = 'bad';
        }

        connectionEl.textContent = connectionText;
        const connectionMetric = connectionEl.closest('.summary-metric');
        if (connectionMetric) {
            connectionMetric.dataset.tone = connectionTone;
        }
    }

    if (relaysEl) {
        const activeRelays = hardwareStatus.relays.filter((relay) => relay.state === true).length;
        relaysEl.textContent = `${activeRelays}/4 active`;
        const relayMetric = relaysEl.closest('.summary-metric');
        if (relayMetric) {
            relayMetric.dataset.tone = activeRelays > 0 ? 'good' : 'warn';
        }
    }

    if (voiceEl) {
        const voiceAssistant = window.voiceAssistant;
        const voiceReady = Boolean(voiceAssistant?.isAssistantEnabled);
        const voiceReplyOn = Boolean(voiceAssistant?.isVoiceReplyEnabled);
        const voiceName = (voiceAssistant?.browserVoiceName || '').trim();
        const talkMode = voiceAssistant?.talkMode === 'hold' ? 'Hold to talk' : 'Tap to talk';

        if (!voiceReady) {
            voiceEl.textContent = 'Disabled';
        } else if (!voiceReplyOn) {
            voiceEl.textContent = 'Muted';
        } else if (voiceName) {
            voiceEl.textContent = `${voiceName} · ${talkMode}`;
        } else {
            voiceEl.textContent = talkMode;
        }

        const voiceMetric = voiceEl.closest('.summary-metric');
        if (voiceMetric) {
            voiceMetric.dataset.tone = voiceReady && voiceReplyOn ? 'good' : 'warn';
        }
    }
}

// Load appliance names from localStorage
function loadApplianceNames() {
    const relay1Name = localStorage.getItem('relay1Name');
    const relay2Name = localStorage.getItem('relay2Name');
    const relay3Name = localStorage.getItem('relay3Name');
    const relay4Name = localStorage.getItem('relay4Name');
    
    if (relay1Name) {
        const relay1Label = document.querySelector('#relay1')?.closest('.toggle-card')?.querySelector('.toggle-name');
        if (relay1Label) relay1Label.textContent = relay1Name;
        // Also update hardware status label
        const relay1HardwareLabel = document.getElementById('relay1HardwareName');
        if (relay1HardwareLabel) relay1HardwareLabel.textContent = relay1Name;
    }
    
    if (relay2Name) {
        const relay2Label = document.querySelector('#relay2')?.closest('.toggle-card')?.querySelector('.toggle-name');
        if (relay2Label) relay2Label.textContent = relay2Name;
        // Also update hardware status label
        const relay2HardwareLabel = document.getElementById('relay2HardwareName');
        if (relay2HardwareLabel) relay2HardwareLabel.textContent = relay2Name;
    }
    
    if (relay3Name) {
        const relay3Label = document.querySelector('#relay3')?.closest('.toggle-card')?.querySelector('.toggle-name');
        if (relay3Label) relay3Label.textContent = relay3Name;
        // Also update hardware status label
        const relay3HardwareLabel = document.getElementById('relay3HardwareName');
        if (relay3HardwareLabel) relay3HardwareLabel.textContent = relay3Name;
    }
    
    if (relay4Name) {
        const relay4Label = document.querySelector('#relay4')?.closest('.toggle-card')?.querySelector('.toggle-name');
        if (relay4Label) relay4Label.textContent = relay4Name;
        // Also update hardware status label
        const relay4HardwareLabel = document.getElementById('relay4HardwareName');
        if (relay4HardwareLabel) relay4HardwareLabel.textContent = relay4Name;
    }
}

// Export any functions that might be needed by other modules
window.toggleRelay = toggleRelay;
window.updateRelayState = updateRelayState;
window.updateESP32StatusUI = updateESP32StatusUI;
window.updateRelayStatusUI = updateRelayStatusUI;
window.updateGasSensorStatusUI = updateGasSensorStatusUI;
window.updateMotionSensorStatusUI = updateMotionSensorStatusUI;