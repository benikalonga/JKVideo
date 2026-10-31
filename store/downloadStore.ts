import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DownloadTask {
  bvid: string;
  title: string;
  cover: string;
  qn: number;
  qdesc: string;
  status: 'downloading' | 'done' | 'error';
  progress: number; // 0-1
  fileSize?: number; // bytes
  localUri?: string;
  error?: string;
  createdAt: number;
}

interface DownloadStore {
  tasks: Record<string, DownloadTask>; // key: `${bvid}_${qn}`
  hasLoaded: boolean;
  addTask: (key: string, task: DownloadTask) => void;
  updateTask: (key: string, patch: Partial<DownloadTask>) => void;
  removeTask: (key: string) => void;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'download_tasks';

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  tasks: {},
  hasLoaded: false,

  addTask: (key, task) => {
    const next = { ...get().tasks, [key]: task };
    set({ tasks: next });
    persistTasks(next);
  },

  updateTask: (key, patch) => {
    set((s) => {
      const prev = s.tasks[key];
      if (!prev) return s;
      const updated = { ...prev, ...patch };
      const next = { ...s.tasks, [key]: updated };
      // Persist only when status/localUri changes; progress is not persisted (avoids frequent AsyncStorage writes)
      if (patch.status !== undefined || patch.localUri !== undefined || patch.error !== undefined || patch.fileSize !== undefined) {
        persistTasks(next);
      }
      return { tasks: next };
    });
  },

  removeTask: (key) => {
    set((s) => {
      const next = { ...s.tasks };
      delete next[key];
      persistTasks(next);
      return { tasks: next };
    });
  },

  loadFromStorage: async () => {
    // Skip if already loaded, so a repeat call does not overwrite in-progress download state
    if (get().hasLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: Record<string, DownloadTask> = JSON.parse(raw);
        // Downloading tasks cannot resume after a restart; mark them as errors
        Object.keys(saved).forEach((k) => {
          if (saved[k].status === 'downloading') {
            saved[k].status = 'error';
            saved[k].error = 'Download was interrupted, please retry';
            saved[k].progress = 0;
          }
        });
        set({ tasks: saved, hasLoaded: true });
      } else {
        set({ hasLoaded: true });
      }
    } catch {
      set({ hasLoaded: true });
    }
  },
}));

function persistTasks(tasks: Record<string, DownloadTask>) {
  // Persist only done/error; downloading tasks cannot resume after a restart, so there is no need to save them
  const toSave: Record<string, DownloadTask> = {};
  Object.keys(tasks).forEach((k) => {
    if (tasks[k].status !== 'downloading') {
      toSave[k] = tasks[k];
    }
  });
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch(() => {});
}
