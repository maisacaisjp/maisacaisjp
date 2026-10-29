/**
 * Haptic Feedback utility for mobile devices
 * Uses the Vibration API safely with user gestures
 */

export const triggerHaptic = (pattern: number | number[] = 12) => {
  try {
    if (typeof window !== "undefined" && "navigator" in window && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently ignore if device/browser doesn't support or disallows vibration
  }
};

export const hapticLight = () => triggerHaptic(10);
export const hapticMedium = () => triggerHaptic(20);
export const hapticSuccess = () => triggerHaptic([15, 60, 25]);
