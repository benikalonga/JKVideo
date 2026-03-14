import { useState, useCallback, useRef } from 'react';
import { getComments } from '../services/bilibili';
import type { Comment } from '../services/types';

export function useComments(aid: number) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current || !hasMore || !aid) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await getComments(aid, pageRef.current);
      if (data.length === 0) { setHasMore(false); return; }
      setComments(prev => [...prev, ...data]);
      pageRef.current += 1;
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [aid, hasMore]);

  return { comments, loading, hasMore, load };
}
