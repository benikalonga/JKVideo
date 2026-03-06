import React, { useEffect, useState } from 'react';
import {
  View, FlatList, StyleSheet,
  Text, TouchableOpacity, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoCard } from '../components/VideoCard';
import { LoginModal } from '../components/LoginModal';
import { useVideoList } from '../hooks/useVideoList';
import { useAuthStore } from '../store/authStore';
import type { VideoItem } from '../services/types';

export default function HomeScreen() {
  const router = useRouter();
  const { videos, loading, refreshing, load, refresh } = useVideoList();
  const { isLoggedIn, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => { load(); }, []);

  const renderItem = ({ item, index }: { item: VideoItem; index: number }) => (
    <View style={index % 2 === 0 ? styles.leftCol : styles.rightCol}>
      <VideoCard
        item={item}
        onPress={() => router.push(`/video/${item.bvid}` as any)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>哔哩哔哩</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="search" size={22} color="#212121" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => isLoggedIn ? logout() : setShowLogin(true)}
          >
            <Ionicons name={isLoggedIn ? 'person' : 'person-outline'} size={22} color="#00AEEC" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Text style={styles.tabActive}>热门</Text>
        <View style={styles.tabUnderline} />
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item, index) => `${item.bvid}-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        onRefresh={refresh}
        refreshing={refreshing}
        onEndReached={() => load()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={styles.footer} color="#00AEEC" /> : null}
      />

      <LoginModal visible={showLogin} onClose={() => setShowLogin(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  logo: { fontSize: 20, fontWeight: '800', color: '#00AEEC', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 4 },
  tabRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  tabActive: { fontSize: 15, fontWeight: '700', color: '#00AEEC', paddingVertical: 10 },
  tabUnderline: { position: 'absolute', bottom: 0, left: 16, width: 24, height: 2, backgroundColor: '#00AEEC', borderRadius: 1 },
  row: { paddingHorizontal: 8 },
  list: { paddingTop: 8, paddingBottom: 80 },
  leftCol: { marginLeft: 4, marginRight: 2 },
  rightCol: { marginLeft: 2, marginRight: 4 },
  footer: { marginVertical: 16 },
});
