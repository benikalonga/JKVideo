/**
 * Mutual exclusion between MiniPlayer and LiveMiniPlayer.
 * Links the two stores externally via zustand subscribe so they never import each other directly,
 * which caused a circular dependency (and once made Metro / TS compile memory explode).
 *
 * Import it once at app startup (_layout.tsx) for it to take effect.
 */
import { useVideoStore } from './videoStore';
import { useLiveStore } from './liveStore';

let initialized = false;

export function initMiniExclusion() {
  if (initialized) return;
  initialized = true;

  // Video mini player activated → clear the live mini player
  useVideoStore.subscribe((state, prev) => {
    if (state.isActive && !prev.isActive && useLiveStore.getState().isActive) {
      useLiveStore.getState().clearLive();
    }
  });

  // Live mini player activated → clear the video mini player
  useLiveStore.subscribe((state, prev) => {
    if (state.isActive && !prev.isActive && useVideoStore.getState().isActive) {
      useVideoStore.getState().clearVideo();
    }
  });
}
