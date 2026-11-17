package id.cgs.quranku;

import static org.junit.Assert.assertEquals;

import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;
import org.junit.Test;

public final class PrayerAlarmSchedulerTest {
    @Test
    public void dailyReadingReminderUsesTheConfiguredLocalClock() {
        TimeZone jakarta = TimeZone.getTimeZone("Asia/Jakarta");
        Calendar day = Calendar.getInstance(jakarta, Locale.US);
        day.clear();
        day.set(2026, Calendar.NOVEMBER, 16, 12, 0, 0);

        Calendar expected = Calendar.getInstance(jakarta, Locale.US);
        expected.clear();
        expected.set(2026, Calendar.NOVEMBER, 16, 18, 30, 0);
        assertEquals(expected.getTimeInMillis(), PrayerAlarmScheduler.timeAt(day, "18:30"));
        assertEquals(Long.MIN_VALUE, PrayerAlarmScheduler.timeAt(day, "24:00"));
        assertEquals(Long.MIN_VALUE, PrayerAlarmScheduler.timeAt(day, "18:60"));
        assertEquals(Long.MIN_VALUE, PrayerAlarmScheduler.timeAt(day, "bad"));
    }

    @Test
    public void calendarReminderUsesItsDateAndConfiguredTimezoneAndRejectsInvalidDates() {
        TimeZone jakarta = TimeZone.getTimeZone("Asia/Jakarta");
        Calendar expected = Calendar.getInstance(jakarta, Locale.US);
        expected.clear();
        expected.set(2026, Calendar.NOVEMBER, 16, 7, 15, 0);

        assertEquals(expected.getTimeInMillis(), PrayerAlarmScheduler.parseDateTime("2026-11-16", "07:15", jakarta));
        assertEquals(Long.MIN_VALUE, PrayerAlarmScheduler.parseDateTime("2026-02-29", "07:15", jakarta));
        assertEquals(Long.MIN_VALUE, PrayerAlarmScheduler.parseDateTime("2026-11-16", "24:00", jakarta));
        assertEquals(Long.MIN_VALUE, PrayerAlarmScheduler.parseDateTime("invalid", "07:15", jakarta));
    }
}
