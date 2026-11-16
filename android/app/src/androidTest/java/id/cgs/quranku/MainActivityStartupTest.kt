package id.cgs.quranku

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
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
        assertTrue("Kota harus tersedia untuk pilihan jadwal", content.cities.isNotEmpty())
        assertEquals("Metadata 114 surah harus tersedia offline", 114, QuranRepository.metadataList(context).size)

        composeRule.onNodeWithText("Doa").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText("Pilih kebutuhanmu").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Pilih kebutuhanmu").assertIsDisplayed()
    }
}
