// Utility Functions

// Format date/time for display
function formatDateTime(date) {
    return new Date(date).toLocaleString();
}

// Format time for display
function formatTime(date) {
    return new Date(date).toLocaleTimeString();
}

// Debounce function to limit rate of execution
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// Throttle function to limit rate of execution
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Save to localStorage with expiration
function saveToLocalStorage(key, value, expirationMinutes = 60) {
    const item = {
        value: value,
        expiry: new Date().getTime() + (expirationMinutes * 60 * 1000),
    };
    localStorage.setItem(key, JSON.stringify(item));
}

// Get from localStorage with expiration check
function getFromLocalStorage(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
        return null;
    }
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    
    if (now > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    return item.value;
}

// Validate email format
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password strength
function isStrongPassword(password) {
    // At least 8 characters, one uppercase, one lowercase, one number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
}

// Convert string to slug
function toSlug(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// Capitalize first letter of each word
function capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Convert bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Get URL parameter by name
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Deep clone object
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// Compare two objects
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
}

// Apply saved accent color from localStorage
function applyAccentColor() {
    const savedAccent = localStorage.getItem('accentColor');
    if (savedAccent) {
        document.documentElement.style.setProperty('--primary', savedAccent);
    }
}

// Update profile info across pages
function syncProfileUI() {
    const name = localStorage.getItem('profileName') || 'Home Admin';
    const seed = localStorage.getItem('profileAvatarSeed') || 'Felix';
    const customImg = localStorage.getItem('profileCustomImage');
    
    const avatarSrc = customImg || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

    // Update header avatar
    const headerAvatar = document.getElementById('headerProfileAvatar');
    if (headerAvatar) {
        headerAvatar.src = avatarSrc;
    }
    
    // Update main profile card avatar (if on settings page)
    const mainAvatar = document.getElementById('mainProfileImage');
    if (mainAvatar) {
        mainAvatar.src = avatarSrc;
    }
    
    // Update header name
    const headerName = document.getElementById('headerProfileName');
    if (headerName) {
        headerName.textContent = name;
    }

    // Update name on settings page
    const settingsName = document.getElementById('profileNameDisplay');
    if (settingsName) settingsName.textContent = name;

    const settingsEmail = document.getElementById('profileEmailDisplay');
    if (settingsEmail) settingsEmail.textContent = localStorage.getItem('profileEmail') || 'admin@smarthome.local';
}

// Hardware status tracking (Global shared state)
window.hardwareStatus = {
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

// Update hardware status based on timing
function updateGlobalHardwareStatus() {
    const now = Date.now();
    const status = window.hardwareStatus;
    
    // Check ESP32 status (15 seconds timeout)
    if (status.esp32.lastMessage) {
        const timeDiff = now - status.esp32.lastMessage;
        if (timeDiff > 15000) {
            if (status.esp32.status !== 'offline') {
                status.esp32.status = 'offline';
                
                // Immediate cleanup of sensors when offline
                status.sensors.gas.active = false;
                status.sensors.motion.active = false;
                
                // Dispatch event so specific pages can update their UI
                window.dispatchEvent(new CustomEvent('hardware-status-changed', { detail: { status: 'offline' } }));
            }
        }
    }
}

// Start monitoring
setInterval(updateGlobalHardwareStatus, 5000);

// Run immediately on script load
applyAccentColor();
document.addEventListener('DOMContentLoaded', syncProfileUI);

// Export functions
window.formatDateTime = formatDateTime;
window.formatTime = formatTime;
window.debounce = debounce;
window.throttle = throttle;
window.generateId = generateId;
window.saveToLocalStorage = saveToLocalStorage;
window.getFromLocalStorage = getFromLocalStorage;
window.isValidEmail = isValidEmail;
window.isStrongPassword = isStrongPassword;
window.toSlug = toSlug;
window.truncateText = truncateText;
window.capitalizeWords = capitalizeWords;
window.formatNumber = formatNumber;
window.formatBytes = formatBytes;
window.getUrlParameter = getUrlParameter;
window.deepClone = deepClone;
window.deepEqual = deepEqual;
window.applyAccentColor = applyAccentColor;
window.syncProfileUI = syncProfileUI;