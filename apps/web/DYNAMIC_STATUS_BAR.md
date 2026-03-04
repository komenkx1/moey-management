# Dynamic Status Bar - Theme Aware

Status bar KeMana sekarang otomatis mengikuti theme (light/dark mode)!

## 🎨 How It Works

### 1. Initial Load
Saat app pertama kali dibuka, status bar akan:
- Check `localStorage` untuk saved theme
- Fallback ke system preference jika belum ada
- Set status bar sesuai theme yang terdeteksi

### 2. Theme Toggle
Saat user toggle theme (tap icon moon/sun):
- Theme berubah (light ↔ dark)
- Status bar otomatis update
- Perubahan tersimpan di localStorage

## 📱 Status Bar Behavior

### Light Theme (Default)
- **Background**: `#FFFFFF` (putih)
- **Text/Icons**: Dark (hitam)
- **Style**: `Style.Light`

### Dark Theme
- **Background**: `#000000` (hitam)
- **Text/Icons**: Light (putih)
- **Style**: `Style.Dark`

## 🔧 Implementation

### 1. useCapacitor Hook
Initialization saat app start:

```typescript
// Detect saved theme
const savedTheme = localStorage.getItem("theme-mode");
const isDark = savedTheme === "dark" || 
              (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

// Set status bar accordingly
if (isDark) {
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: '#000000' });
} else {
  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
}
```

### 2. useTheme Hook
Update saat theme toggle:

```typescript
const toggleTheme = useCallback(() => {
  setIsDarkMode((current) => {
    const nextIsDark = !current;
    
    // Update DOM
    root.classList.toggle("dark", nextIsDark);
    persistThemeMode(nextIsDark ? "dark" : "light");
    
    // Update status bar
    if (nextIsDark) {
      setStatusBarDark();
    } else {
      setStatusBarLight();
    }
    
    return nextIsDark;
  });
}, [setIsDarkMode]);
```

### 3. Theme Color Meta Tag
`ThemeColorSync` component otomatis sync meta tag dengan CSS variable `--app-bg`:

```typescript
// Reads from CSS variable
const color = getComputedStyle(document.documentElement)
  .getPropertyValue("--app-bg")
  .trim();

// Updates meta tag
meta.content = color;
```

## 🎯 User Experience

### Scenario 1: First Time User
1. App opens
2. Detects system theme preference
3. Status bar matches system theme
4. User sees consistent UI

### Scenario 2: Returning User (Light Theme)
1. App opens
2. Reads saved theme: "light"
3. Status bar: white background, dark text
4. Matches screenshot yang kamu kirim! ✅

### Scenario 3: Toggle to Dark
1. User taps moon icon
2. Theme switches to dark
3. Status bar instantly updates: black background, light text
4. Smooth transition

### Scenario 4: Toggle Back to Light
1. User taps sun icon
2. Theme switches to light
3. Status bar instantly updates: white background, dark text
4. Preference saved for next launch

## 🔄 Synchronization

Status bar synchronized dengan:
- ✅ Theme toggle (moon/sun icon)
- ✅ localStorage persistence
- ✅ System theme preference (first launch)
- ✅ CSS variables (`--app-bg`)
- ✅ Meta theme-color tag

## 🧪 Testing

### Test Light Theme
```bash
# 1. Build dan run
npm run build:mobile
npm run cap:run:android

# 2. Di app:
# - Pastikan theme light (background putih)
# - Status bar harus: white bg, dark text
# - Tap moon icon
# - Status bar harus berubah: black bg, light text
```

### Test Dark Theme
```bash
# Di app:
# - Pastikan theme dark (background hitam)
# - Status bar harus: black bg, light text
# - Tap sun icon
# - Status bar harus berubah: white bg, dark text
```

### Test Persistence
```bash
# 1. Set theme ke dark
# 2. Close app (swipe away)
# 3. Open app lagi
# 4. Status bar harus tetap dark
```

## 🐛 Troubleshooting

### Status bar tidak berubah saat toggle

**Check 1**: Pastikan rebuild
```bash
npm run build:mobile
npm run cap:run:android
```

**Check 2**: Clear app data
```bash
# Android
adb shell pm clear com.kemana.app

# Then reinstall
npm run cap:run:android
```

**Check 3**: Check console logs
```javascript
// Di Chrome DevTools (chrome://inspect)
// Look for errors in Capacitor initialization
```

### Status bar berubah tapi ada delay

Normal! Ada slight delay karena:
1. Theme state update
2. Status bar API call
3. Native UI update

Biasanya < 100ms, tidak terlihat oleh user.

### Status bar warna tidak match persis

**iOS**: Status bar background selalu transparent, tapi text color berubah.
**Android**: Background color bisa diubah, harus match persis.

Check CSS variable `--app-bg` untuk ensure consistency.

## 📊 Status Bar States

| Theme | Background | Text Color | Icon Color | Style |
|-------|-----------|------------|------------|-------|
| Light | #FFFFFF | Dark | Dark | Style.Light |
| Dark | #000000 | Light | Light | Style.Dark |

## 💡 Best Practices

### 1. Consistent Colors
Pastikan status bar color match dengan app background:

```css
/* globals.css */
:root {
  --app-bg: #F7F8FA; /* Light theme */
}

.dark {
  --app-bg: #000000; /* Dark theme */
}
```

### 2. Smooth Transitions
Status bar update otomatis saat theme toggle, tidak perlu manual handling.

### 3. Persistence
Theme preference otomatis tersimpan, tidak perlu extra code.

## 🚀 Future Enhancements

Potential improvements:
- [ ] Animated status bar transitions
- [ ] Per-screen status bar customization
- [ ] Auto theme based on time of day
- [ ] Custom theme colors (not just black/white)

## ✅ Summary

Status bar sekarang:
- ✅ Otomatis detect theme saat app start
- ✅ Update saat user toggle theme
- ✅ Persist preference di localStorage
- ✅ Sync dengan CSS variables
- ✅ Match dengan app background
- ✅ Support light dan dark theme
- ✅ Smooth transitions

**Sekarang status bar akan selalu match dengan theme yang aktif!** 🎉
