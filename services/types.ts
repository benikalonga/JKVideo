/**
 * Unified ref interface exposed by the three players (video detail, home big card, live).
 * Not every implementation supports everything; unimplemented methods can be no-ops.
 */
export interface IVideoPlayer {
  seek: (timeSec: number) => void;
  pause: () => void;
  resume: () => void;
  getCurrentTime: () => number;
}

export interface VideoItem {
  bvid: string;
  aid: number;
  title: string;
  pic: string;
  tname?: string;
  pubdate?: number;
  owner: {
    mid: number;
    name: string;
    face: string;
  };
  stat?: {
    view: number;
    danmaku: number;
    reply: number;
    like: number;
    coin: number;
    favorite: number;
  } | null;
  duration: number;
  desc: string;
  cid?: number;
  pages?: Array<{ cid: number; part: string }>;
  goto?: 'av' | 'live';
  roomid?: number;
  online?: number;
  area_name?: string;
  ugc_season?: {
    id: number;
    title: string;
    cover: string;
    ep_count: number;
    sections: Array<{
      episodes: Array<{
        aid: number;
        bvid: string;
        cid: number;
        title: string;
        arc?: { pic: string; stat?: { view: number } };
      }>;
    }>;
  };
}

export interface Comment {
  rpid: number;
  content: { message: string };
  member: {
    uname: string;
    avatar: string;
  };
  like: number;
  ctime: number;
  replies: Comment[] | null;
}

export interface DashSegmentBase {
  initialization: string;
  index_range: string;
}

export interface DashVideoItem {
  id: number;
  baseUrl: string;
  bandwidth: number;
  mimeType: string;
  codecs: string;
  width: number;
  height: number;
  stat:any;
  frameRate: string;
  segment_base?: DashSegmentBase;
  dolby_type?: number;  // 1 = Dolby Vision
  hdr_type?: number;    // 1=HDR
}

export interface DashAudioItem {
  id: number;
  baseUrl: string;
  bandwidth: number;
  mimeType: string;
  codecs: string;
  segment_base?: DashSegmentBase;
}

export interface PlayUrlResponse {
  durl?: Array<{
    url: string;
    length: number;
    size: number;
  }>;
  dash?: {
    duration: number;
    video: DashVideoItem[];
    audio: DashAudioItem[];
  };
  dolby?: {
    type: number;          // 1 = Dolby Atmos
    audio?: DashAudioItem[];
  };
  quality: number;
  accept_quality: number[];
  accept_description: string[];
}

export interface QRCodeInfo {
  url: string;
  qrcode_key: string;
}

export interface VideoShotData {
  img_x_len: number;
  img_y_len: number;
  img_x_size: number;
  img_y_size: number;
  image: string[];
  index: number[]; // frame index per second: index[t] = frame idx at second t
  pvdata?: string;
}

export interface DanmakuItem {
  time: number;       // Seconds (float) when the danmaku appears
  mode: 1 | 4 | 5;   // 1 = scrolling, 4 = fixed bottom, 5 = fixed top
  fontSize: number;
  color: number;      // 0xRRGGBB as a decimal integer
  text: string;
  uname?: string;
  isAdmin?: boolean;
  guardLevel?: number;  // 0 = none, 1 = Governor, 2 = Admiral, 3 = Captain
  medalLevel?: number;
  medalName?: string;
  timeline?: string;    // "2024-01-01 12:00:00" live danmaku timestamp
}

export interface LiveRoom {
  roomid: number;
  uid: number;
  title: string;
  uname: string;
  face: string;
  cover: string;
  online: number;
  area_name: string;
  parent_area_name: string;
}

export interface LiveRoomDetail {
  roomid: number;
  uid: number;
  title: string;
  description: string;
  live_status: number; // 1 = live, 0 = offline
  online: number;
  area_name: string;
  parent_area_name: string;
  keyframe: string;
}

export interface LiveAnchorInfo {
  uid: number;
  uname: string;
  face: string;
}

export interface LiveStreamInfo {
  hlsUrl: string;
  flvUrl: string;
  qn: number;
  qualities: { qn: number; desc: string }[];
}

export interface SearchSuggestItem {
  value: string;
  ref: number;
}

export interface HotSearchItem {
  keyword: string;
  show_name: string;
  icon?: string;
}
