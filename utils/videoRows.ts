import type { VideoItem, LiveRoom } from '../services/types';

export interface NormalRow {
  type: 'pair';
  left: VideoItem;
  right: VideoItem | null;
}

export interface BigRow {
  type: 'big';
  item: VideoItem;
}

export interface LiveRow {
  type: 'live';
  left: LiveRoom;
  right?: LiveRoom;
}

export type ListRow = NormalRow | BigRow | LiveRow;

export function toListRows(pages: VideoItem[][], liveRooms?: LiveRoom[]): ListRow[] {
  const rows: ListRow[] = [];
  let liveInjected = false;

  for (const chunk of pages) {
    if (chunk.length === 0) continue;

    // Highest view count becomes BigRow
    let bigIdx = 0;
    let maxView = chunk[0].stat?.view ?? 0;
    for (let i = 1; i < chunk.length; i++) {
      const v = chunk[i].stat?.view ?? 0;
      if (v > maxView) { maxView = v; bigIdx = i; }
    }

    const bigItem = chunk[bigIdx];
    const rest = chunk.filter((_, i) => i !== bigIdx);

    rows.push({ type: 'big', item: bigItem });

    const pairs: NormalRow[] = [];
    for (let i = 0; i < rest.length; i += 2) {
      pairs.push({ type: 'pair', left: rest[i], right: rest[i + 1] ?? null });
    }

    // Inject LiveRow once, after ~3 pairs in the first chunk
    if (!liveInjected && liveRooms && liveRooms.length > 0) {
      const insertAt = Math.min(3, pairs.length);
      const liveRow: LiveRow = {
        type: 'live',
        left: liveRooms[0],
        right: liveRooms[1],
      };
      pairs.splice(insertAt, 0, liveRow as any);
      liveInjected = true;
    }

    rows.push(...pairs);
  }
  return rows;
}
