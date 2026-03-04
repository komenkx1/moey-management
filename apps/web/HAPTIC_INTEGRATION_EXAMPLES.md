# Haptic Feedback Integration Examples

Contoh-contoh integrasi haptic feedback ke komponen KeMana yang sudah ada.

## 1. Quick Add Transaction (Success Feedback)

```typescript
// Di AddTransactionSheet.tsx atau form submit handler

import { hapticsSuccess, hapticsMedium } from '@/lib/haptics';

const handleSubmit = async (data: TransactionData) => {
  try {
    await saveTransaction(data);
    
    // Trigger haptic success
    await hapticsSuccess();
    
    toast.success("Transaksi berhasil disimpan");
    closeSheet();
  } catch (error) {
    await hapticsError();
    toast.error("Gagal menyimpan transaksi");
  }
};
```

## 2. Swipe to Delete (Warning Feedback)

```typescript
// Di use-swipe-to-delete.ts

import { hapticsWarning, hapticsLight } from '@/lib/haptics';

const handleSwipeThreshold = () => {
  // Saat swipe mencapai threshold delete
  if (swipeDistance > DELETE_THRESHOLD) {
    hapticsWarning(); // Vibrate untuk warning
    setShowDeleteIcon(true);
  }
};

const handleDelete = async () => {
  await hapticsWarning();
  // Proceed with delete
};
```

## 3. Tab Navigation (Light Feedback)

```typescript
// Di BottomTabBar.tsx

import { hapticsLight } from '@/lib/haptics';

const handleTabChange = (tab: string) => {
  hapticsLight(); // Subtle feedback untuk tab change
  setActiveTab(tab);
};
```

## 4. Button Interactions (Medium Feedback)

```typescript
// Di Button component atau action buttons

import { hapticsMedium } from '@/lib/haptics';

const Button = ({ onClick, ...props }) => {
  const handleClick = async (e) => {
    await hapticsMedium();
    onClick?.(e);
  };
  
  return <button onClick={handleClick} {...props} />;
};
```

## 5. Night Close Review (Success Feedback)

```typescript
// Di NightCloseReviewSheet.tsx

import { hapticsSuccess } from '@/lib/haptics';

const handleConfirmNightClose = async () => {
  await confirmNightClose();
  await hapticsSuccess();
  toast.success("Night close berhasil!");
};
```

## 6. Bulk Input (Multiple Success)

```typescript
// Di BulkInputSheet.tsx

import { hapticsLight, hapticsSuccess } from '@/lib/haptics';

const handleAddEntry = () => {
  addEntry();
  hapticsLight(); // Light feedback untuk setiap entry
};

const handleSaveAll = async () => {
  await saveAllEntries();
  await hapticsSuccess(); // Success feedback untuk save all
};
```

## Best Practices

### 1. Gunakan Haptic yang Sesuai

- **Light**: Tap, selection, navigation
- **Medium**: Actions, confirmations
- **Heavy**: Important actions (jarang digunakan)
- **Success**: Successful operations
- **Warning**: Destructive actions, alerts
- **Error**: Failed operations

### 2. Jangan Overuse

Haptic feedback harus meaningful, bukan untuk setiap interaksi:

```typescript
// ❌ BAD: Terlalu banyak haptic
<div 
  onMouseEnter={() => hapticsLight()}
  onMouseMove={() => hapticsLight()}
  onClick={() => hapticsMedium()}
>

// ✅ GOOD: Hanya untuk action penting
<button onClick={async () => {
  await hapticsMedium();
  handleImportantAction();
}}>
```

### 3. Async Handling

Haptic feedback adalah async, tapi tidak perlu di-await untuk UX yang lebih responsive:

```typescript
// Option 1: Fire and forget (recommended untuk UX)
const handleClick = () => {
  hapticsLight(); // Tidak perlu await
  doSomething();
};

// Option 2: Await jika perlu sequence
const handleClick = async () => {
  await hapticsWarning();
  const confirmed = await showConfirmDialog();
  if (confirmed) {
    await hapticsSuccess();
  }
};
```

### 4. Platform Detection

Haptic utilities sudah handle platform detection, tapi Anda bisa check manual jika perlu:

```typescript
import { isNativePlatform } from '@/lib/capacitor';

if (isNativePlatform()) {
  // Show native-specific UI
  await hapticsSuccess();
} else {
  // Web fallback (bisa gunakan Web Vibration API)
  navigator.vibrate?.(100);
}
```

## Integration Checklist

Untuk mengintegrasikan haptic ke existing components:

- [ ] Import haptic utilities
- [ ] Identify key user interactions
- [ ] Add appropriate haptic feedback
- [ ] Test di native device (emulator tidak selalu support haptic)
- [ ] Verify tidak overuse
- [ ] Check performance impact (minimal)

## Testing

### Di Native Device

```bash
# Build dan run
npm run build:mobile
npm run cap:run:android  # atau ios

# Test interactions:
# - Add transaction → Should feel success haptic
# - Swipe to delete → Should feel warning haptic
# - Tab navigation → Should feel light haptic
```

### Fallback Testing (Web)

Haptic utilities akan gracefully fail di web. Check console untuk warnings jika ada.

## Performance Considerations

Haptic feedback sangat lightweight dan tidak impact performance. Namun:

1. Avoid dalam loops atau rapid-fire events
2. Debounce jika diperlukan untuk rapid interactions
3. Test di low-end devices

## Future Enhancements

Potential improvements:

1. Custom haptic patterns
2. User preference untuk enable/disable haptic
3. Haptic intensity settings
4. Context-aware haptic (berbeda per screen)
