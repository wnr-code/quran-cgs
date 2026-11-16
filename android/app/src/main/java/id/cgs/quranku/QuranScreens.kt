package id.cgs.quranku

import android.content.Context
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.withContext

@Composable
internal fun QuranListScreen(context: Context, onOpenSurah: (Int) -> Unit) {
    var surahs by remember(context) { mutableStateOf(emptyList<SurahInfo>()) }
    var search by rememberSaveable { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var loadFailed by remember { mutableStateOf(false) }
    var retryTick by remember { mutableIntStateOf(0) }
    LaunchedEffect(context, retryTick) {
        loading = surahs.isEmpty()
        loadFailed = false
        try {
            val bundled = try {
                withContext(Dispatchers.IO) { QuranRepository.metadataList(context) }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                emptyList()
            }
            if (bundled.isNotEmpty()) {
                surahs = bundled
                loading = false
            }
            val refreshed = try {
                withContext(Dispatchers.IO) { QuranRepository.surahList(context) }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                emptyList()
            }
            if (refreshed.isNotEmpty()) surahs = refreshed
            loadFailed = surahs.isEmpty()
        } finally {
            loading = false
        }
    }
    val filtered = remember(surahs, search) {
        val q = search.trim().lowercase()
        if (q.isEmpty()) surahs else surahs.filter {
            it.latin.lowercase().contains(q) || it.meaning.lowercase().contains(q) || it.number.toString() == q
        }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NativeTabHeader("Al-Qur'an", "114 surah · 6.236 ayat", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
            placeholder = { Text("Cari surah atau nomor…", fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Outlined.Search, null, tint = Green) },
            singleLine = true,
            shape = RoundedCornerShape(16.dp)
        )
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 2.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (loading && filtered.isEmpty()) {
                item { Box(Modifier.fillMaxWidth().padding(30.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Green) } }
            }
            if (!loading && filtered.isEmpty()) {
                item {
                    if (loadFailed) {
                        Column(
                            Modifier.fillMaxWidth().padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                "Daftar surah belum tersedia. Periksa koneksi lalu coba lagi.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                            TextButton(onClick = { retryTick++ }) { Text("Coba lagi", color = Green) }
                        }
                    } else {
                        Text("Surah tidak ditemukan.", Modifier.padding(20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            items(filtered, key = { it.number }) { surah ->
                SurahRow(surah, onClick = { onOpenSurah(surah.number) })
            }
        }
    }
}

@Composable
private fun SurahRow(surah: SurahInfo, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(18.dp),
        tonalElevation = 1.dp
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(MintLight)) {
                Text(surah.number.toString(), color = Green, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(surah.latin, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text("${surah.meaning} · ${surah.ayahs} ayat", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, maxLines = 1)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(surah.arabic, color = Green, fontSize = 18.sp, style = TextStyle(textDirection = TextDirection.Rtl), maxLines = 1)
                Text(surah.revelation.ifBlank { "Al-Qur'an" }, color = Muted, fontSize = 9.sp)
            }
        }
    }
}

@Composable
internal fun QuranReaderScreen(
    context: Context,
    surahNumber: Int,
    initialAyah: Int = 1,
    onBack: () -> Unit,
    onProgress: (Int, Int) -> Unit
) {
    val localInfo = remember(context, surahNumber) {
        runCatching { QuranRepository.metadataList(context).firstOrNull { it.number == surahNumber } }.getOrNull()
    }
    var chapter by remember(surahNumber) { mutableStateOf<QuranChapter?>(null) }
    var failure by remember(surahNumber) { mutableStateOf(false) }
    var loading by remember(surahNumber) { mutableStateOf(true) }
    var retryTick by remember(surahNumber) { mutableIntStateOf(0) }
    var arabicSize by rememberSaveable(surahNumber) { mutableIntStateOf(29) }
    var showMeaning by rememberSaveable(surahNumber) { mutableStateOf(true) }
    val headerItems = if (surahNumber != 1 && surahNumber != 9) 2 else 1
    val safeInitialAyah = initialAyah.coerceIn(1, (localInfo?.ayahs ?: 1).coerceAtLeast(1))
    val firstVisibleIndex = if (safeInitialAyah <= 1) 0 else headerItems + (safeInitialAyah - 1)
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = firstVisibleIndex)

    LaunchedEffect(surahNumber, retryTick) {
        loading = true
        failure = false
        try {
            chapter = withContext(Dispatchers.IO) { QuranRepository.chapter(context, surahNumber) }
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            failure = true
        } finally {
            loading = false
        }
    }
    LaunchedEffect(chapter, listState) {
        val current = chapter ?: return@LaunchedEffect
        snapshotFlow { listState.firstVisibleItemIndex }.distinctUntilChanged().collect { index ->
            val verseIndex = index - headerItems
            if (verseIndex in current.verses.indices) onProgress(surahNumber, current.verses[verseIndex].number)
        }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NativePageHeader(
            title = chapter?.info?.latin ?: localInfo?.latin ?: "Surah $surahNumber",
            subtitle = chapter?.let { "${it.info.meaning} · ${it.verses.size} ayat" } ?: "Al-Qur'an",
            onBack = onBack,
            trailing = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { showMeaning = !showMeaning }, contentPadding = PaddingValues(horizontal = 5.dp, vertical = 4.dp)) {
                        Text(if (showMeaning) "Arti on" else "Arti off", color = Color.White, fontSize = 10.sp)
                    }
                    TextButton(onClick = { arabicSize = (arabicSize - 2).coerceAtLeast(22) }, contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)) {
                        Text("A−", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    TextButton(onClick = { arabicSize = (arabicSize + 2).coerceAtMost(40) }, contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)) {
                        Text("A+", color = Gold, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        )
        when {
            loading && chapter == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Green) }
            failure && chapter == null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.AutoMirrored.Outlined.MenuBook, null, tint = Green, modifier = Modifier.size(42.dp))
                Spacer(Modifier.height(12.dp))
                Text("Surah belum tersimpan di perangkat", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                Text("Sambungkan internet lalu coba lagi. Bacaan tidak diubah atau dibuat oleh aplikasi.", Modifier.padding(top = 6.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 18.sp)
                TextButton(onClick = { retryTick++ }) { Text("Coba lagi", color = Green) }
            }
            else -> {
                val loaded = chapter
                if (loaded != null) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 15.dp, vertical = 14.dp),
                        verticalArrangement = Arrangement.spacedBy(11.dp)
                    ) {
                        item {
                            SurahIntroCard(loaded.info)
                        }
                        if (surahNumber != 1 && surahNumber != 9) {
                            item {
                                Text(
                                    "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ",
                                    Modifier.fillMaxWidth().padding(vertical = 7.dp),
                                    color = Green,
                                    fontSize = 26.sp,
                                    lineHeight = 42.sp,
                                    textAlign = TextAlign.Center,
                                    style = TextStyle(textDirection = TextDirection.Rtl)
                                )
                            }
                        }
                        itemsIndexed(loaded.verses, key = { _, verse -> verse.number }) { _, verse ->
                            QuranVerseCard(verse, arabicSize, showMeaning)
                        }
                        item {
                            Text("Teks Arab & terjemahan: EQuran.id API v2 · Terjemahan Kementerian Agama RI", Modifier.fillMaxWidth().padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, textAlign = TextAlign.Center, lineHeight = 16.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SurahIntroCard(info: SurahInfo) {
    Card(colors = CardDefaults.cardColors(containerColor = Forest), shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text(info.arabic, color = Gold, fontSize = 24.sp, textAlign = TextAlign.Center, style = TextStyle(textDirection = TextDirection.Rtl))
            Text(info.latin, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Text("${info.meaning} · ${info.ayahs} ayat · ${info.revelation.ifBlank { "Al-Qur'an" }}", color = Color.White.copy(alpha = 0.72f), fontSize = 11.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun QuranVerseCard(verse: QuranVerse, arabicSize: Int, showMeaning: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 15.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(30.dp).clip(CircleShape).background(MintLight)) {
                    Text(verse.number.toString(), color = Green, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
                Text("Ayat ${verse.number}", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Text(
                verse.arabic,
                Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = arabicSize.sp,
                lineHeight = (arabicSize * 1.72).sp,
                textAlign = TextAlign.End,
                style = TextStyle(textDirection = TextDirection.Rtl)
            )
            if (showMeaning) {
                if (verse.latin.isNotBlank()) Text(verse.latin, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, lineHeight = 17.sp)
                if (verse.translation.isNotBlank()) Text(verse.translation, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, lineHeight = 22.sp)
            }
        }
    }
}
