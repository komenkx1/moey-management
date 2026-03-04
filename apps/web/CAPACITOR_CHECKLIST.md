# Capacitor Implementation Checklist

Checklist lengkap untuk implementasi dan deployment Capacitor.

## ✅ Phase 1: Setup & Configuration (COMPLETED)

- [x] Update `next.config.js` untuk static export
- [x] Install Capacitor dependencies
- [x] Create `capacitor.config.ts`
- [x] Add Capacitor scripts to `package.json`
- [x] Create platform detection utilities (`lib/capacitor.ts`)
- [x] Create haptic feedback utilities (`lib/haptics.ts`)
- [x] Create Capacitor initialization hook (`hooks/useCapacitor.ts`)
- [x] Update `safe-area-sync.tsx` untuk native support
- [x] Integrate Capacitor init ke root layout
- [x] Update `.gitignore` untuk native folders
- [x] Create setup scripts
- [x] Create documentation

## ⏳ Phase 2: Platform Setup (TODO)

### Prerequisites Check

- [ ] **Android Development**
  - [ ] Install JDK 17
  - [ ] Install Android Studio
  - [ ] Setup Android SDK (API 33+)
  - [ ] Create Android Virtual Device (AVD)
  - [ ] Set `ANDROID_HOME` environment variable

- [ ] **iOS Development** (macOS only)
  - [ ] Install Xcode 14+
  - [ ] Install Command Line Tools
  - [ ] Install CocoaPods
  - [ ] Setup Apple Developer account (untuk device testing)

### Platform Addition

- [ ] Run `npm run cap:setup` atau manual:
  - [ ] `npm install` (install dependencies)
  - [ ] `npm run build` (build static export)
  - [ ] `npx cap add android` (add Android)
  - [ ] `npx cap add ios` (add iOS, macOS only)
  - [ ] `npx cap sync` (sync assets)

### Initial Testing

- [ ] Test build output (`out/` folder exists)
- [ ] Verify `android/` folder created
- [ ] Verify `ios/` folder created (if macOS)
- [ ] Check no build errors

## ⏳ Phase 3: Native Testing (TODO)

### Android Testing

- [ ] Open Android Studio: `npm run cap:open:android`
- [ ] Verify project loads without errors
- [ ] Run on emulator: `npm run cap:run:android`
- [ ] Test core functionality:
  - [ ] App launches successfully
  - [ ] Splash screen shows and hides
  - [ ] Status bar configured correctly
  - [ ] Safe area handling works
  - [ ] Quick Add transaction
  - [ ] View transactions list
  - [ ] Swipe to delete
  - [ ] Tab navigation
  - [ ] Offline functionality (IndexedDB)
  - [ ] Data persistence after app restart

### iOS Testing (macOS only)

- [ ] Open Xcode: `npm run cap:open:ios`
- [ ] Verify project loads without errors
- [ ] Run on simulator: `npm run cap:run:ios`
- [ ] Test core functionality:
  - [ ] App launches successfully
  - [ ] Splash screen shows and hides
  - [ ] Status bar configured correctly
  - [ ] Safe area handling works (notch devices)
  - [ ] Quick Add transaction
  - [ ] View transactions list
  - [ ] Swipe to delete
  - [ ] Tab navigation
  - [ ] Offline functionality (IndexedDB)
  - [ ] Data persistence after app restart

### Real Device Testing

- [ ] Test on real Android device
- [ ] Test on real iOS device (requires provisioning)
- [ ] Test haptic feedback (emulator tidak support)
- [ ] Test different screen sizes
- [ ] Test different Android versions
- [ ] Test different iOS versions

## ⏳ Phase 4: Haptic Integration (TODO)

### Identify Integration Points

- [ ] Quick Add transaction (success)
- [ ] Delete transaction (warning)
- [ ] Tab navigation (light)
- [ ] Button clicks (medium)
- [ ] Night close (success)
- [ ] Bulk input (light per entry, success for save all)

### Implementation

- [ ] Import haptic utilities in components
- [ ] Add haptic calls to event handlers
- [ ] Test haptic timing and feel
- [ ] Verify no overuse
- [ ] Test performance impact

### Testing

- [ ] Test each haptic integration point
- [ ] Verify haptic feels natural
- [ ] Check no haptic on web (graceful fallback)
- [ ] Test on different devices

## ⏳ Phase 5: Assets & Branding (TODO)

### App Icons

- [ ] Create source icon (1024x1024 PNG)
- [ ] Install `@capacitor/assets`
- [ ] Generate icons: `npx capacitor-assets generate`
- [ ] Verify Android adaptive icons
- [ ] Verify iOS app icons
- [ ] Test icons on devices

### Splash Screens

- [ ] Create splash screen design
- [ ] Generate splash screens for Android
- [ ] Generate splash screens for iOS
- [ ] Configure splash screen timing
- [ ] Test splash screen on devices

### Branding

- [ ] Update app name (if needed)
- [ ] Update bundle ID (if needed)
- [ ] Set app colors
- [ ] Configure theme

## ⏳ Phase 6: Build & Signing (TODO)

### Android

- [ ] Generate keystore:
  ```bash
  keytool -genkey -v -keystore kemana-release.keystore \
    -alias kemana -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Configure signing in `android/app/build.gradle`
- [ ] Create `android/keystore.properties`
- [ ] Build release APK: `cd android && ./gradlew assembleRelease`
- [ ] Build release AAB: `cd android && ./gradlew bundleRelease`
- [ ] Test release build on device

### iOS (macOS only)

- [ ] Setup Apple Developer account
- [ ] Create App ID in Apple Developer Portal
- [ ] Create provisioning profiles
- [ ] Configure signing in Xcode
- [ ] Archive app in Xcode
- [ ] Test archive on device

## ⏳ Phase 7: Deployment (TODO)

### Google Play Store

- [ ] Create Google Play Console account
- [ ] Create app listing
- [ ] Upload screenshots
- [ ] Write app description
- [ ] Set content rating
- [ ] Upload AAB
- [ ] Submit for review

### Apple App Store

- [ ] Create App Store Connect account
- [ ] Create app listing
- [ ] Upload screenshots
- [ ] Write app description
- [ ] Set content rating
- [ ] Upload build via Xcode
- [ ] Submit for review

### Web (Existing)

- [ ] Verify PWA still works
- [ ] Deploy to Vercel
- [ ] Test web version

## ⏳ Phase 8: CI/CD (TODO)

### GitHub Actions

- [ ] Create workflow for Android build
- [ ] Create workflow for iOS build
- [ ] Setup secrets (keystore, certificates)
- [ ] Test automated builds
- [ ] Setup automated deployment

### Version Management

- [ ] Document version bump process
- [ ] Use `npm run cap:sync-version` for version sync
- [ ] Create release workflow
- [ ] Tag releases in git

## ⏳ Phase 9: Monitoring & Analytics (TODO)

### Error Tracking

- [ ] Setup Sentry (or similar)
- [ ] Test error reporting
- [ ] Configure source maps

### Analytics

- [ ] Setup analytics (if needed)
- [ ] Track key events
- [ ] Monitor user behavior

### Performance

- [ ] Monitor app startup time
- [ ] Monitor memory usage
- [ ] Monitor battery usage
- [ ] Optimize if needed

## ⏳ Phase 10: Documentation & Maintenance (TODO)

### User Documentation

- [ ] Create user guide
- [ ] Document new features
- [ ] Create FAQ

### Developer Documentation

- [ ] Document build process
- [ ] Document deployment process
- [ ] Document troubleshooting
- [ ] Update README

### Maintenance

- [ ] Setup update schedule
- [ ] Monitor user feedback
- [ ] Plan feature updates
- [ ] Keep dependencies updated

## 📊 Progress Summary

- **Phase 1**: ✅ 100% Complete (13/13)
- **Phase 2**: ⏳ 0% Complete (0/12)
- **Phase 3**: ⏳ 0% Complete (0/24)
- **Phase 4**: ⏳ 0% Complete (0/12)
- **Phase 5**: ⏳ 0% Complete (0/11)
- **Phase 6**: ⏳ 0% Complete (0/11)
- **Phase 7**: ⏳ 0% Complete (0/13)
- **Phase 8**: ⏳ 0% Complete (0/7)
- **Phase 9**: ⏳ 0% Complete (0/8)
- **Phase 10**: ⏳ 0% Complete (0/8)

**Overall Progress**: 13/119 tasks (11%)

## 🎯 Next Immediate Steps

1. Install prerequisites (JDK, Android Studio, Xcode)
2. Run `npm run cap:setup`
3. Test on emulator/simulator
4. Verify core functionality works

## 📝 Notes

- Phase 1 sudah complete, siap untuk platform setup
- Semua code changes backward compatible dengan PWA
- Documentation lengkap tersedia
- Scripts helper sudah dibuat untuk memudahkan workflow

## 🚀 Quick Commands Reference

```bash
# Setup (first time)
npm run cap:setup

# Development
npm run dev                    # Web development
npm run build:mobile          # Build + sync native

# Testing
npm run cap:run:android       # Run Android
npm run cap:run:ios           # Run iOS

# Version management
npm run cap:sync-version      # Sync version to native

# Open IDEs
npm run cap:open:android      # Open Android Studio
npm run cap:open:ios          # Open Xcode
```
