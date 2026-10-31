import { Platform } from 'react-native';

/**
 * On web, rewrites Bilibili image CDN URLs to the local proxy, injecting the correct Referer to get past hotlink protection.
 * On native, returns the original URL (app request headers are set by the axios interceptor).
 */
export function proxyImageUrl(url: string): string {
  if (!url) return url;
  if (Platform.OS === 'web') {
    return url.replace(
      /^https?:\/\/([a-z0-9]+\.hdslb\.com)/,
      'http://localhost:3001/bilibili-img/$1',
    );
  }
  // Native: force HTTPS so Release APK doesn't block cleartext HTTP
  return url.replace(/^http:\/\//, 'https://');
}

export function coverImageUrl(url: string, quality: 'hd' | 'normal'): string {
  const base = proxyImageUrl(url);
  if (quality === 'normal' && base) {
    return base.replace(/(@[\w]+)?$/, '@320w_180h_1c.webp');
  }
  return base;
}
