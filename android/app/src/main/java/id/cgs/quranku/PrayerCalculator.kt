package id.cgs.quranku

import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import kotlin.math.acos
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin
import kotlin.math.tan

 data class PrayerTime(
    val key: String,
    val name: String,
    val time: LocalTime,
    val secondary: Boolean = false
)

object PrayerCalculator {
    /** Perkiraan astronomis lokal: sudut Subuh 20°, Isya 18°, Asar Syafi'i, ihtiyat 2 menit. */
    fun times(city: City, date: LocalDate, zone: ZoneId = ZoneId.systemDefault()): List<PrayerTime> {
        val daysInYear = if (date.isLeapYear) 366.0 else 365.0
        val gamma = 2.0 * Math.PI / daysInYear * (date.dayOfYear - 1)
        val equationOfTime = 229.18 * (
            0.000075 + 0.001868 * cos(gamma) - 0.032077 * sin(gamma) -
                0.014615 * cos(2.0 * gamma) - 0.040849 * sin(2.0 * gamma)
            )
        val declination = 0.006918 - 0.399912 * cos(gamma) + 0.070257 * sin(gamma) -
            0.006758 * cos(2.0 * gamma) + 0.000907 * sin(2.0 * gamma) -
            0.002697 * cos(3.0 * gamma) + 0.00148 * sin(3.0 * gamma)

        val latitude = Math.toRadians(city.latitude)
        val longitude = city.longitude
        val utcOffset = date.atStartOfDay(zone).offset.totalSeconds / 3600.0
        val solarNoonMinutes = 720.0 - 4.0 * (longitude - 15.0 * utcOffset) - equationOfTime

        fun hourAngle(altitudeDegrees: Double): Double? {
            val altitude = Math.toRadians(altitudeDegrees)
            val denominator = cos(latitude) * cos(declination)
            if (kotlin.math.abs(denominator) < 1e-9) return null
            val cosine = (sin(altitude) - sin(latitude) * sin(declination)) / denominator
            if (cosine !in -1.0..1.0) return null
            return Math.toDegrees(acos(cosine))
        }

        fun clock(minutes: Double): LocalTime {
            val rounded = floor(minutes + 0.5).toInt()
            return LocalTime.MIDNIGHT.plusMinutes(rounded.toLong())
        }

        val sunriseAngle = hourAngle(-0.833) ?: return emptyList()
        val fajrAngle = hourAngle(-20.0) ?: return emptyList()
        val ishaAngle = hourAngle(-18.0) ?: return emptyList()
        val asrAltitude = Math.toDegrees(atan(1.0 / (1.0 + tan(kotlin.math.abs(latitude - declination)))))
        val asrAngle = hourAngle(asrAltitude) ?: return emptyList()
        val sunrise = solarNoonMinutes - sunriseAngle * 4.0
        val sunset = solarNoonMinutes + sunriseAngle * 4.0
        val fajr = solarNoonMinutes - fajrAngle * 4.0 + 2.0
        val isha = solarNoonMinutes + ishaAngle * 4.0 + 2.0

        return listOf(
            PrayerTime("imsak", "Imsak", clock(fajr - 10.0), true),
            PrayerTime("subuh", "Subuh", clock(fajr)),
            PrayerTime("terbit", "Terbit", clock(sunrise - 2.0), true),
            PrayerTime("zuhur", "Zuhur", clock(solarNoonMinutes + 2.0)),
            PrayerTime("asar", "Asar", clock(solarNoonMinutes + asrAngle * 4.0 + 2.0)),
            PrayerTime("magrib", "Magrib", clock(sunset + 2.0)),
            PrayerTime("isya", "Isya", clock(isha))
        )
    }

    fun next(city: City, now: java.time.ZonedDateTime): PrayerTime? {
        val today = times(city, now.toLocalDate(), now.zone)
            .firstOrNull { !it.secondary && it.time.isAfter(now.toLocalTime()) }
        if (today != null) return today
        return times(city, now.toLocalDate().plusDays(1), now.zone).firstOrNull { !it.secondary }
    }
}
