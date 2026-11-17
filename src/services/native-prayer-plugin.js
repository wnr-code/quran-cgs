// Register the Capacitor bridge once; scheduler and inbox share the same plugin proxy.
import { registerPlugin } from '@capacitor/core'

export const NativePrayerNotifications = registerPlugin('PrayerNotifications')
