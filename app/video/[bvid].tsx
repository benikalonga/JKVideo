import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  InteractionManager,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoPlayer } from "../../components/VideoPlayer";
import { getDanmaku, getUploaderStat } from "../../services/bilibili";
import type { DanmakuItem, VideoItem } from "../../services/types";
import { useVideoDetail } from "../../hooks/useVideoDetail";
import { useRelatedVideos } from "../../hooks/useRelatedVideos";
import { formatCount, formatDuration, formatTime } from "../../utils/format";
import { proxyImageUrl } from "../../utils/imageUrl";
import { DownloadSheet } from "../../components/DownloadSheet";
import { VideoDetailSkeleton } from "../../components/VideoDetailSkeleton";
import { useTheme } from "../../utils/theme";
import { useLiveStore } from "../../store/liveStore";
import { VideoActionRow } from "../../components/VideoActionRow";
import { DescriptionSheet } from "../../components/DescriptionSheet";
import { EngagementSheet, type EngagementTab } from "../../components/EngagementSheet";
import { useFollow } from "../../hooks/useFollow";

export default function VideoDetailScreen() {
  const { bvid } = useLocalSearchParams<{ bvid: string }>();
  const router = useRouter();
  const theme = useTheme();

  useLayoutEffect(() => {
    useLiveStore.getState().clearLive();
  }, []);

  // Minimum skeleton display time: even if data returns instantly, keep it up this long to avoid a flash.
  // Important: depends on [bvid], so switching via playlist/recommendations resets it and the skeleton covers stale content.
  const SKELETON_MIN_MS = 600;
  const [minSkeletonElapsed, setMinSkeletonElapsed] = useState(false);
  useEffect(() => {
    setMinSkeletonElapsed(false);
    const t = setTimeout(() => setMinSkeletonElapsed(true), SKELETON_MIN_MS);
    return () => clearTimeout(t);
  }, [bvid]);

  const {
    video,
    playData,
    loading: videoLoading,
    qualities,
    currentQn,
    changeQuality,
    initialTime,
  } = useVideoDetail(bvid as string);

  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDownload, setShowDownload] = useState(false);
  const [showDescSheet, setShowDescSheet] = useState(false);
  // Combined comments/danmaku sheet: null = closed, otherwise the tab that should open
  const [engagementTab, setEngagementTab] = useState<EngagementTab | null>(null);
  const [uploaderStat, setUploaderStat] = useState<{
    follower: number;
    archiveCount: number;
  } | null>(null);

  // When switching videos, clear all transient state tied to the old video so the new page never briefly shows old danmaku, old creator stats or an open sheet
  useEffect(() => {
    setDanmakus([]);
    setUploaderStat(null);
    setCurrentTime(0);
    setShowDescSheet(false);
    setShowDownload(false);
    setEngagementTab(null);
  }, [bvid]);

  const { following, loading: followLoading, toggle: toggleFollow } = useFollow(
    video?.owner.mid,
  );

  // Align the sheet top to the bottom of the player: safe-area top inset + player height (no TopBar; the back button floats over the player)
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const sheetTopOffset = insets.top + SCREEN_W * 0.5625;

  const {
    videos: relatedVideos,
    loading: relatedLoading,
    load: loadRelated,
  } = useRelatedVideos(bvid as string);

  // Recommendations are not part of the first screen; fetch after the navigation animation so they do not compete with details/playback for the JS thread
  // Depends on [bvid]: refetch recommendations when switching to a new video via playlist/recommendations
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      loadRelated();
    });
    return () => handle.cancel();
  }, [bvid, loadRelated]);

  useEffect(() => {
    if (!video?.cid) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      getDanmaku(video.cid!).then(setDanmakus).catch(() => {});
    });
    return () => handle.cancel();
  }, [video?.cid]);

  useEffect(() => {
    if (!video?.owner?.mid) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      getUploaderStat(video.owner.mid).then(setUploaderStat).catch(() => {});
    });
    return () => handle.cancel();
  }, [video?.owner?.mid]);

  const shareUrl = bvid ? `https://www.bilibili.com/video/${bvid}` : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.card }]}>
      <VideoPlayer
        playData={playData}
        qualities={qualities}
        currentQn={currentQn}
        onQualityChange={changeQuality}
        bvid={bvid as string}
        cid={video?.cid}
        danmakus={danmakus}
        onTimeUpdate={setCurrentTime}
        initialTime={initialTime}
        onBack={() => router.back()}
        coverUrl={video?.pic ? proxyImageUrl(video.pic) : undefined}
      />

      {videoLoading || !video || !minSkeletonElapsed ? (
        <VideoDetailSkeleton />
      ) : (
        <FlatList<VideoItem>
          // bvid is the key, so the FlatList remounts when switching videos and scroll returns to the top, avoiding stale content
          key={bvid}
          style={styles.scroll}
          data={relatedVideos}
          keyExtractor={(item) => item.bvid}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Title + meta row (tap to open the description sheet) */}
              <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                  {video.title}
                </Text>
                <TouchableOpacity
                  style={styles.metaRow}
                  activeOpacity={0.7}
                  onPress={() => setShowDescSheet(true)}
                >
                  <Text
                    style={[styles.metaText, { color: theme.textSub }]}
                    numberOfLines={1}
                  >
                    {formatCount(video.stat?.view ?? 0)} views
                    {video.pubdate ? ` · ${formatTime(video.pubdate)}` : ""}
                    {video.stat?.like ? ` · ${formatCount(video.stat.like)} likes` : ""}
                    {video.tname ? ` · ${video.tname}` : ""}
                  </Text>
                  <Text style={[styles.metaMore, { color: theme.textSub }]}>More</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.textSub} />
                </TouchableOpacity>
              </View>

              {/* Action button row */}
              <View style={[styles.actionWrap, { borderTopColor: theme.border }]}>
                <VideoActionRow
                  stat={video.stat ?? undefined}
                  danmakuCount={danmakus.length || video.stat?.danmaku}
                  title={video.title}
                  shareUrl={shareUrl}
                  onDownload={() => setShowDownload(true)}
                  onComments={() => setEngagementTab("comments")}
                  onDanmaku={() => setEngagementTab("danmaku")}
                />
              </View>

              {/* Creator row + follow button */}
              <View
                style={[
                  styles.creatorRow,
                  { borderTopColor: theme.border, borderBottomColor: theme.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.creatorLeft}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/creator/${video.owner.mid}` as any)}
                >
                  <Image
                    source={{ uri: proxyImageUrl(video.owner.face) }}
                    style={styles.avatar}
                    contentFit="cover"
                    recyclingKey={String(video.owner.mid)}
                  />
                  <View style={styles.creatorInfo}>
                    <Text
                      style={[styles.creatorName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {video.owner.name}
                    </Text>
                    {uploaderStat && (
                      <Text
                        style={[styles.creatorStat, { color: theme.textSub }]}
                        numberOfLines={1}
                      >
                        {formatCount(uploaderStat.follower)} followers ·{" "}
                        {formatCount(uploaderStat.archiveCount)} videos
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subBtn, following && styles.subBtnFollowing]}
                  activeOpacity={0.85}
                  onPress={toggleFollow}
                  disabled={followLoading}
                >
                  <Text
                    style={[
                      styles.subBtnTxt,
                      following && { color: theme.textSub },
                    ]}
                  >
                    {following ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Playlist */}
              {video.ugc_season && (
                <SeasonSection
                  season={video.ugc_season}
                  currentBvid={bvid as string}
                  onEpisodePress={(epBvid) => router.replace(`/video/${epBvid}`)}
                />
              )}

              {/* Recommended videos heading */}
              <View style={[styles.relatedHeader, { backgroundColor: theme.card }]}>
                <Text style={[styles.relatedHeaderText, { color: theme.text }]}>
                  Recommended videos
                </Text>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.relatedCard,
                { backgroundColor: theme.card, borderBottomColor: theme.border },
              ]}
              onPress={() => router.replace(`/video/${item.bvid}` as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.relatedThumbWrap, { backgroundColor: theme.card }]}>
                <Image
                  source={{ uri: proxyImageUrl(item.pic) }}
                  style={styles.relatedThumb}
                  contentFit="cover"
                  recyclingKey={item.bvid}
                  transition={200}
                />
                <View style={styles.relatedDuration}>
                  <Text style={styles.relatedDurationText}>
                    {formatDuration(item.duration)}
                  </Text>
                </View>
              </View>
              <View style={styles.relatedInfo}>
                <Text
                  style={[styles.relatedTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={[styles.relatedOwner, { color: theme.textSub }]}
                    numberOfLines={1}
                  >
                    {item.owner?.name ?? ""}
                  </Text>
                  <Text style={[styles.relatedView, { color: theme.textSub }]}>
                    {formatCount(item.stat?.view ?? 0)} views
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            relatedLoading ? (
              <ActivityIndicator style={styles.loader} color="#00AEEC" />
            ) : null
          }
          ListFooterComponent={
            relatedLoading ? (
              <ActivityIndicator style={styles.loader} color="#00AEEC" />
            ) : null
          }
        />
      )}

      <DownloadSheet
        visible={showDownload}
        onClose={() => setShowDownload(false)}
        topOffset={sheetTopOffset}
        bvid={bvid as string}
        cid={video?.cid ?? 0}
        title={video?.title ?? ""}
        cover={video?.pic ?? ""}
        qualities={qualities}
      />
      <DescriptionSheet
        visible={showDescSheet}
        onClose={() => setShowDescSheet(false)}
        topOffset={sheetTopOffset}
        video={video ?? null}
      />
      <EngagementSheet
        visible={engagementTab !== null}
        onClose={() => setEngagementTab(null)}
        topOffset={sheetTopOffset}
        initialTab={engagementTab ?? "comments"}
        aid={video?.aid ?? 0}
        replyCount={video?.stat?.reply}
        danmakus={danmakus}
        currentTime={currentTime}
      />
    </SafeAreaView>
  );
}

function SeasonSection({
  season,
  currentBvid,
  onEpisodePress,
}: {
  season: NonNullable<VideoItem["ugc_season"]>;
  currentBvid: string;
  onEpisodePress: (bvid: string) => void;
}) {
  const theme = useTheme();
  const { width: screenW } = useWindowDimensions();
  const episodes = season.sections?.[0]?.episodes ?? [];
  const currentIndex = episodes.findIndex((ep) => ep.bvid === currentBvid);
  const listRef = useRef<FlatList>(null);
  // Stay hidden on first render and show after scrollToOffset completes, removing the visible jump from 0
  const [ready, setReady] = useState(currentIndex <= 0);

  // Compute the initial contentOffset that centers the current episode horizontally
  const initialOffset = useMemo(() => {
    if (currentIndex <= 0) return 0;
    const ITEM_WIDTH = 120;
    const STEP = 130; // 120 + 10 gap
    const PADDING = 12;
    const itemCenter = PADDING + currentIndex * STEP + ITEM_WIDTH / 2;
    return Math.max(0, itemCenter - screenW / 2);
  }, [currentIndex, screenW]);

  const handleContentSizeChange = useCallback(() => {
    if (ready) return;
    if (currentIndex > 0 && initialOffset > 0) {
      listRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
    }
    requestAnimationFrame(() => setReady(true));
  }, [ready, currentIndex, initialOffset]);

  return (
    <View style={[styles.seasonBox, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.seasonHeader}>
        <Text style={[styles.seasonTitle, { color: theme.text }]}>Playlist · {season.title}</Text>
        <Text style={styles.seasonCount}>{season.ep_count} videos</Text>
        <Ionicons name="chevron-forward" size={14} color="#999" />
      </View>
      <FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={episodes}
        keyExtractor={(ep) => ep.bvid}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
        getItemLayout={(_data, index) => ({ length: 130, offset: 12 + index * 130, index })}
        contentOffset={{ x: initialOffset, y: 0 }}
        onContentSizeChange={handleContentSizeChange}
        onScrollToIndexFailed={() => {}}
        style={{ opacity: ready ? 1 : 0 }}
        renderItem={({ item: ep, index }) => {
          const isCurrent = ep.bvid === currentBvid;
          return (
            <TouchableOpacity
              style={[
                styles.epCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                isCurrent && styles.epCardActive,
              ]}
              onPress={() => !isCurrent && onEpisodePress(ep.bvid)}
              activeOpacity={0.8}
            >
              {ep.arc?.pic && (
                <Image
                  source={{ uri: proxyImageUrl(ep.arc.pic) }}
                  style={[styles.epThumb, { backgroundColor: theme.card }]}
                  contentFit="cover"
                  recyclingKey={ep.bvid}
                />
              )}
              <Text style={[styles.epNum, isCurrent && styles.epNumActive]}>Ep. {index + 1}</Text>
              <Text style={[styles.epTitle, { color: theme.text }]} numberOfLines={2}>{ep.title}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loader: { marginVertical: 30 },
  scroll: { flex: 1 },

  // Title + meta (YouTube style)
  titleBlock: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  metaText: { flex: 1, fontSize: 12, lineHeight: 18 },
  metaMore: { fontSize: 12, lineHeight: 18, marginLeft: 6, marginRight: 2 },

  // Action row wrapper
  actionWrap: { borderTopWidth: StyleSheet.hairlineWidth },

  // Creator row
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  creatorLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  avatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  creatorInfo: { flex: 1 },
  creatorName: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  creatorStat: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  subBtn: {
    backgroundColor: "#00AEEC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  // Following: light gray background + gray text (textSub comes from useTheme)
  subBtnFollowing: { backgroundColor: "rgba(127,127,127,0.18)" },
  subBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Playlist
  seasonBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 4,
  },
  seasonTitle: { flex: 1, fontSize: 13, fontWeight: "600" },
  seasonCount: { fontSize: 12, color: "#999" },
  epCard: { width: 120, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "transparent" },
  epCardActive: { borderColor: "#00AEEC", borderWidth: 1.5 },
  epThumb: { width: 120, height: 68 },
  epNum: { fontSize: 11, color: "#999", paddingHorizontal: 6, paddingTop: 4 },
  epNumActive: { color: "#00AEEC", fontWeight: "600" },
  epTitle: { fontSize: 12, paddingHorizontal: 6, paddingBottom: 6, lineHeight: 16 },

  // Recommendations list
  relatedHeader: { paddingLeft: 13, paddingBottom: 8, paddingTop: 12 },
  relatedHeaderText: { fontSize: 13, fontWeight: "600" as const },
  relatedCard: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  relatedThumbWrap: {
    position: "relative",
    width: 120,
    height: 68,
    borderRadius: 4,
    overflow: "hidden",
    flexShrink: 0,
  },
  relatedThumb: { width: 120, height: 68 },
  relatedDuration: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  relatedDurationText: { color: "#fff", fontSize: 10 },
  relatedInfo: { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  relatedTitle: { fontSize: 13, lineHeight: 18 },
  relatedOwner: { fontSize: 12 },
  relatedView: { fontSize: 11 },
});
