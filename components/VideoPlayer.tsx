import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 0.5625;

interface Props {
  uri: string | null;
}

export function VideoPlayer({ uri }: Props) {
  if (!uri) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>视频加载中...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <video
          src={uri}
          style={{ width: '100%', height: '100%', backgroundColor: '#000' } as any}
          controls
          playsInline
        />
      </View>
    );
  }

  // Native: use expo-av
  const NativeVideoPlayer = require('./NativeVideoPlayer').NativeVideoPlayer;
  return <NativeVideoPlayer uri={uri} />;
}

const styles = StyleSheet.create({
  container: { width, height: VIDEO_HEIGHT, backgroundColor: '#000' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 14 },
});
