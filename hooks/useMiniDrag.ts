import { useRef } from 'react';
import { Animated, Dimensions, PanResponder } from 'react-native';

interface Options {
  width: number;
  height: number;
  /** Hit test for the "close button" area (locationX, locationY): true calls onClose, otherwise onTap */
  hitClose?: (locationX: number, locationY: number) => boolean;
  onTap: () => void;
  onClose?: () => void;
}

/**
 * Drag + edge snapping + tap/close dispatch for the global floating mini player.
 * Spread the returned panHandlers on the container and apply pan.getTranslateTransform() as transform.
 */
export function useMiniDrag({ width, height, hitClose, onTap, onClose }: Options) {
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  // Keep the latest callbacks in refs so the PanResponder closure never goes stale
  const cbRef = useRef({ onTap, onClose, hitClose });
  cbRef.current = { onTap, onClose, hitClose };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          isDragging.current = true;
        }
        pan.x.setValue(gs.dx);
        pan.y.setValue(gs.dy);
      },
      onPanResponderRelease: (evt) => {
        pan.flattenOffset();
        if (!isDragging.current) {
          const { locationX, locationY } = evt.nativeEvent;
          const cb = cbRef.current;
          if (cb.hitClose?.(locationX, locationY) && cb.onClose) {
            cb.onClose();
          } else {
            cb.onTap();
          }
          return;
        }
        const { width: sw, height: sh } = Dimensions.get('window');
        const curX = (pan.x as any)._value;
        const curY = (pan.y as any)._value;
        const snapRight = 0;
        const snapLeft = -(sw - width - 24);
        const snapX = curX < snapLeft / 2 ? snapLeft : snapRight;
        const clampedY = Math.max(-sh + height + 60, Math.min(60, curY));
        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          useNativeDriver: false,
          tension: 120,
          friction: 10,
        }).start();
      },
      onPanResponderTerminate: () => { pan.flattenOffset(); },
    }),
  ).current;

  return { pan, panHandlers: panResponder.panHandlers };
}
