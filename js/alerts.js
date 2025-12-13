// Alert System
class AlertSystem {
    constructor() {
        this.container = document.getElementById('alertContainer') || this.createAlertContainer();
        this.alertCount = 0;
    }
    
    createAlertContainer() {
        const container = document.createElement('div');
        container.id = 'alertContainer';
        document.body.appendChild(container);
        return container;
    }
    
    showAlert(type, title, message, duration = 5000) {
        this.alertCount++;
        const alertId = `alert-${Date.now()}-${this.alertCount}`;
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} slideInRight`;
        alertElement.id = alertId;
        
        // Select appropriate icon based on alert type
        let iconClass = 'info';
        if (type === 'success') iconClass = 'check-circle';
        if (type === 'warning') iconClass = 'alert-triangle';
        if (type === 'error') iconClass = 'x-circle';
        
        alertElement.innerHTML = `
            <div class="alert-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${this.getIconSvg(iconClass)}
                </svg>
            </div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close" aria-label="Close alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        this.container.appendChild(alertElement);
        
        // Add close event listener
        const closeBtn = alertElement.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            this.removeAlert(alertId);
        });
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeAlert(alertId);
            }, duration);
        }
        
        return alertId;
    }
    
    removeAlert(alertId) {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.classList.replace('slideInRight', 'slideOutRight');
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.parentNode.removeChild(alertElement);
                }
            }, 300);
        }
    }
    
    getIconSvg(iconType) {
        switch (iconType) {
            case 'check-circle':
                return '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
            case 'alert-triangle':
                return '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
            case 'x-circle':
                return '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
            case 'info':
            default:
                return '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
        }
    }
    
    // Predefined alert types
    successAlert(message, duration) {
        return this.showAlert('success', 'Success', message, duration);
    }
    
    warningAlert(message, duration) {
        return this.showAlert('warning', 'Warning', message, duration);
    }
    
    errorAlert(message, duration) {
        return this.showAlert('error', 'Error', message, duration);
    }
    
    infoAlert(message, duration) {
        return this.showAlert('info', 'Info', message, duration);
    }
    
    relayOnAlert(device) {
        return this.successAlert(`${device} has been turned ON`);
    }
    
    relayOffAlert(device) {
        return this.infoAlert(`${device} has been turned OFF`);
    }
}

// Initialize alert system
const alertSystem = new AlertSystem();

// Make alert functions globally available
window.successAlert = alertSystem.successAlert.bind(alertSystem);
window.warningAlert = alertSystem.warningAlert.bind(alertSystem);
window.errorAlert = alertSystem.errorAlert.bind(alertSystem);
window.infoAlert = alertSystem.infoAlert.bind(alertSystem);
window.relayOnAlert = alertSystem.relayOnAlert.bind(alertSystem);
window.relayOffAlert = alertSystem.relayOffAlert.bind(alertSystem);

// Also make the alertSystem available for other modules
window.alertSystem = alertSystem;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AlertSystem, alertSystem };
}