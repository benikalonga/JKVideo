import { useState, useEffect, useCallback, useRef } from 'react';
import { getLiveRoomDetail, getLiveAnchorInfo, getLiveStreamUrl } from '../services/bilibili';
import type { LiveRoomDetail, LiveAnchorInfo, LiveStreamInfo } from '../services/types';

interface LiveDetailState {
  room: LiveRoomDetail | null;
  anchor: LiveAnchorInfo | null;
  stream: LiveStreamInfo | null;
  loading: boolean;
  error: string | null;
}

export function useLiveDetail(roomId: number) {
  const [state, setState] = useState<LiveDetailState>({
    room: null,
    anchor: null,
    stream: null,
    loading: true,
    error: null,
  });

  // Track the latest roomId in a ref to avoid cancelled-closure problems
  const latestRoomId = useRef(roomId);
  latestRoomId.current = roomId;

  useEffect(() => {
    if (!roomId) return;
    
    setState({ room: null, anchor: null, stream: null, loading: true, error: null });

    const fetchId = roomId; // Capture the current roomId

    async function doFetch() {
      try {
        const [room, anchor] = await Promise.all([
          getLiveRoomDetail(fetchId),
          getLiveAnchorInfo(fetchId),
        ]);

        // Only update state if roomId has not changed (replaces the cancelled pattern)
        if (latestRoomId.current !== fetchId) return;

        let stream: LiveStreamInfo = { hlsUrl: '', flvUrl: '', qn: 0, qualities: [] };
        if (room?.live_status === 1) {
          stream = await getLiveStreamUrl(fetchId);
        }

        if (latestRoomId.current !== fetchId) return;

        setState({ room, anchor, stream, loading: false, error: null });
      } catch (e: any) {
        if (latestRoomId.current !== fetchId) return;
        setState(prev => ({ ...prev, loading: false, error: e?.message ?? 'Failed to load' }));
      }
    }

    doFetch();
  }, [roomId]);

  const changeQuality = useCallback(async (qn: number) => {
    try {
      const stream = await getLiveStreamUrl(roomId, qn);
      setState(prev => ({ ...prev, stream: { ...stream, qn } }));
    } catch { /* ignore */ }
  }, [roomId]);

  return { ...state, changeQuality };
}
