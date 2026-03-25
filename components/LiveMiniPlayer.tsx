import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLiveStore } from '../store/liveStore';
import { useVideoStore } from '../store/videoStore';
import { proxyImageUrl } from '../utils/imageUrl';

const MINI_W = 160;
const MINI_H = 90;

const LIVE_HEADERS = {
  Referer: 'https://live.bilibili.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export function LiveMiniPlayer() {
  const { isActive, roomId, title, cover, hlsUrl, clearLive } = useLiveStore();
  const videoMiniActive = useVideoStore(s => s.isActive);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const { width: sw, height: sh } = Dimensions.get('window');
        const curX = (pan.x as any)._value;
        const curY = (pan.y as any)._value;
        const clampedX = Math.max(-sw + MINI_W + 12, Math.min(12, curX));
        const clampedY = Math.max(-sh + MINI_H + 60, Math.min(60, curY));
        if (curX !== clampedX || curY !== clampedY) {
          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  ).current;

  if (!isActive) return null;

  // 视频 MiniPlayer 激活时，直播小窗叠放其上方（避免重叠）
  const bottomOffset = insets.bottom + 16 + (videoMiniActive ? 106 : 0);

  const handlePress = () => {
    router.push(`/live/${roomId}` as any);
  };

  // Web 端降级：展示封面图 + LIVE 徽标
  if (Platform.OS === 'web') {
    return (
      <Animated.View
        style={[styles.container, { bottom: bottomOffset, transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.main} onPress={handlePress} activeOpacity={0.85}>
          <Image source={{ uri: proxyImageUrl(cover) }} style={styles.videoArea} />
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtn} onPress={clearLive}>
          <Ionicons name="close" size={14} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Native：实际 HLS 流播放
  const Video = require('react-native-video').default;

  return (
    <Animated.View
      style={[styles.container, { bottom: bottomOffset, transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.main} onPress={handlePress} activeOpacity={0.85}>
        <View style={styles.videoArea}>
          <Video
            key={hlsUrl}
            source={{ uri: hlsUrl, headers: LIVE_HEADERS }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            controls={false}
            muted={false}
            paused={false}
            repeat={false}
            onError={clearLive}
          />
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={clearLive}>
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    width: MINI_W,
    height: MINI_H,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  main: { flex: 1 },
  videoArea: {
    width: '100%',
    height: 66,
    backgroundColor: '#111',
  },
  liveBadge: {
    position: 'absolute',
    top: 4,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    gap: 3,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#f00' },
  liveText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  titleText: {
    color: '#fff',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 3,
    lineHeight: 14,
    height: 24,
    backgroundColor: '#1a1a1a',
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
