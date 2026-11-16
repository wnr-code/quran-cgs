package id.cgs.quranku

import android.content.Intent
import android.net.Uri
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivityStartupTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun freshLaunchRendersHomeGreeting() {
        composeRule.onNodeWithText("QuranKu").assertIsDisplayed()
        composeRule.onNodeWithText("Assalamu’alaikum").assertIsDisplayed()
    }

    @Test
    fun bundledContentLoadsAndPrayerDoaTabOpens() {
        val context = composeRule.activity
        val content = NativeContentRepository.load(context)
        assertTrue("Doa harian harus tersedia offline", content.dailyGroups.isNotEmpty())
        assertTrue("Setiap kategori doa harus memuat bacaan Arab", content.dailyGroups.all { group -> group.items.isNotEmpty() && group.items.all { item -> item.parts.isNotEmpty() && item.parts.all { it.arabic.isNotBlank() } } })
        assertEquals("Dua kelompok doa ibadah tersedia offline", 2, content.worshipGroups.size)
        assertEquals("99 nama Asmaul Husna lengkap dan berurutan", (1..99).toList(), content.husna.map { it.id })
        assertTrue("Semua kota memiliki zona waktu valid", content.cities.size == 40 && content.cities.all { city -> city.latitude.isFinite() && city.longitude.isFinite() && city.zone.id == city.timeZoneId })
        assertEquals("Kuningan memakai zona WIB", "Asia/Jakarta", content.cities.first { it.name == "Kuningan" }.timeZoneId)
        assertEquals("Denpasar memakai zona WITA", "Asia/Makassar", content.cities.first { it.name == "Denpasar" }.timeZoneId)
        assertEquals("Jayapura memakai zona WIT", "Asia/Jayapura", content.cities.first { it.name == "Jayapura" }.timeZoneId)
        assertEquals("Makkah memakai waktu Saudi", "Asia/Riyadh", content.cities.first { it.name == "Makkah" }.timeZoneId)
        assertEquals("Metadata 114 surah harus tersedia offline", 114, QuranRepository.metadataList(context).size)

        composeRule.onNodeWithText("Doa").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText("Pilih kebutuhanmu").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Pilih kebutuhanmu").assertIsDisplayed()
    }

    @Test
    fun quranShortcutNavigatesWhenActivityIsAlreadyRunning() {
        fun sendQuranShortcut() = composeRule.runOnUiThread {
            composeRule.activity.onNewIntent(Intent(Intent.ACTION_VIEW, Uri.parse("quranku://quran")))
        }

        sendQuranShortcut()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText("Al-Fatihah").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Al-Fatihah").assertIsDisplayed()

        composeRule.onNodeWithText("Doa").performClick()
        composeRule.onNodeWithText("Pilih kebutuhanmu").assertIsDisplayed()
        sendQuranShortcut()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText("114 surah · 6.236 ayat").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Al-Fatihah").assertIsDisplayed()
    }

    @Test
    fun aboutSourcesLinkReturnsToAboutScreen() {
        composeRule.onNodeWithText("Lainnya").performClick()
        composeRule.onNodeWithText("Tentang QuranKu").performClick()
        composeRule.onNodeWithText("Privasi").assertIsDisplayed()

        composeRule.onNodeWithText("Sumber Data").performClick()
        composeRule.onNodeWithText("Quran NU Online").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Kembali").performClick()
        composeRule.onNodeWithText("Privasi").assertIsDisplayed()
    }

    @Test
    fun prayerCountdownUsesSelectedCityTimezone() {
        val context = composeRule.activity
        val makkah = NativeContentRepository.load(context).cities.first { it.name == "Makkah" }
        val instant = java.time.ZonedDateTime.of(2026, 11, 14, 14, 0, 0, 0, java.time.ZoneId.of("UTC"))
        val cityNow = instant.withZoneSameInstant(makkah.zone)
        val expected = PrayerCalculator.times(makkah, cityNow.toLocalDate())
            .firstOrNull { !it.secondary && it.time.isAfter(cityNow.toLocalTime()) }
            ?: PrayerCalculator.times(makkah, cityNow.toLocalDate().plusDays(1)).first { !it.secondary }

        assertEquals("Jadwal berikutnya mengikuti waktu lokal kota terpilih", expected, PrayerCalculator.next(makkah, instant))
    }

    @Test
    fun malformedTasbihPreferencesRecoverWithoutCrashing() {
        val preferences = composeRule.activity.getSharedPreferences("quranku_native", 0)
        preferences.edit()
            .putString("tasbih_count", "rusak")
            .putString("tasbih_target", "rusak")
            .commit()

        composeRule.onNodeWithText("Lainnya").performClick()
        composeRule.onNodeWithText("Tasbih digital").performClick()
        composeRule.onNodeWithText("Tasbih Digital").assertIsDisplayed()
        composeRule.waitForIdle()

        assertEquals(0, preferences.getInt("tasbih_count", -1))
        assertEquals(33, preferences.getInt("tasbih_target", -1))
    }
}
