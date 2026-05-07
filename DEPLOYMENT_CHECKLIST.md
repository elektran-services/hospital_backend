# Firebase FCM Integration - Deployment & Next Steps

## 🚀 Quick Start Checklist

### ✅ Phase 1: Installation (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Verify firebase-admin was added
npm list firebase-admin
# Should show: firebase-admin@^12.0.0
```

### ✅ Phase 2: Configuration (2 minutes)

1. Get Firebase Service Account:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate New Private Key**
   - Copy the entire JSON

2. Add to `.env.local`:
```bash
# .env.local
FIREBASE_SERVICE_ACCOUNT_JSON='<paste entire JSON here>'
```

### ✅ Phase 3: Database Migration (3 minutes)

```bash
# Run Prisma migration
npx prisma migrate dev --name add_fcm_and_call_sessions

# This creates:
# - DeviceToken table
# - CallSession table
# - CallSessionStatus enum
```

### ✅ Phase 4: Restart Server (1 minute)

```bash
npm run dev
```

**Total Setup Time: ~11 minutes**

---

## 🧪 Validation (10 minutes)

Run each test scenario from `FIREBASE_FCM_SETUP_TESTING.md`:

```bash
# Test 1: Register Device Token
curl -X POST http://localhost:3000/api/v1/video-calls/register-device-token \
  -H "Authorization: Bearer <token>" \
  -d '{"fcmToken": "test_token", "deviceType": "ios"}'

# Expected: 201 Created

# Test 2-5: See FIREBASE_FCM_SETUP_TESTING.md for complete flows
```

---

## 📦 Deployment Checklist

### Pre-Production
- [ ] All tests pass locally
- [ ] Database migration runs without errors
- [ ] Firebase service account JSON validated
- [ ] Agora tokens still generating correctly
- [ ] CORS headers present in responses

### Staging Deployment
```bash
# 1. Deploy new code with endpoints
git push origin main
# (Vercel/deployment pipeline triggers)

# 2. Run database migration
npx prisma migrate deploy

# 3. Set environment variables
# FIREBASE_SERVICE_ACCOUNT_JSON
# (Use secrets manager, not .env files)

# 4. Verify endpoints responding
curl https://staging-api.hospital.com/api/v1/health
```

### Production Deployment
```bash
# 1. Tag release
git tag v1.1.0-fcm
git push --tags

# 2. Deploy (same as staging)
# 3. Verify all endpoints and metrics
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

1. **Device Token Registration**
   ```sql
   SELECT COUNT(*) FROM "DeviceToken" WHERE "isActive" = true;
   -- Should grow as users register
   ```

2. **Call Session Success Rate**
   ```sql
   SELECT 
     COUNT(CASE WHEN "sessionStatus" = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*) as success_rate
   FROM "CallSession";
   ```

3. **Average Call Duration**
   ```sql
   SELECT AVG("callDuration") as avg_seconds FROM "CallSession" 
   WHERE "sessionStatus" = 'COMPLETED';
   ```

4. **Notifications Sent**
   ```sql
   SELECT COUNT(*) FROM "CallSession" WHERE "notificationSentAt" IS NOT NULL;
   ```

### Logging

Enable detailed logs:
```bash
NODE_ENV=development npm run dev
```

Check logs for:
- Firebase initialization status
- FCM notification delivery
- Token generation errors
- Multi-tenant isolation violations

---

## 🔄 Integration Timeline

### Week 1: Backend Ready
- ✅ All endpoints live
- ✅ Database tables created
- ✅ Firebase configured
- ✅ Documentation complete

### Week 2-3: Mobile Integration
- Doctor app registers device token
- Patient app receives incoming call notifications
- Both apps join Agora channels
- End-to-end testing

### Week 4: Production
- Mobile apps released
- Monitor metrics
- Address any issues
- Document learnings

---

## 🚨 Troubleshooting During Deployment

### Problem: "Firebase not initialized"
```
Location: Server logs
Cause: FIREBASE_SERVICE_ACCOUNT_JSON not set or invalid JSON
Fix:
  1. Verify .env.local has the variable
  2. Validate JSON with jsonlint.com
  3. Restart: npm run dev
```

### Problem: "Database migration fails"
```
Location: Terminal output
Cause: Schema conflict or previous partial migration
Fix:
  1. Check migration status: npx prisma migrate status
  2. Reset dev DB: npx prisma migrate reset
  3. Rerun migration: npx prisma migrate dev --name ...
```

### Problem: "Notification not sending"
```
Location: API response includes "notificationSent": false
Cause: Device token not registered or FCM service down
Fix:
  1. Verify device token registered (Test 1)
  2. Check Firebase console for errors
  3. Verify FCM is enabled in Firebase project
```

---

## 📱 Mobile App Integration Steps

### Step 1: Install Firebase SDK
```bash
# React Native
npm install @react-native-firebase/app @react-native-firebase/messaging

# Flutter
flutter pub add firebase_messaging
```

### Step 2: Handle Notifications
```javascript
// Listen for incoming notification
messaging.onMessage((message) => {
  if (message.data.type === 'incoming_call') {
    // Show call UI
  }
});
```

### Step 3: Register Device Token
```javascript
// After user login
const token = await getToken(messaging);
await registerDeviceToken(token, accessToken);
```

### Step 4: Join Video Call
```javascript
// When user taps notification
const sessionDetails = await getCallSession(sessionId);
await agoraClient.joinChannel(
  sessionDetails.token,
  sessionDetails.channelId
);
```

### Step 5: End Call
```javascript
// When user hangs up
await endCall(sessionId);
```

---

## 🎯 Success Metrics

### Technical KPIs
| Metric | Target | Monitoring |
|--------|--------|------------|
| API Response Time | < 200ms | Cloudflare Analytics |
| FCM Delivery Rate | > 95% | Firebase Console |
| Database Query Time | < 100ms | Prisma Logs |
| Error Rate | < 0.5% | Sentry/Cloud Monitoring |

### Business KPIs
| Metric | Target | Monitoring |
|--------|--------|------------|
| Device Registration Rate | > 80% | Database query |
| Call Success Rate | > 98% | Database query |
| Avg Call Duration | 15-20 min | Database query |
| User Satisfaction | > 4.5/5 | App store reviews |

---

## 📞 Support Resources

### Documentation
- `FIREBASE_FCM_INTEGRATION.md` - Complete guide
- `FIREBASE_FCM_SETUP_TESTING.md` - Setup & testing
- `API_REFERENCE_FCM.md` - API quick reference
- `FIREBASE_FCM_IMPLEMENTATION_SUMMARY.md` - Overview

### External Resources
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Agora Token Generation](https://docs.agora.io/en/video-call-sdk/get-started/authentication-workflow)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Debugging Tools
```bash
# Open Firebase Studio
npx prisma studio

# View live logs
npm run dev

# Check device tokens
psql -c "SELECT * FROM \"DeviceToken\" LIMIT 5;"

# Check call sessions
psql -c "SELECT * FROM \"CallSession\" LIMIT 5;"
```

---

## ✨ Features Enabled

After deployment, you have:

1. ✅ Real-time push notifications for incoming calls
2. ✅ Multi-platform support (iOS, Android, Web)
3. ✅ Complete call session tracking
4. ✅ Call duration metrics and history
5. ✅ Hospital-level data isolation
6. ✅ Secure token distribution
7. ✅ Comprehensive audit trail
8. ✅ Mobile app integration ready

---

## 🎓 Learning Resources

### For Backend Developers
- Review `src/lib/firebase.ts` for Firebase integration patterns
- Study `src/app/api/v1/video-calls/initiate/route.ts` for multi-tenant architecture
- Understand token lifecycle in `src/app/api/v1/video-calls/session/[sessionId]/route.ts`

### For Mobile Developers
- Use code examples in `API_REFERENCE_FCM.md`
- Follow patterns in React Native and Flutter examples
- Test with provided cURL commands first

### For DevOps/SRE
- Monitor Firebase quota usage
- Track Agora token generation rate
- Set up alerts for notification failures
- Monitor database query performance

---

## 🚀 Go Live Checklist

- [ ] All code committed and tested
- [ ] Database migration tested on staging
- [ ] Firebase service account verified
- [ ] Environment variables set in production
- [ ] Mobile apps with integration released
- [ ] Monitoring/alerts configured
- [ ] Support documentation published
- [ ] Team training completed
- [ ] Customer communication sent
- [ ] Rollback plan documented

---

**Status: Ready for Deployment** ✅

Estimated Implementation Time: **2-3 weeks** (backend done, mobile team needed for full feature)
