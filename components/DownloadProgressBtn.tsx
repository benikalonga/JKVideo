import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDownloadStore } from '../store/downloadStore';
import { useTheme } from '../utils/theme';

const SIZE = 32;   // Ring outer diameter
const RING = 3;    // Ring width
const BLUE = '#00AEEC';
const INNER = SIZE - RING * 2;

interface Props {
  onPress: () => void;
}

export function DownloadProgressBtn({ onPress }: Props) {
  const theme = useTheme();
  const tasks = useDownloadStore((s) => s.tasks);
  const downloading = Object.values(tasks).filter((t) => t.status === 'downloading');
  const hasDownloading = downloading.length > 0;

  const avgProgress = hasDownloading
    ? downloading.reduce((sum, t) => sum + t.progress, 0) / downloading.length
    : 0;

  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} activeOpacity={0.7}>
      {/* Progress ring, absolutely centered */}
      {/* {hasDownloading && (
        <View style={styles.ringWrap} pointerEvents="none">
          <RingProgress progress={avgProgress} />
        </View>
      )} */}
      <Ionicons
        name="cloud-download-outline"
        size={22}
        color={hasDownloading ? BLUE : theme.iconDefault}
      />
    </TouchableOpacity>
  );
}

/**
 * Draws arc progress with two clipped half circles
 *
 * Two "D shapes" (solid half circles) sit in left/right clipping containers;
 * rotating a D sweeps an arc inside its container, and a white inner circle turns it into a ring.
 *
 * Rotation axis = the D view's default center = the outer circle's center, so no transformOrigin is needed.
 */
function RingProgress({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress));

  // Right half arc: progress 0→50%, right D rotates from -180° to 0° (clockwise)
  const rightAngle = -180 + Math.min(p * 2, 1) * 180;
  // Left half arc: progress 50%→100%, left D rotates from 180° to 0°
  const leftAngle = 180 - Math.max(0, p * 2 - 1) * 180;

  return (
    <View style={styles.ring}>
      {/* Gray background ring */}
      <View style={styles.ringBg} />

      {/* ── Right clip: left edge = center, shows only the right half ── */}
      <View style={styles.rightClip}>
        {/* left: -SIZE/2 puts the D center on the container's left edge = outer circle center */}
        <View style={[styles.dRight, { transform: [{ rotate: `${rightAngle}deg` }] }]} />
      </View>

      {/* ── Left clip: right edge = center, shows only the left half ── */}
      <View style={styles.leftClip}>
        {/* left: 0 puts the D center on the container's right edge = outer circle center */}
        <View style={[styles.dLeft, { transform: [{ rotate: `${leftAngle}deg` }] }]} />
      </View>

      {/* White inner circle that turns the solid sector into a ring */}
      <View style={styles.inner} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: SIZE + 8,
    height: SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Absolutely centered; overflow:hidden keeps the D shapes from spilling out
  ringWrap: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: SIZE,
    height: SIZE,
    overflow: 'hidden',
  },
  ring: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: RING,
    borderColor: '#e0e0e0',
  },

  // Right clip container: left = SIZE/2 (the center), width SIZE/2, shows only the right half
  rightClip: {
    position: 'absolute',
    left: SIZE / 2,
    top: 0,
    width: SIZE / 2,
    height: SIZE,
    overflow: 'hidden',
  },
  // Right D (right half circle): left = -SIZE/2 → center = (0, SIZE/2) in clip = outer circle center
  dRight: {
    position: 'absolute',
    left: -SIZE / 2,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderTopRightRadius: SIZE / 2,
    borderBottomRightRadius: SIZE / 2,
    backgroundColor: BLUE,
  },

  // Left clip container: right = SIZE/2 (the center), width SIZE/2, shows only the left half
  leftClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE / 2,
    height: SIZE,
    overflow: 'hidden',
  },
  // Left D (left half circle): left = 0 → center = (SIZE/2, SIZE/2) in clip = outer circle center
  dLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderTopLeftRadius: SIZE / 2,
    borderBottomLeftRadius: SIZE / 2,
    backgroundColor: BLUE,
  },

  // White inner circle (covers the D centers, leaving the ring width)
  inner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: '#fff',
  },
});
