import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, Modal, StatusBar, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
// expo-screen-orientation requires a dev build; gracefully degrade in Expo Go
let ScreenOrientation: typeof import('expo-screen-orientation') | null = null;
try { ScreenOrientation = require('expo-screen-orientation'); } catch {}
import { NativeVideoPlayer, type NativeVideoPlayerRef } from './NativeVideoPlayer';
import type { PlayUrlResponse, DanmakuItem } from '../services/types';
import { useTheme } from '../utils/theme';

interface Props {
  playData: PlayUrlResponse | null;
  qualities: { qn: number; desc: string }[];
  currentQn: number;
  onQualityChange: (qn: number) => void;
  bvid?: string;
  cid?: number;
  danmakus?: DanmakuItem[];
  onTimeUpdate?: (t: number) => void;
  initialTime?: number;
  /** The detail page wires this to opening the danmaku sheet. Small player only; hidden in fullscreen for now. */
  onDanmakuListPress?: () => void;
  /** Callback for the back button in the top left; shown and hidden with the small player controls. */
  onBack?: () => void;
  /** Video cover URL. Used as a poster before playData or the first <Video> frame arrives, to avoid a black flash */
  coverUrl?: string;
}

export function VideoPlayer({ playData, qualities, currentQn, onQualityChange, bvid, cid, danmakus, onTimeUpdate, initialTime, onDanmakuListPress, onBack, coverUrl }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const { width, height } = useWindowDimensions();
  const VIDEO_HEIGHT = width * 0.5625;
  const needsRotation = !ScreenOrientation && fullscreen;
  const lastTimeRef = useRef(0);
  const seededRef = useRef(false);
  const theme = useTheme();
  // Resume playback: store initialTime in lastTimeRef the first time it arrives
  if (!seededRef.current && typeof initialTime === 'number' && initialTime > 0) {
    lastTimeRef.current = initialTime;
    seededRef.current = true;
  }
  const portraitRef = useRef<NativeVideoPlayerRef>(null);

  const handleEnterFullscreen = async () => {
    if (Platform.OS !== 'web')
      await ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    setFullscreen(true);
  };

  const handleExitFullscreen = async () => {
    setFullscreen(false);
    if (Platform.OS !== 'web')
      await ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  };

  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web')
        ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (!playData) {
    // Without playData, use the theme color as background (same as the page, avoiding a page-to-black clash); with a cover, show the cover
    return (
      <View style={[{ width, height: VIDEO_HEIGHT, backgroundColor: theme.card }, styles.placeholder]}>
        {!!coverUrl && (
          <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
        <Text style={[styles.placeholderText, { color: coverUrl ? '#fff' : theme.textSub }]}>Loading video...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const url = playData.durl?.[0]?.url ?? '';
    return (
      <View style={{ width, height: VIDEO_HEIGHT, backgroundColor: '#000' }}>
        <video
          src={url}
          poster={coverUrl}
          style={{ width: '100%', height: '100%', backgroundColor: '#000' } as any}
          controls
          playsInline
        />
      </View>
    );
  }

  return (
    <>
      {/* Portrait and fullscreen render exclusively, so two video decoders are never mounted at once */}
      {!fullscreen && (
        <NativeVideoPlayer
          ref={portraitRef}
          playData={playData}
          qualities={qualities}
          currentQn={currentQn}
          onQualityChange={onQualityChange}
          onFullscreen={handleEnterFullscreen}
          bvid={bvid}
          cid={cid}
          isFullscreen={false}
          initialTime={lastTimeRef.current}
          onTimeUpdate={(t) => { lastTimeRef.current = t; onTimeUpdate?.(t); }}
          onDanmakuListPress={onDanmakuListPress}
          onBack={onBack}
          coverUrl={coverUrl}
        />
      )}

      {fullscreen && (
        <Modal visible animationType="none" statusBarTranslucent>
          <StatusBar hidden />
          <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <View style={needsRotation
              ? { width: height, height: width, transform: [{ rotate: '90deg' }] }
              : { flex: 1, width: '100%' }
            }>
              <NativeVideoPlayer
                playData={playData}
                qualities={qualities}
                currentQn={currentQn}
                onQualityChange={onQualityChange}
                onFullscreen={handleExitFullscreen}
                bvid={bvid}
                cid={cid}
                danmakus={danmakus}
                isFullscreen={true}
                initialTime={lastTimeRef.current}
                onTimeUpdate={(t) => { lastTimeRef.current = t; onTimeUpdate?.(t); }}
                coverUrl={coverUrl}
                style={needsRotation ? { width: height, height: width } : { flex: 1 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 14 },
});
