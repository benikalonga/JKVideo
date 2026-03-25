import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserInfo } from '../services/bilibili';
import { getSecure, setSecure, deleteSecure } from '../utils/secureStorage';

interface AuthState {
  sessdata: string | null;
  uid: string | null;
  username: string | null;
  face: string | null;
  isLoggedIn: boolean;
  login: (sessdata: string, uid: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  setProfile: (face: string, username: string, uid: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  sessdata: null,
  uid: null,
  username: null,
  face: null,
  isLoggedIn: false,

  login: async (sessdata, uid, username) => {
    await setSecure('SESSDATA', sessdata);
    // Migrate: remove SESSDATA from AsyncStorage if it was there before
    await AsyncStorage.removeItem('SESSDATA').catch(() => {});
    set({ sessdata, uid: uid || null, username: username || null, isLoggedIn: true });
    // 延迟 1s 后台拉取头像，避免与登录后立即触发的其他请求（如 getFollowedLiveRooms）并发
    setTimeout(() => {
      getUserInfo().then(async (info) => {
        await AsyncStorage.multiSet([
          ['UID', String(info.mid)],
          ['USERNAME', info.uname],
          ['FACE', info.face],
        ]).catch(() => {});
        set({ face: info.face, username: info.uname, uid: String(info.mid) });
      }).catch(() => {});
    }, 1000);
  },

  logout: async () => {
    await deleteSecure('SESSDATA');
    await AsyncStorage.multiRemove(['UID', 'USERNAME', 'FACE']);
    set({ sessdata: null, uid: null, username: null, face: null, isLoggedIn: false });
  },

  restore: async () => {
    // Try SecureStore first, fallback to AsyncStorage for migration
    let sessdata = await getSecure('SESSDATA');
    if (!sessdata) {
      sessdata = await AsyncStorage.getItem('SESSDATA');
      if (sessdata) {
        // Migrate from AsyncStorage to SecureStore
        await setSecure('SESSDATA', sessdata);
        await AsyncStorage.removeItem('SESSDATA');
      }
    }
    if (sessdata) {
      set({ sessdata, isLoggedIn: true });
      try {
        const info = await getUserInfo();
        await AsyncStorage.setItem('FACE', info.face);
        set({ face: info.face, username: info.uname, uid: String(info.mid) });
      } catch {}
    }
  },

  setProfile: (face, username, uid) => set({ face, username, uid }),
}));
