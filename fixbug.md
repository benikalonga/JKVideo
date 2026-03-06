# Bug Report

## [Critical] VideoPlayer - B站防盗链导致视频无法播放

**文件**: `components/NativeVideoPlayer.tsx`, `components/VideoPlayer.tsx`

B站 CDN 对视频流地址实施严格的防盗链策略（Referer 校验 + UA 校验 + 时效签名）。
`expo-av` 的 `Video` 组件无法可靠地在底层 HTTP 请求中注入自定义 `Referer` / `User-Agent`，
实际播放时服务器会返回 403，视频黑屏或播放失败。

**修复方案**: 改用 `react-native-webview` 加载 B站官方嵌入播放器：
```
https://player.bilibili.com/player.html?bvid={bvid}&page=1&high_quality=1&danmaku=1
```
该嵌入页由浏览器环境发起请求，Referer/Cookie 天然正确，可正常播放。

---

## [Critical] VideoPlayer.tsx - 组件内动态 require

**文件**: `components/VideoPlayer.tsx:34`

```ts
// 错误写法：在组件函数体内动态 require
const NativeVideoPlayer = require('./NativeVideoPlayer').NativeVideoPlayer;
```

每次渲染都执行 `require()`，虽然 Metro 会缓存模块，但这是反模式，
且与 React 渲染机制不兼容（Hook 规则 / 条件渲染中的动态导入）。
同文件还导入了 `useRef, useState` 但从未使用。

**修复方案**: 改为文件顶部静态 import，移除无用导入。

---

## [High] NativeVideoPlayer.tsx - isPlaying 状态无意义

**文件**: `components/NativeVideoPlayer.tsx:14`

```ts
const [isPlaying, setIsPlaying] = useState(false);
```

追踪了播放状态但没有任何自定义控制 UI 使用它，纯冗余代码。

---

## [High] useVideoDetail.ts - getPlayUrl 在未登录时返回空/错误

**文件**: `hooks/useVideoDetail.ts:19`

```ts
setStreamUrl(playData.durl[0]?.url ?? null);
```

B站 `/x/player/playurl` 接口：
- 未登录时对部分视频返回 `code: -101`（未登录）或 `code: -403`（无权限）
- 高清版本（qn>=80）需要大会员，未登录时 `durl` 数组为空或 fallback 到极低画质
- `fnval: 1` 只请求 durl 格式，但部分视频仅提供 dash 格式，`durl` 为空数组

`playData.durl[0]?.url` 为 `undefined`，`streamUrl` 始终 null，播放器持续显示"视频加载中"。

**修复方案**: 使用 WebView 嵌入播放器后，此接口调用不再需要，移除即可。

---

## [High] services/types.ts - PlayUrlResponse 类型不完整

**文件**: `services/types.ts:37`

```ts
export interface PlayUrlResponse {
  durl: Array<{ url: string; length: number; size: number }>;
  quality: number;
}
```

缺少：
- 接口 `code` 字段（API 响应状态码）
- `dash` 格式（`fnval >= 16` 时返回，包含 video/audio 分离流）
- `durl` 在 dash 模式下为 `undefined`，当前定义为必填数组会导致类型错误

---

## [Medium] app/video/[bvid].tsx - error 状态未处理

**文件**: `app/video/[bvid].tsx:20`

```ts
const { video, streamUrl, loading: videoLoading } = useVideoDetail(bvid as string);
```

`useVideoDetail` 返回了 `error`，但页面中完全未使用，接口失败时用户看不到任何错误提示。

---

## [Medium] LoginModal.tsx - 移动端无法从响应头提取 Cookie

**文件**: `components/LoginModal.tsx:62`

```ts
const setCookie = res.headers['set-cookie'];
const match = setCookie?.find((c: string) => c.includes('SESSDATA'));
```

B站登录成功后 `SESSDATA` 以 `httpOnly` Cookie 设置，在 React Native 中
`axios` 响应头里 `set-cookie` 通常为 `undefined`（被底层 HTTP 客户端过滤），
导致登录二维码扫描后 `cookie` 始终为 `undefined`，登录流程无法完成。

---

## [Low] useVideoList.ts - useCallback 依赖导致的 stale closure 风险

**文件**: `hooks/useVideoList.ts:11`

```ts
const load = useCallback(async (reset = false) => {
  if (loading) return;   // loading 为 stale 值时可能错误地放行重复请求
  ...
}, [loading, page]);     // 每次 loading/page 变化都重新创建函数
```

`load` 依赖 `loading` 用于防重，但同时 `onEndReached` 持有对 `load` 的引用，
在 `loading=true` 的渲染周期内 `load` 会重新创建，而 FlatList 引用可能还是旧版本，
导致防重逻辑失效或加载多次。应改用 `useRef` 追踪 loading 状态做防重。

---

## [Low] App.tsx - 残留 expo 模板代码

**文件**: `App.tsx`

文件内容为 expo 初始化模板，实际项目已使用 expo-router（入口为 `expo-router/entry`），
`App.tsx` 不会被执行，但留在项目中容易造成混淆。
