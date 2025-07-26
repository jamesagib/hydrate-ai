# Apple Sign In Setup & Troubleshooting

## ✅ What I Fixed in the Code

1. **Added proper nonce generation** - Apple requires a secure nonce for authentication
2. **Added availability check** - Button only shows when Apple Auth is available
3. **Enhanced error handling** - More specific error messages
4. **Added console logging** - Better debugging information

## 🔧 Apple Developer Portal Setup

### 1. Enable Sign in with Apple
- Go to [Apple Developer Portal](https://developer.apple.com/account)
- Navigate to **Certificates, Identifiers & Profiles**
- Select your **App ID** (com.hydrate.ai)
- Enable **"Sign In with Apple"** capability
- Save changes

### 2. Create App in App Store Connect
- Go to [App Store Connect](https://appstoreconnect.apple.com)
- Create a new app with bundle ID: `com.hydrate.ai`
- This is required for Apple Auth to work

### 3. Configure Supabase
- Go to your Supabase project dashboard
- Navigate to **Authentication → Providers**
- Enable **Apple** provider
- Add your Apple Service ID (if you have one)

## 🧪 Testing Checklist

### Device Requirements
- ✅ iOS 13+ device or simulator
- ✅ User has Apple ID signed in
- ✅ Device has internet connection

### App Configuration
- ✅ `usesAppleSignIn: true` in app.json
- ✅ `expo-apple-authentication` plugin installed
- ✅ Bundle ID matches Apple Developer Portal

### Common Issues & Solutions

#### "Unknown Reason" Error
- **Cause**: Missing nonce, wrong configuration, or device issue
- **Solution**: ✅ Fixed with proper nonce generation

#### "Not Available on This Device"
- **Cause**: iOS version too old or simulator without Apple ID
- **Solution**: Test on real device with iOS 13+

#### "Invalid Response"
- **Cause**: Network issues or Apple service problems
- **Solution**: Check internet connection, try again

## 🚀 Testing Steps

1. **Build and install** the app on a real device
2. **Ensure Apple ID** is signed in on the device
3. **Tap Apple Sign In** button
4. **Check console logs** for detailed error information
5. **Verify Supabase** receives the authentication

## 📱 Debug Information

The updated code now provides:
- Console logs for each step
- Specific error messages
- Availability checking
- Proper nonce handling

## 🔍 If Still Not Working

1. **Check console logs** for specific error messages
2. **Verify Apple Developer Portal** configuration
3. **Test on real device** (not simulator)
4. **Ensure Apple ID** is signed in on device
5. **Check Supabase** Apple provider configuration 