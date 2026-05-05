import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoPlayer } from "../../components/VideoPlayer";
import { CommentItem } from "../../components/CommentItem";
import { getDanmaku, getUploaderStat } from "../../services/bilibili";
import { DanmakuItem } from "../../services/types";
import DanmakuList from "../../components/DanmakuList";
import { useVideoDetail } from "../../hooks/useVideoDetail";
import { useComments } from "../../hooks/useComments";
import { useRelatedVideos } from "../../hooks/useRelatedVideos";
import { formatCount, formatDuration } from "../../utils/format";
import { proxyImageUrl } from "../../utils/imageUrl";
import { DownloadSheet } from "../../components/DownloadSheet";
import { useTheme } from "../../utils/theme";
import { useLiveStore } from "../../store/liveStore";

type Tab = "intro" | "comments" | "danmaku";

export default function VideoDetailScreen() {
  const { bvid } = useLocalSearchParams<{ bvid: string }>();
  const router = useRouter();
  const theme = useTheme();

  useLayoutEffect(() => {
    useLiveStore.getState().clearLive();
  }, []);

  const {
    video,
    playData,
    loading: videoLoading,
    qualities,
    currentQn,
    changeQuality,
  } = useVideoDetail(bvid as string);
  const [commentSort, setCommentSort] = useState<0 | 2>(2);
  const {
    comments,
    loading: cmtLoading,
    hasMore: cmtHasMore,
    load: loadComments,
  } = useComments(video?.aid ?? 0, commentSort);
  const [tab, setTab] = useState<Tab>("intro");
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDownload, setShowDownload] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const [uploaderStat, setUploaderStat] = useState<{
    follower: number;
    archiveCount: number;
  } | null>(null);
  const {
    videos: relatedVideos,
    loading: relatedLoading,
    load: loadRelated,
  } = useRelatedVideos(bvid as string);

  useEffect(() => { loadRelated(); }, []);

  useEffect(() => {
    if (video?.aid) loadComments();
  }, [video?.aid, commentSort]);

  useEffect(() => {
    if (!video?.cid) return;
    getDanmaku(video.cid).then(setDanmakus).catch(() => {});
  }, [video?.cid]);

  useEffect(() => {
    if (!video?.owner?.mid) return;
    getUploaderStat(video.owner.mid).then(setUploaderStat).catch(() => {});
  }, [video?.owner?.mid]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.card }]}>
      {/* TopBar */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>
          {video?.title ?? "视频详情"}
        </Text>
        <TouchableOpacity style={styles.miniBtn} onPress={() => setShowDownload(true)}>
          <Ionicons name="cloud-download-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <VideoPlayer
        playData={playData}
        qualities={qualities}
        currentQn={currentQn}
        onQualityChange={changeQuality}
        bvid={bvid as string}
        cid={video?.cid}
        danmakus={danmakus}
        onTimeUpdate={setCurrentTime}
      />
      <DownloadSheet
        visible={showDownload}
        onClose={() => setShowDownload(false)}
        bvid={bvid as string}
        cid={video?.cid ?? 0}
        title={video?.title ?? ""}
        cover={video?.pic ?? ""}
        qualities={qualities}
      />

      {/* TabBar */}
      {video && (
        <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
          {(["intro", "comments", "danmaku"] as Tab[]).map((t) => {
            const label =
              t === "intro" ? "简介"
              : t === "comments" ? `评论${video.stat?.reply ? ` ${formatCount(video.stat.reply)}` : ""}`
              : `弹幕${danmakus.length ? ` ${formatCount(danmakus.length)}` : ""}`;
            return (
              <TouchableOpacity key={t} style={styles.tabItem} onPress={() => setTab(t)}>
                <Text style={[styles.tabLabel, { color: theme.textSub }, tab === t && styles.tabActive]}>
                  {label}
                </Text>
                {tab === t && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Tab content */}
      {videoLoading ? (
        <ActivityIndicator style={styles.loader} color="#00AEEC" />
      ) : video ? (
        <>
          {tab === "intro" && (
            <FlatList<import("../../services/types").VideoItem>
              style={styles.tabScroll}
              data={relatedVideos}
              keyExtractor={(item) => item.bvid}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  <TouchableOpacity
                    style={styles.upRow}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/creator/${video.owner.mid}` as any)}
                  >
                    <Image
                      source={{ uri: proxyImageUrl(video.owner.face) }}
                      style={styles.avatar}
                      contentFit="cover"
                      recyclingKey={String(video.owner.mid)}
                    />
                    <View style={styles.upInfo}>
                      <Text style={[styles.upName, { color: theme.text }]}>{video.owner.name}</Text>
                      {uploaderStat && (
                        <Text style={styles.upStat}>
                          {formatCount(uploaderStat.follower)}粉丝 · {formatCount(uploaderStat.archiveCount)}视频
                        </Text>
                      )}
                    </View>
                    <View style={styles.upStats}>
                      <Ionicons name="play-outline" size={12} color={theme.textSub} />
                      <Text style={styles.upStatTxt}>{formatCount(video.stat?.view ?? 0)}</Text>
                      <Text style={styles.upStatDot}>·</Text>
                      <Ionicons name="heart-outline" size={12} color={theme.textSub} />
                      <Text style={styles.upStatTxt}>{formatCount(video.stat?.like ?? 0)}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.titleSection, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.title, { color: theme.text }]}>{video.title}</Text>
                    {!!video.tname && (
                      <View style={styles.tnameBadge}>
                        <Text style={styles.tnameText}>{video.tname}</Text>
                      </View>
                    )}
                    {!!video.desc && (
                      <Text
                        style={[styles.subTitle, styles.descMeasure]}
                        onTextLayout={(e) => setDescOverflows(e.nativeEvent.lines.length > 2)}
                      >
                        {video.desc}
                      </Text>
                    )}
                    <Text
                      style={[styles.subTitle, { color: theme.textSub }]}
                      numberOfLines={descExpanded ? undefined : 2}
                    >
                      {video.desc || "暂无简介"}
                    </Text>
                    {descOverflows && (
                      <TouchableOpacity
                        onPress={() => setDescExpanded(e => !e)}
                        style={styles.expandBtn}
                      >
                        <Ionicons name={descExpanded ? "chevron-up" : "chevron-down"} size={13} color="#00AEEC" />
                        <Text style={styles.expandBtnTxt}>{descExpanded ? "收起" : "展开"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {video.ugc_season && (
                    <SeasonSection
                      season={video.ugc_season}
                      currentBvid={bvid as string}
                      onEpisodePress={(epBvid) => router.replace(`/video/${epBvid}`)}
                    />
                  )}
                  <View style={[styles.relatedHeader, { backgroundColor: theme.card }]}>
                    <Text style={[styles.relatedHeaderText, { color: theme.text }]}>推荐视频</Text>
                  </View>
                </>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.relatedCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
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
                      <Text style={styles.relatedDurationText}>{formatDuration(item.duration)}</Text>
                    </View>
                  </View>
                  <View style={styles.relatedInfo}>
                    <Text style={[styles.relatedTitle, { color: theme.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.relatedOwner} numberOfLines={1}>{item.owner?.name ?? ""}</Text>
                      <Text style={styles.relatedView}>{formatCount(item.stat?.view ?? 0)} 播放</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                relatedLoading ? <ActivityIndicator style={styles.loader} color="#00AEEC" /> : null
              }
              ListFooterComponent={
                relatedLoading ? <ActivityIndicator style={styles.loader} color="#00AEEC" /> : null
              }
            />
          )}

          {tab === "comments" && (
            <FlatList
              style={styles.tabScroll}
              data={comments}
              keyExtractor={(c) => String(c.rpid)}
              renderItem={({ item }) => <CommentItem item={item} />}
              onEndReached={() => { if (cmtHasMore && !cmtLoading) loadComments(); }}
              onEndReachedThreshold={0.3}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={[styles.sortRow, { borderBottomColor: theme.border }]}>
                  {([2, 0] as const).map((sort) => (
                    <TouchableOpacity
                      key={sort}
                      style={[styles.sortBtn, commentSort === sort && styles.sortBtnActive]}
                      onPress={() => setCommentSort(sort)}
                    >
                      <Text style={[styles.sortBtnTxt, commentSort === sort && styles.sortBtnTxtActive]}>
                        {sort === 2 ? "热门" : "最新"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
              ListFooterComponent={
                cmtLoading ? (
                  <ActivityIndicator style={styles.loader} color="#00AEEC" />
                ) : !cmtHasMore && comments.length > 0 ? (
                  <Text style={styles.emptyTxt}>已加载全部评论</Text>
                ) : null
              }
              ListEmptyComponent={!cmtLoading ? <Text style={styles.emptyTxt}>暂无评论</Text> : null}
            />
          )}

          {/* 弹幕面板：始终挂载，切 tab 时用 display:none 隐藏而不卸载 */}
          <DanmakuList
            danmakus={danmakus}
            currentTime={currentTime}
            visible={tab === "danmaku"}
            onToggle={() => {}}
            hideHeader={true}
            style={[styles.danmakuTab, tab !== "danmaku" && { display: "none" }]}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}


function SeasonSection({
  season,
  currentBvid,
  onEpisodePress,
}: {
  season: NonNullable<import("../../services/types").VideoItem["ugc_season"]>;
  currentBvid: string;
  onEpisodePress: (bvid: string) => void;
}) {
  const theme = useTheme();
  const episodes = season.sections?.[0]?.episodes ?? [];
  const currentIndex = episodes.findIndex((ep) => ep.bvid === currentBvid);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (currentIndex <= 0 || episodes.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: currentIndex, viewPosition: 0.5, animated: false });
    }, 200);
    return () => clearTimeout(t);
  }, [currentIndex, episodes.length]);

  return (
    <View style={[styles.seasonBox, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.seasonHeader}>
        <Text style={[styles.seasonTitle, { color: theme.text }]}>合集 · {season.title}</Text>
        <Text style={styles.seasonCount}>{season.ep_count}个视频</Text>
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
        onScrollToIndexFailed={() => {}}
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
              <Text style={[styles.epNum, isCurrent && styles.epNumActive]}>第{index + 1}集</Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  topTitle: { flex: 1, fontSize: 15, fontWeight: "600", marginLeft: 4 },
  miniBtn: { padding: 4 },
  loader: { marginVertical: 30 },
  titleSection: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 13, fontWeight: "600", lineHeight: 22, marginBottom: 6 },
  tnameBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,174,236,0.12)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  tnameText: { fontSize: 11, color: "#00AEEC" },
  subTitle: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  descMeasure: { position: "absolute", opacity: 0, left: 0, right: 0 },
  expandBtn: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 8 },
  expandBtnTxt: { fontSize: 12, color: "#00AEEC" },
  upRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10, marginTop: 1 },
  upInfo: { flex: 1 },
  upName: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  upStat: { fontSize: 11, color: "#999", marginTop: 2, lineHeight: 16 },
  upStats: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  upStatTxt: { fontSize: 11, color: "#999" },
  upStatDot: { fontSize: 11, color: "#ccc" },
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
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, paddingLeft: 3 },
  tabItem: { alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, position: "relative" },
  tabLabel: { fontSize: 13 },
  tabActive: { color: "#00AEEC" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: 24,
    height: 2,
    backgroundColor: "#00AEEC",
    borderRadius: 1,
  },
  tabScroll: { flex: 1 },
  descBox: { padding: 16 },
  descText: { fontSize: 14, lineHeight: 22 },
  danmakuTab: { flex: 1 },
  emptyTxt: { textAlign: "center", color: "#bbb", padding: 30 },
  relatedHeader: { paddingLeft: 13, paddingBottom: 8, paddingTop: 8 },
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
  relatedOwner: { fontSize: 12, color: "#999" },
  relatedView: { fontSize: 11, color: "#bbb" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 16, backgroundColor: "#f0f0f0" },
  sortBtnActive: { backgroundColor: "#00AEEC" },
  sortBtnTxt: { fontSize: 13, color: "#333", fontWeight: "500" },
  sortBtnTxtActive: { color: "#fff", fontWeight: "600" as const },
});
