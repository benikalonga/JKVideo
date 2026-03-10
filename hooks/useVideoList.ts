import { useState, useCallback } from 'react';
import { getRecommendFeed } from '../services/bilibili';
import type { VideoItem } from '../services/types';

export function useVideoList() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [freshIdx, setFreshIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    const idx = reset ? 0 : freshIdx;
    setLoading(true);
    try {
      const data = await getRecommendFeed(idx);
      setVideos(prev => reset ? data : [...prev, ...data]);
      setFreshIdx(idx + 1);
    } catch (e) {
      console.error('Failed to load videos', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, freshIdx]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  return { videos, loading, refreshing, load, refresh };
}
