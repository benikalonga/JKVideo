import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getUploaderInfo, getUploaderVideos } from '../../services/bilibili';
import type { VideoItem } from '../../services/types';
import { useTheme } from '../../utils/theme';
import { formatCount, formatDuration } from '../../utils/format';
import { proxyImageUrl, coverImageUrl } from '../../utils/imageUrl';
import { useSettingsStore } from '../../store/settingsStore';

const PAGE_SIZE = 20;

export default function CreatorScreen() {
  const { mid: midStr } = useLocalSearchParams<{ mid: string }>();
  const mid = Number(midStr);
  const router = useRouter();
  const theme = useTheme();
  const trafficSaving = useSettingsStore(s => s.trafficSaving);

  const [info, setInfo] = useState<{
    name: string; face: string; sign: string; follower: number; archiveCount: number;
  } | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(true);
  const loadingRef = React.useRef(false);

  useEffect(() => {
    getUploaderInfo(mid)
      .then(setInfo)
      .catch(() => {})
      .finally(() => setInfoLoading(false));
    loadVideos(1, true);
  }, [mid]);

  const loadVideos = useCallback(async (pn: number, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const { videos: newVideos, total: t } = await getUploaderVideos(mid, pn, PAGE_SIZE);
      setTotal(t);
      setVideos(prev => reset ? newVideos : [...prev, ...newVideos]);
      setPage(pn);
    } catch {}
    finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [mid]);

  const hasMore = videos.length < total;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>
          {info?.name ?? 'UP主主页'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={videos}
        keyExtractor={item => item.bvid}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasMore && !loading) loadVideos(page + 1); }}
        onEndReachedThreshold={0.3}
        windowSize={7}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        ListHeaderComponent={
          infoLoading ? (
            <ActivityIndicator style={styles.loader} color="#00AEEC" />
          ) : info ? (
            <View style={[styles.profileCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <Image
                source={{ uri: proxyImageUrl(info.face) }}
                style={styles.avatar}
                contentFit="cover"
                recyclingKey={String(mid)}
              />
              <Text style={[styles.name, { color: theme.text }]}>{info.name}</Text>
              {info.sign ? (
                <Text style={[styles.sign, { color: theme.textSub }]} numberOfLines={2}>{info.sign}</Text>
              ) : null}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: theme.text }]}>{formatCount(info.follower)}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSub }]}>粉丝</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: theme.text }]}>{formatCount(info.archiveCount)}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSub }]}>视频</Text>
                </View>
              </View>
              <Text style={[styles.videoListHeader, { color: theme.textSub }]}>
                全部视频（{total}）
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.videoRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
            onPress={() => router.push(`/video/${item.bvid}` as any)}
            activeOpacity={0.85}
          >
            <View style={styles.thumbWrap}>
              <Image
                source={{ uri: coverImageUrl(item.pic, trafficSaving ? 'normal' : 'hd') }}
                style={styles.thumb}
                contentFit="cover"
                recyclingKey={item.bvid}
                transition={200}
              />
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
              </View>
            </View>
            <View style={styles.videoInfo}>
              <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.videoMeta}>
                <Ionicons name="play" size={11} color={theme.textSub} />
                <Text style={[styles.metaText, { color: theme.textSub }]}>{formatCount(item.stat.view)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && !infoLoading ? (
            <Text style={[styles.emptyTxt, { color: theme.textSub }]}>暂无视频</Text>
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={styles.loader} color="#00AEEC" /> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, width: 32 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  profileCard: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  sign: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, marginBottom: 12, lineHeight: 19 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
  statNum: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  videoListHeader: { alignSelf: 'flex-start', paddingHorizontal: 14, fontSize: 13, paddingBottom: 8 },
  loader: { marginVertical: 24 },
  videoRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  thumbWrap: { width: 120, height: 68, borderRadius: 4, overflow: 'hidden', flexShrink: 0, position: 'relative' },
  thumb: { width: 120, height: 68 },
  durationBadge: {
    position: 'absolute', bottom: 3, right: 3,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
  durationText: { color: '#fff', fontSize: 10 },
  videoInfo: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  videoTitle: { fontSize: 13, lineHeight: 18 },
  videoMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12 },
  emptyTxt: { textAlign: 'center', padding: 40 },
});
