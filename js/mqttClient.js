// MQTT Client Configuration
const MQTT_HOST = "4937ec2b1a4d43d188b384d4972d66db.s1.eu.hivemq.cloud";
const MQTT_PORT = 8884;
const MQTT_USERNAME = "Demon_sandy";
const MQTT_PASSWORD = "Demon_sandy9";

// MQTT Topics
const TOPICS = {
    RELAY_SET: [
        'home/relay1/set',
        'home/relay2/set',
        'home/relay3/set',
        'home/relay4/set'
    ],
    RELAY_STATE: [
        'home/relay1/state',
        'home/relay2/state',
        'home/relay3/state',
        'home/relay4/state'
    ],
    SENSOR_GAS: 'home/sensor/gas',
    SENSOR_MOTION: 'home/sensor/motion',
    DEVICE_STATUS: 'home/status'
};

// MQTT Connection Options
const mqttOptions = {
    clientId: 'smart_home_dashboard_' + Math.random().toString(16).substr(2, 8),
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    keepalive: 60,
    reconnectPeriod: 1000,
    protocol: 'wss',
    port: MQTT_PORT,
    clean: true // Ensure clean session to properly receive retained messages
};

// Global MQTT client variable
let mqttClient = null;

// Connect to MQTT broker
function connectMQTT() {
    const brokerUrl = `wss://${MQTT_HOST}:${MQTT_PORT}/mqtt`;
    
    mqttClient = mqtt.connect(brokerUrl, mqttOptions);
    
    mqttClient.on('connect', () => {
        // Connected to MQTT broker
        updateConnectionStatus('Connected', 'online');
        
        // Subscribe to all topics with QoS 1 to ensure message delivery
        // Subscribing to topics
        Object.values(TOPICS).forEach(topic => {
            if (Array.isArray(topic)) {
                topic.forEach(t => {
                    // Subscribing to array topic
                    mqttClient.subscribe(t, { qos: 1 });
                });
            } else {
                // Subscribing to single topic
                mqttClient.subscribe(topic, { qos: 1 });
            }
        });
        
        // Connection event logging REMOVED - Only IoT data should be logged
    });
    
    mqttClient.on('error', (error) => {
        // MQTT connection error
        updateConnectionStatus('Error', 'offline');
        // Error event logging REMOVED - Only IoT data should be logged
        errorAlert('MQTT connection error: ' + error.message);
    });
    
    mqttClient.on('close', () => {
        // MQTT connection closed
        updateConnectionStatus('Disconnected', 'offline');
    });
    
    mqttClient.on('reconnect', () => {
        // MQTT reconnecting...
        updateConnectionStatus('Reconnecting...', 'connecting');
    });
    
    mqttClient.on('message', handleMessage);
    
    // Debug: Log all subscriptions
    mqttClient.on('subscribe', (topic, granted) => {
        // Subscribed to topic
    });
}

// Handle incoming MQTT messages
function handleMessage(topic, message, packet) {
    // Received MQTT message
    // Ignore /set topics completely - these are commands, not state updates
    if (topic.includes('/set')) {
        // Ignoring /set topic
        return;
    }
    
    try {
        const payload = message.toString();
        
        // 1. Handle Raw Status Topic (LWT)
        if (topic === TOPICS.DEVICE_STATUS) {
            const status = payload.toUpperCase(); // "ONLINE" or "OFFLINE"
            if (typeof window.hardwareStatus !== 'undefined') {
                window.hardwareStatus.esp32.status = (status === 'ONLINE') ? 'online' : 'offline';
                window.hardwareStatus.esp32.lastMessage = Date.now();
                window.updateESP32StatusUI?.();
                
                // If offline, disable sensors
                if (status === 'OFFLINE') {
                    window.hardwareStatus.sensors.gas.active = false;
                    window.hardwareStatus.sensors.motion.active = false;
                    window.updateGasSensorStatusUI?.();
                    window.updateMotionSensorStatusUI?.();
                }
            }
            return;
        }

        // Safely parse JSON - ignore non-JSON payloads
        let data;
        try {
            data = JSON.parse(payload);
        } catch (parseError) {
            return;
        }
        
        // MQTT Message received
        // Dispatch global event for all listeners
        window.dispatchEvent(new CustomEvent('mqtt-message-received', {
            detail: { topic, data, timestamp: Date.now() }
        }));
        
        // Update ESP32 status - only real-time (non-retained) messages prove device is online
        const isRetained = packet && packet.retain;
        if (typeof window.hardwareStatus !== 'undefined' && !isRetained) {
            window.hardwareStatus.esp32.lastMessage = Date.now();
            if (window.hardwareStatus.esp32.status !== 'online') {
                window.hardwareStatus.esp32.status = 'online';
                window.updateESP32StatusUI?.();
            }
        }
        
        // Handle relay state updates
        if (TOPICS.RELAY_STATE.includes(topic)) {
            const relayIndex = TOPICS.RELAY_STATE.indexOf(topic) + 1;
            updateRelayState(relayIndex, data.state === 'ON');
            relayStateAlert(relayIndex, data.state === 'ON');

            // Notify listeners (e.g. voice assistant) after confirmed relay state update.
            window.dispatchEvent(new CustomEvent('relay-state-confirmed', {
                detail: {
                    relayNumber: relayIndex,
                    isOn: data.state === 'ON',
                    timestamp: Date.now()
                }
            }));
            
            // Update relay hardware status
            if (typeof window.hardwareStatus !== 'undefined') {
                window.hardwareStatus.relays[relayIndex - 1].connected = true;
                window.hardwareStatus.relays[relayIndex - 1].state = data.state === 'ON';
                window.hardwareStatus.relays[relayIndex - 1].lastMessage = Date.now();
                window.updateRelayStatusUI?.(relayIndex);
            }
        }
        
        // Handle gas sensor data (Advanced Leak Detection)
        if (topic === TOPICS.SENSOR_GAS) {
            updateGasLevel(data.value);
            
            // Priority: Trigger emergency if hardware confirms 'leak' is true
            if (data.leak === true) {
                gasDangerAlert(data.value);
            }
            
            if (typeof window.hardwareStatus !== 'undefined') {
                window.hardwareStatus.sensors.gas.active = true;
                window.hardwareStatus.sensors.gas.lastMessage = Date.now();
                window.updateGasSensorStatusUI?.();
            }
        }
        
        // Handle motion sensor data
        if (topic === TOPICS.SENSOR_MOTION) {
            updateMotionDetection(data.motion === 1);
            if (data.motion === 1) {
                motionDetectedAlert();
            }
            
            // Update motion sensor hardware status
            if (typeof window.hardwareStatus !== 'undefined') {
                window.hardwareStatus.sensors.motion.active = true;
                window.hardwareStatus.sensors.motion.lastMessage = Date.now();
                window.updateMotionSensorStatusUI?.();
            }
        }
        
        // Log sensor and relay data with structured logging
        if (topic === TOPICS.SENSOR_GAS) {
            logGasData(data.value);
        } else if (topic === TOPICS.SENSOR_MOTION) {
            // Only log motion data when motion is detected (motion = 1)
            if (data.motion === 1) {
                logMotionData(1);
            }
        } else if (TOPICS.RELAY_STATE.includes(topic)) {
            const relayIndex = TOPICS.RELAY_STATE.indexOf(topic) + 1;
            logRelayState(`relay${relayIndex}`, data.state);
        }
    } catch (error) {
        // Error processing MQTT message
        // Error logging REMOVED - Only valid IoT data should be logged
    }
}

// Publish message to MQTT topic
function publishMessage(topic, message) {
    if (mqttClient && mqttClient.connected) {
        mqttClient.publish(topic, JSON.stringify(message), { qos: 1 });
        // Published to MQTT
        // System event logging REMOVED - Only IoT data should be logged
    } else {
        // MQTT client not connected
        // Publish failure logging REMOVED - Only IoT data should be logged
    }
}

// Update gas level in UI
function updateGasLevel(value) {
    const gasValueElement = document.getElementById('gasValue');
    const gasFillElement = document.getElementById('gasFill');
    
    if (gasValueElement && gasFillElement) {
        gasValueElement.textContent = value + ' ppm';
        
        // Update gas level bar
        const percentage = Math.min(100, Math.max(0, value));
        gasFillElement.style.width = `${percentage}%`;
        
        // Update color based on level
        gasValueElement.className = 'value';
        if (value > 80) {
            gasValueElement.classList.add('danger');
        } else if (value > 50) {
            gasValueElement.classList.add('warning');
        } else {
            gasValueElement.classList.add('safe');
        }
        
        // Trigger gas danger alert if needed
        const gasThreshold = localStorage.getItem('gasThreshold') || 80;
        if (value > parseInt(gasThreshold)) {
            gasDangerAlert(value);
        }
    }
}

// Update motion detection in UI
function updateMotionDetection(detected) {
    const motionValueElement = document.getElementById('motionValue');
    const motionTimeElement = document.getElementById('motionTime');
    
    if (motionValueElement && motionTimeElement) {
        motionValueElement.textContent = detected ? 'Motion Detected' : 'No Motion';
        motionTimeElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        
        // Add visual indication for motion
        const motionCard = document.getElementById('motionCard');
        if (motionCard) {
            if (detected) {
                motionCard.classList.add('pulse-glow');
            } else {
                motionCard.classList.remove('pulse-glow');
            }
        }
    }
}

// Update connection status in UI
function updateConnectionStatus(status, indicatorClass) {
    const badgeElement = document.getElementById('mqttStatusBadge');
    
    if (badgeElement) {
        // Remove existing status classes
        badgeElement.classList.remove('online', 'offline', 'connecting');
        
        // Add new class based on indicatorClass
        if (indicatorClass === 'online' || indicatorClass === 'offline' || indicatorClass === 'connecting') {
            badgeElement.classList.add(indicatorClass);
        } else {
            // Default to offline if unknown
            badgeElement.classList.add('offline');
        }
    }
}

// Alert functions
function gasDangerAlert(level) {
    // Check if gas alerts are enabled
    const gasAlertsEnabled = localStorage.getItem('gasAlerts');
    if (gasAlertsEnabled === 'false') return; // Alerts disabled
    
    const alertSystem = window.alertSystem || {};
    if (alertSystem.warningAlert) {
        alertSystem.warningAlert(`Gas level HIGH (${level}) - Possible leakage detected!`);
    }
}

function motionDetectedAlert() {
    // Check if motion alerts are enabled
    const motionAlertsEnabled = localStorage.getItem('motionAlerts');
    if (motionAlertsEnabled === 'false') return; // Alerts disabled
    
    const alertSystem = window.alertSystem || {};
    if (alertSystem.infoAlert) {
        alertSystem.infoAlert('Motion detected in the monitored area');
    }
}

function relayStateAlert(relayNumber, isOn) {
    // Check if relay alerts are enabled
    const relayAlertsEnabled = localStorage.getItem('relayAlerts');
    if (relayAlertsEnabled === 'false') return; // Alerts disabled
    
    const alertSystem = window.alertSystem || {};
    const deviceNames = ['Light', 'Fan', 'TV', 'Plug'];
    const deviceName = deviceNames[relayNumber - 1] || `Relay ${relayNumber}`;
    
    if (isOn) {
        if (alertSystem.relayOnAlert) {
            alertSystem.relayOnAlert(deviceName);
        }
    } else {
        if (alertSystem.relayOffAlert) {
            alertSystem.relayOffAlert(deviceName);
        }
    }
}

// Initialize MQTT connection when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only connect on dashboard page
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.endsWith('/') || 
        window.location.pathname.split('/').pop() === '') {
        connectMQTT();
    }
});

// Export functions for use in other modules
window.publishMessage = publishMessage;
window.TOPICS = TOPICS;