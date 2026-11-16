package id.cgs.quranku

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import java.time.Duration
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
internal fun PrayerScreen(
    city: City?,
    cities: List<City>,
    now: ZonedDateTime,
    onBack: () -> Unit,
    onSelectCity: (City?) -> Unit
) {
    var showPicker by rememberSaveable { mutableStateOf(city == null) }
    val times = remember(city, now.toLocalDate(), now.zone) {
        city?.let { PrayerCalculator.times(it, now.toLocalDate(), now.zone) }.orEmpty()
    }
    val next = remember(city, now) { city?.let { PrayerCalculator.next(it, now) } }
    val date = now.format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale("id", "ID")))

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NativePageHeader("Jadwal Salat", city?.name ?: "Pilih lokasi", onBack)
        if (city == null) {
            Column(Modifier.fillMaxSize().padding(26.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Surface(shape = CircleShape, color = MintLight, modifier = Modifier.size(66.dp)) {
                    Box(contentAlignment = Alignment.Center) { Icon(Icons.Outlined.LocationOn, null, tint = Green, modifier = Modifier.size(31.dp)) }
                }
                Text("Atur kota terlebih dahulu", Modifier.padding(top = 16.dp), color = MaterialTheme.colorScheme.onSurface, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("Pilih kota agar waktu salat dihitung sesuai koordinat setempat. QuranKu tidak meminta akses lokasi GPS.", Modifier.padding(top = 7.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center, lineHeight = 19.sp)
                Surface(onClick = { showPicker = true }, modifier = Modifier.padding(top = 18.dp), shape = RoundedCornerShape(15.dp), color = Green) {
                    Text("Pilih kota", Modifier.padding(horizontal = 22.dp, vertical = 13.dp), color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
            }
        } else {
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 17.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Forest), shape = RoundedCornerShape(23.dp)) {
                        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Outlined.LocationOn, null, tint = Gold, modifier = Modifier.size(16.dp))
                                Text(city.name.uppercase(Locale("id", "ID")), color = Color.White.copy(alpha = 0.78f), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.7.sp)
                            }
                            Text(date.replaceFirstChar { it.uppercase(Locale("id", "ID")) }, color = Color.White.copy(alpha = 0.76f), fontSize = 12.sp)
                            if (next != null) {
                                Spacer(Modifier.height(8.dp))
                                Text("SALAT BERIKUTNYA", color = Gold, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                                    Text(next.name, color = Color.White, fontSize = 27.sp, fontWeight = FontWeight.Bold)
                                    Text(next.time.format(DateTimeFormatter.ofPattern("HH:mm")), color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 3.dp))
                                }
                                val target = now.withHour(next.time.hour).withMinute(next.time.minute).withSecond(0).withNano(0).let { if (it.isAfter(now)) it else it.plusDays(1) }
                                val gap = Duration.between(now, target)
                                Text("${gap.toHours()} jam ${gap.toMinutes() % 60} menit lagi", color = Color.White.copy(alpha = 0.76f), fontSize = 11.sp)
                            }
                        }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth().padding(top = 2.dp, bottom = 1.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Waktu hari ini", color = MaterialTheme.colorScheme.onBackground, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                            Text("Metode Kemenag RI · Asar Syafi'i", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                        TextButton(onClick = { showPicker = true }) { Text("Ganti kota", color = Green, fontSize = 11.sp) }
                    }
                }
                items(times, key = { it.key }) { prayer ->
                    val highlighted = prayer.key == next?.key && !prayer.secondary
                    Surface(
                        color = if (highlighted) MintLight else MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(16.dp),
                        tonalElevation = if (highlighted) 0.dp else 1.dp
                    ) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(8.dp).clip(CircleShape).background(if (highlighted) Green else Color(0xFFC7CEC8)))
                            Text(prayer.name, Modifier.weight(1f).padding(start = 11.dp), color = if (highlighted) Green else MaterialTheme.colorScheme.onSurface, fontSize = 13.sp, fontWeight = if (highlighted) FontWeight.Bold else FontWeight.Medium)
                            Text(prayer.time.format(DateTimeFormatter.ofPattern("HH:mm")), color = if (highlighted) Green else MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                item {
                    Text(
                        "Perhitungan astronomis lokal: Subuh 20°, Isya 18°, ihtiyat 2 menit. Koordinat memakai perkiraan pusat kota; jadwal dapat berbeda beberapa menit. Cocokkan dengan jadwal resmi Kemenag atau otoritas setempat.",
                        Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp,
                        lineHeight = 16.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }

    if (showPicker) CityPickerDialog(cities, city, onDismiss = { showPicker = false }, onSelect = {
        onSelectCity(it)
        showPicker = false
    })
}

@Composable
private fun CityPickerDialog(cities: List<City>, selected: City?, onDismiss: () -> Unit, onSelect: (City) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    val filtered = remember(cities, query) {
        if (query.isBlank()) cities else cities.filter { it.name.contains(query.trim(), ignoreCase = true) }
    }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier.fillMaxWidth(0.92f).heightIn(max = 650.dp),
            shape = RoundedCornerShape(26.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(Modifier.padding(16.dp)) {
                Text("Pilih kota", color = MaterialTheme.colorScheme.onSurface, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text("Koordinat pusat kota digunakan untuk perhitungan.", Modifier.padding(top = 3.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.fillMaxWidth().padding(top = 11.dp, bottom = 7.dp),
                    placeholder = { Text("Cari kota…", fontSize = 13.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(15.dp)
                )
                LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    items(filtered, key = { it.name }) { city ->
                        Surface(
                            onClick = { onSelect(city) },
                            color = if (selected?.name == city.name) MintLight else Color.Transparent,
                            shape = RoundedCornerShape(13.dp)
                        ) {
                            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(city.name, Modifier.weight(1f), color = if (selected?.name == city.name) Green else MaterialTheme.colorScheme.onSurface, fontSize = 13.sp, fontWeight = if (selected?.name == city.name) FontWeight.Bold else FontWeight.Medium)
                                if (selected?.name == city.name) Text("Terpilih", color = Green, fontSize = 10.sp)
                            }
                        }
                    }
                    if (filtered.isEmpty()) item { Text("Kota tidak ditemukan.", Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                }
                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) { Text("Tutup", color = Green) }
            }
        }
    }
}
