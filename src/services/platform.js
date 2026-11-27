import { Capacitor } from '@capacitor/core'

/** True when the shared web UI is running inside a Capacitor native shell. */
export const isNativePlatform = () => Capacitor.isNativePlatform()

/** True only for the Android APK target; the PWA and other browser builds remain web-first. */
export const isAndroidApp = () => isNativePlatform() && Capacitor.getPlatform() === 'android'

/**
 * True when a page is being served inside the Capacitor WebView — termasuk halaman statis
 * (/buka.html) yang dibuka dari https://localhost di APK. Dipakai untuk mematikan
 * pemberitahuan "buka di aplikasi" dan halaman perantara, karena aplikasinya sudah terbuka.
 */
export const isNativeShell = (origin = typeof location !== 'undefined' ? location.origin : '') => {
  if (isNativePlatform()) return true
  return /^(https?|capacitor):\/\/localhost\/?$/i.test(origin)
}
