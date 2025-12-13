# Deployment Guide for Netlify

This guide explains how to deploy the Smart Home IoT Dashboard to Netlify.

## Prerequisites

1. A GitHub/GitLab/Bitbucket account
2. A Netlify account
3. Firebase project with Authentication and Realtime Database enabled
4. HiveMQ Cloud account with MQTT broker configured

## Deployment Steps

### 1. Prepare Your Repository

1. Ensure all files are committed to your Git repository
2. Push your repository to GitHub/GitLab/Bitbucket

### 2. Connect to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up or log in
2. Click "New site from Git"
3. Connect your Git provider account
4. Select your repository

### 3. Configure Deployment Settings

In the Netlify deploy settings:
- **Build command**: Leave empty (this is a static site)
- **Publish directory**: `/` (root directory)

### 4. Set Environment Variables

For better security, configure environment variables in Netlify instead of hardcoding credentials:

In Netlify dashboard:
1. Go to Site settings > Build & deploy > Environment
2. Add the following environment variables:

#### Firebase Configuration
- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain
- `VITE_FIREBASE_DATABASE_URL` - Your Firebase database URL
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Your Firebase app ID

#### MQTT Configuration
- `VITE_MQTT_HOST` - Your HiveMQ Cloud host (e.g., `your-cluster.s1.eu.hivemq.cloud`)
- `VITE_MQTT_PORT` - Your MQTT port (usually 8884 for WSS)
- `VITE_MQTT_USERNAME` - Your MQTT username
- `VITE_MQTT_PASSWORD` - Your MQTT password

### 5. Deploy

Click "Deploy site" and Netlify will build and deploy your site. The site will be available at a Netlify-provided URL.

## Custom Domain (Optional)

To use a custom domain:
1. Go to Site settings > Domain management
2. Add your custom domain
3. Follow the DNS configuration instructions

## Continuous Deployment

Once connected to Git, Netlify will automatically rebuild and deploy your site whenever you push changes to your repository.

## Troubleshooting

If you encounter issues:
1. Check that all environment variables are correctly set
2. Verify your Firebase and MQTT credentials are correct
3. Ensure your MQTT broker is accessible from the internet
4. Check the browser console for JavaScript errors

## Security Notes

- Never commit actual credentials to version control
- Always use environment variables for sensitive information
- Ensure your Firebase security rules are properly configured
- Use HTTPS (automatically provided by Netlify)