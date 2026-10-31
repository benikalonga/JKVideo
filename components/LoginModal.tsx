import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Linking,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { generateQRCode, pollQRCode } from "../services/bilibili";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../utils/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LoginModal({ visible, onClose }: Props) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrKey, setQrKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const qrRef = useRef<any>(null);
  const [status, setStatus] = useState<
    "loading" | "waiting" | "scanned" | "done" | "error"
  >("loading");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const login = useAuthStore((s) => s.login);
  const theme = useTheme();

  // Sheet slide-in animation
  const slideY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      slideY.setValue(300);
    }
  }, [visible]);

  function initQRCode() {
    setStatus("loading");
    setQrData(null);
    setQrKey(null);
    generateQRCode()
      .then((data) => {
        setQrData(data.url);
        setQrKey(data.qrcode_key);
        setStatus("waiting");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    if (!visible) return;
    initQRCode();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [visible]);

  useEffect(() => {
    if (!qrKey || status !== "waiting") return;
    let cancelled = false;
    pollRef.current = setInterval(async () => {
      if (cancelled) return;
      try {
        const result = await pollQRCode(qrKey);
        if (cancelled) return;
        if (result.code === 86038) {
          setStatus("error");
          clearInterval(pollRef.current!);
        }
        if (result.code === 86090) setStatus("scanned");
        if (result.code === 0 && result.cookie) {
          clearInterval(pollRef.current!);
          try {
            await login(result.cookie, "", "", result.csrf);
          } catch {
            if (!cancelled) setStatus("error");
            return;
          }
          if (!cancelled) onClose();
        }
      } catch {
        // Network error during poll — ignore, will retry next interval
      }
    }, 2000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrKey, status]);

  async function handleSaveQR() {
    if (!qrRef.current) return;
    setSaving(true);
    try {
      const { status: perm } = await MediaLibrary.requestPermissionsAsync();
      if (perm !== "granted") {
        Alert.alert("Notice", "Photo library permission is required to save the image");
        return;
      }
      qrRef.current.toDataURL(async (base64: string) => {
        try {
          const dest = `${FileSystem.cacheDirectory}bilibili_qr.png`;
          await FileSystem.writeAsStringAsync(dest, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await MediaLibrary.saveToLibraryAsync(dest);
          Alert.alert("Saved", "QR code saved to your photos. Scan it with the Bilibili app to sign in", [
            { text: "Close", style: "cancel" },
            {
              text: "Open Bilibili",
              onPress: () => Linking.openURL("bilibili://"),
            },
          ]);
        } catch {
          Alert.alert("Failed", "Could not save. Please try again");
        } finally {
          setSaving(false);
        }
      });
    } catch {
      Alert.alert("Failed", "Could not save. Please try again");
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop stays fixed */}
      <View style={styles.overlay} pointerEvents="box-none" />

      {/* Sheet slides in on its own */}
      <Animated.View
        style={[styles.sheetWrapper, { transform: [{ translateY: slideY }] }]}
      >
        <View style={[styles.sheet, { backgroundColor: theme.sheetBg }]}>
          <Text style={[styles.title, { color: theme.modalText }]}>Sign in with QR code</Text>
          {status === "loading" && (
            <ActivityIndicator
              size="large"
              color="#00AEEC"
              style={styles.loader}
            />
          )}
          {(status === "waiting" || status === "scanned") && qrData && (
            <>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrData}
                  size={200}
                  getRef={(ref) => { qrRef.current = ref; }}
                />
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveQR}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="download-outline" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: theme.modalTextSub }]}>
                {status === "scanned"
                  ? "Scanned. Confirm on your phone"
                  : "Scan with the Bilibili app"}
              </Text>
            </>
          )}
          {status === "error" && (
            <View style={styles.errorBox}>
              <Text style={[styles.hint, { color: theme.modalTextSub }]}>QR code expired</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={initQRCode}>
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.retryTxt}>Get a new one</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 20 },
  loader: { marginVertical: 40 },
  qrWrapper: { width: 200, height: 200, marginBottom: 12 },
  saveBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 13, color: "#666", marginBottom: 12 },
  errorBox: { alignItems: "center", marginBottom: 8 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00AEEC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  retryTxt: { fontSize: 13, color: "#fff", fontWeight: "600" },
  closeBtn: { padding: 12 },
  closeTxt: { fontSize: 14, color: "#00AEEC" },
});
