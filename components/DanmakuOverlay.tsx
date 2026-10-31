import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { DanmakuItem } from '../services/types';
import { danmakuColorToCss } from '../utils/danmaku';

interface Props {
  danmakus: DanmakuItem[];
  currentTime: number;
  screenWidth: number;
  screenHeight: number;
  visible: boolean;
}

// ─── Config ─────────────────────────────────────────────────────────────────
// Maximum font size (slightly smaller feels closer to Bilibili on desktop)
const FONT_MAX = 16;
// Height of a single lane
const LANE_H = 22;
// Number of horizontal lanes
const LANE_COUNT = 6;
// Maximum danmaku on screen at once
const MAX_ACTIVE = 80;
// Threshold for the activated set; reset once reached to avoid memory growth
const ACTIVATED_LIMIT = 1000;
// Constant scroll speed (pixels per second): long text travels longer so visual speed stays the same
const SCROLL_PX_PER_SEC = 160;
// Fade in/out duration
const FADE_MS = 200;

// Estimate text width in pixels. CJK ideographs count as 1.0x fontSize, ASCII as 0.55x.
function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x2e80) w += fontSize;
    else w += fontSize * 0.55;
  }
  return w;
}

interface ActiveDanmaku {
  id: string;
  item: DanmakuItem;
  lane: number;
  fontSize: number;
  tx: Animated.Value;
  opacity: Animated.Value;
}

// ─── Single danmaku ─────────────────────────────────────────────────────────
// React.memo: when a new danmaku re-renders the parent, existing ones skip JSX.
// Animated.Value references are stable and other props are values, so the shallow compare hits.
const DanmakuLine = memo(
  function DanmakuLine({
    d,
    screenHeight,
  }: {
    d: ActiveDanmaku;
    screenHeight: number;
  }) {
    const isScrolling = d.item.mode === 1;
    const isTop = d.item.mode === 5;
    return (
      <Animated.Text
        style={{
          position: 'absolute',
          top: isScrolling
            ? 16 + d.lane * LANE_H
            : isTop
            ? 16
            : screenHeight - 36,
          left: isScrolling ? 0 : undefined,
          alignSelf: !isScrolling ? 'center' : undefined,
          transform: isScrolling ? [{ translateX: d.tx }] : [],
          opacity: d.opacity,
          color: danmakuColorToCss(d.item.color),
          fontSize: d.fontSize,
          fontWeight: '700',
          // Outline: 1px offset + radius 0 avoids the extra rasterization of a blur
          textShadowColor: 'rgba(0,0,0,0.9)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 0,
        }}
      >
        {d.item.text}
      </Animated.Text>
    );
  },
  (prev, next) => prev.d === next.d && prev.screenHeight === next.screenHeight,
);

export default function DanmakuOverlay({
  danmakus,
  currentTime,
  screenWidth,
  screenHeight,
  visible,
}: Props) {
  const [activeDanmakus, setActiveDanmakus] = useState<ActiveDanmaku[]>([]);
  const laneAvailAt = useRef<number[]>(new Array(LANE_COUNT).fill(0));
  const activated = useRef<Set<string>>(new Set());
  const prevTimeRef = useRef<number>(currentTime);
  const idCounter = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pickLane = useCallback((): number | null => {
    const now = Date.now();
    for (let i = 0; i < LANE_COUNT; i++) {
      if (laneAvailAt.current[i] <= now) return i;
    }
    return null;
  }, []);

  useEffect(() => {
    activated.current.clear();
    laneAvailAt.current.fill(0);
    setActiveDanmakus([]);
  }, [danmakus]);

  useEffect(() => {
    if (!visible) return;

    const prevTime = prevTimeRef.current;
    const didSeek = Math.abs(currentTime - prevTime) > 2;
    prevTimeRef.current = currentTime;

    if (didSeek) {
      activated.current.clear();
      laneAvailAt.current.fill(0);
      setActiveDanmakus([]);
      return;
    }

    const window = 0.4;
    const candidates = danmakus.filter((d) => {
      const key = `${d.time}_${d.text}`;
      return (
        d.time >= currentTime - window &&
        d.time <= currentTime + window &&
        !activated.current.has(key)
      );
    });

    if (candidates.length === 0) return;

    if (activated.current.size > ACTIVATED_LIMIT) {
      activated.current.clear();
      idCounter.current = 0;
    }

    const newItems: ActiveDanmaku[] = [];

    for (const item of candidates) {
      const key = `${item.time}_${item.text}`;
      activated.current.add(key);

      const fontSize = Math.min(item.fontSize || 18, FONT_MAX);

      if (item.mode === 1) {
        const lane = pickLane();
        if (lane === null) continue;

        const textWidth = estimateTextWidth(item.text, fontSize);
        const totalDistance = screenWidth + textWidth + 20;
        // Constant speed: duration is derived from text length so visual speed is uniform
        const duration = (totalDistance / SCROLL_PX_PER_SEC) * 1000;
        // When a lane can be reused: once the tail passes the right edge, independent of duration
        const laneFreeMs = (textWidth / SCROLL_PX_PER_SEC) * 1000;
        laneAvailAt.current[lane] = Date.now() + laneFreeMs;

        const tx = new Animated.Value(screenWidth);
        const opacity = new Animated.Value(0);
        const id = `d_${idCounter.current++}`;

        newItems.push({ id, item, lane, fontSize, tx, opacity });

        // Fade in on entry
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();

        // Main scroll animation (linear, constant visual speed)
        Animated.timing(tx, {
          toValue: -textWidth - 20,
          duration,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!mountedRef.current) return;
          if (!finished) {
            setActiveDanmakus((prev) => prev.filter((d) => d.id !== id));
            return;
          }
          // Already off-screen before reaching the end, so just remove it (no overlapping fade-out)
          setActiveDanmakus((prev) => prev.filter((d) => d.id !== id));
        });

        // Fade out near the end: starts at duration - FADE_MS
        Animated.sequence([
          Animated.delay(Math.max(0, duration - FADE_MS)),
          Animated.timing(opacity, {
            toValue: 0,
            duration: FADE_MS,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Fixed position (4 = bottom, 5 = top)
        const opacity = new Animated.Value(0);
        const id = `d_${idCounter.current++}`;
        newItems.push({
          id,
          item,
          lane: -1,
          fontSize,
          tx: new Animated.Value(0),
          opacity,
        });

        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: FADE_MS,
            useNativeDriver: true,
          }),
          Animated.delay(2200),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (mountedRef.current) {
            setActiveDanmakus((prev) => prev.filter((d) => d.id !== id));
          }
        });
      }
    }

    if (newItems.length > 0) {
      setActiveDanmakus((prev) => {
        const combined = [...prev, ...newItems];
        return combined.slice(Math.max(0, combined.length - MAX_ACTIVE));
      });
    }
  }, [currentTime, visible, danmakus, pickLane, screenWidth]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {activeDanmakus.map((d) => (
        <DanmakuLine key={d.id} d={d} screenHeight={screenHeight} />
      ))}
    </View>
  );
}
