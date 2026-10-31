import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/theme";
import { formatCount } from "../utils/format";
import { toast } from "../utils/toast";

interface Props {
  /** Video stats: likes/coins/favorites/comments. If unavailable, no number is shown under the button. */
  stat?: {
    like: number;
    coin: number;
    favorite: number;
    reply?: number;
  } | null;
  /** Number of loaded danmaku (if unavailable, the button shows the plain label "Danmaku"). */
  danmakuCount?: number;
  /** Video title shown when sharing. */
  title?: string;
  /** Link attached when sharing (usually https://www.bilibili.com/video/BVxxx). */
  shareUrl?: string;
  onDownload: () => void;
  onComments: () => void;
  onDanmaku: () => void;
}

export const VideoActionRow = React.memo(function VideoActionRow({
  stat,
  danmakuCount,
  title,
  shareUrl,
  onDownload,
  onComments,
  onDanmaku,
}: Props) {
  const theme = useTheme();

  const handleShare = async () => {
    if (!shareUrl) {
      toast("No share link available");
      return;
    }
    try {
      await Share.share({
        message: title ? `${title}\n${shareUrl}` : shareUrl,
        url: shareUrl,
      });
    } catch {
      // User cancelled or the system refused; nothing to do
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {/* <Btn
        icon="thumbs-up-outline"
        label={stat?.like ? formatCount(stat.like) : "Like"}
        onPress={() => toast("Not implemented yet")}
        color={theme.text}
        bg={theme.inputBg}
      /> */}
      {/* <Btn
        icon="thumbs-down-outline"
        label="Dislike"
        onPress={() => toast("Not implemented yet")}
        color={theme.text}
        bg={theme.inputBg}
      /> */}
      <Btn
        icon="chatbubble-outline"
        label={stat?.reply ? formatCount(stat.reply) : "Comments"}
        onPress={onComments}
        color={theme.text}
        bg={theme.inputBg}
      />
      <Btn
        icon="chatbox-ellipses-outline"
        label={danmakuCount ? formatCount(danmakuCount) : "Danmaku"}
        onPress={onDanmaku}
        color={theme.text}
        bg={theme.inputBg}
      />
      {/* <Btn
        icon="logo-bitcoin"
        label={stat?.coin ? formatCount(stat.coin) : "Coin"}
        onPress={() => toast("Not implemented yet")}
        color={theme.text}
        bg={theme.inputBg}
      /> */}
      <Btn
        icon="cloud-download-outline"
        label="Download"
        onPress={onDownload}
        color={theme.text}
        bg={theme.inputBg}
      />
      <Btn
        icon="arrow-redo-outline"
        label="Share"
        onPress={handleShare}
        color={theme.text}
        bg={theme.inputBg}
      />
      <Btn
        icon="star-outline"
        label={stat?.favorite ? formatCount(stat.favorite) : "Favorite"}
        onPress={() => toast("Not implemented yet")}
        color={theme.text}
        bg={theme.inputBg}
      />
    </ScrollView>
  );
});

function Btn({
  icon,
  label,
  onPress,
  color,
  bg,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  color: string;
  bg: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.btnLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  btnLabel: { fontSize: 13, fontWeight: "600" },
});
