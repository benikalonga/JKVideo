import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 0.5625;

interface Props {
  uri: string;
}

const buildHtml = (uri: string) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin:0; padding:0; box-sizing:border-box; background:#000; }
  video { width:100vw; height:100vh; object-fit:contain; display:block; }
</style>
</head>
<body>
<video id="v" controls autoplay playsinline webkit-playsinline></video>
<script>
  document.getElementById('v').src = ${JSON.stringify(uri)};
</script>
</body>
</html>
`;

export function NativeVideoPlayer({ uri }: Props) {
  return (
    <View style={styles.container}>
      <WebView
        source={{ html: buildHtml(uri) }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height: VIDEO_HEIGHT, backgroundColor: '#000' },
  webview: { width, height: VIDEO_HEIGHT, backgroundColor: '#000' },
});
