import { useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';

const GITHUB_API = 'https://api.github.com/repos/tiajinsha/JKVideo/releases/latest';

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

export function useCheckUpdate() {
  const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
  const [isChecking, setIsChecking] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const checkUpdate = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(GITHUB_API, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();

      const latestVersion: string = data.tag_name ?? '';
      const apkAsset = (data.assets as any[]).find((a) =>
        (a.name as string).endsWith('.apk')
      );
      const downloadUrl: string = apkAsset?.browser_download_url ?? '';
      const releaseNotes: string = data.body ?? '';

      if (compareVersions(latestVersion, currentVersion) <= 0) {
        Alert.alert('Up to date', `v${currentVersion} is the latest version`);
        return;
      }

      Alert.alert(
        `New version available: ${latestVersion}`,
        releaseNotes || 'A new version is available. Download it now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download in browser',
            onPress: () => Linking.openURL(downloadUrl),
          },
          {
            text: 'Download in app',
            onPress: () => downloadAndInstall(downloadUrl, latestVersion),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Update check failed', e?.message ?? 'Network error. Please try again later');
    } finally {
      setIsChecking(false);
    }
  };

  const openInstallSettings = () => {
    IntentLauncher.startActivityAsync(
      'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
      { data: 'package:com.anonymous.jkvideo' }
    ).catch(() => {
      // Some older Android versions do not support the exact intent; fall back to the general security settings
      IntentLauncher.startActivityAsync('android.settings.SECURITY_SETTINGS');
    });
  };

  const triggerInstall = async (localUri: string) => {
    const contentUri = await FileSystem.getContentUriAsync(localUri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1,
      type: 'application/vnd.android.package-archive',
    });
  };

  const downloadAndInstall = async (url: string, version: string) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Notice', 'Automatic install is only supported on Android');
      return;
    }
    const localUri = FileSystem.cacheDirectory + `JKVideo-${version}.apk`;
    try {
      setDownloadProgress(0);
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localUri,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (totalBytesExpectedToWrite > 0) {
            setDownloadProgress(
              Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
            );
          }
        }
      );
      await downloadResumable.downloadAsync();
      setDownloadProgress(null);

      // Android 8.0+ requires the user to grant this app the "Install unknown apps" permission in system settings.
      // A system denial does not throw a JS error, so guide the user after the download finishes.
      Alert.alert(
        'Download complete, ready to install',
        'If tapping "Install" reports a missing permission, tap "Settings" first, allow "Install unknown apps" for JKVideo, then come back and try again.',
        [
          { text: 'Settings', onPress: openInstallSettings },
          {
            text: 'Install',
            onPress: () => {
              triggerInstall(localUri).catch((e: any) => {
                Alert.alert('Install failed', e?.message ?? 'Allow "Install unknown apps" in settings and try again');
              });
            },
          },
        ]
      );
    } catch (e: any) {
      setDownloadProgress(null);
      Alert.alert('Download failed', e?.message ?? 'Please try again later');
    }
  };

  return { currentVersion, isChecking, downloadProgress, checkUpdate };
}
