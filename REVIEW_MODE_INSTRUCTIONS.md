# App Store Review Mode Instructions

## For Apple App Store Review

### Setup
1. Add this line to your `.env` file:
   ```
   EXPO_PUBLIC_REVIEW_MODE=true
   ```

2. Build and submit the app with this environment variable set.

### How Review Mode Works

**Apple Reviewers will see:**
1. ✅ **The paywall** - They can review subscription terms, pricing, and UI
2. ✅ **The full app functionality** - After dismissing/skipping the paywall, they get full access
3. ✅ **The subscription flow** - They can test the purchase process

**Review Mode Behavior:**
- Shows the paywall normally (required for subscription review)
- After paywall is dismissed/skipped/errors, automatically grants access to full app
- Allows reviewers to test all features without needing to actually subscribe

### After Approval
1. Set `EXPO_PUBLIC_REVIEW_MODE=false` in your `.env` file
2. Build and submit the production version
3. Users will now need to subscribe to access the full app

### Testing Locally
- In development (`__DEV__` is true), review mode is automatically enabled
- You can test the full flow without hitting paywall restrictions

This approach ensures Apple can review your subscription functionality while still being able to test the complete app experience. 