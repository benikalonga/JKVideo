import { useState, useEffect, useRef } from 'react';
import { getLiveDanmakuHistory } from '../services/bilibili';
import type { DanmakuItem } from '../services/types';

const POLL_INTERVAL = 1500;

// Matches gift info in admin messages (Bilibili sends these in Chinese), e.g. "xxx gave <gift> x5" or "xxx fed <gift> ×1". Escapes: \u8d60\u9001 = "gave", \u6295\u5582 = "fed".
const GIFT_PATTERN = /(?:\u8d60\u9001|\u6295\u5582)\s*(?:\u4e86\s*)?(.+?)\s*[xX\u00d7]\s*(\d+)/;

// Common gift names as Bilibili sends them (Chinese, escaped): spicy strip, little heart, call, cheers, heart hands,
const KNOWN_GIFTS = new Set([
  '\u8fa3\u6761', '\u5c0f\u5fc3\u5fc3', '\u6253call', '\u5e72\u676f', '\u6bd4\u5fc3',
  '\u5403\u74dc', '\u82b1\u5f0f\u5938\u5938', '\u544a\u767d\u6c14\u7403', '\u5c0f\u7535\u89c6\u98de\u8239', // watching, fancy praise, love balloon, TV spaceship
]);

export function useLiveDanmaku(roomId: number): {
  danmakus: DanmakuItem[];
  giftCounts: Record<string, number>;
} {
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [giftCounts, setGiftCounts] = useState<Record<string, number>>({});
  const seenTextsRef = useRef<Set<string>>(new Set());
  const seenAdminRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    setDanmakus([]);
    setGiftCounts({});
    seenTextsRef.current.clear();
    seenAdminRef.current.clear();
    let cancelled = false;

    async function poll() {
      try {
        const { danmakus: items, adminMsgs } = await getLiveDanmakuHistory(roomId);
        if (cancelled) return;

        // Deduplicate danmaku: key is uname + text + timeline
        // timeline separates legitimate repeats of the same message by the same person (gethistory polling returns the same tail data repeatedly; timeline filters it out)
        const newItems = items.filter(item => {
          const key = `${item.uname ?? ''}:${item.text}:${item.timeline ?? ''}`;
          if (seenTextsRef.current.has(key)) return false;
          seenTextsRef.current.add(key);
          return true;
        });
        if (newItems.length > 0) {
          setDanmakus(prev => [...prev, ...newItems]);
        }

        // Parse gifts from admin messages
        const newGifts: Record<string, number> = {};
        for (const msg of adminMsgs) {
          // Deduplicate admin messages
          if (seenAdminRef.current.has(msg)) continue;
          seenAdminRef.current.add(msg);

          const match = msg.match(GIFT_PATTERN);
          if (match) {
            const giftName = match[1].trim();
            const count = parseInt(match[2], 10);
            if (KNOWN_GIFTS.has(giftName) && count > 0) {
              newGifts[giftName] = (newGifts[giftName] ?? 0) + count;
            }
          }
        }
        if (Object.keys(newGifts).length > 0) {
          setGiftCounts(prev => {
            const next = { ...prev };
            for (const [name, count] of Object.entries(newGifts)) {
              next[name] = (next[name] ?? 0) + count;
            }
            return next;
          });
        }

        // Keep the seen set from growing without bound
        if (seenTextsRef.current.size > 2000) {
          const arr = Array.from(seenTextsRef.current);
          seenTextsRef.current = new Set(arr.slice(-1000));
        }
        if (seenAdminRef.current.size > 500) {
          const arr = Array.from(seenAdminRef.current);
          seenAdminRef.current = new Set(arr.slice(-250));
        }
      } catch (e) {
        console.warn('[danmaku] poll failed:', e);
      }
      if (!cancelled) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roomId]);

  return { danmakus, giftCounts };
}
