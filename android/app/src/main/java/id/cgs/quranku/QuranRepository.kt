package id.cgs.quranku

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

private const val EQURAN_API = "https://equran.id/api/v2"

data class SurahInfo(
    val number: Int,
    val latin: String,
    val meaning: String,
    val arabic: String,
    val ayahs: Int,
    val revelation: String = ""
)

data class QuranVerse(
    val number: Int,
    val arabic: String,
    val latin: String,
    val translation: String
)

data class QuranChapter(
    val info: SurahInfo,
    val verses: List<QuranVerse>
)

object QuranRepository {
    suspend fun surahList(context: Context): List<SurahInfo> = withContext(Dispatchers.IO) {
        val fallback = runCatching { metadataList(context) }.getOrDefault(emptyList())
        try {
            val data = requestJson("$EQURAN_API/surat").getJSONArray("data")
            val results = (0 until data.length()).map { index ->
                val row = data.getJSONObject(index)
                val number = row.optInt("nomor", index + 1)
                val local = fallback.getOrNull(number - 1)
                SurahInfo(
                    number = number,
                    latin = row.optString("namaLatin").ifBlank { local?.latin.orEmpty() },
                    meaning = row.optString("arti").ifBlank { local?.meaning.orEmpty() },
                    arabic = row.optString("nama").ifBlank { local?.arabic.orEmpty() },
                    ayahs = row.optInt("jumlahAyat", local?.ayahs ?: 0),
                    revelation = row.optString("tempatTurun")
                )
            }
            if (results.size == 114) results else fallback
        } catch (_: Exception) {
            fallback
        }
    }

    suspend fun chapter(context: Context, number: Int): QuranChapter = withContext(Dispatchers.IO) {
        val cache = File(context.filesDir, "quran/surah-$number.json")
        if (cache.exists()) {
            try {
                return@withContext parseChapter(JSONObject(cache.readText(Charsets.UTF_8)))
            } catch (_: Exception) {
                cache.delete()
            }
        }
        val response = requestJson("$EQURAN_API/surat/$number")
        val root = response.optJSONObject("data") ?: error("Respons data surah tidak ditemukan")
        val chapter = parseChapter(root)
        if (chapter.info.number != number || chapter.verses.isEmpty()) error("Data surah tidak lengkap")
        cache.parentFile?.mkdirs()
        cache.writeText(root.toString(), Charsets.UTF_8)
        chapter
    }

    fun metadataList(context: Context): List<SurahInfo> {
        val root = JSONObject(context.assets.open("surah-metadata.json").bufferedReader(Charsets.UTF_8).use { it.readText() })
        val rows = root.getJSONArray("surahs")
        return (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            SurahInfo(
                number = row.getInt("number"),
                latin = row.getString("latin"),
                meaning = row.optString("meaning"),
                arabic = row.optString("arabic"),
                ayahs = row.getInt("ayahs")
            )
        }
    }

    private fun parseChapter(root: JSONObject): QuranChapter {
        val number = root.optInt("nomor")
        val localInfo = SurahInfo(
            number = number,
            latin = root.optString("namaLatin"),
            meaning = root.optString("arti"),
            arabic = root.optString("nama"),
            ayahs = root.optInt("jumlahAyat"),
            revelation = root.optString("tempatTurun")
        )
        val rows = root.optJSONArray("ayat") ?: error("Ayat surah tidak tersedia")
        val verses = (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            QuranVerse(
                number = row.optInt("nomorAyat", index + 1),
                arabic = row.optString("teksArab"),
                latin = row.optString("teksLatin"),
                translation = row.optString("teksIndonesia")
            )
        }
        return QuranChapter(localInfo, verses)
    }

    private fun requestJson(address: String): JSONObject {
        val connection = URL(address).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 15_000
            connection.readTimeout = 20_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("User-Agent", "QuranKu-Android")
            val status = connection.responseCode
            if (status !in 200..299) error("Layanan Al-Qur'an memberi respons $status")
            return JSONObject(connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() })
        } finally {
            connection.disconnect()
        }
    }
}
