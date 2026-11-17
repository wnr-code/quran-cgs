package id.cgs.quranku;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Capacitor bridge for the native rolling prayer-alarm scheduler and azan playback controls. */
@CapacitorPlugin(name = "PrayerNotifications")
public final class PrayerNotificationsPlugin extends Plugin {
    @PluginMethod
    public void sync(PluginCall call) {
        JSObject input = call.getObject("settings");
        if (input == null) {
            call.reject("Pengaturan notifikasi salat tidak tersedia");
            return;
        }
        try {
            JSONObject status = PrayerAlarmScheduler.saveAndSchedule(getContext(), new JSONObject(input.toString()));
            call.resolve(toJsObject(status));
        } catch (Exception error) {
            call.reject("Jadwal notifikasi salat Android tidak dapat diperbarui", error);
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            call.resolve(toJsObject(PrayerAlarmScheduler.status(getContext(), 0, 0L)));
        } catch (JSONException error) {
            call.reject("Status notifikasi tidak dapat dibaca", error);
        }
    }

    @PluginMethod
    public void getNotifications(PluginCall call) {
        JSONArray stored = PrayerAlarmScheduler.notifications(getContext());
        JSArray items = new JSArray();
        for (int i = 0; i < stored.length(); i++) {
            JSONObject item = stored.optJSONObject(i);
            if (item == null) continue;
            try { items.put(new JSObject(item.toString())); } catch (JSONException ignored) {}
        }
        call.resolve(new JSObject().put("items", items));
    }

    @PluginMethod
    public void getUnreadNotifications(PluginCall call) {
        JSONArray stored = PrayerAlarmScheduler.unreadNotifications(getContext());
        JSArray items = new JSArray();
        for (int i = 0; i < stored.length(); i++) {
            JSONObject item = stored.optJSONObject(i);
            if (item == null) continue;
            try { items.put(new JSObject(item.toString())); } catch (JSONException ignored) {}
        }
        call.resolve(new JSObject().put("items", items));
    }

    @PluginMethod
    public void markNotificationRead(PluginCall call) {
        String eventId = call.getString("eventId", "");
        call.resolve(new JSObject().put("marked", PrayerAlarmScheduler.markNotificationRead(getContext(), eventId)));
    }

    @PluginMethod
    public void markAllNotificationsRead(PluginCall call) {
        PrayerAlarmScheduler.markAllNotificationsRead(getContext());
        call.resolve();
    }

    @PluginMethod
    public void playAzan(PluginCall call) {
        String key = call.getString("key", "uji");
        String voice = call.getString("voice", "a9");
        double volume = Math.max(0.0, Math.min(1.0, call.getDouble("volume", 1.0)));
        PrayerPlaybackService.start(getContext(), key, voice, (float) volume);
        call.resolve(new JSObject().put("started", true));
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        PrayerPlaybackService.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getContext().getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Setelan notifikasi Android tidak dapat dibuka", error);
        }
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager == null || alarmManager.canScheduleExactAlarms()) {
            call.resolve(new JSObject().put("exactAlarmAllowed", true));
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(new JSObject().put("exactAlarmAllowed", false));
        } catch (Exception error) {
            call.reject("Setelan alarm tepat Android tidak dapat dibuka", error);
        }
    }

    private static JSObject toJsObject(JSONObject json) throws JSONException {
        return new JSObject(json.toString());
    }
}
