# Comparison: Capacitor vs React Native Web

## Tanggal: 28 Februari 2026

## Executive Summary

**Capacitor:** Wrap Next.js web app ke native container (WebView)
**React Native Web:** Rebuild UI dengan React Native, compile ke web + native

---

## 1. Quick Comparison Table

| Aspect | Capacitor | React Native Web | Winner |
|--------|-----------|------------------|--------|
| **Migration Time** | 1-2 weeks | 4 weeks | Capacitor ⚡ |
| **Code Sharing** | 100% | 95% | Capacitor 📝 |
| **Performance (Mobile)** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | RN Web 🚀 |
| **Performance (Web)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Capacitor 🌐 |
| **Native Feel** | ⭐⭐ | ⭐⭐⭐⭐⭐ | RN Web 📱 |
| **Bundle Size (Mobile)** | Large (~10-15MB) | Medium (~5-8MB) | RN Web 📦 |
| **Memory Usage** | High (WebView) | Low (Native) | RN Web 💾 |
| **Gesture Quality** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | RN Web 👆 |
| **Maintenance** | Easy (1 codebase) | Easy (1 codebase) | Tie 🤝 |
| **Future-Proof** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | RN Web 🔮 |
| **Learning Curve** | Low | Medium | Capacitor 📚 |

---

## 2. Detailed Analysis

### 2.1 Capacitor (Ionic)

#### What is it?
```
Next.js App (Current)
    ↓
Build Web Bundle
    ↓
Wrap in Native Container (WebView)
    ↓
iOS App + Android App

Your web app runs inside a native WebView
```

#### Architecture
```
┌─────────────────────────────────────┐
│  Native Container (iOS/Android)     │
│  ┌───────────────────────────────┐  │
│  │  WebView                      │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  Your Next.js App       │  │  │
│  │  │  (HTML + CSS + JS)      │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│                                     │
│  Capacitor Plugins (Bridge)         │
│  - Camera, Notifications, etc       │
└─────────────────────────────────────┘
```

#### Pros ✅
1. **Fastest Migration** - 1-2 minggu
2. **100% Code Reuse** - Keep Next.js as-is
3. **Keep SSR/SEO** - Web version tetap optimal
4. **Familiar Stack** - No new tech to learn
5. **Easy Maintenance** - 1 codebase, truly universal
6. **Existing Tools** - Keep Tailwind, shadcn, etc

#### Cons ❌
1. **WebView Performance** - Slower than native
2. **Memory Usage** - Higher (WebView overhead)
3. **Gesture Quality** - Not as smooth as native
4. **Bundle Size** - Larger app size (~10-15MB)
5. **Startup Time** - Slower cold start
6. **Native Feel** - Feels like web app, not native
7. **Animation Jank** - Complex animations can stutter
8. **Battery Drain** - Higher than native

---

### 2.2 React Native Web

#### What is it?
```
Rebuild UI with React Native
    ↓
Compile to 3 targets:
    ├─ Web (React Native Web)
    ├─ iOS (Native)
    └─ Android (Native)

Native code on mobile, web code on web
```

#### Architecture
```
┌─────────────────────────────────────┐
│  React Native (iOS/Android)         │
│  ┌───────────────────────────────┐  │
│  │  Native UI Components         │  │
│  │  - UIView, TextView, etc      │  │
│  │  (Real native, not WebView)   │  │
│  └───────────────────────────────┘  │
│                                     │
│  JavaScript Engine (Hermes)         │
│  - Your business logic             │
└─────────────────────────────────────┘

Web version uses React Native Web
(compiles RN components to HTML/CSS)
```

#### Pros ✅
1. **Native Performance** - True native on mobile
2. **Native Feel** - Smooth gestures, animations
3. **Smaller Bundle** - Native code is optimized
4. **Better Battery** - Native is more efficient
5. **60fps Animations** - Reanimated on native thread
6. **Future-Proof** - Industry standard for cross-platform
7. **Rich Ecosystem** - Tons of native modules
8. **Better UX** - Feels like native app

#### Cons ❌
1. **Migration Time** - 4 minggu
2. **Learning Curve** - Need to learn RN APIs
3. **UI Rebuild** - Can't reuse Next.js components
4. **Web Bundle Larger** - RN Web adds overhead
5. **No SSR** - Web becomes SPA (but fine for app)

---

## 3. Performance Benchmarks

### 3.1 App Size

```
Capacitor:
├─ iOS: ~12-18MB (includes WebView + web bundle)
├─ Android: ~10-15MB
└─ Web: ~200KB (same as current)

React Native Web:
├─ iOS: ~5-8MB (native code only)
├─ Android: ~4-7MB
└─ Web: ~400KB (includes RN Web runtime)
```

### 3.2 Startup Time (Cold Start)

```
Capacitor:
├─ iOS: ~2-3 seconds (WebView init + load HTML)
├─ Android: ~2-4 seconds
└─ Web: ~500ms (same as current)

React Native Web:
├─ iOS: ~1-1.5 seconds (native init)
├─ Android: ~1-2 seconds
└─ Web: ~800ms (RN Web init)
```

### 3.3 Memory Usage

```
Capacitor:
├─ iOS: ~150-200MB (WebView overhead)
├─ Android: ~120-180MB
└─ Web: ~50MB (browser)

React Native Web:
├─ iOS: ~80-120MB (native)
├─ Android: ~70-100MB
└─ Web: ~60MB (RN Web)
```

### 3.4 Gesture Response Time

```
Capacitor:
├─ Swipe: ~50-100ms (WebView delay)
├─ Scroll: ~30-60ms
└─ Animation: 30-60fps (can drop)

React Native Web:
├─ Swipe: ~16ms (native thread)
├─ Scroll: ~16ms
└─ Animation: 60fps (consistent)
```

---

## 4. Feature Comparison

### 4.1 Push Notifications

**Capacitor:**
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

// Works, but setup more complex
await PushNotifications.requestPermissions();
await PushNotifications.register();
```

**React Native Web:**
```typescript
import * as Notifications from 'expo-notifications';

// Simpler, better documented
await Notifications.requestPermissionsAsync();
```

**Winner:** React Native Web (better DX)

### 4.2 Camera/OCR

**Capacitor:**
```typescript
import { Camera } from '@capacitor/camera';

// Works, but limited ML Kit integration
const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Uri
});
```

**React Native Web:**
```typescript
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

// Better ML Kit integration
// On-device OCR with ML Kit
```

**Winner:** React Native Web (better ML integration)

### 4.3 Offline Storage

**Capacitor:**
```typescript
// Use Dexie (IndexedDB) - same as web
// Works, but not optimal for mobile
```

**React Native Web:**
```typescript
// Use SQLite (native database)
// Much faster on mobile
// Better for large datasets
```

**Winner:** React Native Web (native SQLite)

### 4.4 Gestures

**Capacitor:**
```typescript
// Use Framer Motion or vanilla JS
// Works, but not as smooth
// Can feel laggy on complex gestures
```

**React Native Web:**
```typescript
// Use React Native Gesture Handler
// Runs on native thread (60fps)
// Buttery smooth
```

**Winner:** React Native Web (native gestures)

---

## 5. User Experience Comparison

### 5.1 Scroll Performance

**Capacitor:**
- Scroll feels slightly laggy
- Momentum scroll not as smooth
- Can stutter on long lists
- FlatList virtualization doesn't work (it's web)

**React Native Web:**
- Native scroll (iOS bounce, Android overscroll)
- Smooth momentum
- FlatList virtualization works perfectly
- Handles 1000+ items easily

**Winner:** React Native Web

### 5.2 Animations

**Capacitor:**
- CSS animations work
- Complex animations can drop frames
- No access to native animation APIs
- 30-45fps on complex animations

**React Native Web:**
- Reanimated runs on native thread
- Consistent 60fps
- Spring physics feel native
- Shared element transitions

**Winner:** React Native Web

### 5.3 Form Inputs

**Capacitor:**
- Web inputs in WebView
- Keyboard handling can be tricky
- Autofill works (web-based)
- Copy/paste works

**React Native Web:**
- Native inputs
- Better keyboard handling
- Native autofill
- Better accessibility

**Winner:** React Native Web

---

## 6. Development Experience

### 6.1 Hot Reload

**Capacitor:**
```
Change code → Refresh WebView → See changes
Speed: ~2-3 seconds
```

**React Native Web:**
```
Change code → Fast Refresh → See changes
Speed: ~1-2 seconds (web), ~2-3 seconds (mobile)
```

**Winner:** Tie

### 6.2 Debugging

**Capacitor:**
- Chrome DevTools (web debugging)
- Safari Web Inspector (iOS)
- Chrome Remote Debugging (Android)
- Familiar tools

**React Native Web:**
- React Native Debugger
- Flipper (powerful native debugging)
- Chrome DevTools (web)
- More powerful, but steeper learning curve

**Winner:** Capacitor (familiarity)

### 6.3 Build Time

**Capacitor:**
```
Build web → Sync to native → Build native
Total: ~5-10 minutes
```

**React Native Web:**
```
Build native directly
Total: ~10-15 minutes (EAS Build)
```

**Winner:** Capacitor (faster builds)

---

## 7. Cost Analysis

### 7.1 Development Time

**Capacitor:**
```
Week 1: Setup Capacitor + plugins
Week 2: Test + fix platform-specific issues
Total: 2 weeks

Cost: ~80 hours
```

**React Native Web:**
```
Week 1: Setup + storage adapter
Week 2: Port screens
Week 3: Port components + gestures
Week 4: Platform-specific + polish
Total: 4 weeks

Cost: ~160 hours
```

**Winner:** Capacitor (2x faster)

### 7.2 Maintenance Cost

**Capacitor:**
```
Maintain: 1 codebase (Next.js)
Update: Web dependencies only
Complexity: Low

Annual cost: ~40 hours
```

**React Native Web:**
```
Maintain: 1 codebase (RN)
Update: RN + Expo dependencies
Complexity: Medium

Annual cost: ~60 hours
```

**Winner:** Capacitor (lower maintenance)

### 7.3 Performance Optimization Cost

**Capacitor:**
```
Optimize WebView performance: ~40 hours
- Reduce bundle size
- Optimize animations
- Fix scroll jank
- Memory leaks

Ongoing: ~20 hours/year
```

**React Native Web:**
```
Optimize native performance: ~20 hours
- Already fast by default
- Minor tweaks only

Ongoing: ~10 hours/year
```

**Winner:** React Native Web (less optimization needed)

---

## 8. Real-World Examples

### 8.1 Apps Using Capacitor

- **Ionic Portals** - Hybrid apps
- **Burger King** - Parts of their app
- **Southwest Airlines** - Booking flow
- **Many enterprise apps** - Internal tools

**Common feedback:**
- "Works, but feels like web"
- "Good for MVP, but users notice"
- "Performance issues on older devices"

### 8.2 Apps Using React Native

- **Instagram** - Main app
- **Facebook** - Parts of main app
- **Discord** - Mobile app
- **Shopify** - Mobile app
- **Microsoft Office** - Mobile apps
- **Tesla** - Mobile app

**Common feedback:**
- "Feels native"
- "Can't tell it's not native"
- "Smooth and fast"

---

## 9. Decision Matrix

### Choose Capacitor If:
✅ Need to ship ASAP (1-2 weeks)
✅ Team only knows web tech
✅ App is simple (mostly forms/lists)
✅ Budget is very limited
✅ Performance is not critical
✅ Users are not picky about UX

### Choose React Native Web If:
✅ Want best mobile UX
✅ Performance is important
✅ App has complex gestures/animations
✅ Planning long-term (2+ years)
✅ Want to compete with native apps
✅ Users expect native feel
✅ Have 4 weeks for migration

---

## 10. Recommendation for KeMana

### Context:
- Expense tracker with gestures (swipe-to-delete)
- Habit loop (needs push notifications)
- Multi-device sync
- Target: Daily active users
- Competition: Native apps (Splitwise, Spendee)

### Analysis:

**Capacitor Risks:**
1. Swipe-to-delete won't feel as smooth
2. Scroll performance on long transaction lists
3. Animation jank on charts/graphs
4. Users will compare to native competitors
5. Higher battery drain (habit loop = daily use)

**React Native Web Benefits:**
1. Swipe gestures feel native (already implemented)
2. Smooth scroll with FlatList virtualization
3. 60fps animations on charts
4. Competitive with native apps
5. Better battery life for daily use
6. Push notifications work better

### Recommendation: **React Native Web** ✅

**Reasoning:**
1. **UX is critical** - Expense tracking is competitive space
2. **Gestures matter** - Swipe-to-delete is core feature
3. **Daily use** - Performance & battery matter
4. **Long-term** - Planning for 2+ years
5. **Worth the investment** - 2 extra weeks for much better UX

**Trade-off Accepted:**
- 2 extra weeks migration time
- Learning curve for RN
- Worth it for 2-3x better mobile UX

---

## 11. Hybrid Approach (Not Recommended)

### Option: Capacitor Now, RN Later

```
Phase 1: Wrap with Capacitor (2 weeks)
  → Launch to stores quickly
  → Get user feedback
  
Phase 2: Migrate to RN (4 weeks)
  → Better UX
  → Replace Capacitor version
```

**Why Not Recommended:**
- Double migration work
- Users experience bad UX first (bad impression)
- Wasted 2 weeks on Capacitor
- Total time: 6 weeks (vs 4 weeks RN direct)

---

## Conclusion

**For KeMana: React Native Web is the better choice**

Despite 2x longer migration time, the benefits outweigh costs:
- ✅ Native-quality UX (critical for daily-use app)
- ✅ Smooth gestures (core feature)
- ✅ Better performance (daily use = battery matters)
- ✅ Competitive with native apps
- ✅ Future-proof (industry standard)

**Capacitor is good for:**
- Quick MVP/prototype
- Simple CRUD apps
- Internal tools
- Budget-constrained projects

**React Native Web is good for:**
- Consumer-facing apps
- Gesture-heavy apps
- Performance-critical apps
- Long-term products
- **KeMana** ✅
