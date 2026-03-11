import type { VideoItem } from '../services/types';

export interface NormalRow {
  type: 'pair';
  left: VideoItem;
  right: VideoItem | null;
}

export interface BigRow {
  type: 'big';
  item: VideoItem;
}

export type ListRow = NormalRow | BigRow;

/**
 * Transform a flat VideoItem array into display rows.
 * The last item always becomes a full-width BigRow.
 * All preceding items are grouped into NormalRow pairs.
 */
export function toListRows(videos: VideoItem[]): ListRow[] {
  if (videos.length === 0) return [];
  if (videos.length === 1) return [{ type: 'big', item: videos[0] }];

  const rows: ListRow[] = [];
  const body = videos.slice(0, videos.length - 1);

  for (let i = 0; i < body.length; i += 2) {
    rows.push({
      type: 'pair',
      left: body[i],
      right: body[i + 1] ?? null,
    });
  }

  rows.push({ type: 'big', item: videos[videos.length - 1] });
  return rows;
}
