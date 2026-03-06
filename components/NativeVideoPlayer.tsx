import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 0.5625;

interface Props {
  uri: string;
}

export function NativeVideoPlayer({ uri }: Props) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const onPlaybackStatusUpdate = (s: AVPlaybackStatus) => {
    if (s.isLoaded) setIsPlaying(s.isPlaying);
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri, headers: { Referer: 'https://www.bilibili.com' } }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        useNativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height: VIDEO_HEIGHT, backgroundColor: '#000' },
  video: { width, height: VIDEO_HEIGHT },
});
