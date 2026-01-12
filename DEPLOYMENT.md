# 🚀 Deploy to Netlify

## Quick Deploy Options

### Option 1: Netlify CLI (Recommended)
```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist
```

### Option 2: Drag & Drop Deploy
1. Go to [Netlify](https://app.netlify.com/)
2. Drag the `dist` folder to the deploy area
3. Your site will be live instantly!

### Option 3: Git Integration
1. Push your code to GitHub/GitLab
2. Connect repository in Netlify dashboard
3. Auto-deploy on every push

## 🔧 Environment Variables Setup

After deployment, add these environment variables in Netlify:

**Site Settings → Environment Variables:**
- `VITE_FIREBASE_API_KEY` = Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` = spontaneous-pixie-1a76e9.firebaseapp.com
- `VITE_FIREBASE_PROJECT_ID` = spontaneous-pixie-1a76e9
- `VITE_FIREBASE_STORAGE_BUCKET` = spontaneous-pixie-1a76e9.appspot.com
- `VITE_FIREBASE_MESSAGING_SENDER_ID` = 911257745432
- `VITE_FIREBASE_APP_ID` = 1:911257745432:web:798307aed378045899b6bd

## 🔥 Firebase Setup for Production

1. Go to Firebase Console → Authentication → Settings
2. Add your Netlify domain to **Authorized domains**:
   - `your-site-name.netlify.app`
   - `your-custom-domain.com` (if using custom domain)

## ✅ What's Ready

- ✅ Build optimized for production
- ✅ SPA routing configured (`_redirects` file)
- ✅ Netlify configuration (`netlify.toml`)
- ✅ Firebase centralized and fixed
- ✅ Environment variables properly configured

## 🎯 Next Steps

1. Choose deployment method above
2. Add environment variables in Netlify
3. Update Firebase authorized domains
4. Your app will be live! 🎉