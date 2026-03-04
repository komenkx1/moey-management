# iOS Real Device Testing - Setup Guide

Panduan lengkap untuk test KeMana di iPhone/iPad real device via kabel USB.

## 📋 Prerequisites

### 1. Hardware
- ✅ Mac (kamu sudah punya)
- ✅ iPhone/iPad dengan kabel USB
- ✅ iOS 13.0 atau lebih tinggi

### 2. Software
- ✅ Xcode (dari App Store)
- ✅ Apple ID (gratis, tidak perlu Developer Program)

## 🚀 Quick Setup (5 Menit)

### Step 1: Install Xcode Command Line Tools

```bash
# Check if already installed
xcode-select -p

# If not installed:
xcode-select --install
```

### Step 2: Build Project

```bash
cd apps/web

# Install dependencies (if not done)
npm install

# Build web assets
npm run build

# Add iOS platform (if not done)
npx cap add ios

# Sync assets
npx cap sync
```

### Step 3: Open Xcode

```bash
npm run cap:open:ios
```

Xcode akan terbuka dengan project KeMana.

### Step 4: Connect iPhone

1. **Sambungkan iPhone ke Mac via USB**
2. **Unlock iPhone**
3. **Trust komputer** (popup di iPhone: "Trust This Computer?")

### Step 5: Setup Signing (PENTING!)

Di Xcode:

1. **Select project** "App" di sidebar kiri
2. **Select target** "App" 
3. **Tab "Signing & Capabilities"**
4. **Centang** "Automatically manage signing"
5. **Select Team**: Pilih Apple ID kamu
   - Jika belum ada, klik "Add Account..."
   - Login dengan Apple ID
   - Tidak perlu bayar, gratis untuk development!

6. **Bundle Identifier**: Ubah jika perlu
   - Default: `com.kemana.app`
   - Bisa ubah ke: `com.[nama-kamu].kemana`
   - Contoh: `com.wahyu.kemana`

### Step 6: Select Device

Di Xcode toolbar (atas):
1. Klik dropdown device (sebelah tombol Play)
2. Pilih iPhone kamu (bukan simulator)
3. Contoh: "Wahyu's iPhone"

### Step 7: Build & Run

1. **Klik tombol Play** (▶️) atau `Cmd + R`
2. **Wait** untuk build (pertama kali agak lama, ~2-5 menit)
3. **Di iPhone**: Popup "Untrusted Developer"

### Step 8: Trust Developer (Di iPhone)

1. **Settings** → **General** → **VPN & Device Management**
2. **Tap** pada Apple ID kamu
3. **Tap** "Trust [Apple ID]"
4. **Confirm** "Trust"

### Step 9: Run Again

1. **Kembali ke Xcode**
2. **Klik Play** lagi (▶️)
3. **App akan launch** di iPhone! 🎉

## 🎯 Quick Commands

```bash
# Full workflow
cd apps/web
npm run build:mobile
npm run cap:open:ios

# Then di Xcode:
# 1. Select your iPhone
# 2. Click Play (▶️)
```

## 🔧 Troubleshooting

### Error: "No provisioning profile"

**Solusi:**
1. Xcode → Signing & Capabilities
2. Centang "Automatically manage signing"
3. Select Team (Apple ID)
4. Xcode akan auto-create profile

### Error: "Failed to register bundle identifier"

**Solusi:**
1. Ubah Bundle Identifier
2. Dari: `com.kemana.app`
3. Ke: `com.[nama-unik].kemana`
4. Contoh: `com.wahyu.kemana123`

### Error: "Untrusted Developer"

**Solusi:**
1. iPhone → Settings → General → VPN & Device Management
2. Trust developer
3. Run lagi dari Xcode

### iPhone tidak muncul di Xcode

**Solusi:**
1. Unlock iPhone
2. Trust komputer (popup di iPhone)
3. Restart Xcode
4. Unplug & replug kabel

### Build error: "Code signing"

**Solusi:**
1. Pastikan sudah login Apple ID di Xcode
2. Xcode → Preferences → Accounts
3. Add Account jika belum ada
4. Download manual profiles jika perlu

## 📱 Testing Checklist

Setelah app running di iPhone:

### Basic Functionality
- [ ] App launches successfully
- [ ] Splash screen shows and hides
- [ ] Status bar color matches theme
- [ ] Safe area (notch) handled correctly
- [ ] Navigation works (tabs)

### Theme
- [ ] Light theme: status bar light
- [ ] Dark theme: status bar dark
- [ ] Toggle theme works
- [ ] Theme persists after restart

### Interactions
- [ ] Quick Add transaction
- [ ] Swipe to delete (smooth animation)
- [ ] Haptic feedback works
- [ ] Keyboard appears correctly
- [ ] Touch interactions responsive

### Performance
- [ ] 60fps animations
- [ ] No lag or jank
- [ ] Smooth scrolling
- [ ] Fast app launch

### Data
- [ ] IndexedDB works
- [ ] Data persists after close
- [ ] Offline functionality works

## 🎨 Icon & Splash Screen

Setelah setup assets:

```bash
# Generate icons & splash
npm run cap:setup-assets

# Rebuild
npm run build:mobile

# Open Xcode
npm run cap:open:ios

# Run on device
```

Check:
- [ ] App icon on home screen
- [ ] Splash screen on launch
- [ ] Icon matches design

## 🔄 Development Workflow

### Make Changes

```bash
# 1. Edit code
# 2. Build
npm run build

# 3. Sync
npm run cap:sync

# 4. Xcode will auto-reload
# 5. Or click Play again
```

### Quick Iteration

```bash
# One command
npm run build:mobile

# Then Xcode → Play
```

## 💡 Tips

### 1. Keep iPhone Unlocked
- iPhone akan sleep jika tidak digunakan
- Unlock untuk Xcode bisa deploy

### 2. Use WiFi Debugging (Optional)
- Xcode → Window → Devices and Simulators
- Select iPhone → Connect via network
- Unplug kabel, debug via WiFi!

### 3. View Console Logs
- Xcode → View → Debug Area → Show Debug Area
- Atau: `Cmd + Shift + Y`
- Lihat console.log dari app

### 4. Inspect Web Content
- Safari → Develop → [iPhone Name] → [App]
- Web Inspector untuk debug

### 5. Hot Reload (Tidak Ada)
- Tidak seperti web dev
- Harus rebuild setiap perubahan
- Tapi build cepat setelah pertama kali

## 🚨 Common Issues

### "iPhone is busy"
- Wait untuk iPhone selesai processing
- Atau restart iPhone

### "Could not launch [App]"
- Trust developer di iPhone
- Atau rebuild dari Xcode

### "No code signing identities found"
- Login Apple ID di Xcode
- Xcode → Preferences → Accounts

### Build sangat lambat
- Pertama kali memang lama (2-5 menit)
- Build berikutnya lebih cepat (~30 detik)

## 📊 Performance Monitoring

### Xcode Instruments

```bash
# Profile app
Xcode → Product → Profile (Cmd + I)

# Choose:
# - Time Profiler (CPU usage)
# - Allocations (Memory usage)
# - Energy Log (Battery impact)
```

### FPS Counter

Di app, tambahkan:
```typescript
// Show FPS in dev mode
if (process.env.NODE_ENV === 'development') {
  // FPS counter code
}
```

## 🎉 Success!

Jika semua berjalan lancar:

```
✅ App running di iPhone
✅ Status bar match theme
✅ Haptic feedback works
✅ Smooth 60fps animations
✅ Data persists
✅ Native app experience!
```

## 📞 Need Help?

### Check Logs

**Xcode Console:**
```
Cmd + Shift + Y
```

**Safari Web Inspector:**
```
Safari → Develop → [iPhone] → [App]
```

### Common Commands

```bash
# Clean build
cd apps/web/ios
rm -rf build DerivedData
cd ../..

# Rebuild
npm run build:mobile
npm run cap:open:ios
```

## 🚀 Next Steps

1. ✅ Setup signing
2. ✅ Run on device
3. ✅ Test functionality
4. ⏳ Setup app icons
5. ⏳ Test on different iOS versions
6. ⏳ Prepare for TestFlight (optional)

---

**Selamat testing di real device!** 📱✨

Kalau ada error, screenshot dan share, saya bantu troubleshoot! 🤝
