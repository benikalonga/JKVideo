import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'play_progress';
// Persist at most 200 records
const MAX_ENTRIES = 200;
// Treat a video as finished near the end (>= 95%) and clear its record
const FINISH_RATIO = 0.95;

interface ProgressEntry {
  bvid: string;
  time: number;       // Seconds
  duration: number;   // Seconds
  ts: number;         // Write timestamp
}

interface PlayProgressStore {
  records: Record<string, ProgressEntry>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  save: (bvid: string, time: number, duration: number) => void;
  get: (bvid: string) => number; // Seconds to seek to (0 if there is no record)
  clear: (bvid: string) => void;
}

const persist = (records: Record<string, ProgressEntry>) => {
  // Cap the total: drop the oldest when over the limit
  const entries = Object.values(records).sort((a, b) => b.ts - a.ts);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  const trimmedMap: Record<string, ProgressEntry> = {};
  trimmed.forEach(e => { trimmedMap[e.bvid] = e; });
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedMap)).catch(() => {});
  return trimmedMap;
};

export const usePlayProgressStore = create<PlayProgressStore>((set, get) => ({
  records: {},
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const records = JSON.parse(raw);
        set({ records, hydrated: true });
        return;
      }
    } catch {}
    set({ hydrated: true });
  },
  save: (bvid, time, duration) => {
    if (!bvid || !duration || duration <= 0) return;
    // Near the end of the video, clear the record
    if (time / duration >= FINISH_RATIO) {
      get().clear(bvid);
      return;
    }
    // No need to record the first 5 seconds
    if (time < 5) return;
    const records = { ...get().records };
    records[bvid] = { bvid, time, duration, ts: Date.now() };
    set({ records: persist(records) });
  },
  get: (bvid) => {
    const r = get().records[bvid];
    return r?.time ?? 0;
  },
  clear: (bvid) => {
    const records = { ...get().records };
    if (records[bvid]) {
      delete records[bvid];
      set({ records: persist(records) });
    }
  },
}));
