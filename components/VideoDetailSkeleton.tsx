import React, { useEffect, useRef, memo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "../utils/theme";

// 注意：原版本每个 SkeletonBlock 都调 useTheme，导致 40+ 个 store 订阅
// + 整体 6 张卡片 + opacity loop，进入页面瞬间产生明显抖动。
// 现优化：颜色由顶层 useTheme 一次拿到，所有 block 走 inline style。

interface BlockProps {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  bg: string;
  style?: any;
}

const SkeletonBlock = memo(function SkeletonBlock({ width, height, radius = 4, bg, style }: BlockProps) {
  return (
    <View
      style={[
        { width, height, borderRadius: radius, backgroundColor: bg },
        style,
      ]}
    />
  );
});

const RelatedCardSkeleton = memo(function RelatedCardSkeleton({ bg, border }: { bg: string; border: string }) {
  return (
    <View style={[styles.card, { borderBottomColor: border }]}>
      <SkeletonBlock width={120} height={68} radius={4} bg={bg} />
      <View style={styles.cardInfo}>
        <View>
          <SkeletonBlock width={"100%"} height={12} bg={bg} />
          <SkeletonBlock width={"70%"} height={12} bg={bg} style={{ marginTop: 6 }} />
        </View>
        <View style={styles.cardMeta}>
          <SkeletonBlock width={70} height={10} bg={bg} />
          <SkeletonBlock width={50} height={10} bg={bg} />
        </View>
      </View>
    </View>
  );
});

const CARD_COUNT = 4;

export function VideoDetailSkeleton() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const bg = theme.placeholder;
  const border = theme.border;

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.card, opacity }]}>
      {/* UP 主行 */}
      <View style={styles.upRow}>
        <SkeletonBlock width={38} height={38} radius={19} bg={bg} />
        <View style={styles.upInfo}>
          <SkeletonBlock width={120} height={13} bg={bg} />
          <SkeletonBlock width={160} height={11} bg={bg} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* 标题 + 简介 */}
      <View style={[styles.titleSection, { borderBottomColor: border }]}>
        <SkeletonBlock width={"95%"} height={14} bg={bg} />
        <SkeletonBlock width={"60%"} height={14} bg={bg} style={{ marginTop: 8 }} />
        <SkeletonBlock width={48} height={16} radius={4} bg={bg} style={{ marginTop: 12 }} />
        <SkeletonBlock width={"100%"} height={12} bg={bg} style={{ marginTop: 12 }} />
        <SkeletonBlock width={"80%"} height={12} bg={bg} style={{ marginTop: 6 }} />
      </View>

      {/* 推荐视频标题 */}
      <View style={styles.relatedHeader}>
        <SkeletonBlock width={64} height={13} bg={bg} />
      </View>

      {/* 推荐卡片占位（4 张足够撑满首屏，少绘制开销） */}
      {Array.from({ length: CARD_COUNT }).map((_, i) => (
        <RelatedCardSkeleton key={i} bg={bg} border={border} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  upRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  upInfo: { flex: 1, marginLeft: 10 },
  titleSection: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  relatedHeader: {
    paddingLeft: 13,
    paddingTop: 10,
    paddingBottom: 8,
  },
  card: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  cardInfo: { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
