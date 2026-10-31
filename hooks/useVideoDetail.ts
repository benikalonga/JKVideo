import { useState, useEffect, useRef } from 'react';
import { getVideoDetail, getPlayUrl } from '../services/bilibili';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePlayProgressStore } from '../store/playProgressStore';
import type { VideoItem, PlayUrlResponse } from '../services/types';

export function useVideoDetail(bvid: string) {
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [playData, setPlayData] = useState<PlayUrlResponse | null>(null);
  const [qualities, setQualities] = useState<{ qn: number; desc: string }[]>([]);
  const [currentQn, setCurrentQn] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialTime, setInitialTime] = useState(0);
  const cidRef = useRef<number>(0);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const trafficSaving = useSettingsStore(s => s.trafficSaving);
  const defaultQn = trafficSaving ? 16 : 126;

  async function fetchPlayData(cid: number, qn: number, updateList = false) {
    const data = await getPlayUrl(bvid, cid, qn);
    setPlayData(data);
    setCurrentQn(data.quality);
    if (updateList && data.accept_quality?.length) {
      setQualities(
        data.accept_quality.map((q, i) => ({
          qn: q,
          desc: data.accept_description?.[i] ?? String(q),
        }))
      );
    }
  }

  async function changeQuality(qn: number) {
    await fetchPlayData(cidRef.current, qn);
  }

  useEffect(() => {
    // Clear old data immediately when bvid changes, so the previous video's player/description/quality never ghost on screen
    setVideo(null);
    setPlayData(null);
    setQualities([]);
    setCurrentQn(0);
    cidRef.current = 0;
    async function fetchData() {
      try {
        setLoading(true);
        // Read the resume position
        setInitialTime(usePlayProgressStore.getState().get(bvid));
        const detail = await getVideoDetail(bvid);
        setVideo(detail);
        const cid = detail.pages?.[0]?.cid ?? detail.cid as number;
        cidRef.current = cid;
        await fetchPlayData(cid, defaultQn, true);
      } catch (e: any) {
        setError(e.message ?? 'Load failed');
      } finally {
        setLoading(false);
      }
    }
    if (bvid) fetchData();
  }, [bvid]);

  // Refetch the quality list when sign-in state changes (signing in may unlock higher quality)
  // The cancelled flag stops an old response (from before the sign-in change) overwriting the new one
  useEffect(() => {
    if (!cidRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getPlayUrl(bvid, cidRef.current, defaultQn);
        if (cancelled) return;
        setPlayData(data);
        setCurrentQn(data.quality);
        if (data.accept_quality?.length) {
          setQualities(
            data.accept_quality.map((q, i) => ({
              qn: q,
              desc: data.accept_description?.[i] ?? String(q),
            })),
          );
        }
      } catch (e) {
        if (!cancelled) console.warn('Failed to refresh quality list after login change:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  return { video, playData, loading, error, qualities, currentQn, changeQuality, initialTime };
}
