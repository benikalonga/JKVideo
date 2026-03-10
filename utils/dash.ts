import type { PlayUrlResponse } from '../services/types';

/**
 * 从 Bilibili DASH 响应生成 MPD data URI。
 * 选取 id === qn 的视频流（找不到则取第一条），带宽最高的音频流。
 * 返回 "data:application/dash+xml;base64,..." 供 react-native-video (ExoPlayer) 使用。
 */
export function buildDashDataUri(playData: PlayUrlResponse, qn: number): string {
  const dash = playData.dash!;

  const video = dash.video.find(v => v.id === qn) ?? dash.video[0];
  const audio = dash.audio.reduce((best, a) =>
    a.bandwidth > best.bandwidth ? a : best
  );

  const dur = dash.duration;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"
     profiles="urn:mpeg:dash:profile:isoff-on-demand:2011"
     type="static"
     mediaPresentationDuration="PT${dur}S">
  <Period duration="PT${dur}S">
    <AdaptationSet id="1" mimeType="${video.mimeType}" codecs="${video.codecs}" startWithSAP="1" subsegmentAlignment="true">
      <Representation id="v1" bandwidth="${video.bandwidth}" width="${video.width}" height="${video.height}" frameRate="${video.frameRate}">
        <BaseURL>${escapeXml(video.baseUrl)}</BaseURL>
        <SegmentBase indexRange="${video.segmentBase.indexRange}">
          <Initialization range="${video.segmentBase.Initialization}"/>
        </SegmentBase>
      </Representation>
    </AdaptationSet>
    <AdaptationSet id="2" mimeType="${audio.mimeType}" codecs="${audio.codecs}" startWithSAP="1" subsegmentAlignment="true">
      <Representation id="a1" bandwidth="${audio.bandwidth}">
        <BaseURL>${escapeXml(audio.baseUrl)}</BaseURL>
        <SegmentBase indexRange="${audio.segmentBase.indexRange}">
          <Initialization range="${audio.segmentBase.Initialization}"/>
        </SegmentBase>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

  return `data:application/dash+xml;base64,${btoa(xml)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
