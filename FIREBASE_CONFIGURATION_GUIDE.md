# Firebase Configuration - Step-by-Step Guide

## 📋 Overview

You need to:
1. Get Firebase service account JSON from Firebase Console
2. Add it to `.env.local` file in your project

**Time Required:** 3-5 minutes

---

## ✅ Step 1: Get Firebase Service Account JSON

### Option A: Using Firebase Console (Recommended)

**Follow these steps exactly:**

1. **Go to Firebase Console**
   - Open: https://console.firebase.google.com
   - Login with your Google account

2. **Select Your Project**
   - Look for your project name (e.g., "hospital-saas", "telemedicine-app")
   - Click on it to open

3. **Go to Project Settings**
   - Click the **⚙️ Settings icon** (gear icon) at top-left
   - Click **Project Settings**

4. **Navigate to Service Accounts**
   - Click the **Service Accounts** tab (at the top)
   - You'll see three tabs: General, ServiceAccounts, Integrations
   - Make sure you're on **Service Accounts** tab

5. **Generate New Private Key**
   - Scroll down and look for button: **"Generate New Private Key"**
   - Click it
   - A JSON file will download automatically (might be named `project-id-firebase-adminsdk-xyz.json`)

6. **Open the Downloaded JSON File**
   - Open the downloaded `.json` file with a text editor
   - Copy the **entire contents** (all the text from `{` to `}`)

**⚠️ Important:** The JSON will look like this (but with real values):
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xyz@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## ✅ Step 2: Create/Update `.env.local` File

### Option A: Using VS Code (Easy)

1. **Open VS Code**
   - You should already have your project open
   - Look at the file explorer on left

2. **Find or Create `.env.local`**
   - In file explorer, look for `.env.local`
   - **If it doesn't exist:**
     - Right-click on project root folder
     - Click **New File**
     - Name it: `.env.local`

3. **Add Firebase Configuration**
   - Open `.env.local` 
   - Add this template:

```
# Firebase Service Account (JSON as string)
FIREBASE_SERVICE_ACCOUNT_JSON='[PASTE_JSON_HERE]'
```

4. **Paste Your JSON**
   - Replace `[PASTE_JSON_HERE]` with your entire JSON (without the outer quotes)
   - The full line should look like:

```
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project",...}'
```

**⚠️ Important formatting rules:**
- Wrap entire JSON in single quotes: `'...'`
- No line breaks inside (keep it on one line)
- Keep the single quotes around the JSON
- No spaces around the `=` sign

5. **Save the file** (Ctrl+S)

---

### Option B: Using PowerShell Terminal (Alternative)

If you prefer using terminal:

```powershell
# Navigate to your project
cd C:\Users\HP\Documents\app\node\hospital-saas

# View existing .env.local (if it exists)
Get-Content .env.local

# Add Firebase config (replace with your actual JSON)
Add-Content .env.local "FIREBASE_SERVICE_ACCOUNT_JSON='{`"type`":`"service_account`",...}'"
```

---

## ✅ Step 3: Verify Configuration

### Check 1: File Exists
```powershell
# Should output the contents of .env.local
Get-Content .env.local
```

Expected output:
```
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

### Check 2: JSON is Valid

Open your `.env.local` and manually verify:
- ✅ Entire JSON wrapped in single quotes
- ✅ No missing quotes
- ✅ No line breaks in the JSON
- ✅ File is saved (no unsaved indicator in VS Code)

### Check 3: Restart Server

After adding `.env.local`, **restart** your dev server:

```powershell
# Stop the server (Ctrl+C)
# Then restart
npm run dev

# You should see in terminal:
# ✅ Firebase Admin initialized successfully
```

If you see that message, Firebase is configured! ✅

---

## 🚨 Common Issues & Fixes

### Issue 1: "Firebase not initialized" error

**Problem:** You see this in terminal:
```
⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not set
```

**Solution:**
1. Verify `.env.local` exists in project root
2. Verify JSON is wrapped in single quotes like: `'{"type":"service_account",...}'`
3. Restart server: Stop (Ctrl+C) then `npm run dev`

### Issue 2: JSON validation error

**Problem:** 
```
Failed to initialize Firebase: SyntaxError...
```

**Solution:**
1. Open downloaded JSON file again
2. Verify it starts with `{` and ends with `}`
3. Copy the **entire** file contents
4. Paste into `.env.local` exactly as is
5. Verify no quotes are missing

### Issue 3: `.env.local` file not found

**Problem:** Terminal says `.env.local` doesn't exist

**Solution:**
1. Create it manually using VS Code (right-click → New File)
2. Name it exactly: `.env.local`
3. Make sure it's in the **project root** (same level as `package.json`)

---

## 📁 Correct File Location

Your `.env.local` should be here:
```
C:\Users\HP\Documents\app\node\hospital-saas\
  ├── .env.local          ← Your file goes here
  ├── package.json
  ├── tsconfig.json
  ├── next.config.ts
  └── src/
      └── ...
```

---

## ✅ Success Checklist

After configuration:

- [ ] `.env.local` exists in project root
- [ ] Contains: `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'`
- [ ] JSON wrapped in single quotes
- [ ] File saved (no unsaved indicator)
- [ ] Server restarted with `npm run dev`
- [ ] Terminal shows: **"✅ Firebase Admin initialized successfully"**

---

## 🧪 Test Firebase Setup

Once configured, run this test:

```bash
# Make sure server is running: npm run dev
# In another terminal:

curl -X POST http://localhost:3000/api/v1/video-calls/register-device-token \
  -H "Authorization: Bearer test_token" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken": "test_fcm_token", "deviceType": "ios"}'
```

**Expected response:**
- If error is about authorization → Firebase is initialized ✅
- If error is about Firebase → Still not configured ❌

---

## 🔐 Security Note

**IMPORTANT:**
- Keep `.env.local` SECRET
- Never commit `.env.local` to Git
- The `.gitignore` file should already exclude it
- Verify with: `git status` (shouldn't show `.env.local`)

---

## 💡 Pro Tips

1. **Use different projects per environment:**
   - Local: Development Firebase project
   - Staging: Staging Firebase project
   - Production: Production Firebase project

2. **Rotate keys regularly:**
   - Delete old service account keys in Firebase
   - Generate new ones quarterly

3. **Monitor usage:**
   - Go to Firebase Console
   - Check usage stats and quotas
   - Set up alerts for unusual activity

---

**Need Help?** 
- Stuck at Firebase Console? Reference the Firebase docs: https://firebase.google.com/docs/admin/setup
- Having other issues? Check "Common Issues" section above

When done, your terminal should show: **"✅ Firebase Admin initialized successfully"** ✅
