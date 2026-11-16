package id.cgs.quranku;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.LinkedHashMap;

/**
 * Offline native port of the adhan-js solar-time calculation used by the shared UI.
 * Results are UTC instants for the supplied local calendar date, matching the JS
 * package's UTC Date construction and its existing Kemenag/MWL/Umm al-Qura/Egypt/Singapore presets.
 */
final class PrayerTimesCalculator {
    private static final double SUN_ALTITUDE = -50.0 / 60.0;
    private static final TimeZone UTC = TimeZone.getTimeZone("UTC");

    private PrayerTimesCalculator() {}

    static Map<String, Long> calculate(Calendar localDate, double latitude, double longitude, String method) {
        int year = localDate.get(Calendar.YEAR);
        int month = localDate.get(Calendar.MONTH) + 1;
        int day = localDate.get(Calendar.DAY_OF_MONTH);
        SolarTime today = new SolarTime(year, month, day, latitude, longitude);
        Calendar tomorrowDate = (Calendar) localDate.clone();
        tomorrowDate.add(Calendar.DAY_OF_MONTH, 1);
        SolarTime tomorrow = new SolarTime(
            tomorrowDate.get(Calendar.YEAR),
            tomorrowDate.get(Calendar.MONTH) + 1,
            tomorrowDate.get(Calendar.DAY_OF_MONTH),
            latitude,
            longitude
        );

        MethodParameters params = MethodParameters.forMethod(method);
        double fajr = today.hourAngle(-params.fajrAngle, false);
        double asr = today.afternoon(1.0); // QuranKu uses the Shafi'i madhab.
        double isha = params.ishaInterval > 0
            ? today.sunset + params.ishaInterval / 60.0
            : today.hourAngle(-params.ishaAngle, true);

        long sunsetUtc = utcMillis(year, month, day, today.sunset);
        long tomorrowSunriseUtc = utcMillis(
            tomorrowDate.get(Calendar.YEAR),
            tomorrowDate.get(Calendar.MONTH) + 1,
            tomorrowDate.get(Calendar.DAY_OF_MONTH),
            tomorrow.sunrise
        );
        double nightSeconds = (tomorrowSunriseUtc - sunsetUtc) / 1000.0;
        long sunriseUtc = utcMillis(year, month, day, today.sunrise);
        long safeFajr = sunriseUtc - Math.round(nightSeconds * 0.5);
        long fajrUtc = Double.isFinite(fajr) ? utcMillis(year, month, day, fajr) : Long.MIN_VALUE;
        if (fajrUtc == Long.MIN_VALUE || safeFajr > fajrUtc) fajrUtc = safeFajr;

        long ishaUtc;
        if (params.ishaInterval > 0) {
            ishaUtc = sunsetUtc + params.ishaInterval * 60_000L;
        } else {
            long rawIsha = Double.isFinite(isha) ? utcMillis(year, month, day, isha) : Long.MIN_VALUE;
            long safeIsha = sunsetUtc + Math.round(nightSeconds * 0.5);
            ishaUtc = rawIsha == Long.MIN_VALUE || safeIsha < rawIsha ? safeIsha : rawIsha;
        }

        long transitUtc = utcMillis(year, month, day, today.transit);
        long asrUtc = utcMillis(year, month, day, asr);
        Map<String, Long> result = new LinkedHashMap<>();
        result.put("subuh", roundedMinute(fajrUtc + (params.fajrAdjustment + params.methodFajr) * 60_000L, params.roundUp));
        result.put("zuhur", roundedMinute(transitUtc + (params.dhuhrAdjustment + params.methodDhuhr) * 60_000L, params.roundUp));
        result.put("asar", roundedMinute(asrUtc + (params.asrAdjustment + params.methodAsr) * 60_000L, params.roundUp));
        result.put("magrib", roundedMinute(sunsetUtc + (params.maghribAdjustment + params.methodMaghrib) * 60_000L, params.roundUp));
        result.put("isya", roundedMinute(ishaUtc + (params.ishaAdjustment + params.methodIsha) * 60_000L, params.roundUp));
        return result;
    }

    private static long utcMillis(int year, int month, int day, double hours) {
        if (!Double.isFinite(hours)) return Long.MIN_VALUE;
        Calendar base = new GregorianCalendar(UTC, Locale.US);
        base.clear();
        base.set(year, month - 1, day, 0, 0, 0);
        long seconds = (long) Math.floor(hours * 3600.0);
        return base.getTimeInMillis() + seconds * 1000L;
    }

    private static long roundedMinute(long millis, boolean roundUp) {
        if (millis == Long.MIN_VALUE) return millis;
        long wholeSeconds = Math.floorDiv(millis, 1000L);
        int second = (int) Math.floorMod(wholeSeconds, 60L);
        long offset = roundUp ? 60L - second : (second >= 30 ? 60L - second : -second);
        return millis + offset * 1000L;
    }

    private static double radians(double degrees) { return Math.toRadians(degrees); }
    private static double degrees(double radians) { return Math.toDegrees(radians); }
    private static double normalize(double value, double max) { return value - max * Math.floor(value / max); }
    private static double unwind(double angle) { return normalize(angle, 360.0); }
    private static double quadrantShift(double angle) {
        return angle >= -180.0 && angle <= 180.0 ? angle : angle - 360.0 * Math.round(angle / 360.0);
    }

    private static final class MethodParameters {
        final double fajrAngle, ishaAngle;
        final int ishaInterval;
        int fajrAdjustment, sunriseAdjustment, dhuhrAdjustment, asrAdjustment, maghribAdjustment, ishaAdjustment;
        int methodFajr, methodDhuhr, methodAsr, methodMaghrib, methodIsha;
        boolean roundUp;

        MethodParameters(double fajrAngle, double ishaAngle, int ishaInterval) {
            this.fajrAngle = fajrAngle;
            this.ishaAngle = ishaAngle;
            this.ishaInterval = ishaInterval;
            this.fajrAdjustment = 0;
            this.sunriseAdjustment = 0;
            this.dhuhrAdjustment = 0;
            this.asrAdjustment = 0;
            this.maghribAdjustment = 0;
            this.ishaAdjustment = 0;
        }

        static MethodParameters forMethod(String method) {
            MethodParameters p;
            switch (method == null ? "" : method) {
                case "mwl":
                    p = new MethodParameters(18, 17, 0);
                    p.methodDhuhr = 1;
                    break;
                case "ummalqura":
                    p = new MethodParameters(18.5, 0, 90);
                    break;
                case "egypt":
                    p = new MethodParameters(19.5, 17.5, 0);
                    p.methodDhuhr = 1;
                    break;
                case "singapore":
                    p = new MethodParameters(20, 18, 0);
                    p.methodDhuhr = 1;
                    p.roundUp = true;
                    break;
                default: // QuranKu's Kemenag RI preset: Other(20/18) with ihtiyat adjustments.
                    p = new MethodParameters(20, 18, 0);
                    p.fajrAdjustment = 2;
                    p.sunriseAdjustment = -2;
                    p.dhuhrAdjustment = 2;
                    p.asrAdjustment = 2;
                    p.maghribAdjustment = 2;
                    p.ishaAdjustment = 2;
                    break;
            }
            return p;
        }
    }

    private static final class SolarCoordinates {
        final double declination, rightAscension, apparentSiderealTime;
        SolarCoordinates(double julianDay) {
            double t = (julianDay - 2451545.0) / 36525.0;
            double meanLongitude = unwind(280.4664567 + 36000.76983 * t + 0.0003032 * t * t);
            double lunarLongitude = unwind(218.3165 + 481267.8813 * t);
            double node = unwind(125.04452 - 1934.136261 * t + 0.0020708 * t * t + t * t * t / 450000.0);
            double meanAnomaly = unwind(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
            double m = radians(meanAnomaly);
            double center = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m)
                + (0.019993 - 0.000101 * t) * Math.sin(2 * m)
                + 0.000289 * Math.sin(3 * m);
            double longitude = unwind(meanLongitude + center - 0.00569 - 0.00478 * Math.sin(radians(125.04 - 1934.136 * t)));
            double meanObliquity = 23.439291 - 0.013004167 * t - 0.0000001639 * t * t + 0.0000005036 * t * t * t;
            double apparentObliquity = meanObliquity + 0.00256 * Math.cos(radians(125.04 - 1934.136 * t));
            double dPsi = (-17.2 / 3600.0 * Math.sin(radians(node))
                - 1.32 / 3600.0 * Math.sin(2 * radians(meanLongitude))
                - 0.23 / 3600.0 * Math.sin(2 * radians(lunarLongitude))
                + 0.21 / 3600.0 * Math.sin(2 * radians(node)));
            double dEpsilon = (9.2 / 3600.0 * Math.cos(radians(node))
                + 0.57 / 3600.0 * Math.cos(2 * radians(meanLongitude))
                + 0.1 / 3600.0 * Math.cos(2 * radians(lunarLongitude))
                - 0.09 / 3600.0 * Math.cos(2 * radians(node)));
            double lambda = radians(longitude);
            double epsilon = radians(apparentObliquity);
            declination = degrees(Math.asin(Math.sin(epsilon) * Math.sin(lambda)));
            rightAscension = unwind(degrees(Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda))));
            double sidereal = unwind(280.46061837 + 360.98564736629 * (julianDay - 2451545.0)
                + 0.000387933 * t * t - t * t * t / 38710000.0);
            apparentSiderealTime = sidereal + dPsi * Math.cos(radians(meanObliquity + dEpsilon));
        }
    }

    private static final class SolarTime {
        final double transit, sunrise, sunset;
        final double approxTransit;
        final double latitude, longitude;
        final SolarCoordinates solar, previous, next;

        SolarTime(int year, int month, int day, double latitude, double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
            double jd = julianDay(year, month, day, 0);
            solar = new SolarCoordinates(jd);
            previous = new SolarCoordinates(jd - 1);
            next = new SolarCoordinates(jd + 1);
            approxTransit = approximateTransit(longitude, solar.apparentSiderealTime, solar.rightAscension);
            transit = correctedTransit(approxTransit);
            sunrise = correctedHourAngle(SUN_ALTITUDE, false);
            sunset = correctedHourAngle(SUN_ALTITUDE, true);
        }

        double hourAngle(double angle, boolean afterTransit) { return correctedHourAngle(angle, afterTransit); }

        double afternoon(double shadowLength) {
            double tangent = Math.abs(latitude - solar.declination);
            double inverse = shadowLength + Math.tan(radians(tangent));
            double angle = degrees(Math.atan(1.0 / inverse));
            return hourAngle(angle, true);
        }

        private double correctedTransit(double m0) {
            double theta = unwind(solar.apparentSiderealTime + 360.985647 * m0);
            double alpha = unwind(interpolateAngles(solar.rightAscension, previous.rightAscension, next.rightAscension, m0));
            double h = quadrantShift(theta + longitude - alpha);
            return (m0 + h / -360.0) * 24.0;
        }

        private double correctedHourAngle(double angle, boolean afterTransit) {
            double term1 = Math.sin(radians(angle)) - Math.sin(radians(latitude)) * Math.sin(radians(solar.declination));
            double term2 = Math.cos(radians(latitude)) * Math.cos(radians(solar.declination));
            double h0 = degrees(Math.acos(term1 / term2));
            double m = afterTransit ? approxTransit + h0 / 360.0 : approxTransit - h0 / 360.0;
            double theta = unwind(solar.apparentSiderealTime + 360.985647 * m);
            double alpha = unwind(interpolateAngles(solar.rightAscension, previous.rightAscension, next.rightAscension, m));
            double delta = interpolate(solar.declination, previous.declination, next.declination, m);
            double hour = theta + longitude - alpha;
            double altitude = degrees(Math.asin(Math.sin(radians(latitude)) * Math.sin(radians(delta))
                + Math.cos(radians(latitude)) * Math.cos(radians(delta)) * Math.cos(radians(hour))));
            double divisor = 360.0 * Math.cos(radians(delta)) * Math.cos(radians(latitude)) * Math.sin(radians(hour));
            return (m + (altitude - angle) / divisor) * 24.0;
        }

        private static double approximateTransit(double longitude, double sidereal, double rightAscension) {
            double m0 = normalize((rightAscension - longitude - sidereal) / 360.0, 1.0);
            double expected = normalize((12.0 - longitude / 15.0) / 24.0, 1.0);
            if (m0 - expected > 0.5) return m0 - 1.0;
            if (expected - m0 > 0.5) return m0 + 1.0;
            return m0;
        }
    }

    private static double interpolate(double y2, double y1, double y3, double n) {
        double a = y2 - y1;
        double b = y3 - y2;
        return y2 + n / 2.0 * (a + b + n * (b - a));
    }

    private static double interpolateAngles(double y2, double y1, double y3, double n) {
        double a = unwind(y2 - y1);
        double b = unwind(y3 - y2);
        return y2 + n / 2.0 * (a + b + n * (b - a));
    }

    private static double julianDay(int year, int month, int day, double hours) {
        int y = month > 2 ? year : year - 1;
        int m = month > 2 ? month : month + 12;
        double d = day + hours / 24.0;
        int a = (int) (y / 100.0);
        int b = 2 - a + (int) (a / 4.0);
        int i0 = (int) Math.floor(365.25 * (y + 4716));
        int i1 = (int) Math.floor(30.6001 * (m + 1));
        return i0 + i1 + d + b - 1524.5;
    }
}
