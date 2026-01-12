# Netlify Deployment Guide

## Environment Variables Setup

Your app works on localhost but not on Netlify because the environment variables are not properly configured in the Netlify dashboard.

### Step 1: Set Environment Variables in Netlify Dashboard

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

```
VITE_FIREBASE_API_KEY = AIzaSyCVETgTKYN4FY3OxV81wERGjbvPFsK_Cz0
VITE_FIREBASE_AUTH_DOMAIN = spontaneous-pixie-1a76e9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = spontaneous-pixie-1a76e9
VITE_FIREBASE_STORAGE_BUCKET = spontaneous-pixie-1a76e9.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 911257745432
VITE_FIREBASE_APP_ID = 1:911257745432:web:798307aed3780458996b6d
```

### Step 2: Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `spontaneous-pixie-1a76e9`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Netlify domain (e.g., `your-app-name.netlify.app`)

### Step 3: Redeploy

After setting the environment variables:
1. Go to **Deploys** in your Netlify dashboard
2. Click **Trigger deploy** → **Deploy site**
3. Wait for the build to complete

### Step 4: Test the Deployment

1. Visit your Netlify URL
2. Try to sign in with Google
3. Add some test data (clients, transactions)
4. Refresh the page to verify data persistence

## Troubleshooting

### If authentication fails:
- Check that your Netlify domain is added to Firebase authorized domains
- Verify environment variables are set correctly in Netlify dashboard

### If data doesn't persist:
- Check browser console for Firebase errors
- Verify Firestore database is created and rules are set correctly

### Firebase Rules (should be set):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Current Status

✅ Firebase configuration updated with better error handling
✅ Removed localhost bypass that was causing production issues  
✅ Added debug logging for production environment
✅ Business analytics page implemented (no AI dependencies)
✅ All mock data removed - app starts clean

The app should now work properly on Netlify once you set the environment variables in the Netlify dashboard.