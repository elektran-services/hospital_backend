# Agora Video Call Integration - Developer Checklist

## ✅ Pre-Integration Checklist

### System Requirements
- [ ] Node.js 16+ installed
- [ ] npm or yarn package manager available
- [ ] Agora.io account created (https://console.agora.io)
- [ ] Agora App ID and Certificate obtained
- [ ] Backend server running or accessible
- [ ] Database with user/branch data populated

### Project Setup
- [ ] Backend cloned and dependencies installed
- [ ] `.env.local` file created in root directory
- [ ] `AGORA_APP_ID` added to `.env.local`
- [ ] `AGORA_APP_CERTIFICATE` added to `.env.local`
- [ ] `agora-token` package installed (`npm install agora-token`)
- [ ] Backend server started (`npm run dev`)

## 📂 Files to Review

### Core Implementation
- [ ] Read [src/lib/agora.ts](src/lib/agora.ts) - Understand token generation
- [ ] Read [src/app/api/v1/video-calls/route.ts](src/app/api/v1/video-calls/route.ts) - Understand endpoint
- [ ] Review inline comments and JSDoc documentation

### Documentation
- [ ] Read [AGORA_QUICK_REFERENCE.md](AGORA_QUICK_REFERENCE.md) - Overview
- [ ] Read [AGORA_ENV_SETUP.md](AGORA_ENV_SETUP.md) - Environment setup
- [ ] Read [AGORA_USAGE_EXAMPLES.md](AGORA_USAGE_EXAMPLES.md) - Your platform examples
- [ ] Read [AGORA_INTEGRATION.md](AGORA_INTEGRATION.md) - Full documentation
- [ ] Read [AGORA_IMPLEMENTATION_SUMMARY.md](AGORA_IMPLEMENTATION_SUMMARY.md) - Architecture decisions

## 🧪 Testing the Backend

### Manual Testing
- [ ] Start backend: `npm run dev`
- [ ] Get access token (login as doctor/patient)
- [ ] Test endpoint with cURL or Postman:
  ```bash
  curl -X POST http://localhost:3000/api/v1/video-calls/token \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"branchId":"...", "doctorId":"...", "patientId":"..."}'
  ```
- [ ] Verify token returned in response
- [ ] Test with invalid credentials (should get 400/401/403)
- [ ] Test with non-existent user IDs (should get 404)

### Edge Cases to Test
- [ ] Missing authorization header (401)
- [ ] Invalid UUID format (400)
- [ ] Doctor ID that's not a doctor (400)
- [ ] Patient ID that's not a patient (400)
- [ ] Users in different hospitals (409)
- [ ] Doctor not in specified branch (409)
- [ ] User account suspended (403 or 404)
- [ ] Expired token (401)

## 📱 Mobile App Integration

### Platform: iOS (Swift)

- [ ] Install Agora SDK: `pod install`
- [ ] Create VideoCallService class
- [ ] Implement token request function
- [ ] Add Bearer token to Authorization header
- [ ] Parse JSON response
- [ ] Initialize Agora SDK with returned token
- [ ] Test video call join
- [ ] Handle token expiration (refresh at 24 hours)
- [ ] Add error handling/UI for failures

**Code Example:** See [AGORA_USAGE_EXAMPLES.md](AGORA_USAGE_EXAMPLES.md#ios-swift-integration)

### Platform: Android (Kotlin)

- [ ] Add Agora dependency in build.gradle
- [ ] Create VideoCallService class
- [ ] Implement token request with OkHttp/Retrofit
- [ ] Add Bearer token to Authorization header
- [ ] Parse JSON response with Gson
- [ ] Initialize Agora RTC engine with token
- [ ] Test video call join
- [ ] Handle token expiration
- [ ] Add error handling/UI for failures

**Code Example:** See [AGORA_USAGE_EXAMPLES.md](AGORA_USAGE_EXAMPLES.md#android-kotlin-integration)

### Platform: React Native / Flutter

- [ ] See [AGORA_USAGE_EXAMPLES.md](AGORA_USAGE_EXAMPLES.md) for Flutter example
- [ ] Install agora_rtc_engine package
- [ ] Create video call service
- [ ] Implement token request
- [ ] Initialize Agora SDK
- [ ] Test video call

### Platform: Web (React/Vue/Vanilla)

- [ ] Install Agora SDK: `npm install agora-rtc-sdk-ng`
- [ ] Create VideoCallService
- [ ] Implement token request
- [ ] Initialize AgoraRTC
- [ ] Test video/audio streaming

## 🔐 Security Verification

### Before Deployment
- [ ] `.env.local` is in `.gitignore`
- [ ] AGORA_APP_CERTIFICATE NOT in source code
- [ ] AGORA_APP_CERTIFICATE NOT in console logs
- [ ] API validates user ownership of call
- [ ] Proper CORS headers set
- [ ] Rate limiting considered
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS enforced in production
- [ ] Token never sent to frontend in URL/cookie (only in response body)

### Authorization Checks
- [ ] Doctor can only request tokens they're part of ✓
- [ ] Patient can only request tokens they're part of ✓
- [ ] Manager cannot request tokens (not authorized) ✓
- [ ] Unauthenticated users get 401 ✓
- [ ] Invalid users get 404 not 403 (security) ✓

## 🐛 Debugging Guide

### Common Issues

**Token generation fails immediately**
- [ ] Check AGORA_APP_ID and AGORA_APP_CERTIFICATE in `.env.local`
- [ ] Verify environment variables loaded (check console)
- [ ] Check file: `src/lib/agora.ts` validateConfig()

**Users can't join Agora channel**
- [ ] Verify token is not expired (< 24 hours old)
- [ ] Check channelName matches exactly
- [ ] Check UID in app matches token UID
- [ ] Verify Agora SDK initialized correctly

**API returns 404 for valid users**
- [ ] Verify users exist in database
- [ ] Check user IDs are correct UUIDs
- [ ] Confirm user roles are DOCTOR/PATIENT
- [ ] Check user status is ACTIVE (not SUSPENDED)

**API returns 409 Conflict**
- [ ] Verify doctor and patient in same hospital
- [ ] Check doctor is in specified branch
- [ ] Confirm all user hospital IDs match

**API returns 403 Forbidden**
- [ ] Verify you're authenticated (Bearer token present)
- [ ] Check user role is DOCTOR or PATIENT
- [ ] Verify requester is the doctor or patient in the call

### Logging & Monitoring

- [ ] Add request logging to see incoming data
- [ ] Add response logging to verify token generation
- [ ] Log validation errors for debugging
- [ ] Monitor token generation rate
- [ ] Alert on failed token requests
- [ ] Track user participation patterns

## 📊 Performance Considerations

- [ ] Test endpoint response time (target: < 500ms)
- [ ] Load test with multiple simultaneous requests
- [ ] Monitor database query performance
- [ ] Consider caching branch/user lookups if needed
- [ ] Set up rate limiting to prevent abuse
- [ ] Monitor Agora API response times

## 📋 Documentation Checklist

### For Your Team
- [ ] Share AGORA_QUICK_REFERENCE.md with developers
- [ ] Share platform-specific examples from AGORA_USAGE_EXAMPLES.md
- [ ] Document your App ID and Certificate location
- [ ] Document token generation success metrics
- [ ] Document troubleshooting procedures
- [ ] Create runbook for production issues

### For End Users
- [ ] Document how to initiate video calls
- [ ] Document what to do if call fails
- [ ] Document supported platforms
- [ ] Document system requirements (bandwidth, etc.)
- [ ] Create FAQ for common issues

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Environment variables configured in deployment platform
- [ ] HTTPS certificate valid
- [ ] CORS origins configured for mobile app domains
- [ ] Rate limiting configured
- [ ] Monitoring/logging setup
- [ ] Backup and recovery plan

### Deployment Steps
- [ ] Deploy backend code to production
- [ ] Set production environment variables
- [ ] Verify endpoint responds with 200 OK
- [ ] Test with real production Agora credentials
- [ ] Monitor for errors in first 24 hours
- [ ] Validate token generation success rate

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify token generation metrics
- [ ] Monitor Agora dashboard for call quality
- [ ] Get feedback from initial testers
- [ ] Prepare incident response procedures

## 📈 Success Metrics

- [ ] Token generation success rate > 99%
- [ ] Endpoint response time < 500ms (p99)
- [ ] Zero security incidents
- [ ] User satisfaction with call quality
- [ ] Call success rate (users can join)
- [ ] Call duration (no unexpected drops)
- [ ] Mobile app crash rate due to calls: 0%

## 🎯 Go-Live Readiness

- [ ] Backend endpoint tested and working ✓
- [ ] Mobile app integrated with token endpoint ✓
- [ ] Error handling implemented ✓
- [ ] Security review completed ✓
- [ ] Performance testing completed ✓
- [ ] User documentation ready ✓
- [ ] Support team trained ✓
- [ ] Monitoring and alerting active ✓
- [ ] Rollback plan documented ✓
- [ ] Feature flags for gradual rollout ready ✓

## 📞 Support Contacts

- **Agora Support:** https://agora-ticket.agora.io/
- **Backend Developer:** [Your team]
- **Mobile Developer:** [Your team]
- **Security Team:** [Your team]
- **DevOps/Infrastructure:** [Your team]

## 📝 Notes & Decisions

Use this section to document your team's decisions:

```
Decision: Token expiration
- Chose: 24 hours
- Reason: Balances security and UX

Decision: Token refresh strategy
- Chose: Generate new token on demand
- Reason: Simpler, more secure

Decision: Role assignment
- Chose: Doctor = PUBLISHER, Patient = SUBSCRIBER
- Reason: Prevents accidental patient broadcast

Add your decisions here...
```

## ✨ Final Verification

Before marking as complete, verify:

1. [ ] I can request a token successfully
2. [ ] I can parse the token response
3. [ ] I can use the token in Agora SDK
4. [ ] I can join a video call
5. [ ] Error handling works for all scenarios
6. [ ] Security checks are in place
7. [ ] Documentation is clear to my team
8. [ ] Monitoring/logging is active
9. [ ] I can handle token expiration
10. [ ] I'm ready for production

## 🎉 Ready to Go!

Once all items are checked, you're ready to launch video calling in production!

For detailed information, always refer back to:
- Quick questions → [AGORA_QUICK_REFERENCE.md](AGORA_QUICK_REFERENCE.md)
- Code examples → [AGORA_USAGE_EXAMPLES.md](AGORA_USAGE_EXAMPLES.md)
- Full documentation → [AGORA_INTEGRATION.md](AGORA_INTEGRATION.md)

**Start with:** [AGORA_QUICK_REFERENCE.md](AGORA_QUICK_REFERENCE.md) - Read it in 5 minutes!
