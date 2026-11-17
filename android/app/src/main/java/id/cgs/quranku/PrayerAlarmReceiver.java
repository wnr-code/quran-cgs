package id.cgs.quranku;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Receives native AlarmManager events and posts Android system notifications. */
public final class PrayerAlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_PREFIX = "qk_prayer_";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (PrayerAlarmScheduler.ACTION_REFRESH.equals(action)) {
            try { PrayerAlarmScheduler.rebuild(context); } catch (Exception ignored) {}
            return;
        }
        if (!PrayerAlarmScheduler.ACTION_FIRE.equals(action)) return;

        String eventId = intent.getStringExtra("eventId");
        String kind = intent.getStringExtra("kind");
        String key = intent.getStringExtra("key");
        if (!PrayerAlarmScheduler.isEventEnabled(context, kind, key)) return;
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;
        if (!PrayerAlarmScheduler.markDelivered(context, eventId)) return;

        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String sound = intent.getStringExtra("notificationSound");
        boolean vibrate = intent.getBooleanExtra("vibration", true);
        long at = intent.getLongExtra("at", System.currentTimeMillis());
        int id = eventId == null ? (int) at : eventId.hashCode();
        String channelId = ensureChannel(context, kind, sound, vibrate);

        Intent open = new Intent(context, PrayerNotificationOpenReceiver.class)
            .setAction(PrayerNotificationOpenReceiver.ACTION_OPEN)
            .setData(Uri.parse("quranku://notification-open/" + Uri.encode(eventId)))
            .putExtra("eventId", eventId);
        PendingIntent content = PendingIntent.getBroadcast(context, id, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification_icon)
            .setColor(Color.rgb(11, 61, 46))
            .setContentTitle(title == null ? "Pengingat salat" : title)
            .setContentText(body == null ? "" : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body == null ? "" : body))
            .setContentIntent(content)
            .setWhen(at)
            .setShowWhen(true)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Uri soundUri = soundUri(sound);
            if (soundUri != null) builder.setSound(soundUri);
            if (vibrate) builder.setVibrate(new long[] { 0, 250, 150, 250 });
            else builder.setDefaults(0);
        }
        try {
            manager.notify(id, builder.build());
        } catch (SecurityException ignored) {
            return;
        }
        PrayerAlarmScheduler.recordNotification(context, eventId, kind, key, title, body, at);

        if ("prayer".equals(kind) && intent.getBooleanExtra("longAzan", false)) {
            PrayerPlaybackService.start(
                context,
                key,
                intent.getStringExtra("voice"),
                (float) intent.getDoubleExtra("volume", 1.0)
            );
        }
    }

    private static String ensureChannel(Context context, String kind, String sound, boolean vibrate) {
        String type = kind == null ? "reminder" : kind;
        String choice = sound == null ? "default" : sound;
        if (!"default".equals(choice) && !"alarm".equals(choice) && !"silent".equals(choice)) choice = "default";
        String id = CHANNEL_PREFIX + type + "_" + choice + (vibrate ? "_v" : "_q");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null && manager.getNotificationChannel(id) == null) {
                String name = "QuranKu · " + channelName(type) + " · " + soundName(choice);
                NotificationChannel channel = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Pemberitahuan salat, tilawah, target, dan kalender QuranKu");
                Uri uri = soundUri(choice);
                AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                channel.setSound(uri, uri == null ? null : attrs);
                channel.enableVibration(vibrate);
                if (vibrate) channel.setVibrationPattern(new long[] { 0, 250, 150, 250 });
                manager.createNotificationChannel(channel);
            }
        }
        return id;
    }

    private static Uri soundUri(String choice) {
        if ("silent".equals(choice)) return null;
        if ("alarm".equals(choice)) return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
    }

    private static String channelName(String kind) {
        if ("prayer".equals(kind)) return "Azan";
        if ("imsak".equals(kind)) return "Imsak";
        if ("tarhim".equals(kind) || "pre_reminder".equals(kind)) return "Pengingat salat";
        if ("tilawah".equals(kind)) return "Pengingat tilawah";
        if ("goal".equals(kind)) return "Target tilawah";
        if ("calendar".equals(kind)) return "Kalender";
        return "Jadwal salat";
    }

    private static String soundName(String sound) {
        if ("silent".equals(sound)) return "hening";
        if ("alarm".equals(sound)) return "nada alarm";
        return "nada standar";
    }
}
