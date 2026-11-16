package id.cgs.quranku

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class DuaPart(
    val arabic: String,
    val latin: String,
    val meaning: String
)

data class DuaItem(
    val id: String,
    val title: String,
    val parts: List<DuaPart>,
    val note: String = "",
    val section: String = "",
    val source: String = "Quran NU Online"
)

data class DuaGroup(
    val id: String,
    val title: String,
    val description: String,
    val type: String,
    val items: List<DuaItem>
)

data class HusnaItem(
    val id: Int,
    val arabic: String,
    val latin: String,
    val meaning: String,
    val explanation: String
)

data class City(
    val name: String,
    val latitude: Double,
    val longitude: Double
)

data class LocalContent(
    val dailyGroups: List<DuaGroup>,
    val worshipGroups: List<DuaGroup>,
    val husna: List<HusnaItem>,
    val cities: List<City>
) {
    fun group(id: String): DuaGroup? = (dailyGroups + worshipGroups).firstOrNull { it.id == id }
}

object NativeContentRepository {
    fun load(context: Context): LocalContent {
        val dailyJson = JSONObject(readAsset(context, "doa-nu.json"))
        val dailySource = dailyJson.optJSONObject("source")?.optString("name", "Quran NU Online")
            ?.takeIf { it.isNotBlank() } ?: "Quran NU Online"
        val dailyGroups = dailyJson.optJSONArray("categories").toList().map { category ->
            val items = category.optJSONArray("items").toList().map { item ->
                DuaItem(
                    id = item.optString("id"),
                    title = item.optString("title", "Doa"),
                    parts = item.optJSONArray("parts").toList().map { part ->
                        DuaPart(
                            arabic = part.optString("ar"),
                            latin = part.optString("latin"),
                            meaning = part.optString("arti")
                        )
                    },
                    source = dailySource
                )
            }
            DuaGroup(
                id = "daily:${category.optString("slug")}",
                title = category.optString("name", "Doa"),
                description = category.optString("desc"),
                type = "Doa harian",
                items = items
            )
        }

        val worshipJson = JSONObject(readAsset(context, "dzikir.json"))
        fun worshipGroup(key: String, title: String, description: String): DuaGroup {
            val items = worshipJson.optJSONArray(key).toList().map { item ->
                DuaItem(
                    id = "$key:${item.optInt("step")}:${item.optString("title")}",
                    title = item.optString("title", "Bacaan"),
                    parts = listOf(
                        DuaPart(
                            arabic = item.optString("arabic"),
                            latin = item.optString("latin"),
                            meaning = item.optString("translation")
                        )
                    ),
                    note = item.optString("notes"),
                    section = item.optString("section"),
                    source = item.optString("source", "Quran NU Online")
                )
            }
            return DuaGroup(key, title, description, "Doa & dzikir", items)
        }
        val worshipGroups = listOf(
            worshipGroup("wudhu", "Doa Wudhu", "Bacaan sebelum, saat, dan sesudah wudhu"),
            worshipGroup("salat", "Usai Salat", "Wirid dan doa setelah salat fardu")
        )

        val husnaJson = JSONObject(readAsset(context, "asmaul-husna.json"))
        val husna = husnaJson.optJSONArray("items").toList().map { item ->
            HusnaItem(
                id = item.optInt("id"),
                arabic = item.optString("arab"),
                latin = item.optString("latin"),
                meaning = item.optString("arti"),
                explanation = item.optString("makna")
            )
        }

        val citiesJson = JSONObject(readAsset(context, "cities.json"))
        val cities = citiesJson.optJSONArray("cities").toList().map { item ->
            City(
                name = item.optString("name"),
                latitude = item.optDouble("lat"),
                longitude = item.optDouble("lng")
            )
        }.sortedBy { it.name }

        return LocalContent(dailyGroups, worshipGroups, husna, cities)
    }

    private fun readAsset(context: Context, name: String): String =
        context.assets.open(name).bufferedReader(Charsets.UTF_8).use { it.readText() }

    private fun JSONArray?.toList(): List<JSONObject> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { index -> optJSONObject(index) }
    }
}
