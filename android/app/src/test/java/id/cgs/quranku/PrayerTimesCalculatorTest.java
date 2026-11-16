package id.cgs.quranku;

import static org.junit.Assert.assertTrue;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Instant;
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

        assertNear("subuh " + diagnosticTrace(jakarta, -6.2, 106.82), times.get("subuh"), utc(2026, Calendar.NOVEMBER, 14, 21, 5));
        assertNear("zuhur", times.get("zuhur"), utc(2026, Calendar.NOVEMBER, 15, 4, 39));
        assertNear("asar", times.get("asar"), utc(2026, Calendar.NOVEMBER, 15, 8, 1));
        assertNear("magrib", times.get("magrib"), utc(2026, Calendar.NOVEMBER, 15, 10, 51));
        assertNear("isya", times.get("isya"), utc(2026, Calendar.NOVEMBER, 15, 12, 5));
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

    private static String diagnosticTrace(Calendar localDate, double latitude, double longitude) {
        try {
            Class<?> solarType = Class.forName(PrayerTimesCalculator.class.getName() + "$SolarTime");
            Constructor<?> constructor = solarType.getDeclaredConstructor(
                int.class, int.class, int.class, double.class, double.class
            );
            constructor.setAccessible(true);
            int year = localDate.get(Calendar.YEAR);
            int month = localDate.get(Calendar.MONTH) + 1;
            int day = localDate.get(Calendar.DAY_OF_MONTH);
            Object today = constructor.newInstance(year, month, day, latitude, longitude);
            Calendar tomorrowDate = (Calendar) localDate.clone();
            tomorrowDate.add(Calendar.DAY_OF_MONTH, 1);
            Object tomorrow = constructor.newInstance(
                tomorrowDate.get(Calendar.YEAR),
                tomorrowDate.get(Calendar.MONTH) + 1,
                tomorrowDate.get(Calendar.DAY_OF_MONTH),
                latitude,
                longitude
            );

            Method hourAngle = solarType.getDeclaredMethod("hourAngle", double.class, boolean.class);
            hourAngle.setAccessible(true);
            double fajrHours = ((Double) hourAngle.invoke(today, -20.0, false)).doubleValue();
            double sunriseHours = field(solarType, "sunrise").getDouble(today);
            double sunsetHours = field(solarType, "sunset").getDouble(today);
            double tomorrowSunriseHours = field(solarType, "sunrise").getDouble(tomorrow);

            Method utcMillis = PrayerTimesCalculator.class.getDeclaredMethod(
                "utcMillis", int.class, int.class, int.class, double.class
            );
            utcMillis.setAccessible(true);
            long rawFajr = ((Long) utcMillis.invoke(null, year, month, day, fajrHours)).longValue();
            long sunrise = ((Long) utcMillis.invoke(null, year, month, day, sunriseHours)).longValue();
            long sunset = ((Long) utcMillis.invoke(null, year, month, day, sunsetHours)).longValue();
            long nextSunrise = ((Long) utcMillis.invoke(
                null,
                tomorrowDate.get(Calendar.YEAR),
                tomorrowDate.get(Calendar.MONTH) + 1,
                tomorrowDate.get(Calendar.DAY_OF_MONTH),
                tomorrowSunriseHours
            )).longValue();
            double nightSeconds = (nextSunrise - sunset) / 1000.0;
            long safeFajr = sunrise - Math.round(nightSeconds * 0.5);
            return String.format(Locale.US,
                "fajrHours=%.6f raw=%s sunriseHours=%.6f sunrise=%s sunsetHours=%.6f sunset=%s "
                    + "tomorrowSunriseHours=%.6f tomorrowSunrise=%s nightSeconds=%.1f safeFajr=%s",
                fajrHours, Instant.ofEpochMilli(rawFajr), sunriseHours, Instant.ofEpochMilli(sunrise),
                sunsetHours, Instant.ofEpochMilli(sunset), tomorrowSunriseHours,
                Instant.ofEpochMilli(nextSunrise), nightSeconds, Instant.ofEpochMilli(safeFajr));
        } catch (ReflectiveOperationException error) {
            return "diagnosticTrace failed: " + error;
        }
    }

    private static Field field(Class<?> type, String name) throws NoSuchFieldException {
        Field field = type.getDeclaredField(name);
        field.setAccessible(true);
        return field;
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
