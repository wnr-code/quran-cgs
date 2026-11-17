package id.cgs.quranku;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Marks a delivered reminder as opened before bringing QuranKu to the foreground. */
public final class PrayerNotificationOpenReceiver extends BroadcastReceiver {
    static final String ACTION_OPEN = "id.cgs.quranku.action.OPEN_PRAYER_NOTIFICATION";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_OPEN.equals(intent.getAction())) return;
        String eventId = intent.getStringExtra("eventId");
        PrayerAlarmScheduler.markNotificationRead(context, eventId);

        Intent launch = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launch);
    }
}
