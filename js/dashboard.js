// Hardware status tracking
const hardwareStatus = {
    esp32: {
        lastMessage: null,
        status: 'syncing' // syncing, online, offline
    },
    relays: [
        { connected: false, state: null, lastMessage: null }, // relay 1
        { connected: false, state: null, lastMessage: null }, // relay 2
        { connected: false, state: null, lastMessage: null }, // relay 3
        { connected: false, state: null, lastMessage: null }  // relay 4
    ],
    sensors: {
        gas: { active: false, lastMessage: null },
        motion: { active: false, lastMessage: null }
    }
};

// Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard
    initializeDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start hardware status monitoring
    startHardwareStatusMonitoring();
});

// Initialize dashboard
function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Load any saved settings
    loadSettings();
    
    // Load saved appliance names
    loadApplianceNames();
    
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

// Load appliance names from localStorage
function loadApplianceNames() {
    const relay1Name = localStorage.getItem('relay1Name');
    const relay2Name = localStorage.getItem('relay2Name');
    const relay3Name = localStorage.getItem('relay3Name');
    const relay4Name = localStorage.getItem('relay4Name');
    
    if (relay1Name) {
        const relay1Label = document.querySelector('#relay1').closest('.toggle-card').querySelector('h3');
        if (relay1Label) relay1Label.textContent = relay1Name;
    }
    
    if (relay2Name) {
        const relay2Label = document.querySelector('#relay2').closest('.toggle-card').querySelector('h3');
        if (relay2Label) relay2Label.textContent = relay2Name;
    }
    
    if (relay3Name) {
        const relay3Label = document.querySelector('#relay3').closest('.toggle-card').querySelector('h3');
        if (relay3Label) relay3Label.textContent = relay3Name;
    }
    
    if (relay4Name) {
        const relay4Label = document.querySelector('#relay4').closest('.toggle-card').querySelector('h3');
        if (relay4Label) relay4Label.textContent = relay4Name;
    }
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

// Start hardware status monitoring
function startHardwareStatusMonitoring() {
    // Update hardware status every 5 seconds
    setInterval(updateHardwareStatus, 5000);
}

// Update hardware status based on last message timestamps
function updateHardwareStatus() {
    const now = Date.now();
    
    // Check ESP32 status (15 seconds timeout)
    if (hardwareStatus.esp32.lastMessage) {
        const timeDiff = now - hardwareStatus.esp32.lastMessage;
        if (timeDiff > 15000) {
            // More than 15 seconds since last message
            if (hardwareStatus.esp32.status !== 'offline') {
                hardwareStatus.esp32.status = 'offline';
                updateESP32StatusUI();
            }
        } else {
            // Recent message, device is online
            if (hardwareStatus.esp32.status !== 'online') {
                hardwareStatus.esp32.status = 'online';
                updateESP32StatusUI();
            }
        }
    }
    
    // Check relay connections (15 seconds timeout)
    for (let i = 0; i < 4; i++) {
        if (hardwareStatus.relays[i].lastMessage) {
            const timeDiff = now - hardwareStatus.relays[i].lastMessage;
            if (timeDiff > 15000) {
                // More than 15 seconds since last message
                if (hardwareStatus.relays[i].connected) {
                    hardwareStatus.relays[i].connected = false;
                    updateRelayStatusUI(i + 1);
                }
            }
        }
    }
    
    // Check sensor activity (30 seconds timeout)
    if (hardwareStatus.sensors.gas.lastMessage) {
        const timeDiff = now - hardwareStatus.sensors.gas.lastMessage;
        if (timeDiff > 30000) {
            // More than 30 seconds since last message
            if (hardwareStatus.sensors.gas.active) {
                hardwareStatus.sensors.gas.active = false;
                updateGasSensorStatusUI();
            }
        }
    }
    
    if (hardwareStatus.sensors.motion.lastMessage) {
        const timeDiff = now - hardwareStatus.sensors.motion.lastMessage;
        if (timeDiff > 30000) {
            // More than 30 seconds since last message
            if (hardwareStatus.sensors.motion.active) {
                hardwareStatus.sensors.motion.active = false;
                updateMotionSensorStatusUI();
            }
        }
    }
}

// Update ESP32 status in UI
function updateESP32StatusUI() {
    const statusElement = document.getElementById('esp32Status');
    const indicatorElement = document.getElementById('esp32Indicator');
    const textElement = statusElement?.querySelector('.status-text');
    
    if (!statusElement || !indicatorElement || !textElement) return;
    
    switch (hardwareStatus.esp32.status) {
        case 'online':
            indicatorElement.className = 'status-indicator online';
            textElement.textContent = 'Online';
            break;
        case 'offline':
            indicatorElement.className = 'status-indicator offline';
            textElement.textContent = 'Offline';
            break;
        case 'syncing':
        default:
            indicatorElement.className = 'status-indicator syncing';
            textElement.textContent = 'Syncing...';
            break;
    }
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
}

// Update gas sensor status in UI
function updateGasSensorStatusUI() {
    const statusElement = document.getElementById('gasSensorStatus');
    const indicatorElement = document.getElementById('gasSensorIndicator');
    const textElement = statusElement?.querySelector('.status-text');
    
    if (!statusElement || !indicatorElement || !textElement) return;
    
    if (hardwareStatus.sensors.gas.active) {
        indicatorElement.className = 'status-indicator green';
        textElement.textContent = 'Active';
    } else {
        indicatorElement.className = 'status-indicator grey';
        textElement.textContent = 'No Data';
    }
}

// Update motion sensor status in UI
function updateMotionSensorStatusUI() {
    const statusElement = document.getElementById('motionSensorStatus');
    const indicatorElement = document.getElementById('motionSensorIndicator');
    const textElement = statusElement?.querySelector('.status-text');
    
    if (!statusElement || !indicatorElement || !textElement) return;
    
    if (hardwareStatus.sensors.motion.active) {
        indicatorElement.className = 'status-indicator green';
        textElement.textContent = 'Active';
    } else {
        indicatorElement.className = 'status-indicator grey';
        textElement.textContent = 'No Data';
    }
}

// Load appliance names from localStorage
function loadApplianceNames() {
    const relay1Name = localStorage.getItem('relay1Name');
    const relay2Name = localStorage.getItem('relay2Name');
    const relay3Name = localStorage.getItem('relay3Name');
    const relay4Name = localStorage.getItem('relay4Name');
    
    if (relay1Name) {
        const relay1Label = document.querySelector('#relay1').closest('.toggle-card').querySelector('h3');
        if (relay1Label) relay1Label.textContent = relay1Name;
        // Also update hardware status label
        const relay1HardwareLabel = document.getElementById('relay1HardwareName');
        if (relay1HardwareLabel) relay1HardwareLabel.textContent = relay1Name;
    }
    
    if (relay2Name) {
        const relay2Label = document.querySelector('#relay2').closest('.toggle-card').querySelector('h3');
        if (relay2Label) relay2Label.textContent = relay2Name;
        // Also update hardware status label
        const relay2HardwareLabel = document.getElementById('relay2HardwareName');
        if (relay2HardwareLabel) relay2HardwareLabel.textContent = relay2Name;
    }
    
    if (relay3Name) {
        const relay3Label = document.querySelector('#relay3').closest('.toggle-card').querySelector('h3');
        if (relay3Label) relay3Label.textContent = relay3Name;
        // Also update hardware status label
        const relay3HardwareLabel = document.getElementById('relay3HardwareName');
        if (relay3HardwareLabel) relay3HardwareLabel.textContent = relay3Name;
    }
    
    if (relay4Name) {
        const relay4Label = document.querySelector('#relay4').closest('.toggle-card').querySelector('h3');
        if (relay4Label) relay4Label.textContent = relay4Name;
        // Also update hardware status label
        const relay4HardwareLabel = document.getElementById('relay4HardwareName');
        if (relay4HardwareLabel) relay4HardwareLabel.textContent = relay4Name;
    }
}

// Export any functions that might be needed by other modules
window.toggleRelay = toggleRelay;
window.updateRelayState = updateRelayState;
window.hardwareStatus = hardwareStatus;
window.updateESP32StatusUI = updateESP32StatusUI;
window.updateRelayStatusUI = updateRelayStatusUI;
window.updateGasSensorStatusUI = updateGasSensorStatusUI;
window.updateMotionSensorStatusUI = updateMotionSensorStatusUI;