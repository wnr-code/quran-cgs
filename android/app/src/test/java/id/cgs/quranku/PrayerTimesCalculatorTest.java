package id.cgs.quranku;

import static org.junit.Assert.assertTrue;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import org.junit.Test;

public final class PrayerTimesCalculatorTest {
    private static final TimeZone UTC = TimeZone.getTimeZone("UTC");

    @Test
    public void kemenagTimesMatchSharedAdhanJsCalculationForJakarta() {
        Calendar jakarta = Calendar.getInstance(TimeZone.getTimeZone("Asia/Jakarta"), Locale.US);
        jakarta.clear();
        jakarta.set(2026, Calendar.NOVEMBER, 15, 12, 0, 0);
        Map<String, Long> times = PrayerTimesCalculator.calculate(jakarta, -6.2, 106.82, "kemenag");

        assertNear("subuh", times.get("subuh"), utc(2026, Calendar.NOVEMBER, 14, 21, 5));
        assertNear("zuhur", times.get("zuhur"), utc(2026, Calendar.NOVEMBER, 15, 4, 39));
        assertNear("asar", times.get("asar"), utc(2026, Calendar.NOVEMBER, 15, 8, 1));
        assertNear("magrib", times.get("magrib"), utc(2026, Calendar.NOVEMBER, 15, 10, 51));
        assertNear("isya", times.get("isya"), utc(2026, Calendar.NOVEMBER, 15, 12, 5));
    }

    @Test
    public void highLatitudeFallbackUsesHalfNightInSecondsConvertedToMillis() {
        Calendar oslo = Calendar.getInstance(TimeZone.getTimeZone("Europe/Oslo"), Locale.US);
        oslo.clear();
        oslo.set(2026, Calendar.JUNE, 21, 12, 0, 0);
        Map<String, Long> times = PrayerTimesCalculator.calculate(oslo, 59.9139, 10.7522, "kemenag");

        assertNear("subuh fallback", times.get("subuh"), utc(2026, Calendar.JUNE, 20, 23, 21));
        assertNear("isha fallback", times.get("isya"), utc(2026, Calendar.JUNE, 21, 23, 21));
    }

    @Test
    public void methodPresetsProduceOrderedPrayerTimes() {
        Calendar day = Calendar.getInstance(TimeZone.getTimeZone("Asia/Jakarta"), Locale.US);
        day.clear();
        day.set(2026, Calendar.NOVEMBER, 15, 12, 0, 0);
        for (String method : new String[] { "kemenag", "mwl", "ummalqura", "egypt", "singapore" }) {
            Map<String, Long> times = PrayerTimesCalculator.calculate(day, -6.2, 106.82, method);
            long last = Long.MIN_VALUE;
            for (String key : new String[] { "subuh", "zuhur", "asar", "magrib", "isya" }) {
                long value = times.get(key);
                assertTrue(method + " returned invalid " + key, value != Long.MIN_VALUE);
                assertTrue(method + " prayer order is invalid at " + key, value > last);
                last = value;
            }
        }
    }

    private static long utc(int year, int month, int day, int hour, int minute) {
        Calendar calendar = Calendar.getInstance(UTC, Locale.US);
        calendar.clear();
        calendar.set(year, month, day, hour, minute, 0);
        return calendar.getTimeInMillis();
    }

    private static void assertNear(String name, long actual, long expected) {
        assertTrue(name + " differs from adhan-js by more than one minute: actual=" + actual + ", expected=" + expected,
            Math.abs(actual - expected) <= 60_000L);
    }
}
