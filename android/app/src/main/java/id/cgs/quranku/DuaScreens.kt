package id.cgs.quranku

import android.content.Intent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

@Composable
internal fun DoaHomeScreen(content: LocalContent?, onOpenGroup: (String) -> Unit) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    if (content == null) {
        Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            NativeTabHeader("Doa & Dzikir", "Temukan bacaan untuk keseharianmu", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            LoadingOrError("Memuat bacaan…")
        }
        return
    }
    val groups = if (selected == 0) content.dailyGroups else content.worshipGroups
    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(15.dp)
    ) {
        item { NativeTabHeader("Doa & Dzikir", "Temukan bacaan untuk keseharianmu", Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 17.dp), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                CategoryTab("Doa Harian", selected == 0, Modifier.weight(1f)) { selected = 0 }
                CategoryTab("Wudhu & Salat", selected == 1, Modifier.weight(1f)) { selected = 1 }
            }
        }
        item {
            Column(Modifier.padding(horizontal = 19.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(if (selected == 0) "Pilih kebutuhanmu" else "Doa dan dzikir ibadah", color = MaterialTheme.colorScheme.onBackground, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text(if (selected == 0) "Disusun dalam kategori agar mudah ditemukan." else "Bacaan tersimpan di perangkat dan bisa dibuka offline.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
        }
        items(groups.chunked(2), key = { row -> row.firstOrNull()?.id.orEmpty() }) { row ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { group -> DuaGroupCard(group, Modifier.weight(1f)) { onOpenGroup(group.id) } }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        item {
            Text("Sumber bacaan: Quran NU Online", Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 2.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun CategoryTab(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(44.dp),
        shape = RoundedCornerShape(14.dp),
        color = if (selected) Green else MaterialTheme.colorScheme.surface,
        tonalElevation = if (selected) 0.dp else 1.dp
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(label, color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
        }
    }
}

@Composable
private fun DuaGroupCard(group: DuaGroup, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(142.dp),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Surface(shape = RoundedCornerShape(12.dp), color = MintLight, modifier = Modifier.size(35.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(if (group.id == "wudhu") Icons.Outlined.SelfImprovement else Icons.Outlined.FavoriteBorder, null, tint = Green, modifier = Modifier.size(19.dp))
                }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(group.title, color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text("${group.items.size} bacaan", color = Green, fontSize = 10.sp, fontWeight = FontWeight.Medium)
            }
            Text(group.description, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, lineHeight = 14.sp, maxLines = 2)
        }
    }
}

@Composable
internal fun DuaGroupScreen(group: DuaGroup, onBack: () -> Unit, onOpenItem: (DuaItem) -> Unit) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NativePageHeader(group.title, group.description, onBack)
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Text("${group.items.size} bacaan · bisa dibaca offline", Modifier.padding(start = 3.dp, bottom = 4.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
            itemsIndexed(group.items, key = { _, item -> item.id }) { _, item ->
                Surface(
                    onClick = { onOpenItem(item) },
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(17.dp),
                    tonalElevation = 1.dp
                ) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(35.dp).clip(CircleShape).background(MintLight)) {
                            Text((item.section.takeIf { it.isNotBlank() }?.take(1) ?: "د"), color = Green, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            if (item.section.isNotBlank()) Text(item.section, color = Green, fontSize = 9.sp, fontWeight = FontWeight.SemiBold)
                            Text(item.title, color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, lineHeight = 18.sp)
                            if (item.note.isNotBlank()) Text(item.note, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                        }
                        Text("›", color = Green, fontSize = 25.sp, fontWeight = FontWeight.Light)
                    }
                }
            }
            item {
                Text("Sumber: ${group.items.firstOrNull()?.source ?: "Quran NU Online"}", Modifier.fillMaxWidth().padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
internal fun DuaDetailScreen(item: DuaItem, onBack: () -> Unit) {
    var showLatin by rememberSaveable(item.id) { mutableStateOf(true) }
    var showMeaning by rememberSaveable(item.id) { mutableStateOf(true) }
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NativePageHeader(
            item.title,
            item.section.ifBlank { "Doa & dzikir" },
            onBack,
            trailing = {
                IconButton(onClick = {
                    val lines = buildString {
                        append(item.title).append("\n\n")
                        item.parts.forEach { part ->
                            if (part.arabic.isNotBlank()) append(part.arabic).append("\n")
                            if (part.latin.isNotBlank()) append(part.latin).append("\n")
                            if (part.meaning.isNotBlank()) append(part.meaning).append("\n\n")
                        }
                        append("Sumber: ").append(item.source)
                    }
                    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, lines)
                    context.startActivity(Intent.createChooser(send, "Bagikan bacaan"))
                }) { Icon(Icons.Outlined.Share, "Bagikan", tint = Color.White) }
            }
        )
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CategoryTab("Latin ${if (showLatin) "✓" else ""}", showLatin, Modifier.weight(1f)) { showLatin = !showLatin }
            CategoryTab("Arti ${if (showMeaning) "✓" else ""}", showMeaning, Modifier.weight(1f)) { showMeaning = !showMeaning }
        }
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(11.dp)
        ) {
            itemsIndexed(item.parts) { index, part ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(20.dp), elevation = CardDefaults.cardElevation(1.dp)) {
                    Column(Modifier.fillMaxWidth().padding(17.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (item.parts.size > 1) Text("BACAAN ${index + 1}", color = Green, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        if (part.arabic.isNotBlank()) {
                            Text(part.arabic, Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.onSurface, fontSize = 27.sp, lineHeight = 47.sp, textAlign = TextAlign.End, style = TextStyle(textDirection = TextDirection.Rtl))
                        }
                        if (showLatin && part.latin.isNotBlank()) Text(part.latin, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 20.sp)
                        if (showMeaning && part.meaning.isNotBlank()) Text(part.meaning, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, lineHeight = 22.sp)
                    }
                }
            }
            item {
                Column(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    if (item.note.isNotBlank()) Text(item.note, color = Green, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text("Sumber: ${item.source}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
internal fun AsmaulHusnaScreen(items: List<HusnaItem>, onBack: () -> Unit) {
    var search by rememberSaveable { mutableStateOf("") }
    var expandedId by rememberSaveable { mutableIntStateOf(-1) }
    val filtered = remember(items, search) {
        val q = search.trim().lowercase()
        if (q.isBlank()) items else items.filter { it.latin.lowercase().contains(q) || it.meaning.lowercase().contains(q) || it.id.toString() == q }
    }
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NativePageHeader("Asmaul Husna", "99 nama indah Allah", onBack)
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 17.dp, vertical = 10.dp),
            placeholder = { Text("Cari nama Allah…", fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Outlined.Search, null, tint = Green) },
            singleLine = true,
            shape = RoundedCornerShape(16.dp)
        )
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 15.dp, vertical = 3.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(filtered, key = { it.id }) { name ->
                val expanded = expandedId == name.id
                Surface(
                    onClick = { expandedId = if (expanded) -1 else name.id },
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(18.dp),
                    tonalElevation = 1.dp
                ) {
                    Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(37.dp).clip(CircleShape).background(MintLight)) {
                                Text(name.id.toString(), color = Green, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(name.latin, color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text(name.meaning, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                            }
                            Text(name.arabic, color = Green, fontSize = 21.sp, style = TextStyle(textDirection = TextDirection.Rtl))
                        }
                        if (expanded && name.explanation.isNotBlank()) {
                            Text(name.explanation, Modifier.padding(start = 49.dp, top = 2.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 19.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun TasbihScreen(onBack: () -> Unit, preferences: android.content.SharedPreferences) {
    var count by rememberSaveable { mutableIntStateOf(preferences.getInt("tasbih_count", 0)) }
    var target by rememberSaveable { mutableIntStateOf(preferences.getInt("tasbih_target", 33)) }
    val haptics = LocalHapticFeedback.current
    LaunchedEffect(count) { preferences.edit().putInt("tasbih_count", count).apply() }
    LaunchedEffect(target) { preferences.edit().putInt("tasbih_target", target).apply() }
    val round = if (target > 0) count % target else 0
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NativePageHeader("Tasbih Digital", "Hitung zikir dengan tenang", onBack)
        Column(
            Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(15.dp)
        ) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.fillMaxWidth().padding(17.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("سُبْحَانَ اللهِ", color = Green, fontSize = 26.sp, lineHeight = 43.sp, style = TextStyle(textDirection = TextDirection.Rtl))
                    Text("Subhanallah", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Target putaran", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                listOf(33, 99, 100).forEach { amount ->
                    FilterChip(selected = target == amount, onClick = { target = amount }, label = { Text("$amount", fontSize = 11.sp) })
                }
            }
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(250.dp)) {
                Canvas(Modifier.fillMaxSize().padding(8.dp)) {
                    drawCircle(Color(0xFFE2E8E1), style = Stroke(width = 9.dp.toPx()))
                    drawArc(
                        color = Green,
                        startAngle = -90f,
                        sweepAngle = 360f * (round.toFloat() / target.coerceAtLeast(1)),
                        useCenter = false,
                        style = Stroke(width = 9.dp.toPx(), cap = StrokeCap.Round)
                    )
                    drawCircle(Gold.copy(alpha = 0.12f), radius = size.minDimension * 0.39f)
                }
                Column(
                    Modifier.fillMaxSize().padding(18.dp).clip(CircleShape).clickable {
                        count++
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(count.toString(), color = MaterialTheme.colorScheme.onSurface, fontSize = 56.sp, fontWeight = FontWeight.Light)
                    Text("KETUK UNTUK ZIKIR", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                    Spacer(Modifier.height(4.dp))
                    Text("${round} / $target", color = Green, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            Text(if (round == 0 && count > 0) "Satu putaran selesai. Lanjutkan dengan niat yang baik." else "Setiap ketukan menambah satu hitungan.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center)
            Surface(
                onClick = { count = 0 },
                color = MaterialTheme.colorScheme.surface,
                shape = RoundedCornerShape(15.dp),
                tonalElevation = 1.dp
            ) {
                Row(Modifier.padding(horizontal = 18.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Outlined.Refresh, null, tint = Green, modifier = Modifier.size(17.dp))
                    Text("Atur ulang hitungan", color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
