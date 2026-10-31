import { useCallback, useEffect, useRef, useState } from "react";
import { getRelation, modifyRelation } from "../services/bilibili";
import { useAuthStore } from "../store/authStore";
import { getSecure } from "../utils/secureStorage";
import { toast } from "../utils/toast";

/**
 * Follow / unfollow a creator.
 * - Not signed in: toggle shows a toast; the button stays enabled (disabled=false)
 * - Signed in but no bili_jct: toggle shows a toast asking the user to sign in again
 * - Normal path: optimistic UI update, rolled back if the request fails
 */
export function useFollow(mid: number | undefined) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const inflightRef = useRef(false);

  // Refresh follow state on first load / when mid changes
  useEffect(() => {
    if (!mid || !isLoggedIn) {
      setFollowing(false);
      return;
    }
    let cancelled = false;
    getRelation(mid)
      .then((r) => {
        if (!cancelled) setFollowing(r.following);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mid, isLoggedIn]);

  const toggle = useCallback(async () => {
    if (!mid) return;
    if (!isLoggedIn) {
      toast("Please sign in to follow");
      return;
    }
    const biliJct = await getSecure("bili_jct");
    if (!biliJct) {
      toast("Please sign in again to use follow");
      return;
    }
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);
    const next = !following;
    setFollowing(next); // Optimistic update
    try {
      await modifyRelation(mid, next ? 1 : 2);
    } catch (e: any) {
      setFollowing(!next); // Roll back on failure
      if (e?.message === "NO_CSRF") {
        toast("Please sign in again to use follow");
      } else {
        toast(`Action failed: ${e?.message || "Unknown error"}`);
      }
    } finally {
      inflightRef.current = false;
      setLoading(false);
    }
  }, [mid, isLoggedIn, following]);

  return { following, loading, toggle };
}
