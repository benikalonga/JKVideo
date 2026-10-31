import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

/**
 * Controls the bottom sheet timing: mount + slide in / slide out + unmount.
 *
 * Usage:
 *   const { rendered, slideAnim } = useSheetTransition(visible, sheetH);
 *   if (!rendered) return null;
 *   <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>…</Animated.View>
 *
 * Key behavior:
 * - visible=true sets rendered=true immediately and starts the bottom-up slide in
 * - visible=false slides out for 240ms first, then sets rendered=false (unmounting the Modal)
 * - Toggling visible repeatedly mid-animation is safe: an interrupted timing.start() callback gets finished=false,
 *   so rendered is never cleared before the animation completes.
 */
export function useSheetTransition(visible: boolean, sheetH: number) {
  const [rendered, setRendered] = useState(visible);
  const slideAnim = useRef(new Animated.Value(visible ? 0 : sheetH)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: sheetH,
        duration: 240,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, sheetH]);

  return { rendered, slideAnim };
}
