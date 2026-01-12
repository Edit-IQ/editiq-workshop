# Firebase Setup Instructions

## ✅ Fixed Issues

1. **Removed duplicate Firebase initialization** from App.tsx
2. **Updated imports** to use centralized Firebase config from `services/firebase.ts`
3. **Fixed environment variable access** to use `import.meta.env.VITE_*` instead of `process.env`
4. **Centralized auth and provider exports** in `services/firebase.ts`

## 🔧 Next Steps

### 1. Get Your Firebase API Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `spontaneous-pixie-1a76e9`
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Copy the `apiKey` value

### 2. Update Environment Variables
Replace `YOUR_ACTUAL_FIREBASE_API_KEY_HERE` in `.env.local` with your actual Firebase API key.

### 3. Restart Development Server
```bash
npm run dev
```

## 🔍 What Was Fixed

- **App.tsx**: Now imports `auth` and `googleProvider` from `services/firebase.ts`
- **services/firebase.ts**: Single source of truth for Firebase configuration
- **Environment**: Uses proper Vite environment variable format (`VITE_*`)
- **Authentication**: Centralized Firebase auth setup

## 🚀 Testing

After updating the API key and restarting the server:
1. Click "Sign in with Gmail"
2. Should redirect to Google authentication
3. After successful login, should return to your app

The Firebase Console settings (Google provider enabled, authorized domains) are already correct according to your description.