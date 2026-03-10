# Player UI Redesign Spec

## Goal
重写播放器 UI：统一自定义控制层（点击显示/3s 自动隐藏），将热度进度条和缩略图预览整合进播放器内部，删除播放器下方独立的 HeatProgressBar。

## Layout

```
+------------------------------------------+
│ [pip]                                    │  ← 顶部栏（半透明黑底渐变）
│                                           │
│                  [▶/⏸]                   │  ← 中心播放/暂停按钮
│                                           │
│     [缩略图 + 时间]                        │  ← 拖拽时浮出，紧贴进度条上方
│ [00:12] [════════●═══] [10:23] [HD] [⛶]  │  ← 底部栏（半透明黑底渐变）
+------------------------------------------+
```

## Architecture

### Files Changed

| File | Action | Notes |
|---|---|---|
| `components/NativeVideoPlayer.tsx` | Rewrite | 全量自定义控制层，整合热度图逻辑 |
| `components/VideoPlayer.tsx` | Modify | 新增 bvid/cid props，向下透传 |
| `app/video/[bvid].tsx` | Modify | 删除 HeatProgressBar 及相关 state |
| `components/HeatProgressBar.tsx` | Delete | 逻辑搬入 NativeVideoPlayer |

### NativeVideoPlayer Props

```ts
interface Props {
  playData: PlayUrlResponse | null;
  qualities: { qn: number; desc: string }[];
  currentQn: number;
  onQualityChange: (qn: number) => void;
  onFullscreen: () => void;
  onMiniPlayer?: () => void;
  style?: object;
  bvid?: string;   // NEW: for heatmap + thumbnail
  cid?: number;    // NEW: for heatmap + thumbnail
}
```

`onProgress` / `seekTo` props 删除（进度状态内部管理）

### Internal State

| State | Type | Description |
|---|---|---|
| `resolvedUrl` | string? | async MPD/durl URI |
| `showControls` | boolean | 控制层可见性 |
| `paused` | boolean | 播放/暂停 |
| `currentTime` | number | 当前播放进度（秒） |
| `duration` | number | 视频总时长 |
| `isSeeking` | boolean | 是否正在拖拽进度条 |
| `touchX` | number? | 拖拽时的 x 坐标（相对进度条左端） |
| `heatSegments` | number[] | 热度图归一化数据 |
| `shots` | VideoShotData? | 缩略图雪碧图数据 |

### Control Layer Behavior

- **点击视频区域** → toggle `showControls`，重置 3s 隐藏定时器
- **拖拽进度条** → `isSeeking=true`，暂停定时器；松手 → seek，`isSeeking=false`，重置定时器
- **点击播放/暂停** → toggle `paused`，重置定时器
- **切换清晰度** → Modal 显示时不自动隐藏控制层

### Progress Bar Layout (bottom bar)

```
[▶/⏸]  [00:12]  [track with heatmap + ball]  [10:23]  [HD]  [⛶]
```

- 热度图色段 + 已播进度半透明遮罩（同 HeatProgressBar 现有实现）
- 拖拽时进度条 ball 放大至 16px，并在上方显示缩略图 + 时间
- 底部栏背景：`linear-gradient(transparent → rgba(0,0,0,0.7))`（使用 expo-linear-gradient）

### Thumbnail Preview

- 触发：`isSeeking=true` 且 `shots` 数据已加载
- 位置：进度条上方，左右不超出边界
- 内容：雪碧图裁切（同 HeatProgressBar 现有实现）+ 时间文字

## Deleted

- `components/HeatProgressBar.tsx`
- `[bvid].tsx` 中的 `currentTime`、`duration`、`seekCmd` state
- `[bvid].tsx` 中的 `<HeatProgressBar>` JSX 及 import
- `VideoPlayer.tsx` 中的 `onProgress`、`seekTo` props
