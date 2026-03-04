# Icon & Splash Screen Setup

Panduan lengkap untuk setup app icon dan splash screen untuk iOS dan Android.

## 📁 Asset Structure

```
apps/web/
├── assets/
│   ├── icon.png          # 512x512 (source icon)
│   └── splash.png        # 2048x2048 (source splash)
├── assets.json           # Configuration
└── public/
    ├── icons/
    │   ├── icon-192.png  # PWA icon
    │   └── icon-512.png  # PWA icon (source)
    └── splash-2048.png   # PWA splash (source)
```

## ✅ Assets Ready

Assets sudah di-copy dari PWA icons:
- ✅ `assets/icon.png` (512x512)
- ✅ `assets/splash.png` (2048x2048)
- ✅ `assets.json` (configuration)

## 🎨 Generate Native Assets

### Option 1: Automatic (Recommended)

```bash
cd apps/web

# Run setup script
npm run cap:setup-assets
```

Script akan:
1. ✅ Verify assets exist
2. ✅ Generate icons untuk Android (mipmap)
3. ✅ Generate icons untuk iOS (Assets.xcassets)
4. ✅ Generate splash screens untuk Android (drawable)
5. ✅ Generate splash screens untuk iOS (Assets.xcassets)

### Option 2: Manual

```bash
cd apps/web

# Generate dengan custom config
npx capacitor-assets generate \
  --iconBackgroundColor "#F7F8FA" \
  --iconBackgroundColorDark "#000000" \
  --splashBackgroundColor "#F7F8FA" \
  --splashBackgroundColorDark "#000000"
```

## 📱 What Gets Generated

### Android

**App Icons (mipmap):**
```
android/app/src/main/res/
├── mipmap-hdpi/
│   └── ic_launcher.png (72x72)
├── mipmap-mdpi/
│   └── ic_launcher.png (48x48)
├── mipmap-xhdpi/
│   └── ic_launcher.png (96x96)
├── mipmap-xxhdpi/
│   └── ic_launcher.png (144x144)
└── mipmap-xxxhdpi/
    └── ic_launcher.png (192x192)
```

**Adaptive Icons:**
```
android/app/src/main/res/
├── mipmap-hdpi/
│   ├── ic_launcher_foreground.png
│   └── ic_launcher_background.png
├── mipmap-mdpi/
│   ├── ic_launcher_foreground.png
│   └── ic_launcher_background.png
└── ... (all densities)
```

**Splash Screens (drawable):**
```
android/app/src/main/res/
├── drawable/
│   └── splash.png
├── drawable-land-hdpi/
│   └── splash.png
├── drawable-land-mdpi/
│   └── splash.png
└── ... (all orientations & densities)
```

### iOS

**App Icons:**
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
├── AppIcon-20x20@1x.png
├── AppIcon-20x20@2x.png
├── AppIcon-20x20@3x.png
├── AppIcon-29x29@1x.png
├── AppIcon-29x29@2x.png
├── AppIcon-29x29@3x.png
├── AppIcon-40x40@1x.png
├── AppIcon-40x40@2x.png
├── AppIcon-40x40@3x.png
├── AppIcon-60x60@2x.png
├── AppIcon-60x60@3x.png
├── AppIcon-76x76@1x.png
├── AppIcon-76x76@2x.png
├── AppIcon-83.5x83.5@2x.png
└── AppIcon-1024x1024@1x.png
```

**Splash Screens:**
```
ios/App/App/Assets.xcassets/Splash.imageset/
├── splash-2732x2732.png
├── splash-2732x2732-1.png
└── splash-2732x2732-2.png
```

## 🎯 Configuration

### assets.json

```json
{
  "icon": {
    "source": "assets/icon.png",
    "background": "#F7F8FA",      // Light theme
    "backgroundDark": "#000000"    // Dark theme
  },
  "splash": {
    "source": "assets/splash.png",
    "background": "#F7F8FA",      // Light theme
    "backgroundDark": "#000000"    // Dark theme
  }
}
```

### Background Colors

Match dengan app theme:
- **Light theme**: `#F7F8FA` (abu-abu terang)
- **Dark theme**: `#000000` (hitam)

## 🔄 Workflow

### Initial Setup

```bash
# 1. Generate assets
npm run cap:setup-assets

# 2. Build & sync
npm run build:mobile

# 3. Run on device
npm run cap:run:android  # Android
npm run cap:run:ios      # iOS
```

### Update Icons

Jika icon berubah:

```bash
# 1. Replace source
cp new-icon.png apps/web/assets/icon.png

# 2. Regenerate
npm run cap:setup-assets

# 3. Rebuild
npm run build:mobile

# 4. Test
npm run cap:run:android
```

## ✅ Verification

### Android

1. **Build & install**
   ```bash
   npm run build:mobile
   npm run cap:run:android
   ```

2. **Check home screen**
   - App icon should appear
   - Icon should be sharp (not blurry)
   - Adaptive icon works (long press)

3. **Check splash screen**
   - Launch app
   - Splash should show briefly
   - Background color matches theme

### iOS

1. **Build & install**
   ```bash
   npm run build:mobile
   npm run cap:open:ios
   # Xcode → Run on device
   ```

2. **Check home screen**
   - App icon should appear
   - Icon should be sharp
   - Rounded corners automatic

3. **Check splash screen**
   - Launch app
   - Splash should show briefly
   - Background color matches theme

## 🎨 Design Guidelines

### App Icon

**Requirements:**
- Size: 512x512 minimum (1024x1024 recommended)
- Format: PNG with transparency
- Content: Centered, avoid text
- Safe area: Keep important content in center 80%

**Android Adaptive Icon:**
- Foreground: Icon content
- Background: Solid color or simple pattern
- System will mask to various shapes

**iOS:**
- System adds rounded corners
- No need to round corners yourself
- Avoid content near edges

### Splash Screen

**Requirements:**
- Size: 2048x2048 minimum (2732x2732 recommended)
- Format: PNG with transparency
- Content: Logo/brand centered
- Background: Will be filled with config color

**Best Practices:**
- Keep logo small (max 40% of screen)
- Center content
- Simple design (loads fast)
- Match app theme

## 🔧 Troubleshooting

### Icons not showing

**Android:**
```bash
# Clear app data
adb shell pm clear com.kemana.app

# Reinstall
npm run cap:run:android
```

**iOS:**
```bash
# Clean build
cd ios
rm -rf build DerivedData
cd ..

# Rebuild
npm run build:mobile
npm run cap:open:ios
```

### Blurry icons

**Check source resolution:**
```bash
# Should be at least 512x512
file apps/web/assets/icon.png
```

**Regenerate:**
```bash
npm run cap:setup-assets
npm run build:mobile
```

### Splash screen not showing

**Check capacitor.config.ts:**
```typescript
SplashScreen: {
  launchAutoHide: false,  // Manual hide
  backgroundColor: '#F7F8FA'
}
```

**Check useCapacitor hook:**
```typescript
// Should hide after delay
setTimeout(async () => {
  await SplashScreen.hide();
}, 500);
```

### Wrong background color

**Update assets.json:**
```json
{
  "splash": {
    "background": "#F7F8FA"  // Match theme
  }
}
```

**Regenerate:**
```bash
npm run cap:setup-assets
npm run build:mobile
```

## 📊 Asset Sizes

### Generated Sizes

| Platform | Type | Sizes |
|----------|------|-------|
| Android | Icon | 48, 72, 96, 144, 192 |
| Android | Splash | Multiple densities & orientations |
| iOS | Icon | 20-1024 (15 sizes) |
| iOS | Splash | 2732x2732 (3 scales) |

### Total Files

- Android: ~30 files (icons + splash)
- iOS: ~20 files (icons + splash)
- Total: ~50 files generated

## 💡 Tips

### 1. High Resolution Source

Use highest resolution possible:
- Icon: 1024x1024 or higher
- Splash: 2732x2732 or higher

### 2. Test on Real Devices

Emulators may not show accurate:
- Icon sharpness
- Splash screen timing
- Adaptive icon behavior

### 3. Dark Mode Support

Configure both light and dark:
```json
{
  "background": "#F7F8FA",
  "backgroundDark": "#000000"
}
```

### 4. Keep Source Files

Keep original high-res files:
```
design/
├── icon-original.png (4096x4096)
└── splash-original.png (4096x4096)
```

### 5. Version Control

**Commit:**
- ✅ `assets/icon.png`
- ✅ `assets/splash.png`
- ✅ `assets.json`

**Gitignore:**
- ❌ Generated files in `android/` and `ios/`
- (Already in .gitignore)

## 🚀 Quick Commands

```bash
# Setup assets
npm run cap:setup-assets

# Full rebuild
npm run build:mobile

# Test Android
npm run cap:run:android

# Test iOS
npm run cap:open:ios

# Clean & regenerate
rm -rf apps/web/assets
npm run cap:setup-assets
npm run build:mobile
```

## ✅ Checklist

- [x] Source icon (512x512+) in `assets/icon.png`
- [x] Source splash (2048x2048+) in `assets/splash.png`
- [x] Configuration in `assets.json`
- [ ] Run `npm run cap:setup-assets`
- [ ] Verify generated files
- [ ] Test on Android device
- [ ] Test on iOS device
- [ ] Check icon on home screen
- [ ] Check splash on launch
- [ ] Verify theme colors match

## 🎉 Done!

Setelah setup:
- ✅ App icon di home screen
- ✅ Splash screen saat launch
- ✅ Match dengan theme colors
- ✅ Sharp dan professional
- ✅ Support light & dark mode

**Ready untuk production!** 🚀
