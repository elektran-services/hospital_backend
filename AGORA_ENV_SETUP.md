# Environment Variables for Agora Integration

Add these variables to your `.env.local` file to enable video call functionality.

## Required Variables

```env
# Agora.io Real-Time Communication Credentials
# Get these from: https://console.agora.io
# 
# AGORA_APP_ID: Your Agora application ID (provided by Agora dashboard)
# AGORA_APP_CERTIFICATE: Your Agora App Certificate (keep this secret!)
#
# ⚠️ WARNING: NEVER commit AGORA_APP_CERTIFICATE to version control
# ⚠️ WARNING: NEVER expose AGORA_APP_CERTIFICATE to frontend/mobile clients

AGORA_APP_ID=0b0a3b554bbb4204864c5336a55194f5
AGORA_APP_CERTIFICATE=904e13ad2d824463afc96fee16a3ab96
```

## Where to Get These Credentials

1. Go to https://console.agora.io
2. Sign in or create an account
3. Create a new project
4. In the project settings, find:
   - **App ID** → `AGORA_APP_ID`
   - **App Certificate** → `AGORA_APP_CERTIFICATE`

## Development vs Production

### Development (.env.local)
```env
AGORA_APP_ID=your_dev_app_id
AGORA_APP_CERTIFICATE=your_dev_certificate
```

### Production (.env.production)
```env
AGORA_APP_ID=your_prod_app_id
AGORA_APP_CERTIFICATE=your_prod_certificate
```

Or use environment variables in your deployment platform (Vercel, Docker, etc.):
```bash
export AGORA_APP_ID="your_prod_app_id"
export AGORA_APP_CERTIFICATE="your_prod_certificate"
```

## Security Best Practices

✅ **DO:**
- Store AGORA_APP_CERTIFICATE securely in environment variables
- Use different App IDs for development and production
- Rotate credentials regularly
- Only expose APP_ID to clients, never the certificate

❌ **DON'T:**
- Commit .env.local to version control
- Use the same credentials for dev and production
- Expose AGORA_APP_CERTIFICATE in client code
- Share credentials in messages or emails
- Hardcode credentials in source code

## Verification

To verify your setup is correct, check:

1. **Environment Variables Set:**
```bash
echo $AGORA_APP_ID        # Should print your App ID
echo $AGORA_APP_CERTIFICATE  # Should print your certificate
```

2. **Application Starts:**
```bash
npm run dev
```
You should see no errors about missing AGORA environment variables.

3. **Endpoint Works:**
```bash
curl -X POST http://localhost:3000/api/v1/video-calls/token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "valid-uuid",
    "doctorId": "valid-uuid",
    "patientId": "valid-uuid"
  }'
```

If setup is correct, you'll get a token response (or auth error if token invalid).

## Troubleshooting

### "Missing required environment variable: AGORA_APP_ID"
**Solution:** Add `AGORA_APP_ID` to `.env.local` file

### "Missing required environment variable: AGORA_APP_CERTIFICATE"
**Solution:** Add `AGORA_APP_CERTIFICATE` to `.env.local` file

### Endpoint returns 500 error about Agora
**Solution:** 
- Verify both variables are in `.env.local`
- Check `.env.local` isn't in `.gitignore` (it should be!)
- Restart dev server after changing .env

### Can't find .env.local
**Solution:** Create it in the root directory:
```bash
touch .env.local
# Then edit and add your Agora credentials
```

## Git Safety

Make sure `.env.local` is in `.gitignore`:

```
# .gitignore
.env.local
.env.production.local
.env.*.local
```

## Related Documentation

- [AGORA_INTEGRATION.md](AGORA_INTEGRATION.md) - Full integration guide
- [AGORA_QUICK_REFERENCE.md](AGORA_QUICK_REFERENCE.md) - Quick API reference
- [AGORA_IMPLEMENTATION_SUMMARY.md](AGORA_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [Agora Documentation](https://docs.agora.io/) - Official Agora docs
