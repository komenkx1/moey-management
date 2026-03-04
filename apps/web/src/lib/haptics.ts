/**
 * Haptic Feedback Utilities
 * Menyediakan feedback haptic untuk interaksi user
 */

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativePlatform } from "./capacitor";

/**
 * Trigger haptic feedback ringan (untuk tap/click)
 */
export async function hapticsLight() {
  if (!isNativePlatform()) return;
  
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.warn("Haptics not available:", error);
  }
}

/**
 * Trigger haptic feedback medium (untuk actions)
 */
export async function hapticsMedium() {
  if (!isNativePlatform()) return;
  
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    console.warn("Haptics not available:", error);
  }
}

/**
 * Trigger haptic feedback heavy (untuk important actions)
 */
export async function hapticsHeavy() {
  if (!isNativePlatform()) return;
  
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.warn("Haptics not available:", error);
  }
}

/**
 * Trigger haptic untuk success
 */
export async function hapticsSuccess() {
  if (!isNativePlatform()) return;
  
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    console.warn("Haptics not available:", error);
  }
}

/**
 * Trigger haptic untuk warning
 */
export async function hapticsWarning() {
  if (!isNativePlatform()) return;
  
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    console.warn("Haptics not available:", error);
  }
}

/**
 * Trigger haptic untuk error
 */
export async function hapticsError() {
  if (!isNativePlatform()) return;
  
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (error) {
    console.warn("Haptics not available:", error);
  }
}
