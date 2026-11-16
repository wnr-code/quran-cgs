import { Capacitor } from '@capacitor/core'

/** True when the shared web UI is running inside a Capacitor native shell. */
export const isNativePlatform = () => Capacitor.isNativePlatform()

/** True only for the Android APK target; the PWA and other browser builds remain web-first. */
export const isAndroidApp = () => isNativePlatform() && Capacitor.getPlatform() === 'android'
