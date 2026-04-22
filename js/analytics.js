// Analytics Page Logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize analytics
    initializeAnalytics();
});

// Initialize analytics
function initializeAnalytics() {
    console.log('Initializing analytics...');
    
    // Set up charts
    setupCharts();
    
    // Load initial data
    loadData();
    
    // Load custom names
    loadApplianceNames();
    
    // Set up auto-refresh
    setupAutoRefresh();
    
    // Add event listeners for refresh buttons
    document.getElementById('refreshGasChart')?.addEventListener('click', () => {
        loadData();
        successAlert('Gas chart refreshed!');
    });
    
    document.getElementById('refreshMotionChart')?.addEventListener('click', () => {
        loadData();
        successAlert('Motion chart refreshed!');
    });
    
    // Add event listeners for export buttons
    document.getElementById('exportGasData')?.addEventListener('click', exportGasData);
    document.getElementById('exportMotionData')?.addEventListener('click', exportMotionData);
    document.getElementById('exportAllData')?.addEventListener('click', exportAllData);
    document.getElementById('printReport')?.addEventListener('click', printReport);

    // Handle hardware status changes
    window.addEventListener('hardware-status-changed', (e) => {
        if (e.detail.status === 'offline') {
            updateESP32StatusUI();
            
            // Clear current status cards
            const gasEl = document.getElementById('currentGasLevel');
            if (gasEl) gasEl.textContent = '---';
            const motionEl = document.getElementById('motionStatus');
            if (motionEl) motionEl.textContent = 'Offline';
        }
    });

    // Initial UI update for badges
    updateESP32StatusUI();
}

// Update ESP32 status in UI
function updateESP32StatusUI() {
    const badgeElement = document.getElementById('esp32StatusBadge');
    if (badgeElement) {
        badgeElement.classList.remove('online', 'offline', 'syncing');
        badgeElement.classList.add(hardwareStatus.esp32.status);
    }
}

// Load appliance names from local storage
function loadApplianceNames() {
    for (let i = 1; i <= 4; i++) {
        const name = localStorage.getItem(`relay${i}Name`);
        if (name) {
            const element = document.getElementById(`relay${i}StatName`);
            if (element) {
                element.textContent = name;
            }
        }
    }
}

// Set up charts
function setupCharts() {
    // Gas sensor chart
    const gasCtx = document.getElementById('gasChart').getContext('2d');
    window.gasChart = new Chart(gasCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Gas Level',
                data: [],
                borderColor: '#00E1FF',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(0, 225, 255, 0.3)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(0, 225, 255, 0.3)');
                    gradient.addColorStop(1, 'rgba(0, 225, 255, 0.05)');
                    return gradient;
                },
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: '#00E1FF',
                pointBorderColor: '#1F2937',
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#FF4D6D',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#D1D5DB',
                        callback: function(value) {
                            return value + ' ppm';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Gas Level (ppm)',
                        color: '#9CA3AF',
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#D1D5DB',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#9CA3AF',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#F3F4F6',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#00E1FF',
                    bodyColor: '#F3F4F6',
                    borderColor: 'rgba(0, 225, 255, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} ppm`;
                        }
                    }
                }
            }
        }
    });
    
    // Motion activity chart
    const motionCtx = document.getElementById('motionChart').getContext('2d');
    window.motionChart = new Chart(motionCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Motion Events',
                data: [],
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(0, 225, 255, 0.8)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(0, 225, 255, 0.8)');
                    gradient.addColorStop(1, 'rgba(0, 225, 255, 0.3)');
                    return gradient;
                },
                borderColor: '#00E1FF',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
                hoverBackgroundColor: 'rgba(255, 77, 109, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#D1D5DB',
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Number of Events',
                        color: '#9CA3AF',
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#D1D5DB'
                    },
                    title: {
                        display: true,
                        text: 'Hour of Day',
                        color: '#9CA3AF',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#F3F4F6',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#00E1FF',
                    bodyColor: '#F3F4F6',
                    borderColor: 'rgba(0, 225, 255, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} events`;
                        }
                    }
                }
            }
        }
    });
}

// Load data from Firebase
function loadData() {
    // Read structured data from Firebase
    Promise.all([
        readGasLogs(),
        readMotionLogs(),
        readRelayLogs()
    ])
        .then(([gasSnapshot, motionSnapshot, relaySnapshot]) => {
            const gasLogs = gasSnapshot.val() || {};
            const motionLogs = motionSnapshot.val() || {};
            const relayLogs = relaySnapshot.val() || {};
            
            console.log('Retrieved data from Firebase:', { gasLogs, motionLogs, relayLogs });
            
            processDataStructured(gasLogs, motionLogs, relayLogs);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            errorAlert('Failed to load analytics data: ' + error.message);
        });
}

// Process data for charts
function processData(logs) {
    // This function is kept for backward compatibility but deprecated
    console.warn('processData function is deprecated. Use processDataStructured instead.');
    // All system/debug logging has been removed - Only IoT data should be logged
    // Prepare data arrays
    const gasData = [];
    const gasLabels = [];
    const motionData = [];
    const motionLabels = [];
    const relayUsage = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let currentGasLevel = 'No data';
    let motionStatus = 'No data';
    let activeDevices = 0;
    
    // Process logs
    if (!logs || Object.keys(logs).length === 0) {
        console.warn('No logs data available');
        // Update UI to show no data state
        updateSummaryCards('N/A', 'N/A', 'N/A', 'N/A');
        updateGasChart([], []);
        updateMotionChart([], []);
        updateRelayStats(relayUsage);
        return;
    }
    
    Object.values(logs).forEach(log => {
        const timestamp = new Date(log.timestamp);
        
        // Process gas sensor data
        if (log.type === 'mqtt_message' && log.payload && log.payload.includes('home/sensor/gas')) {
            try {
                const data = JSON.parse(log.payload);
                gasData.push(data.value);
                gasLabels.push(timestamp.toLocaleTimeString());
                currentGasLevel = data.value;
            } catch (e) {
                console.error('Error parsing gas data:', e);
            }
        }
        
        // Process motion sensor data
        if (log.type === 'mqtt_message' && log.payload && log.payload.includes('home/sensor/motion')) {
            try {
                const data = JSON.parse(log.payload);
                if (data.detected) {
                    const hour = timestamp.getHours();
                    if (!motionData[hour]) motionData[hour] = 0;
                    motionData[hour]++;
                    motionLabels[hour] = `${hour}:00`;
                    motionStatus = 'Motion Detected';
                } else {
                    motionStatus = 'No Motion';
                }
            } catch (e) {
                console.error('Error parsing motion data:', e);
            }
        }
        
        // Process relay toggle data
        if (log.type === 'relay_toggle') {
            const duration = 1; // Simplified - assuming 1 hour per toggle for demo
            relayUsage[log.relay] += duration;
            
            // Count active devices
            if (duration > 0) {
                activeDevices++;
            }
        }
    });
    
    // Calculate total usage
    const totalUsage = Object.values(relayUsage).reduce((sum, usage) => sum + usage, 0);
    
    // Update summary cards
    updateSummaryCards(currentGasLevel, motionStatus, activeDevices, totalUsage);
    
    // Update charts with limited data
    updateGasChart(gasLabels.slice(-24), gasData.slice(-24));
    // Limit motion data to last 24 hours (0-23)
    const limitedMotionLabels = [];
    const limitedMotionData = [];
    for (let i = 0; i < 24; i++) {
        limitedMotionLabels.push(`${i}:00`);
        limitedMotionData.push(motionData[i] || 0);
    }
    updateMotionChart(limitedMotionLabels, limitedMotionData);
    updateRelayStats(relayUsage);
}

// Process structured data for charts
function processDataStructured(gasLogs, motionLogs, relayLogs) {
    console.log('Processing structured data:', { gasLogs, motionLogs, relayLogs });
    
    const gasData = [];
    const gasLabels = [];
    const motionData = Array(24).fill(0);
    const motionLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const relayUsage = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    // Accurate state tracking
    const currentRelayStates = { 1: false, 2: false, 3: false, 4: false };
    const lastToggleTime = { 1: null, 2: null, 3: null, 4: null };
    
    let currentGasLevel = '0';
    let motionStatus = 'No Motion';
    
    // 1. Process gas sensor data (Chronological order)
    if (gasLogs) {
        const sortedGas = Object.entries(gasLogs).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        if (sortedGas.length > 0) {
            const lastEntry = sortedGas[sortedGas.length - 1];
            currentGasLevel = lastEntry[1].value;
        }
        sortedGas.forEach(([timestamp, data]) => {
            gasData.push(data.value);
            gasLabels.push(new Date(parseInt(timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        });
    }
    
    // 2. Process motion sensor data
    if (motionLogs) {
        const sortedMotion = Object.entries(motionLogs).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        if (sortedMotion.length > 0) {
            const lastEntry = sortedMotion[sortedMotion.length - 1];
            motionStatus = lastEntry[1].motion === 1 ? 'Motion Detected' : 'No Motion';
        }
        sortedMotion.forEach(([timestamp, data]) => {
            if (data.motion === 1) {
                const date = new Date(parseInt(timestamp));
                const hour = date.getHours();
                motionData[hour]++;
            }
        });
    }
    
    // 3. Process relay state data & calculate ACTUAL usage
    if (relayLogs) {
        const sortedRelays = Object.entries(relayLogs).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        
        sortedRelays.forEach(([timestamp, data]) => {
            const relayNumber = parseInt(data.relay.replace('relay', ''));
            const time = parseInt(timestamp);
            
            if (relayNumber >= 1 && relayNumber <= 4) {
                const newState = data.state === 'ON';
                
                // If turning OFF, calculate duration since it was turned ON
                if (!newState && currentRelayStates[relayNumber] && lastToggleTime[relayNumber]) {
                    const durationMs = time - lastToggleTime[relayNumber];
                    const durationHrs = durationMs / (1000 * 60 * 60);
                    relayUsage[relayNumber] += parseFloat(durationHrs.toFixed(2));
                }
                
                // Update current state for next calculation
                currentRelayStates[relayNumber] = newState;
                lastToggleTime[relayNumber] = time;
            }
        });
    }

    // Active devices is the count of relays currently 'ON' at the end of the logs
    const activeDevices = Object.values(currentRelayStates).filter(state => state === true).length;
    const totalUsage = Object.values(relayUsage).reduce((sum, usage) => sum + usage, 0).toFixed(1);
    
    // Update summary cards
    updateSummaryCards(currentGasLevel, motionStatus, activeDevices, totalUsage);
    
    // Update charts
    updateGasChart(gasLabels.slice(-24), gasData.slice(-24));
    updateMotionChart(motionLabels, motionData);
    updateRelayStats(relayUsage);
    
    // Update last updated timestamp
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) lastUpdated.textContent = new Date().toLocaleTimeString();
}

// Real-time MQTT listener for Analytics summary cards
// This ensures that even though charts are historical, the top cards are LIVE
document.addEventListener('mqtt-message-received', (e) => {
    const { topic, data } = e.detail;
    
    if (topic === 'home/sensor/gas') {
        const el = document.getElementById('currentGasLevel');
        if (el) el.textContent = data.value;
    } else if (topic === 'home/sensor/motion') {
        const el = document.getElementById('motionStatus');
        if (el) el.textContent = data.motion === 1 ? 'Motion Detected' : 'No Motion';
    } else if (topic.includes('home/relay') && topic.includes('/state')) {
        // Active devices might change, let's refresh logs for full accuracy
        // or just wait for auto-refresh
    }
});

// Update gas chart
function updateGasChart(labels, data) {
    console.log('Updating gas chart with:', { labels, data });
    if (window.gasChart) {
        window.gasChart.data.labels = labels;
        window.gasChart.data.datasets[0].data = data;
        window.gasChart.update();
        // Force resize to ensure proper rendering
        window.gasChart.resize();
        console.log('Gas chart updated successfully');
    } else {
        console.log('Gas chart not initialized');
    }
}

// Update motion chart
function updateMotionChart(labels, data) {
    if (window.motionChart) {
        window.motionChart.data.labels = labels;
        window.motionChart.data.datasets[0].data = data;
        window.motionChart.update();
    }
}

// Update summary cards
function updateSummaryCards(currentGasLevel, motionStatus, activeDevices, totalUsage) {
    document.getElementById('currentGasLevel').textContent = currentGasLevel;
    document.getElementById('motionStatus').textContent = motionStatus;
    document.getElementById('activeDevices').textContent = activeDevices;
    document.getElementById('totalUsage').textContent = totalUsage === 'N/A' ? 'N/A' : `${totalUsage} hrs`;
}

// Update relay statistics
function updateRelayStats(usage) {
    // Check if we have valid data
    const hasData = usage && (usage[1] > 0 || usage[2] > 0 || usage[3] > 0 || usage[4] > 0);
    
    // Update usage values
    document.getElementById('lightUsage').textContent = hasData ? `${usage[1]} hours` : 'No data';
    document.getElementById('fanUsage').textContent = hasData ? `${usage[2]} hours` : 'No data';
    document.getElementById('tvUsage').textContent = hasData ? `${usage[3]} hours` : 'No data';
    document.getElementById('plugUsage').textContent = hasData ? `${usage[4]} hours` : 'No data';
    
    // Update progress bars (assuming max usage is 24 hours for demo)
    const maxUsage = 24;
    document.getElementById('lightProgress').style.width = hasData ? `${Math.min(100, (usage[1] / maxUsage) * 100)}%` : '0%';
    document.getElementById('fanProgress').style.width = hasData ? `${Math.min(100, (usage[2] / maxUsage) * 100)}%` : '0%';
    document.getElementById('tvProgress').style.width = hasData ? `${Math.min(100, (usage[3] / maxUsage) * 100)}%` : '0%';
    document.getElementById('plugProgress').style.width = hasData ? `${Math.min(100, (usage[4] / maxUsage) * 100)}%` : '0%';
    
    // Update status indicators (simplified for demo)
    const lightStatus = hasData ? (usage[1] > 0 ? 'ON' : 'OFF') : 'N/A';
    const fanStatus = hasData ? (usage[2] > 0 ? 'ON' : 'OFF') : 'N/A';
    const tvStatus = hasData ? (usage[3] > 0 ? 'ON' : 'OFF') : 'N/A';
    const plugStatus = hasData ? (usage[4] > 0 ? 'ON' : 'OFF') : 'N/A';
    
    const lightStatusElement = document.getElementById('lightStatus');
    const fanStatusElement = document.getElementById('fanStatus');
    const tvStatusElement = document.getElementById('tvStatus');
    const plugStatusElement = document.getElementById('plugStatus');
    
    if (lightStatusElement) lightStatusElement.textContent = lightStatus;
    if (fanStatusElement) fanStatusElement.textContent = fanStatus;
    if (tvStatusElement) tvStatusElement.textContent = tvStatus;
    if (plugStatusElement) plugStatusElement.textContent = plugStatus;
    
    // Add/remove 'on' class for styling
    if (lightStatusElement) lightStatusElement.classList.toggle('on', usage[1] > 0);
    if (fanStatusElement) fanStatusElement.classList.toggle('on', usage[2] > 0);
    if (tvStatusElement) tvStatusElement.classList.toggle('on', usage[3] > 0);
    if (plugStatusElement) plugStatusElement.classList.toggle('on', usage[4] > 0);
}

// Set up auto-refresh
function setupAutoRefresh() {
    // Auto-refresh disabled to prevent continuous loading issues
    // setInterval(() => {
    //     loadData();
    //     // Update last updated timestamp
    //     const now = new Date();
    //     const timeString = now.toLocaleTimeString();
    //     const lastUpdatedElement = document.getElementById('lastUpdated');
    //     if (lastUpdatedElement) {
    //         lastUpdatedElement.textContent = timeString;
    //     }
    // }, 30000);
}

// Export gas sensor data to CSV
function exportGasData() {
    if (!window.gasChart) {
        errorAlert('No gas data available to export');
        return;
    }
    
    const labels = window.gasChart.data.labels;
    const data = window.gasChart.data.datasets[0].data;
    
    if (!labels || !data || labels.length === 0) {
        errorAlert('No gas data available to export');
        return;
    }
    
    let csvContent = 'Time,Gas Level (ppm)\n';
    
    for (let i = 0; i < labels.length; i++) {
        csvContent += `${labels[i]},${data[i]}\n`;
    }
    
    downloadCSV(csvContent, 'gas_sensor_data.csv');
    successAlert('Gas sensor data exported successfully!');
}

// Export motion data to CSV
function exportMotionData() {
    if (!window.motionChart) {
        errorAlert('No motion data available to export');
        return;
    }
    
    const labels = window.motionChart.data.labels;
    const data = window.motionChart.data.datasets[0].data;
    
    if (!labels || !data || labels.length === 0) {
        errorAlert('No motion data available to export');
        return;
    }
    
    let csvContent = 'Hour,Motion Events\n';
    
    for (let i = 0; i < labels.length; i++) {
        csvContent += `${labels[i]},${data[i]}\n`;
    }
    
    downloadCSV(csvContent, 'motion_sensor_data.csv');
    successAlert('Motion sensor data exported successfully!');
}

// Export all analytics data
function exportAllData() {
    // Export gas data
    if (window.gasChart) {
        const gasLabels = window.gasChart.data.labels;
        const gasData = window.gasChart.data.datasets[0].data;
        
        if (gasLabels && gasData && gasLabels.length > 0) {
            let csvContent = 'Sensor Type,Time/Hour,Value\n';
            
            // Add gas data
            for (let i = 0; i < gasLabels.length; i++) {
                csvContent += `Gas Sensor,${gasLabels[i]},${gasData[i]} ppm\n`;
            }
            
            // Add motion data
            if (window.motionChart) {
                const motionLabels = window.motionChart.data.labels;
                const motionData = window.motionChart.data.datasets[0].data;
                
                if (motionLabels && motionData && motionLabels.length > 0) {
                    for (let i = 0; i < motionLabels.length; i++) {
                        csvContent += `Motion Sensor,${motionLabels[i]},${motionData[i]} events\n`;
                    }
                }
            }
            
            downloadCSV(csvContent, 'all_analytics_data.csv');
            successAlert('All analytics data exported successfully!');
            return;
        }
    }
    
    errorAlert('No analytics data available to export');
}

// Download CSV file
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Print report
function printReport() {
    window.print();
    successAlert('Printing report...');
}

// Export functions if needed
window.initializeAnalytics = initializeAnalytics;
window.loadData = loadData;