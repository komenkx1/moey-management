# Status Bar Customization Guide

Panduan untuk mengatur status bar di iOS dan Android agar match dengan theme app.

## 🎨 Current Configuration

Status bar KeMana sudah dikonfigurasi untuk **dark theme**:

- **Background**: `#000000` (hitam)
- **Text/Icons**: Light (putih)
- **Style**: `Style.Dark` (light content untuk dark background)

## 📱 Platform Behavior

### iOS
- Status bar text/icons bisa light atau dark
- Background color tidak bisa diubah (selalu transparent)
- Gunakan `Style.Dark` untuk light text (dark background)
- Gunakan `Style.Light` untuk dark text (light background)

### Android
- Status bar background color bisa diubah
- Text/icons bisa light atau dark
- Full control atas appearance

## 🔧 Configuration Files

### 1. capacitor.config.ts

```typescript
plugins: {
  StatusBar: {
    style: 'DARK',           // Light text untuk dark background
    backgroundColor: '#000000' // Hitam (Android only)
  }
}
```

### 2. useCapacitor.ts

```typescript
// Initialize saat app start
await StatusBar.setStyle({ style: Style.Dark });
await StatusBar.setBackgroundColor({ color: '#000000' });
```

### 3. layout.tsx

```typescript
export const viewport: Viewport = {
  themeColor: "#000000",  // Match dengan status bar
  viewportFit: "cover"
};
```

## 💡 Usage Examples

### Basic Usage

```typescript
import { setStatusBarDark, setStatusBarLight } from '@/lib/status-bar';

// Set dark theme (default)
await setStatusBarDark();

// Set light theme (jika ada light mode)
await setStatusBarLight();
```

### Custom Color

```typescript
import { setStatusBarColor } from '@/lib/status-bar';

// Custom color dengan light text
await setStatusBarColor('#1a1a1a', 'dark');

// Custom color dengan dark text
await setStatusBarColor('#f5f5f5', 'light');
```

### Dynamic Based on Context

```typescript
// Contoh: Ubah status bar saat buka sheet
const handleOpenSheet = async () => {
  // Jika sheet background terang
  await setStatusBarLight();
  openSheet();
};

const handleCloseSheet = async () => {
  // Kembali ke dark theme
  await setStatusBarDark();
  closeSheet();
};
```

### Fullscreen Mode

```typescript
import { hideStatusBar, showStatusBar } from '@/lib/status-bar';

// Hide untuk fullscreen (misal: video player)
await hideStatusBar();

// Show kembali
await showStatusBar();
```

### iOS Overlay Mode

```typescript
import { setStatusBarOverlay } from '@/lib/status-bar';

// Status bar overlay di atas content (transparent)
await setStatusBarOverlay(true);

// Status bar push content down
await setStatusBarOverlay(false);
```

## 🎯 Best Practices

### 1. Consistency

Pastikan status bar match dengan app theme:

```typescript
// ❌ BAD: Mismatch
// App background: #000000
// Status bar: #FFFFFF (white)

// ✅ GOOD: Match
// App background: #000000
// Status bar: #000000 dengan light text
```

### 2. Smooth Transitions

Gunakan transitions saat mengubah status bar:

```typescript
// Ubah status bar sebelum transition
await setStatusBarLight();
// Kemudian animate sheet/modal
animateSheet();
```

### 3. Platform Detection

Check platform sebelum set status bar:

```typescript
import { isNativePlatform } from '@/lib/capacitor';

if (isNativePlatform()) {
  await setStatusBarDark();
}
```

### 4. Error Handling

Status bar utilities sudah handle errors gracefully:

```typescript
// Tidak perlu try-catch, sudah handled internally
await setStatusBarDark();
```

## 🔄 Theme Switching

Jika app support light/dark mode toggle:

```typescript
import { setStatusBarDark, setStatusBarLight } from '@/lib/status-bar';

const toggleTheme = async (theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    await setStatusBarDark();
    document.documentElement.classList.add('dark');
  } else {
    await setStatusBarLight();
    document.documentElement.classList.remove('dark');
  }
};
```

## 📊 Status Bar Styles Reference

| Style | Text Color | Best For |
|-------|-----------|----------|
| `Style.Dark` | Light (white) | Dark backgrounds (#000000, #1a1a1a) |
| `Style.Light` | Dark (black) | Light backgrounds (#FFFFFF, #f5f5f5) |
| `Style.Default` | System default | Auto based on system theme |

## 🎨 Color Recommendations

### Dark Theme (Current)
- Background: `#000000` (pure black)
- Text: Light/White
- Style: `Style.Dark`

### Dark Gray Theme
- Background: `#1a1a1a` or `#0f2f33`
- Text: Light/White
- Style: `Style.Dark`

### Light Theme
- Background: `#FFFFFF` or `#F7F8FA`
- Text: Dark/Black
- Style: `Style.Light`

## 🐛 Troubleshooting

### Status bar tidak berubah

```typescript
// Clean dan rebuild
npm run build:mobile
npm run cap:run:android
```

### iOS status bar tidak match

iOS tidak support background color. Gunakan:
1. Set `viewportFit: "cover"` di viewport
2. Extend app background ke safe area
3. Gunakan correct style (Dark/Light)

### Android status bar flickering

```typescript
// Set di initialization, bukan di useEffect yang re-run
// useCapacitor hook sudah handle ini
```

## 📱 Testing

### Test di Emulator/Simulator

```bash
# Android
npm run cap:run:android

# iOS
npm run cap:run:ios
```

### Test di Real Device

Status bar appearance lebih akurat di real device, terutama untuk:
- Color accuracy
- Transition smoothness
- Overlay behavior (iOS)

## 🚀 Advanced: Context-Aware Status Bar

Untuk advanced use case, bisa buat hook:

```typescript
// hooks/useStatusBar.ts
import { useEffect } from 'react';
import { setStatusBarDark, setStatusBarLight } from '@/lib/status-bar';

export function useStatusBar(theme: 'light' | 'dark') {
  useEffect(() => {
    if (theme === 'dark') {
      setStatusBarDark();
    } else {
      setStatusBarLight();
    }
  }, [theme]);
}

// Usage in component
function MyComponent() {
  useStatusBar('dark');
  return <div>...</div>;
}
```

## 📚 Resources

- [Capacitor Status Bar Plugin](https://capacitorjs.com/docs/apis/status-bar)
- [iOS Status Bar Styles](https://developer.apple.com/documentation/uikit/uistatusbarstyle)
- [Android Status Bar](https://developer.android.com/training/system-ui/status)

## ✅ Checklist

- [x] Status bar configured untuk dark theme
- [x] Background color set ke `#000000`
- [x] Text/icons set ke light (white)
- [x] Theme color metadata match
- [x] Utilities created untuk dynamic changes
- [ ] Test di Android device
- [ ] Test di iOS device
- [ ] Test transitions saat buka/tutup sheets
- [ ] Verify consistency across all screens

---

**Current Status**: Status bar sudah dikonfigurasi untuk dark theme dengan background hitam dan text putih, match dengan screenshot app KeMana! 🎉
