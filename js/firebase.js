// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBfP6c4VMAzjSyiDXV2a_ifUJ2dgRYnw7U",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-home-iot-e0e92.firebaseapp.com",
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://smart-home-iot-e0e92-default-rtdb.firebaseio.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "smart-home-iot-e0e92",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-home-iot-e0e92.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "369339639572",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:369339639572:web:dc3e33306b4669677c0401"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Auth and Database References
const auth = firebase.auth();
const database = firebase.database();

// Firebase Authentication Functions
function loginUser(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

function logoutUser() {
    return auth.signOut();
}

// Firebase Database Functions
// writeLog function REMOVED - Only IoT data should be logged

// New structured logging functions for IoT data
function logGasData(value) {
    const timestamp = Date.now();
    const logData = {
        value: value
    };
    
    return database.ref('logs/gas/' + timestamp).set(logData);
}

function logMotionData(motion) {
    const timestamp = Date.now();
    const logData = {
        motion: motion
    };
    
    return database.ref('logs/motion/' + timestamp).set(logData);
}

function logRelayState(relay, state) {
    const timestamp = Date.now();
    const logData = {
        relay: relay,
        state: state
    };
    
    return database.ref('logs/relay/' + timestamp).set(logData);
}

// System logging function REMOVED - Only IoT data should be logged

function readLogs() {
    return database.ref('logs').orderByKey().limitToLast(50).once('value');
}

// New functions to read specific data types
function readGasLogs() {
    return database.ref('logs/gas').orderByKey().limitToLast(50).once('value');
}

function readMotionLogs() {
    return database.ref('logs/motion').orderByKey().limitToLast(50).once('value');
}

function readRelayLogs() {
    return database.ref('logs/relay').orderByKey().limitToLast(50).once('value');
}

// Check auth state and redirect if not logged in
auth.onAuthStateChanged(user => {
    const publicPages = ['login.html', '']; // Include empty string for root path
    const currentPage = window.location.pathname.split('/').pop();
    const onPublicPage = publicPages.includes(currentPage) || currentPage === '';
    
    if (!user && !onPublicPage) {
        window.location.href = 'login.html';
    } else if (user && onPublicPage && currentPage === 'login.html') {
        window.location.href = 'index.html';
    }
    
    // Hide loading overlay when auth state is determined
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }, 500);
    }
});

// Export functions for use in other modules
window.loginUser = loginUser;
window.logoutUser = logoutUser;
// window.writeLog REMOVED - Only IoT data should be logged
window.readLogs = readLogs;
window.logGasData = logGasData;
window.logMotionData = logMotionData;
window.logRelayState = logRelayState;
window.readGasLogs = readGasLogs;
window.readMotionLogs = readMotionLogs;
window.readRelayLogs = readRelayLogs;

// Logout button handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser().then(() => {
                window.location.href = 'login.html';
            }).catch(error => {
                console.error('Logout error:', error);
            });
        });
    }
});