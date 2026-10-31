# Changelog

All notable changes are recorded in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.15] - 2026-03-26

### Added
- **Creator page**: tapping the creator's name on the video detail page opens the creator page (`/creator/[mid]`), showing avatar, bio, follower count, upload count and a paginated video list
- **Cache management**: a new "Storage" section in settings shows the live cache size and clears the expo-image disk/memory cache and the general cache directory in one tap

### Improved
- **Performance**: all cover images now use `expo-image` (two-level memory/disk cache, `recyclingKey` reuses UI tree nodes); FlatList enables `removeClippedSubviews`; `buvid3` is initialized lazily, making the first screen about 30ms faster
- **Search**: matched words are highlighted in results (HTML tags filtered); the empty state has an icon and text; a 300ms debounce cuts wasted requests
- **Dark mode**: fixed hard-coded colors missed on the settings page; the appearance/data buttons and the sign-out button now follow the theme
- **Sign-in security**: SESSDATA moved to encrypted `expo-secure-store` storage (falls back to AsyncStorage on web)

### Fixed
- **Avatar not updating after sign-in**: moved `getUserInfo()` into `authStore.login()` and run it in the background after 1s, avoiding Bilibili's concurrency risk control on new sessions; the avatar now refreshes right after sign-in
- **getFollowedLiveRooms empty after sign-in**: calling `getUserInfo` synchronously in `login()` made the concurrent `FollowedLiveStrip` request get blocked by Bilibili's risk control; fixed with a non-blocking `setTimeout(1000)` background fetch
- **getUploaderVideos returned no data**: `/x/space/wbi/arc/search` requires WBI signing; added the missing `getWbiKeys()` + `signWbi()` calls
- **getFollowedLiveRooms field compatibility**: added a `code !== 0` check and `list ?? rooms ?? []` to handle different API response shapes

---

## [1.0.13] - 2026-03-25

### Fixed
- **Stale mini player PanResponder closure**: `useRef(PanResponder.create(...))` captured the initial `roomId=0` / `bvid=""`, so tapping the mini player opened the wrong page; switched to a `storeRef` pattern to keep the latest values
- **Endless loading when opening a live room from the mini player**: `useLiveDetail` used a `cancelled` closure flag, so the fetch was silently dropped after effect cleanup; replaced it with a `latestRoomId` ref comparison
- **Mini player not closing when entering a player page**: video/live detail pages now clear the mini player synchronously with `useLayoutEffect` + `getState().clearLive()`, avoiding double playback and resource contention
- **BigVideoCard conflicting with the live mini player**: home BigVideoCard autoplay competed with the live mini player for the decoder; while the mini player is active, the card skips rendering Video and shows only the cover
- **Video paused after exiting fullscreen**: with exclusive rendering, the portrait player remounts and react-native-video does not resume after a seek; `onLoad` now forces a `paused` toggle to start playback

### Improved
- **Single video player instance**: portrait and fullscreen render exclusively (`{!fullscreen && ...}` / `{fullscreen && ...}`), so two Video decoders are never mounted at once, halving GPU/memory use
- **onProgress throttling**: `progressUpdateInterval` raised from 250ms to 500ms, with a 450ms throttle and seeking skip in the callback to reduce re-renders
- **Removed debug logs**: cleaned up leftover `console.log` calls in NativeVideoPlayer
- **Downloads page UI**: improved interactions and dark theme support

---

## [1.0.12] - 2026-03-25

### Added
- **Creator info**: the video detail page shows follower and video counts under the creator's name (`getUploaderStat` → `/x/web-interface/card`)
- **Related videos**: the detail page recommendations are now based on the current video (`getVideoRelated` → `/x/web-interface/archive/related`) instead of sharing the home feed

### Fixed
- **Live stream paused on exiting fullscreen**: fullscreen now uses a `position:absolute` overlay, so the Video component stays in the same React tree and is no longer rebuilt and paused by Modal switches; live playback pauses automatically on exiting fullscreen
- **Live quality selection**: `changeQuality` now overrides the server-negotiated value with the requested `qn`, so the quality panel highlight matches the user's choice
- **Live quality filtering**: options with `qn > 10000` (Dolby/4K) are filtered out; the highest shown is the original quality
- **Recommended video navigation**: tapping a recommendation now uses `router.replace`, so detail pages no longer stack endlessly

### Improved
- **Live quality panel**: now a centered modal
- **Video detail tabs**: buttons are left-aligned instead of evenly spaced
- **Comment sort buttons**: unified to a solid background style (`#f0f0f0` → `#00AEEC`), matching the live category tabs
- **Settings buttons**: appearance/data option buttons unified to the solid background style

## [1.0.11] - 2026-03-24

### Added
- **Dark mode**: a global theme system (`utils/theme.ts`) with one-tap light/dark switching across all pages and components
- **Data saver mode**: a new data-saving switch in settings; when on, covers use low quality, home videos do not autoplay and videos default to 360p
- **Local QR code generation**: the sign-in QR code is now rendered locally with `react-native-qrcode-svg`, removing the external dependency on `api.qrserver.com` for better reliability

### Fixed
- **SeasonSection background**: the playlist component background did not match its parent; it now follows the theme color (`theme.card`)
- **Recommendation list loading state**: no spinner was shown while an empty list was loading (`ListEmptyComponent` condition was inverted)
- **Playlist scroll position offset**: the `getItemLayout` offset ignored the card gap (`gap: 10`), making `scrollToIndex` inaccurate
- **Double border on recommendation cards**: adjacent recommended video cards showed a double divider

## [1.0.0] — 2026-03-20

### First stable release

#### Video playback
- Full DASH playback: Bilibili DASH API → `buildDashMpdUri()` builds a local MPD → native ExoPlayer decoding
- Multiple quality options (360P / 480P / 720P / 1080P / 1080P+ / 4K)
- Home BigVideoCard inline muted DASH autoplay, with horizontal swipe-to-seek and progress/buffer bars
- Global mini player (MiniPlayer) that keeps playing in a bottom overlay across pages
- WebView fallback (NativeVideoPlayer) for Expo Go

#### Live streams
- The Live tab shows online status of followed streamers at the top
- Two-column live card grid + horizontal category filter
- Live recommendation cards mixed into the trending list
- LivePlayer supports HLS quality switching
- Live danmaku received in real time over WebSocket, with guard marks + gift counts

#### Danmaku
- Video danmaku: full XML fetch + timeline-synced drip rendering
- DanmakuOverlay floating layer (5 scrolling lanes)
- DanmakuList supports a real-time live mode (keeps the latest 500)

#### Search & content
- Video keyword search + pagination
- Video detail: description / comments / danmaku tabs
- Recommended video feed (infinite scroll)
- Comment list (top / newest sorting)

#### Account & settings
- QR code sign-in (QR code + 2s polling + automatic SESSDATA extraction)
- Persistent sign-in state (AsyncStorage)
- Cover image quality setting (HD / standard, to save data)

#### Downloads & sharing
- Background downloads in multiple qualities
- Downloads page (play and delete downloaded videos)
- LAN HTTP server that generates a QR code, so devices on the same Wi-Fi can scan and play directly

#### Cross-platform
- Android, iOS and Web
- Quick start with Expo Go (UI preview mode)
- Full features with Dev Build (native DASH playback)
