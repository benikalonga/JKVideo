# 代码审查：优化建议与 Bug 清单

## 严重 Bug

### 1. ~~useComments 竞态条件~~ [已修复]
- **文件**: `hooks/useComments.ts`
- **问题**: `load()` 依赖 `[aid, page, loading, hasMore]`，`setPage(p => p + 1)` 触发新的 load 回调，可能重复请求或跳页
- **修复**: 改用 `pageRef` + `loadingRef` 避免依赖循环

### 2. ~~LoginModal 错误处理缺失~~ [已修复]
- **文件**: `components/LoginModal.tsx`
- **问题**: `login(result.cookie, '', '')` 传入空 uid/username；`getUserInfo()` 调用无错误处理
- **修复**: 添加 try-catch 包裹登录+拉取用户信息流程

### 3. ~~NativeVideoPlayer loadPvData 未捕获 Promise 异常~~ [已修复]
- **文件**: `components/NativeVideoPlayer.tsx`
- **问题**: `loadPvData().then(...)` 没有 `.catch()`，且原来的 try-catch 无法捕获异步 Promise
- **修复**: 改为 `.then().catch()` 链式调用

### 4. BigVideoCard PanResponder 闭包陈旧
- **文件**: `components/BigVideoCard.tsx`
- **问题**: `useMemo` 依赖为 `[]`，但内部使用 `currentTimeRef`、`durationRef`、`screenWRef`，重构时容易引入 bug
- **状态**: 当前使用 ref 所以不会出错，但属于脆弱模式

## 性能问题

### 5. ~~index.tsx renderItem 未稳定~~ [已修复]
- **文件**: `app/index.tsx`
- **问题**: `renderItem` 依赖 `[visibleBigKey]`，每次可见项变化都重建回调
- **修复**: 改用 `visibleBigKeyRef` + 空依赖 `useCallback`

### 6. BigVideoCard 视频预加载无取消机制
- **文件**: `components/BigVideoCard.tsx`
- **问题**: 快速滑动时，所有可见卡片同时发起 `getPlayUrl` 请求，无取消/去抖
- **修复**: 增加可见性停留阈值或 AbortController

### 7. DanmakuList 动画值频繁创建
- **文件**: `components/DanmakuList.tsx`
- **问题**: 每次 drip interval 都创建新的 `Animated.Value`，弹幕密集时影响性能
- **修复**: 使用对象池复用 Animated.Value

### 8. LivePulse 动画堆叠
- **文件**: `components/LivePulse.tsx`
- **问题**: 组件快速卸载/重新挂载时，`Animated.loop()` 动画可能堆叠

## 错误处理

### 9. 缺少全局错误边界
- **文件**: `app/_layout.tsx`
- **问题**: 没有 React Error Boundary，任何组件抛异常会导致白屏
- **修复**: 在根布局包裹 ErrorBoundary 组件

### 10. ~~WBI Keys 缓存无过期~~ [已修复]
- **文件**: `services/bilibili.ts`
- **问题**: `wbiKeys` 模块级变量缓存后永不过期，B站 WBI 密钥每日更换
- **修复**: 添加 12 小时 TTL，过期后自动刷新；网络错误时回退到陈旧缓存

### 11. ~~getWbiKeys 无容错~~ [已修复]
- **文件**: `services/bilibili.ts`
- **问题**: 直接访问 `res.data.data.wbi_img`，结构不匹配时直接崩溃
- **修复**: 添加可选链检查 + try-catch + 陈旧缓存回退

### 12. ~~Cookie 解析脆弱~~ [已修复]
- **文件**: `services/bilibili.ts`
- **问题**: `split(';')[0].replace('SESSDATA=', '')` 假设 SESSDATA 是第一个 cookie 属性
- **修复**: 改为 `.find()` 查找包含 `SESSDATA=` 的 part

### 13. ~~useVideoDetail 静默吞错~~ [已修复]
- **文件**: `hooks/useVideoDetail.ts`
- **问题**: `.catch(() => {})` 吞掉重新获取播放数据时的错误，用户无感知
- **修复**: 改为 `console.warn` 输出

## 代码质量

### 14. ~~残留调试代码~~ [已修复]
- **文件**: `components/NativeVideoPlayer.tsx`
- **问题**: `console.log(r, "ddddddddddddd")` 和未使用的 `axios` 导入
- **修复**: 已移除

### 15. 类型安全问题
- **文件**: `app/index.tsx`
- **问题**: `router.push(\`/video/${bvid}\` as any)` 使用 `as any` 绕过类型检查
- **修复**: 正确定义路由类型

### 16. 未使用的导入
- **文件**: `components/VideoPlayer.tsx`
- **问题**: `Paths` 从 `expo-file-system` 导入但未使用

### 17. 魔法数字散落
- **文件**: 多处
- **问题**: `SWIPE_SECONDS = 90`、`HIDE_DELAY = 3000`、`DRIP_INTERVAL = 250` 等硬编码
- **修复**: 统一到 constants 文件

## API 使用

### 18. 无请求去重
- **文件**: `services/bilibili.ts`
- **问题**: BigVideoCard 和 NativeVideoPlayer 可能同时为同一视频发起 `getPlayUrl` 请求
- **修复**: 实现请求去重（相同参数复用 Promise）

### 19. 无请求超时重试
- **文件**: `services/bilibili.ts`
- **问题**: 设置了 `timeout: 10000` 但无重试逻辑，弱网下直接失败

## UI/UX

### 20. ~~MiniPlayer 拖拽无边界~~ [已修复]
- **文件**: `components/MiniPlayer.tsx`
- **问题**: 拖拽可将迷你播放器移出屏幕外，无边界限制
- **修复**: 释放时 clamp 到屏幕范围内，超出部分用 spring 动画弹回

### 21. 无网络状态检测
- **问题**: 离线时所有 API 静默失败，用户无反馈
- **修复**: 使用 `@react-native-community/netinfo` 检测网络并提示

### 22. BigVideoCard 预加载无 Loading 态
- **问题**: 视频 URL 加载期间画面冻结，无骨架屏或加载动画

## 安全

### 23. SESSDATA 明文存储
- **文件**: `services/bilibili.ts` / `store/authStore.ts`
- **问题**: Cookie 存储在 AsyncStorage（明文），设备被攻破可泄露
- **修复**: 使用 `expo-secure-store` 存储敏感凭证

---

## 修复进度

| 优先级 | 项目 | 状态 |
|--------|------|------|
| **P0** | #1 竞态条件 | 已修复 |
| **P0** | #3 Promise 未捕获 | 已修复 |
| **P0** | #14 调试代码 | 已修复 |
| **P0** | #10 WBI 过期 | 已修复 |
| **P1** | #2 登录错误处理 | 已修复 |
| **P1** | #5 renderItem 稳定化 | 已修复 |
| **P1** | #11 getWbiKeys 容错 | 已修复 |
| **P1** | #12 Cookie 解析 | 已修复 |
| **P1** | #13 静默吞错 | 已修复 |
| **P2** | #20 MiniPlayer 边界 | 已修复 |
| **P1** | #9 错误边界 | 待修复 |
| **P2** | #6 预加载取消 | 待修复 |
| **P2** | #18 请求去重 | 待修复 |
| **P2** | #21 网络检测 | 待修复 |
| **P3** | #4 闭包陈旧 | 暂不修复（ref模式可用） |
| **P3** | #7 动画池化 | 待修复 |
| **P3** | #8 动画堆叠 | 待修复 |
| **P3** | #15 类型安全 | 待修复 |
| **P3** | #16 未使用导入 | 待修复 |
| **P3** | #17 魔法数字 | 待修复 |
| **P3** | #19 超时重试 | 待修复 |
| **P3** | #22 Loading 态 | 待修复 |
| **P3** | #23 安全存储 | 待修复 |
