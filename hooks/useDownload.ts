import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { useDownloadStore } from '../store/downloadStore';
import { getPlayUrlForDownload } from '../services/bilibili';

const lastReportedProgress: Record<string, number> = {};

const QUALITY_LABELS: Record<number, string> = {
  16: '360P', 32: '480P', 64: '720P',
  80: '1080P', 112: '1080P+', 116: '1080P60',
};

/** Wait for the app to return to the foreground */
function waitForActive(): Promise<void> {
  return new Promise((resolve) => {
    if (AppState.currentState === 'active') { resolve(); return; }
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { sub.remove(); resolve(); }
    });
  });
}

/** Whether the app is currently in the background */
function isBackground() {
  return AppState.currentState !== 'active';
}

/** Read the actual size of a local file */
async function readFileSize(uri: string): Promise<number | undefined> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    if (info.exists) return (info as any).size as number;
  } catch {}
  return undefined;
}

export function useDownload() {
  const { tasks, addTask, updateTask, removeTask } = useDownloadStore();

  function taskKey(bvid: string, qn: number) { return `${bvid}_${qn}`; }
  function localPath(bvid: string, qn: number) {
    return `${FileSystem.documentDirectory}${bvid}_${qn}.mp4`;
  }

  async function startDownload(
    bvid: string, cid: number, qn: number,
    qdesc: string, title: string, cover: string,
  ) {
    const key = taskKey(bvid, qn);
    if (tasks[key]?.status === 'downloading') return;

    addTask(key, {
      bvid, title, cover, qn,
      qdesc: qdesc || QUALITY_LABELS[qn] || String(qn),
      status: 'downloading', progress: 0, createdAt: Date.now(),
    });

    // Refetch the URL and retry at most once (handles URLs expiring while in the background)
    for (let attempt = 0; attempt < 2; attempt++) {
      const success = await attemptDownload(key, bvid, cid, qn);
      if (success !== 'retry') return;
      // Retry needed: refetch the URL
      updateTask(key, { status: 'downloading', progress: 0 });
      lastReportedProgress[key] = -1;
    }

    updateTask(key, { status: 'error', error: 'Download failed, please retry' });
  }

  /** Run one download attempt. Returns 'done' | 'error' | 'retry' */
  async function attemptDownload(
    key: string, bvid: string, cid: number, qn: number,
  ): Promise<'done' | 'error' | 'retry'> {
    try {
      const [url, buvid3, sessdata] = await Promise.all([
        getPlayUrlForDownload(bvid, cid, qn),
        AsyncStorage.getItem('buvid3'),
        AsyncStorage.getItem('SESSDATA'),
      ]);
      const dest = localPath(bvid, qn);

      const cookies: string[] = [];
      if (buvid3) cookies.push(`buvid3=${buvid3}`);
      if (sessdata) cookies.push(`SESSDATA=${sessdata}`);

      const headers = {
        Referer: 'https://www.bilibili.com',
        Origin: 'https://www.bilibili.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(cookies.length > 0 && { Cookie: cookies.join('; ') }),
      };

      const progressCallback = (p: FileSystem.DownloadProgressData) => {
        const { totalBytesWritten, totalBytesExpectedToWrite } = p;
        const progress = totalBytesExpectedToWrite > 0
          ? totalBytesWritten / totalBytesExpectedToWrite : 0;
        const last = lastReportedProgress[key] ?? -1;
        if (progress - last >= 0.01) {
          lastReportedProgress[key] = progress;
          updateTask(key, { progress });
        }
      };

      const resumable = FileSystem.createDownloadResumable(url, dest, { headers }, progressCallback);

      // Pause proactively when entering the background, before the OS drops the connection
      let bgPaused = false;
      const appStateSub = AppState.addEventListener('change', async (state) => {
        if ((state === 'background' || state === 'inactive') && !bgPaused) {
          bgPaused = true;
          try { await resumable.pauseAsync(); } catch {}
        }
      });

      let result: FileSystem.DownloadResult | null = null;

      try {
        result = await resumable.downloadAsync();
      } catch (e: any) {
        // downloadAsync threw: usually a background disconnect (connection abort) or a pauseAsync interruption
        if (!isBackground() && !bgPaused) {
          // A real network error, not caused by the background
          appStateSub.remove();
          delete lastReportedProgress[key];
          const msg = e?.message ?? 'Download failed';
          updateTask(key, { status: 'error', error: msg.length > 40 ? msg.slice(0, 40) + '...' : msg });
          return 'error';
        }
        // Interrupted by the background; use the resume logic below
        result = null;
      } finally {
        appStateSub.remove();
      }

      // ── Resume logic: a null result means it was paused or interrupted ──
      if (!result?.uri) {
        // Wait for the app to return to the foreground
        if (isBackground()) await waitForActive();

        // Try to resume from where it stopped
        try {
          result = await resumable.resumeAsync();
        } catch {
          result = null;
        }

        // Resume still failed (the URL may have expired); tell the caller to retry
        if (!result?.uri) {
          delete lastReportedProgress[key];
          return 'retry';
        }
      }

      // ── Download complete ──
      delete lastReportedProgress[key];
      const fileSize = await readFileSize(result.uri);
      updateTask(key, {
        status: 'done', progress: 1, localUri: result.uri,
        ...(fileSize ? { fileSize } : {}),
      });
      return 'done';

    } catch (e: any) {
      delete lastReportedProgress[key];
      console.error('[Download] failed:', e);
      const msg = e?.message ?? 'Download failed';
      updateTask(key, { status: 'error', error: msg.length > 40 ? msg.slice(0, 40) + '...' : msg });
      return 'error';
    }
  }

  function getLocalUri(bvid: string, qn: number): string | undefined {
    return tasks[taskKey(bvid, qn)]?.localUri;
  }

  function cancelDownload(bvid: string, qn: number) {
    removeTask(taskKey(bvid, qn));
  }

  return { tasks, startDownload, getLocalUri, cancelDownload, taskKey };
}
