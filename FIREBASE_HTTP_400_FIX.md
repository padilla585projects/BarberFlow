# Firebase HTTP 400 Error Fix - Investigation and Solution

## Problem Description

After login in the mobile app, users encounter an HTTP 400 error from Firebase Identity Toolkit API:
```
https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCkJOmEDgREdMNcXZqwRTBmPPPDCsVwkpM
```

This error appears in console for:
- Client login (email/password)
- Barber login (email/password)
- Owner login (email/password)
- Password reset flow

## Root Cause Analysis

The HTTP 400 error from Firebase Identity Toolkit typically indicates **one of these issues**:

### Primary Causes (Most Likely)

1. **API Key Restrictions in Google Cloud Console**
   - The API key has HTTP referrer restrictions that block mobile app requests
   - Mobile apps cannot send HTTP referrers like web apps, causing the request to be rejected
   - Solution: Remove HTTP referrer restrictions from the API key

2. **Missing API Enable**
   - Identity Toolkit API is not enabled in Google Cloud Console for the project
   - Solution: Go to Google Cloud Console → APIs & Services → Enable "Identity Toolkit API"

3. **IP Restrictions**
   - API key has IP restrictions that don't include the network where the app makes requests
   - Mobile devices can have dynamic IPs or corporate proxy IPs
   - Solution: Remove IP restrictions or allow all IPs (Google Cloud will still enforce other controls)

### Secondary Causes

4. **Firebase Project Misconfiguration**
   - Auth domain doesn't match project configuration
   - App ID format is incorrect for mobile (currently using web app ID)

5. **Invalid or Expired API Key**
   - The API key was regenerated and the .env file wasn't updated
   - The API key was accidentally restricted

## Files Modified

### 1. `mobile/src/services/firebase.ts`
**Changes:**
- Added validation for required Firebase environment variables
- Added comments explaining API key format requirements
- Added logging for debugging configuration issues
- Added validation that API key is properly formatted

**Why:** Ensures Firebase configuration is correct and provides early warnings if something is misconfigured.

### 2. `mobile/src/screens/auth/LoginScreen.tsx`
**Changes:**
- Added import of debug utilities
- Added useEffect to log Firebase debug info on component mount
- Enhanced error handling for email sign-in:
  - Checks for HTTP 400 and identitytoolkit errors specifically
  - Logs diagnostic information when Firebase HTTP 400 errors occur
  - Uses the diagnoseHTTP400Error utility to log troubleshooting steps
- Enhanced error handling for password reset with same improvements
- Better error messages for users (in Spanish)

**Why:** Provides detailed logging when Firebase errors occur, making it easier to diagnose the issue in production logs or console.

### 3. `mobile/src/utils/firebaseDebug.ts` (NEW FILE)
**Purpose:** Comprehensive Firebase debugging utilities

**Key Functions:**
- `getFirebaseDebugInfo()` - Collects Firebase configuration status
- `logFirebaseDebugInfo()` - Logs configuration info to console
- `diagnoseHTTP400Error(error)` - Provides specific troubleshooting steps for HTTP 400 errors
- `getFirebaseErrorMessage(error)` - Converts Firebase error codes to user-friendly Spanish messages

**Why:** Centralizes all Firebase debugging logic and provides consistent error messaging across the app.

## How to Fix the HTTP 400 Error

### Step 1: Go to Google Cloud Console
1. Visit https://console.cloud.google.com
2. Select project "barberflow-2026"
3. Go to APIs & Services → Credentials

### Step 2: Check API Key Restrictions
1. Click on the API key `AIzaSyCkJOmEDgREdMNcXZqwRTBmPPPDCsVwkpM`
2. Under "Application restrictions" → Select "None" (remove HTTP referrer restrictions)
3. Under "API restrictions" → Select "Restrict key" and add:
   - Identity Toolkit API
   - Cloud Firestore API
   - Cloud Storage API
4. Click Save

### Step 3: Enable Identity Toolkit API
1. Go to APIs & Services → Library
2. Search for "Identity Toolkit API"
3. Click on it and click "Enable"

### Step 4: Verify Firebase Configuration
Run the login screen and check the browser/console for:
```
[Firebase Debug Info] {
  apiKeyConfigured: true,
  authDomainConfigured: true,
  projectIdConfigured: true,
  appIdConfigured: true,
  apiKeyFormat: 'Web API Key'
}
```

### Step 5: Test Email/Password Sign-In
Try logging in with:
- Email: `cliente@barberflow.dev`
- Password: `TestPass123`

If you see HTTP 400 error in console, it will now log diagnostic info.

## Testing the Fix

### Console Output
When the app starts, you should see:
```
[Firebase Debug Info] {
  apiKeyConfigured: true,
  authDomainConfigured: true,
  projectIdConfigured: true,
  appIdConfigured: true,
  apiKeyFormat: 'Web API Key'
}
```

### On Error
If an HTTP 400 occurs, you'll see:
```
[LoginScreen] Email sign-in error: {
  code: 'auth/...',
  message: '...',
  fullError: {...}
}

[LoginScreen] Firebase HTTP 400 Error detected

Suggestions:
1. Verify "Identity Toolkit API" is ENABLED in Google Cloud Console...
2. Check API Key restrictions...
```

## Long-Term Improvements

Consider these improvements for better mobile Firebase support:

1. **Use @react-native-firebase/auth**
   - Native Android/iOS implementation
   - Better performance and offline support
   - Doesn't rely on browser APIs

2. **Add API Key per Platform**
   - Create a separate API key for mobile app in Google Cloud
   - Remove web-specific restrictions

3. **Add Network Error Recovery**
   - Implement exponential backoff for retries
   - Better handling of network timeouts

4. **Monitor Firebase Auth Errors**
   - Send error reports to Sentry/error tracking
   - Track frequency of Firebase errors in production

## References

- Firebase Web SDK: https://firebase.google.com/docs/auth/web
- Google Cloud API Keys: https://cloud.google.com/docs/authentication/api-keys
- Identity Toolkit API: https://developers.google.com/identity/toolkit/reference/rest/v1/accounts/signInWithPassword
- React Native Firebase: https://rnfirebase.io/auth/usage
