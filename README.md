# Smart Home IoT Dashboard

A complete, production-ready, responsive Smart Home Automation Dashboard built with HTML, CSS, JavaScript, Firebase Web SDK, and MQTT over WebSockets.

## Features

- **Real-time Control**: Control up to 4 appliances (Light, Fan, TV, Plug) with toggle switches
- **Live Sensor Monitoring**: Real-time gas level and motion detection sensors
- **Alert System**: Toast-style notifications for system events
- **Analytics**: Historical data visualization with Chart.js
- **User Authentication**: Secure login with Firebase Authentication
- **Responsive Design**: Works on mobile, tablet, and desktop devices
- **Modern UI**: Dark tech theme with neon blue accents and glassmorphism effects

## Prerequisites

1. Firebase Account
2. HiveMQ Cloud Account
3. ESP32 devices with MQTT connectivity

## Setup Instructions

### 1. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Email/Password authentication
3. Create a Realtime Database
4. Copy your Firebase configuration and replace in `js/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. HiveMQ Configuration

1. Create a free cluster at [HiveMQ Cloud](https://www.hivemq.com/cloud/)
2. Create credentials for your MQTT client
3. Update the MQTT configuration in `js/mqttClient.js`:

```javascript
const MQTT_HOST = "YOUR_CLUSTER_URL.s2.eu.hivemq.cloud";
const MQTT_PORT = 8884;
const MQTT_USERNAME = "YOUR_MQTT_USERNAME";
const MQTT_PASSWORD = "YOUR_MQTT_PASSWORD";
```

### 3. Deployment

This project is ready for deployment on Netlify. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to Netlify, including how to set up environment variables for better security.
## File Structure

```
/public
    index.html          # Main dashboard
    login.html          # Login page
    analytics.html      # Analytics page
    settings.html       # Settings page

    /css
       style.css        # Main styles
       dashboard.css    # Dashboard-specific styles
       alerts.css       # Alert system styles
       animations.css   # Animation classes

    /js
       firebase.js      # Firebase integration
       mqttClient.js    # MQTT client
       dashboard.js     # Dashboard logic
       analytics.js     # Analytics page logic
       alerts.js        # Alert system
       utils.js         # Utility functions

    /assets
       /icons           # SVG icons
       /images          # Placeholder images
```

## MQTT Topic Structure

The dashboard expects the following MQTT topics:

- `home/relay1/set` to `home/relay4/set` - Control relay states
- `home/relay1/state` to `home/relay4/state` - Receive relay state confirmations
- `home/sensor/gas` - Gas sensor data
- `home/sensor/motion` - Motion sensor data

Messages should be JSON formatted:
```json
// For relay control
{"state": "ON"}

// For relay state confirmation
{"state": "ON"}

// For gas sensor
{"value": 45}

// For motion sensor
{"detected": true}
```

## Customization

### Changing Appliance Names

1. Navigate to Settings page
2. Modify appliance names in the "Appliance Names" section
3. Save changes

### Adjusting Gas Threshold

1. Navigate to Settings page
2. Adjust the slider in the "Gas Threshold" section
3. Save changes

### Notification Settings

1. Navigate to Settings page
2. Toggle notifications on/off
3. Save changes

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Security Considerations

- Never commit your actual Firebase credentials to version control
- Use environment variables or secure configuration methods for production
- Ensure your MQTT credentials are secured
- HTTPS is required for production deployments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on the GitHub repository.