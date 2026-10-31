import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  InteractionManager,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommentItem } from "./CommentItem";
import DanmakuList from "./DanmakuList";
import { useComments } from "../hooks/useComments";
import { useTheme } from "../utils/theme";
import { formatCount } from "../utils/format";
import { useSheetTransition } from "../utils/useSheetTransition";
import type { DanmakuItem } from "../services/types";

export type EngagementTab = "comments" | "danmaku";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Absolute screen Y to align the sheet top to (usually the bottom of the player) */
  topOffset: number;
  initialTab: EngagementTab;
  aid: number;
  replyCount?: number;
  danmakus: DanmakuItem[];
  currentTime: number;
}

export function EngagementSheet({
  visible,
  onClose,
  topOffset,
  initialTab,
  aid,
  replyCount,
  danmakus,
  currentTime,
}: Props) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const sheetH = Math.max(120, height - topOffset);
  const { rendered, slideAnim } = useSheetTransition(visible, sheetH);

  const [tab, setTab] = useState<EngagementTab>(initialTab);
  const [commentSort, setCommentSort] = useState<0 | 2>(2);
  const { comments, loading, hasMore, load } = useComments(aid, commentSort);

  // Each time it opens, switch to the tab given by the external initialTab
  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  // Lazy-load comments: only fetch when the sheet is visible and the comments tab is selected
  useEffect(() => {
    if (!visible || !aid || tab !== "comments") return;
    const handle = InteractionManager.runAfterInteractions(() => load());
    return () => handle.cancel();
  }, [visible, aid, commentSort, tab, load]);

  if (!rendered) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.sheet,
          {
            top: topOffset,
            backgroundColor: theme.sheetBg,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Tab bar + close button */}
        <View style={[styles.tabBar, { borderBottomColor: theme.modalBorder }]}>
          {(["comments", "danmaku"] as EngagementTab[]).map((t) => {
            const label =
              t === "comments"
                ? `Comments${replyCount ? ` ${formatCount(replyCount)}` : ""}`
                : `Danmaku${danmakus.length ? ` ${formatCount(danmakus.length)}` : ""}`;
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                style={styles.tabItem}
                onPress={() => setTab(t)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: theme.modalTextSub },
                    active && { color: theme.modalText, fontWeight: "700" },
                  ]}
                >
                  {label}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.modalTextSub} />
          </TouchableOpacity>
        </View>

        {/* Comments tab */}
        {tab === "comments" && (
          <>
            <View style={[styles.sortRow, { borderBottomColor: theme.modalBorder }]}>
              {([2, 0] as const).map((sort) => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.sortBtn,
                    { backgroundColor: theme.inputBg },
                    commentSort === sort && styles.sortBtnActive,
                  ]}
                  onPress={() => setCommentSort(sort)}
                >
                  <Text
                    style={[
                      styles.sortBtnTxt,
                      { color: theme.modalTextSub },
                      commentSort === sort && styles.sortBtnTxtActive,
                    ]}
                  >
                    {sort === 2 ? "Top" : "Newest"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <FlatList
              style={styles.list}
              data={comments}
              keyExtractor={(c) => String(c.rpid)}
              renderItem={({ item }) => <CommentItem item={item} />}
              onEndReached={() => {
                if (hasMore && !loading) load();
              }}
              onEndReachedThreshold={0.3}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                loading ? (
                  <ActivityIndicator style={styles.loader} color="#00AEEC" />
                ) : !hasMore && comments.length > 0 ? (
                  <Text style={[styles.emptyTxt, { color: theme.modalTextSub }]}>
                    All comments loaded
                  </Text>
                ) : null
              }
              ListEmptyComponent={
                !loading ? (
                  <Text style={[styles.emptyTxt, { color: theme.modalTextSub }]}>
                    No comments yet
                  </Text>
                ) : null
              }
            />
          </>
        )}

        {/* Danmaku tab: hideHeader=true lets the list fill the space; this sheet's top tabs act as the header */}
        {tab === "danmaku" && (
          <DanmakuList
            danmakus={danmakus}
            currentTime={currentTime}
            visible
            onToggle={() => {}}
            hideHeader
            style={styles.danmakuList}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    position: "relative",
    alignItems: "center",
  },
  tabLabel: { fontSize: 14 },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: "#00AEEC",
    borderRadius: 1,
  },
  closeBtn: { padding: 10 },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
  },
  sortBtnActive: { backgroundColor: "#00AEEC" },
  sortBtnTxt: { fontSize: 13, fontWeight: "500" },
  sortBtnTxtActive: { color: "#fff", fontWeight: "600" },
  list: { flex: 1 },
  loader: { marginVertical: 30 },
  emptyTxt: { textAlign: "center", padding: 30, fontSize: 13 },
  danmakuList: { flex: 1, borderTopWidth: 0 },
});
