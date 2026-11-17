package id.cgs.quranku;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.icu.util.IslamicCalendar;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

/** Stores settings and maintains a rolling, bounded native prayer-alarm window. */
final class PrayerAlarmScheduler {
    static final String PREFS = "quranku_prayer_alarm_settings";
    static final String SETTINGS_KEY = "settings_json";
    static final String EVENT_IDS_KEY = "scheduled_event_ids";
    static final String FIRED_IDS_KEY = "fired_event_ids";
    static final String UNREAD_NOTIFICATIONS_KEY = "unread_notifications_json";
    static final String ACTION_FIRE = "id.cgs.quranku.action.PRAYER_ALARM";
    static final String ACTION_REFRESH = "id.cgs.quranku.action.PRAYER_REFRESH";
    static final int WINDOW_DAYS = 14;
    private static final long REFRESH_AFTER_MS = 24L * 60L * 60L * 1000L;
    private static final int REFRESH_REQUEST_CODE = 0x514b;
    private static final String[] PRAYER_KEYS = { "subuh", "zuhur", "asar", "magrib", "isya" };
    private static final String[] PRAYER_NAMES = { "Subuh", "Zuhur", "Asar", "Magrib", "Isya" };

    private PrayerAlarmScheduler() {}

    static JSONObject saveAndSchedule(Context context, JSONObject settings) throws JSONException {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(SETTINGS_KEY, settings.toString()).commit();
        return rebuild(context);
    }

    static JSONObject getSettings(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SETTINGS_KEY, "{}");
        try { return new JSONObject(raw); } catch (JSONException ignored) { return new JSONObject(); }
    }

    static JSONObject rebuild(Context context) throws JSONException {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) throw new IllegalStateException("AlarmManager tidak tersedia");
        cancelAll(context, alarms);

        JSONObject settings = getSettings(context);
        JSONObject location = settings.optJSONObject("location");
        JSONObject adzan = settings.optJSONObject("adzan");
        boolean enabled = settings.optBoolean("enabled", adzan != null && adzan.optBoolean("enabled", false));
        if (!enabled) {
            saveEventIds(context, new LinkedHashSet<>());
            return status(context, 0, 0L);
        }

        double latitude = location == null ? Double.NaN : location.optDouble("lat", Double.NaN);
        double longitude = location == null ? Double.NaN : location.optDouble("lng", Double.NaN);
        boolean hasLocation = Double.isFinite(latitude) && Double.isFinite(longitude)
            && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

        String timezone = settings.optString("timezone", TimeZone.getDefault().getID());
        TimeZone zone = safeTimeZone(timezone);
        String method = settings.optString("method", "kemenag");
        int hijriAdjust = Math.max(-2, Math.min(2, settings.optInt("hijriAdjust", 0)));
        JSONObject reminders = settings.optJSONObject("prayerReminders");
        JSONObject ramadanReminders = settings.optJSONObject("ramadanReminders");
        boolean azanEnabled = adzan != null && adzan.optBoolean("enabled", false);
        long now = System.currentTimeMillis();
        Calendar day = Calendar.getInstance(zone, Locale.US);
        day.setTimeInMillis(now);
        day.set(Calendar.HOUR_OF_DAY, 12);
        day.set(Calendar.MINUTE, 0);
        day.set(Calendar.SECOND, 0);
        day.set(Calendar.MILLISECOND, 0);

        Set<String> scheduled = new LinkedHashSet<>();
        for (int offset = 0; offset < WINDOW_DAYS; offset++) {
            if (offset > 0) day.add(Calendar.DAY_OF_MONTH, 1);
            Map<String, Long> prayerTimes = hasLocation
                ? PrayerTimesCalculator.calculate(day, latitude, longitude, method)
                : java.util.Collections.emptyMap();
            String dateId = dateId(day);
            boolean ramadan = isRamadan(day, hijriAdjust, zone);
            long fajr = value(prayerTimes, "subuh");

            if (enabled && hasLocation && azanEnabled) {
                for (int i = 0; i < PRAYER_KEYS.length; i++) {
                    String key = PRAYER_KEYS[i];
                    long at = value(prayerTimes, key);
                    if (at > now && adzan.optBoolean(key, true)) {
                        String label = PRAYER_NAMES[i];
                        String place = location.optString("name", "").trim();
                        String body = "Telah masuk waktu salat " + label + " (" + clock(at, zone) + ")"
                            + (place.isEmpty() ? "." : " untuk " + place + ".");
                        Event event = new Event(dateId + "|" + key, "prayer", key, label, at,
                            "Waktu " + label, body,
                            adzan.optString("notificationSound", "default"), adzan.optBoolean("vibration", true),
                            adzan.optBoolean("sound", true), adzan.optString("voice", "a9"),
                            clampVolume(adzan.optDouble("volume", 1.0)));
                        schedule(context, alarms, event, now, scheduled);
                    }
                }
            }

            if (enabled && hasLocation && ramadan && ramadanReminders != null
                && ramadanReminders.optBoolean("imsakEnabled", false) && fajr > 0) {
                long at = fajr - 10L * 60_000L;
                if (at > now) {
                    Event event = new Event(dateId + "|imsak", "imsak", "imsak", "Imsak", at,
                        "Waktu imsak", "Waktu imsak telah tiba (" + clock(at, zone) + ").",
                        ramadanReminders.optString("imsakSound", "default"), ramadanReminders.optBoolean("vibration", true),
                        false, "a9", 1.0);
                    schedule(context, alarms, event, now, scheduled);
                }
            }

            if (enabled && hasLocation && azanEnabled && ramadan && adzan.optBoolean("tarhim", true) && fajr > 0) {
                long at = fajr - 15L * 60_000L;
                if (at > now) {
                    Event event = new Event(dateId + "|tarhim", "tarhim", "tarhim", "Tarhim", at,
                        "Tarhim", "15 menit lagi masuk waktu Subuh (" + clock(fajr, zone) + "). Segera selesaikan sahur.",
                        adzan.optString("tarhimSound", "default"), adzan.optBoolean("tarhimVibration", adzan.optBoolean("vibration", true)),
                        false, adzan.optString("voice", "a9"), clampVolume(adzan.optDouble("volume", 1.0)));
                    schedule(context, alarms, event, now, scheduled);
                }
            }

            if (hasLocation && reminders != null && reminders.optBoolean("enabled", false)) {
                int leadMinutes = Math.max(1, Math.min(60, reminders.optInt("leadMinutes", 10)));
                JSONObject selected = reminders.optJSONObject("prayers");
                for (int i = 0; i < PRAYER_KEYS.length; i++) {
                    String key = PRAYER_KEYS[i];
                    if (selected != null && !selected.optBoolean(key, true)) continue;
                    long prayerAt = value(prayerTimes, key);
                    long at = prayerAt - leadMinutes * 60_000L;
                    if (at <= now || prayerAt <= 0) continue;
                    String label = PRAYER_NAMES[i];
                    Event event = new Event(dateId + "|reminder_" + key, "pre_reminder", key, label, at,
                        "Pengingat salat " + label,
                        leadMinutes + " menit lagi masuk waktu salat " + label + " (" + clock(prayerAt, zone) + ").",
                        reminders.optString("sound", "default"), reminders.optBoolean("vibration", true),
                        false, "a9", 1.0);
                    schedule(context, alarms, event, now, scheduled);
                }
            }

            scheduleReadingReminders(context, alarms, day, dateId, now, settings.optJSONObject("readingReminders"), scheduled);
        }

        Calendar horizonDay = (Calendar) day.clone();
        horizonDay.add(Calendar.DAY_OF_MONTH, 1);
        horizonDay.set(Calendar.HOUR_OF_DAY, 0);
        horizonDay.set(Calendar.MINUTE, 0);
        horizonDay.set(Calendar.SECOND, 0);
        horizonDay.set(Calendar.MILLISECOND, 0);
        long horizon = horizonDay.getTimeInMillis();
        scheduleCalendarReminders(context, alarms, settings.optJSONArray("calendarReminders"), zone, now, horizon, scheduled);
        scheduleRefresh(context, alarms, now + REFRESH_AFTER_MS);
        saveEventIds(context, scheduled);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("horizon_end", horizon).commit();
        return status(context, scheduled.size(), horizon);
    }

    private static void scheduleReadingReminders(Context context, AlarmManager alarms, Calendar day, String dateId,
            long now, JSONObject reminders, Set<String> scheduled) {
        if (reminders == null) return;
        if (readingReminderEnabled(reminders, "tilawah", dateId)) {
            long at = timeAt(day, reminders.optString("tilawahTime", "18:30"));
            if (at > now) {
                Event event = new Event(dateId + "|tilawah", "tilawah", dateId, "Tilawah", at,
                    "Waktunya tilawah", "Luangkan waktu sejenak untuk membaca Al-Qur’an hari ini.",
                    "default", true, false, "a9", 1.0);
                schedule(context, alarms, event, now, scheduled);
            }
        }
        if (readingReminderEnabled(reminders, "goal", dateId)) {
            int target = Math.max(1, Math.min(604, reminders.optInt("targetPages", 2)));
            int pages = dateId.equals(reminders.optString("currentProgressDate", ""))
                ? Math.max(0, reminders.optInt("currentProgressPages", 0)) : 0;
            long at = timeAt(day, reminders.optString("goalTime", "20:30"));
            if (at > now) {
                String body = "Target " + target + " halaman belum tercapai (" + pages + "/" + target + "). Yuk lanjutkan bacaan.";
                Event event = new Event(dateId + "|goal", "goal", dateId, "Target tilawah", at,
                    "Target tilawah hari ini", body, "default", true, false, "a9", 1.0);
                schedule(context, alarms, event, now, scheduled);
            }
        }
    }

    private static void scheduleCalendarReminders(Context context, AlarmManager alarms, JSONArray reminders,
            TimeZone zone, long now, long horizon, Set<String> scheduled) {
        if (reminders == null) return;
        for (int i = 0; i < reminders.length(); i++) {
            JSONObject reminder = reminders.optJSONObject(i);
            if (reminder == null) continue;
            String id = reminder.optString("id", "").trim();
            String date = reminder.optString("date", "").trim();
            String time = reminder.optString("time", "").trim();
            String body = reminder.optString("text", "").trim();
            long at = parseDateTime(date, time, zone);
            if (id.isEmpty() || body.isEmpty() || at <= now || at > horizon) continue;
            String key = date + "|" + id;
            Event event = new Event(date + "|calendar|" + id + "|" + time, "calendar", key, "Pengingat kalender", at,
                "Pengingat kalender", body, "default", true, false, "a9", 1.0);
            schedule(context, alarms, event, now, scheduled);
        }
    }

    static long timeAt(Calendar day, String value) {
        if (day == null || value == null) return Long.MIN_VALUE;
        String[] pieces = value.split(":", -1);
        if (pieces.length != 2) return Long.MIN_VALUE;
        try {
            int hour = Integer.parseInt(pieces[0]);
            int minute = Integer.parseInt(pieces[1]);
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return Long.MIN_VALUE;
            Calendar event = (Calendar) day.clone();
            event.set(Calendar.HOUR_OF_DAY, hour);
            event.set(Calendar.MINUTE, minute);
            event.set(Calendar.SECOND, 0);
            event.set(Calendar.MILLISECOND, 0);
            return event.getTimeInMillis();
        } catch (RuntimeException ignored) {
            return Long.MIN_VALUE;
        }
    }

    static long parseDateTime(String date, String time, TimeZone zone) {
        if (date == null || time == null || zone == null) return Long.MIN_VALUE;
        String[] dateParts = date.split("-", -1);
        String[] timeParts = time.split(":", -1);
        if (dateParts.length != 3 || timeParts.length != 2) return Long.MIN_VALUE;
        try {
            int year = Integer.parseInt(dateParts[0]);
            int month = Integer.parseInt(dateParts[1]);
            int day = Integer.parseInt(dateParts[2]);
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);
            Calendar event = Calendar.getInstance(zone, Locale.US);
            event.clear();
            event.setLenient(false);
            event.set(year, month - 1, day, hour, minute, 0);
            return event.getTimeInMillis();
        } catch (RuntimeException ignored) {
            return Long.MIN_VALUE;
        }
    }

    static boolean readingReminderEnabled(JSONObject reminders, String kind, String date) {
        if (reminders == null) return false;
        if ("tilawah".equals(kind)) return reminders.optBoolean("tilawahEnabled", false);
        if (!"goal".equals(kind) || !reminders.optBoolean("goalEnabled", false)) return false;
        int target = Math.max(1, Math.min(604, reminders.optInt("targetPages", 2)));
        int pages = date != null && date.equals(reminders.optString("currentProgressDate", ""))
            ? Math.max(0, reminders.optInt("currentProgressPages", 0)) : 0;
        return pages < target;
    }

    static boolean calendarReminderEnabled(JSONArray reminders, String key) {
        if (reminders == null || key == null || key.isEmpty()) return false;
        for (int i = 0; i < reminders.length(); i++) {
            JSONObject reminder = reminders.optJSONObject(i);
            if (reminder == null) continue;
            String id = reminder.optString("id", "").trim();
            String date = reminder.optString("date", "").trim();
            String text = reminder.optString("text", "").trim();
            if (!id.isEmpty() && !text.isEmpty() && (date + "|" + id).equals(key)) return true;
        }
        return false;
    }

    static JSONObject status(Context context, int count, long horizon) throws JSONException {
        JSONObject result = new JSONObject();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        boolean exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || (alarmManager != null && alarmManager.canScheduleExactAlarms());
        boolean notificationsAllowed = androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled();
        if (count == 0) count = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet(EVENT_IDS_KEY, new HashSet<>()).size();
        if (horizon == 0L) horizon = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("horizon_end", 0L);
        result.put("notificationsAllowed", notificationsAllowed);
        result.put("exactAlarmAllowed", exactAllowed);
        result.put("scheduledCount", count);
        result.put("windowDays", WINDOW_DAYS);
        result.put("horizonEnd", horizon);
        return result;
    }

    static boolean markDelivered(Context context, String eventId) {
        if (eventId == null || eventId.isEmpty()) return false;
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> fired = new HashSet<>(prefs.getStringSet(FIRED_IDS_KEY, new HashSet<>()));
        if (fired.contains(eventId)) return false;
        fired.add(eventId);
        if (fired.size() > 120) {
            List<String> copy = new ArrayList<>(fired);
            for (int i = 0; i < copy.size() - 120; i++) fired.remove(copy.get(i));
        }
        prefs.edit().putStringSet(FIRED_IDS_KEY, fired).commit();
        return true;
    }

    static JSONArray notifications(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(UNREAD_NOTIFICATIONS_KEY, "[]");
        try { return new JSONArray(raw); } catch (JSONException ignored) { return new JSONArray(); }
    }

    static JSONArray unreadNotifications(Context context) {
        JSONArray previous = notifications(context);
        JSONArray unread = new JSONArray();
        for (int i = 0; i < previous.length(); i++) {
            JSONObject item = previous.optJSONObject(i);
            // Legacy records did not store a read flag, so they remain unread after upgrade.
            if (item != null && !item.optBoolean("read", false)) unread.put(item);
        }
        return unread;
    }

    static void recordNotification(Context context, String eventId, String kind, String key, String title, String body, long at) {
        if (eventId == null || eventId.isEmpty()) return;
        JSONArray previous = notifications(context);
        JSONArray saved = new JSONArray();
        for (int i = 0; i < previous.length(); i++) {
            JSONObject item = previous.optJSONObject(i);
            if (item != null && !eventId.equals(item.optString("eventId", ""))) saved.put(item);
        }
        JSONObject item = new JSONObject();
        try {
            item.put("eventId", eventId);
            item.put("kind", kind == null ? "reminder" : kind);
            item.put("key", key == null ? "" : key);
            item.put("title", title == null ? "Pengingat QuranKu" : title);
            item.put("body", body == null ? "" : body);
            item.put("at", at);
            item.put("read", false);
            saved.put(item);
            while (saved.length() > 100) saved.remove(0);
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(UNREAD_NOTIFICATIONS_KEY, saved.toString()).commit();
        } catch (JSONException ignored) {}
    }

    static boolean markNotificationRead(Context context, String eventId) {
        if (eventId == null || eventId.isEmpty()) return false;
        JSONArray previous = notifications(context);
        JSONArray saved = new JSONArray();
        boolean changed = false;
        for (int i = 0; i < previous.length(); i++) {
            JSONObject item = previous.optJSONObject(i);
            if (item == null) continue;
            if (eventId.equals(item.optString("eventId", "")) && !item.optBoolean("read", false)) {
                try { item.put("read", true); } catch (JSONException ignored) {}
                changed = true;
            }
            saved.put(item);
        }
        if (changed) context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(UNREAD_NOTIFICATIONS_KEY, saved.toString()).commit();
        return changed;
    }

    static void markAllNotificationsRead(Context context) {
        JSONArray previous = notifications(context);
        for (int i = 0; i < previous.length(); i++) {
            JSONObject item = previous.optJSONObject(i);
            if (item != null) {
                try { item.put("read", true); } catch (JSONException ignored) {}
            }
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(UNREAD_NOTIFICATIONS_KEY, previous.toString()).commit();
    }

    static boolean isEventEnabled(Context context, String kind, String key) {
        JSONObject settings = getSettings(context);
        JSONObject adzan = settings.optJSONObject("adzan");
        JSONObject reminders = settings.optJSONObject("prayerReminders");
        JSONObject ramadan = settings.optJSONObject("ramadanReminders");
        JSONObject reading = settings.optJSONObject("readingReminders");
        boolean enabled = settings.optBoolean("enabled", adzan != null && adzan.optBoolean("enabled", false));
        if ("pre_reminder".equals(kind)) {
            return reminders != null && reminders.optBoolean("enabled", false)
                && (reminders.optJSONObject("prayers") == null || reminders.optJSONObject("prayers").optBoolean(key, true));
        }
        if (!enabled) return false;
        if ("calendar".equals(kind)) return calendarReminderEnabled(settings.optJSONArray("calendarReminders"), key);
        if ("tilawah".equals(kind) || "goal".equals(kind)) return readingReminderEnabled(reading, kind, key);
        if ("imsak".equals(kind)) return ramadan != null && ramadan.optBoolean("imsakEnabled", false);
        if (adzan == null || !adzan.optBoolean("enabled", false)) return false;
        if ("prayer".equals(kind)) return adzan.optBoolean(key, true);
        if ("tarhim".equals(kind)) return adzan.optBoolean("tarhim", true);
        return false;
    }

    static void refreshAfterSystemChange(Context context, boolean timezoneChanged) {
        JSONObject settings = getSettings(context);
        if (timezoneChanged) {
            try {
                settings.put("timezone", TimeZone.getDefault().getID());
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(SETTINGS_KEY, settings.toString()).commit();
            } catch (JSONException ignored) {}
        }
        try { rebuild(context); } catch (Exception ignored) {}
    }

    static void cancelAll(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) cancelAll(context, alarms);
        saveEventIds(context, new LinkedHashSet<>());
    }

    private static void cancelAll(Context context, AlarmManager alarms) {
        Set<String> oldIds = new HashSet<>(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet(EVENT_IDS_KEY, new HashSet<>()));
        for (String id : oldIds) cancelEvent(context, alarms, id);
        PendingIntent refresh = refreshPendingIntent(context, PendingIntent.FLAG_NO_CREATE);
        if (refresh != null) {
            alarms.cancel(refresh);
            refresh.cancel();
        }
    }

    private static void schedule(Context context, AlarmManager alarms, Event event, long now, Set<String> ids) {
        if (event.at <= now || event.at == Long.MIN_VALUE) return;
        PendingIntent pending = eventPendingIntent(context, event, PendingIntent.FLAG_UPDATE_CURRENT);
        setAlarm(alarms, event.at, pending);
        ids.add(event.id);
    }

    private static void scheduleRefresh(Context context, AlarmManager alarms, long at) {
        setAlarm(alarms, at, refreshPendingIntent(context, PendingIntent.FLAG_UPDATE_CURRENT));
    }

    private static void setAlarm(AlarmManager manager, long at, PendingIntent pending) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && manager.canScheduleExactAlarms()) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, at, pending);
        }
    }

    private static PendingIntent eventPendingIntent(Context context, Event event, int flags) {
        Intent intent = new Intent(context, PrayerAlarmReceiver.class)
            .setAction(ACTION_FIRE)
            .setData(Uri.parse("quranku://prayer-alarm/" + Uri.encode(event.id)))
            .putExtra("eventId", event.id)
            .putExtra("kind", event.kind)
            .putExtra("key", event.key)
            .putExtra("label", event.label)
            .putExtra("at", event.at)
            .putExtra("title", event.title)
            .putExtra("body", event.body)
            .putExtra("notificationSound", event.sound)
            .putExtra("vibration", event.vibration)
            .putExtra("longAzan", event.longAzan)
            .putExtra("voice", event.voice)
            .putExtra("volume", event.volume);
        return PendingIntent.getBroadcast(context, event.id.hashCode(), intent,
            flags | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void cancelEvent(Context context, AlarmManager alarms, String id) {
        Intent intent = new Intent(context, PrayerAlarmReceiver.class)
            .setAction(ACTION_FIRE)
            .setData(Uri.parse("quranku://prayer-alarm/" + Uri.encode(id)));
        PendingIntent pending = PendingIntent.getBroadcast(context, id.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pending != null) {
            alarms.cancel(pending);
            pending.cancel();
        }
    }

    private static PendingIntent refreshPendingIntent(Context context, int flags) {
        Intent intent = new Intent(context, PrayerAlarmReceiver.class)
            .setAction(ACTION_REFRESH)
            .setData(Uri.parse("quranku://prayer-alarm/refresh"));
        return PendingIntent.getBroadcast(context, REFRESH_REQUEST_CODE, intent,
            flags | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void saveEventIds(Context context, Set<String> ids) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putStringSet(EVENT_IDS_KEY, new HashSet<>(ids)).commit();
    }

    private static long value(Map<String, Long> values, String key) {
        Long value = values.get(key);
        return value == null ? Long.MIN_VALUE : value;
    }

    private static double clampVolume(double volume) { return Math.max(0.0, Math.min(1.0, volume)); }

    private static TimeZone safeTimeZone(String id) {
        TimeZone zone = TimeZone.getTimeZone(id);
        return "GMT".equals(zone.getID()) && !"GMT".equalsIgnoreCase(id) ? TimeZone.getDefault() : zone;
    }

    private static String dateId(Calendar date) {
        return String.format(Locale.US, "%04d-%02d-%02d", date.get(Calendar.YEAR), date.get(Calendar.MONTH) + 1, date.get(Calendar.DAY_OF_MONTH));
    }

    private static String clock(long epoch, TimeZone zone) {
        Calendar c = Calendar.getInstance(zone, Locale.US);
        c.setTimeInMillis(epoch);
        return String.format(Locale.US, "%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE));
    }

    private static boolean isRamadan(Calendar date, int adjustDays, TimeZone zone) {
        try {
            Calendar adjusted = (Calendar) date.clone();
            adjusted.add(Calendar.DAY_OF_MONTH, adjustDays);
            IslamicCalendar hijri = new IslamicCalendar(android.icu.util.TimeZone.getTimeZone(zone.getID()));
            hijri.setCalculationType(IslamicCalendar.CalculationType.ISLAMIC_UMALQURA);
            hijri.setTimeInMillis(adjusted.getTimeInMillis());
            return hijri.get(android.icu.util.Calendar.MONTH) == 8;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static final class Event {
        final String id, kind, key, label, title, body, sound, voice;
        final long at;
        final boolean vibration, longAzan;
        final double volume;
        Event(String id, String kind, String key, String label, long at, String title, String body,
              String sound, boolean vibration, boolean longAzan, String voice, double volume) {
            this.id = id; this.kind = kind; this.key = key; this.label = label; this.at = at;
            this.title = title; this.body = body; this.sound = sound; this.vibration = vibration;
            this.longAzan = longAzan; this.voice = voice; this.volume = volume;
        }
    }
}
