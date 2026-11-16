package id.cgs.quranku;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restores the bounded alarm window after reboot, app update, date/time or timezone changes. */
public final class PrayerBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        boolean timezoneChanged = Intent.ACTION_TIMEZONE_CHANGED.equals(action);
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_DATE_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_USER_UNLOCKED.equals(action)
            || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(action)) {
            PrayerAlarmScheduler.refreshAfterSystemChange(context, timezoneChanged);
        }
    }
}
