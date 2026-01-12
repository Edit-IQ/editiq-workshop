# 🚀 Supabase Deployment Guide

## Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login
3. Click "New Project"
4. Choose organization, name, and password
5. Wait 2 minutes for setup

## Step 2: Get Your Credentials
1. Go to **Settings** → **API**
2. Copy:
   - `Project URL` 
   - `anon public` key

## Step 3: Update Environment Variables

### Local (.env.local):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Netlify Environment Variables:
1. Go to Netlify dashboard
2. Site settings → Environment variables
3. Add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

## Step 4: Create Database Tables

Go to **Table Editor** in Supabase and run these SQL commands:

### Clients Table:
```sql
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  rate DECIMAL,
  projectType TEXT,
  status TEXT,
  createdAt BIGINT
);
```

### Transactions Table:
```sql
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  clientId UUID REFERENCES clients(id)
);
```

### Credentials Table:
```sql
CREATE TABLE credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  createdAt BIGINT
);
```

## Step 5: Enable Google Auth (Optional)
1. Go to **Authentication** → **Providers**
2. Enable Google
3. Add your domain to authorized URLs:
   - `http://localhost:3000` (for local)
   - `https://your-netlify-site.netlify.app` (for production)

## Step 6: Deploy to Netlify
1. Push your code to GitHub
2. Connect to Netlify
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables (Step 3)
5. Deploy!

## ✅ You're Live!

Your app will now:
- ✅ Work on Netlify without domain issues
- ✅ Have real-time database sync
- ✅ Support Google authentication
- ✅ Store data reliably in PostgreSQL
- ✅ Scale automatically

## Demo Mode
If you don't want to set up auth, users can click "Enter as Guest" to use demo mode with localStorage.