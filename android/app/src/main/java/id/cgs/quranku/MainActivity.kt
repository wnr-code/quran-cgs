package id.cgs.quranku

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.time.Duration
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContent {
            QuranKuTheme {
                val dark = androidx.compose.foundation.isSystemInDarkTheme()
                SideEffect {
                    window.statusBarColor = android.graphics.Color.parseColor("#103B31")
                    window.navigationBarColor = android.graphics.Color.parseColor(if (dark) "#111A16" else "#F6F5F0")
                    WindowInsetsControllerCompat(window, window.decorView).apply {
                        isAppearanceLightStatusBars = false
                        isAppearanceLightNavigationBars = !dark
                    }
                }
                val start = intent?.data?.host.orEmpty()
                Box(Modifier.fillMaxSize().background(Forest)) {
                    QuranKuApp(
                        startDestination = start,
                        modifier = Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()
                    )
                    Box(
                        Modifier.align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .windowInsetsBottomHeight(WindowInsets.navigationBars)
                            .background(MaterialTheme.colorScheme.background)
                    )
                }
            }
        }
    }
}

@Composable
private fun QuranKuApp(startDestination: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val appContext = remember(context) { context.applicationContext }
    val preferences = remember(appContext) { appContext.getSharedPreferences("quranku_native", 0) }
    var selectedTab by rememberSaveable {
        mutableStateOf(if (startDestination == "quran" || startDestination == "resume") "quran" else "home")
    }
    var page by rememberSaveable { mutableStateOf(if (startDestination == "resume") "reader" else "") }
    var selectedGroupId by rememberSaveable { mutableStateOf("") }
    var selectedDuaId by rememberSaveable { mutableStateOf("") }
    var selectedSurah by rememberSaveable { mutableIntStateOf(preferences.getInt("last_surah", 1)) }
    var lastAyah by rememberSaveable { mutableIntStateOf(preferences.getInt("last_ayah", 1)) }
    var localContent by remember { mutableStateOf<LocalContent?>(null) }
    var metadata by remember { mutableStateOf<List<SurahInfo>>(emptyList()) }
    var selectedCityName by rememberSaveable { mutableStateOf(preferences.getString("city_name", "").orEmpty()) }
    var now by remember { mutableStateOf(ZonedDateTime.now()) }

    LaunchedEffect(appContext) {
        localContent = withContext(Dispatchers.IO) { NativeContentRepository.load(appContext) }
        metadata = withContext(Dispatchers.IO) { QuranRepository.metadataList(appContext) }
    }
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            now = ZonedDateTime.now()
        }
    }

    val city = localContent?.cities?.firstOrNull { it.name == selectedCityName }
    fun saveCity(value: City?) {
        selectedCityName = value?.name.orEmpty()
        preferences.edit().apply {
            if (value == null) remove("city_name") else putString("city_name", value.name)
        }.apply()
    }
    fun openSurah(number: Int) {
        selectedSurah = number.coerceIn(1, 114)
        lastAyah = 1
        preferences.edit().putInt("last_surah", selectedSurah).putInt("last_ayah", 1).apply()
        selectedTab = "quran"
        page = "reader"
    }
    fun backOneLevel() {
        when (page) {
            "dua-detail" -> page = "dua-group"
            else -> page = ""
        }
    }

    BackHandler(enabled = page.isNotBlank() || selectedTab != "home") {
        if (page.isNotBlank()) backOneLevel() else selectedTab = "home"
    }

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            if (page.isBlank()) {
                QuranBottomNavigation(selectedTab) { selectedTab = it }
            }
        }
    ) { insets ->
        Box(Modifier.fillMaxSize().padding(insets)) {
            when (page) {
                "reader" -> QuranReaderScreen(
                    context = appContext,
                    surahNumber = selectedSurah,
                    initialAyah = lastAyah,
                    onBack = ::backOneLevel,
                    onProgress = { surah, ayah ->
                        selectedSurah = surah
                        lastAyah = ayah
                        preferences.edit().putInt("last_surah", surah).putInt("last_ayah", ayah).apply()
                    }
                )
                "prayer" -> PrayerScreen(
                    city = city,
                    cities = localContent?.cities.orEmpty(),
                    now = now,
                    onBack = ::backOneLevel,
                    onSelectCity = ::saveCity
                )
                "dua-group" -> {
                    val group = localContent?.group(selectedGroupId)
                    if (group == null) LoadingOrError("Memuat bacaan…") else DuaGroupScreen(
                        group = group,
                        onBack = ::backOneLevel,
                        onOpenItem = { item -> selectedDuaId = item.id; page = "dua-detail" }
                    )
                }
                "dua-detail" -> {
                    val group = localContent?.group(selectedGroupId)
                    val item = group?.items?.firstOrNull { it.id == selectedDuaId }
                    if (item == null) LoadingOrError("Memuat bacaan…") else DuaDetailScreen(item, onBack = ::backOneLevel)
                }
                "asma" -> AsmaulHusnaScreen(localContent?.husna.orEmpty(), onBack = ::backOneLevel)
                "tasbih" -> TasbihScreen(onBack = ::backOneLevel, preferences = preferences)
                "qibla" -> QiblaScreen(city, onBack = ::backOneLevel, onChooseCity = { page = "prayer" })
                "sources" -> NativeSourcesScreen(onBack = ::backOneLevel)
                "about" -> NativeAboutScreen(onBack = ::backOneLevel, version = BuildConfig.VERSION_NAME, onSources = { page = "sources" })
                "settings" -> NativeSettingsScreen(onBack = ::backOneLevel)
                else -> when (selectedTab) {
                    "quran" -> QuranListScreen(appContext, onOpenSurah = ::openSurah)
                    "doa" -> DoaHomeScreen(localContent, onOpenGroup = { selectedGroupId = it; page = "dua-group" })
                    "more" -> MoreScreen(
                        onAsma = { page = "asma" },
                        onTasbih = { page = "tasbih" },
                        onPrayer = { page = "prayer" },
                        onQibla = { page = "qibla" },
                        onSources = { page = "sources" },
                        onAbout = { page = "about" },
                        onSettings = { page = "settings" }
                    )
                    else -> HomeScreen(
                        city = city,
                        now = now,
                        lastSurah = metadata.firstOrNull { it.number == selectedSurah },
                        lastAyah = lastAyah,
                        onQuran = { selectedTab = "quran" },
                        onOpenLast = { selectedTab = "quran"; page = "reader" },
                        onDoa = { selectedTab = "doa" },
                        onPrayer = { page = "prayer" },
                        onTasbih = { page = "tasbih" },
                        onQibla = { page = "qibla" }
                    )
                }
            }
        }
    }
}

private data class MainNavItem(val id: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@Composable
private fun QuranBottomNavigation(selected: String, onSelect: (String) -> Unit) {
    val items = listOf(
        MainNavItem("home", "Beranda", Icons.Outlined.Home),
        MainNavItem("quran", "Al-Qur'an", Icons.Outlined.MenuBook),
        MainNavItem("doa", "Doa", Icons.Outlined.FavoriteBorder),
        MainNavItem("more", "Lainnya", Icons.Outlined.GridView)
    )
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
        tonalElevation = 6.dp,
        windowInsets = WindowInsets(0, 0, 0, 0)
    ) {
        items.forEach { item ->
            NavigationBarItem(
                selected = selected == item.id,
                onClick = { onSelect(item.id) },
                icon = { Icon(item.icon, contentDescription = null) },
                label = { Text(item.label, fontSize = 11.sp, maxLines = 1) },
                alwaysShowLabel = true,
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Green,
                    selectedTextColor = Green,
                    indicatorColor = MintLight,
                    unselectedIconColor = Muted,
                    unselectedTextColor = Muted
                )
            )
        }
    }
}

@Composable
private fun HomeScreen(
    city: City?,
    now: ZonedDateTime,
    lastSurah: SurahInfo?,
    lastAyah: Int,
    onQuran: () -> Unit,
    onOpenLast: () -> Unit,
    onDoa: () -> Unit,
    onPrayer: () -> Unit,
    onTasbih: () -> Unit,
    onQibla: () -> Unit
) {
    val nextPrayer = remember(city, now) { city?.let { PrayerCalculator.next(it, now) } }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item { HomeHero(now) }
        item {
            Column(Modifier.padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                NextPrayerCard(city, nextPrayer, now, onPrayer)
                ContinueReadingCard(lastSurah, lastAyah, onOpenLast)
                SectionTitle("Jelajahi", "Temani ibadah harianmu")
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickActionCard("Al-Qur'an", "Baca & renungkan", Icons.Outlined.MenuBook, MintLight, Modifier.weight(1f), onQuran)
                    QuickActionCard("Doa harian", "Doa pilihan", Icons.Outlined.FavoriteBorder, Color(0xFFF7EDE7), Modifier.weight(1f), onDoa)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickActionCard("Jadwal salat", city?.name ?: "Atur lokasi", Icons.Outlined.AccessTime, Color(0xFFEBF0F6), Modifier.weight(1f), onPrayer)
                    QuickActionCard("Tasbih", "Hitung zikir", Icons.Outlined.SelfImprovement, Color(0xFFF3EEDF), Modifier.weight(1f), onTasbih)
                }
                AyahReflectionCard()
                Text(
                    "Tampilan Android native · data doa tersedia offline",
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun HomeHero(now: ZonedDateTime) {
    val hour = now.hour
    val greeting = when (hour) {
        in 4..10 -> "Selamat pagi"
        in 11..14 -> "Selamat siang"
        in 15..17 -> "Selamat sore"
        else -> "Selamat malam"
    }
    val date = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale("id", "ID")))
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(30.dp))
            .background(Brush.linearGradient(listOf(Forest, Green, Color(0xFF3D8067))))
    ) {
        Canvas(Modifier.matchParentSize()) {
            drawCircle(Color.White.copy(alpha = 0.04f), radius = size.minDimension * 0.62f, center = Offset(size.width * 1.03f, size.height * 0.06f))
            drawCircle(Color.White.copy(alpha = 0.045f), radius = size.minDimension * 0.38f, center = Offset(size.width * 0.94f, size.height * 0.1f), style = Stroke(width = 1.5.dp.toPx()))
            drawCircle(Gold.copy(alpha = 0.22f), radius = 4.dp.toPx(), center = Offset(size.width * 0.78f, size.height * 0.28f))
            drawCircle(Color.White.copy(alpha = 0.3f), radius = 2.dp.toPx(), center = Offset(size.width * 0.87f, size.height * 0.22f))
        }
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 21.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Image(
                    painter = painterResource(id = R.mipmap.ic_launcher),
                    contentDescription = "Ikon QuranKu",
                    modifier = Modifier.size(42.dp).clip(RoundedCornerShape(13.dp))
                )
                Column(Modifier.weight(1f)) {
                    Text("QuranKu", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    Text("Al-Qur'an & ibadah harian", color = Color.White.copy(alpha = 0.72f), fontSize = 11.sp)
                }
                Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = Gold, modifier = Modifier.size(22.dp))
            }
            Text(
                "اَلسَّلَامُ عَلَيْكُمْ",
                modifier = Modifier.fillMaxWidth().padding(top = 3.dp),
                color = Color.White,
                fontSize = 27.sp,
                lineHeight = 40.sp,
                textAlign = TextAlign.End,
                style = TextStyle(textDirection = TextDirection.Rtl)
            )
            Text("$greeting, semoga harimu penuh berkah.", color = Color.White.copy(alpha = 0.86f), fontSize = 14.sp)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Outlined.CalendarMonth, null, tint = Gold, modifier = Modifier.size(15.dp))
                Text(date.replaceFirstChar { it.uppercase(Locale("id", "ID")) }, color = Color.White.copy(alpha = 0.78f), fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun NextPrayerCard(city: City?, next: PrayerTime?, now: ZonedDateTime, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(23.dp)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 17.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(shape = CircleShape, color = MintLight, modifier = Modifier.size(45.dp)) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Outlined.AccessTime, null, tint = Green, modifier = Modifier.size(22.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(if (city == null) "Waktu salat" else "Salat berikutnya", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                if (city == null || next == null) {
                    Text("Pilih lokasi untuk mulai", color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                } else {
                    Text("${next.name} · ${next.time.format(DateTimeFormatter.ofPattern("HH:mm"))}", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    val target = now.withHour(next.time.hour).withMinute(next.time.minute).withSecond(0).withNano(0).let {
                        if (it.isAfter(now)) it else it.plusDays(1)
                    }
                    val remaining = Duration.between(now, target)
                    val hours = remaining.toHours()
                    val minutes = remaining.toMinutes() % 60
                    Text("${city.name} · ${if (hours > 0) "${hours}j " else ""}${minutes}m lagi", color = Muted, fontSize = 11.sp)
                }
            }
            Icon(Icons.Outlined.ChevronRight, null, tint = Muted, modifier = Modifier.size(22.dp))
        }
    }
}

@Composable
private fun ContinueReadingCard(lastSurah: SurahInfo?, lastAyah: Int, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Forest),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(15.dp), color = Color.White.copy(alpha = 0.12f), modifier = Modifier.size(48.dp)) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Outlined.BookmarkBorder, null, tint = Gold, modifier = Modifier.size(24.dp)) }
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("LANJUTKAN MEMBACA", color = Gold, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.7.sp)
                Text(lastSurah?.latin ?: "Mulai membaca Al-Qur'an", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Text(if (lastSurah == null) "Buka daftar surah" else "Ayat $lastAyah · ${lastSurah.ayahs} ayat", color = Color.White.copy(alpha = 0.72f), fontSize = 11.sp)
            }
            Icon(Icons.Outlined.ChevronRight, null, tint = Color.White.copy(alpha = 0.75f), modifier = Modifier.size(23.dp))
        }
    }
}

@Composable
private fun SectionTitle(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, color = MaterialTheme.colorScheme.onBackground, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
    }
}

@Composable
private fun QuickActionCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(106.dp),
        shape = RoundedCornerShape(21.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 1.dp
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Surface(shape = RoundedCornerShape(12.dp), color = tint, modifier = Modifier.size(35.dp)) {
                Box(contentAlignment = Alignment.Center) { Icon(icon, null, tint = Green, modifier = Modifier.size(19.dp)) }
            }
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(title, color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, maxLines = 1)
            }
        }
    }
}

@Composable
private fun AyahReflectionCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(23.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Icon(Icons.Outlined.AutoAwesome, null, tint = Gold, modifier = Modifier.size(17.dp))
                Text("RENUNGAN HARI INI", color = Green, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
            }
            Text(
                "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 26.sp,
                lineHeight = 42.sp,
                textAlign = TextAlign.End,
                style = TextStyle(textDirection = TextDirection.Rtl)
            )
            Text("Maka, sesungguhnya beserta kesulitan ada kemudahan.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, lineHeight = 20.sp)
            Text("QS. Asy-Syarh: 5 · Terjemahan Kemenag RI", color = Green, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun MoreScreen(
    onAsma: () -> Unit,
    onTasbih: () -> Unit,
    onPrayer: () -> Unit,
    onQibla: () -> Unit,
    onSources: () -> Unit,
    onAbout: () -> Unit,
    onSettings: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Lainnya", color = MaterialTheme.colorScheme.onBackground, fontSize = 27.sp, fontWeight = FontWeight.Bold)
                Text("Fitur pendukung ibadah dan aplikasi", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            }
        }
        item { SectionTitle("Ibadah", "Akses cepat ke fitur lainnya") }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                MoreRow("Asmaul Husna", "99 nama Allah", Icons.Outlined.AutoAwesome, onAsma)
                MoreRow("Tasbih digital", "Hitung zikir dengan mudah", Icons.Outlined.SelfImprovement, onTasbih)
                MoreRow("Jadwal salat", "Pilih kota untuk melihat waktu", Icons.Outlined.AccessTime, onPrayer)
                MoreRow("Arah kiblat", "Hitung arah dari kota pilihan", Icons.Outlined.LocationOn, onQibla)
            }
        }
        item { SectionTitle("Tentang aplikasi", "") }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                MoreRow("Sumber Data", "Terima kasih kepada para penyedia data", Icons.Outlined.BookmarkBorder, onSources)
                MoreRow("Tentang QuranKu", "Versi, privasi, dan informasi aplikasi", Icons.Outlined.Settings, onAbout)
                MoreRow("Preferensi tampilan", "Terang, gelap, atau mengikuti perangkat", Icons.Outlined.MoreHoriz, onSettings)
            }
        }
    }
}

@Composable
private fun MoreRow(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(19.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(12.dp), color = MintLight, modifier = Modifier.size(42.dp)) {
                Box(contentAlignment = Alignment.Center) { Icon(icon, null, tint = Green, modifier = Modifier.size(21.dp)) }
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
            Icon(Icons.Outlined.ChevronRight, null, tint = Muted, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
internal fun NativePageHeader(
    title: String,
    subtitle: String = "",
    onBack: () -> Unit,
    trailing: @Composable (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth().background(Forest).padding(horizontal = 15.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            onClick = onBack,
            color = Color.White.copy(alpha = 0.12f),
            shape = CircleShape,
            modifier = Modifier.size(42.dp)
        ) {
            Box(contentAlignment = Alignment.Center) { Icon(Icons.Outlined.ArrowBack, "Kembali", tint = Color.White, modifier = Modifier.size(21.dp)) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            if (subtitle.isNotBlank()) Text(subtitle, color = Color.White.copy(alpha = 0.68f), fontSize = 11.sp, maxLines = 1)
        }
        if (trailing != null) trailing()
    }
}

@Composable
internal fun LoadingOrError(message: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, tonalElevation = 1.dp) {
            Text(message, Modifier.padding(horizontal = 22.dp, vertical = 16.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        }
    }
}

@Composable
private fun NativeSourcesScreen(onBack: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 26.dp)) {
        item { NativePageHeader("Sumber Data", onBack = onBack) }
        item {
            Column(Modifier.padding(horizontal = 18.dp, vertical = 18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Card(colors = CardDefaults.cardColors(containerColor = Forest), shape = RoundedCornerShape(24.dp)) {
                    Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("جَزَاكُمُ اللهُ خَيْرًا", color = Gold, fontSize = 23.sp, textAlign = TextAlign.End, modifier = Modifier.fillMaxWidth(), style = TextStyle(textDirection = TextDirection.Rtl))
                        Text("Terima kasih kepada para penyedia data, penyusun, penerjemah, qari, pembuat pustaka, serta semua yang turut menghadirkan QuranKu.", color = Color.White, fontSize = 13.sp, lineHeight = 20.sp)
                    }
                }
                SourceCard("Quran NU Online", "Doa harian, doa wudhu, dan doa usai salat", "https://quran.nu.or.id/doa")
                SourceCard("EQuran.id API v2", "Teks Arab, transliterasi, dan terjemahan Al-Qur'an Kementerian Agama RI", "https://equran.id")
                SourceCard("quran-meta", "Metadata surah, jumlah ayat, dan nama surah · lisensi MIT", "https://github.com/quran-center/quran-meta")
                SourceCard("Asmaul Husna", "Data 99 nama Allah · lisensi MIT", "https://github.com/wnr-code/asmaul_husna")
                Text("Alamat sumber ditampilkan untuk disalin; tautan GitHub tetap aktif.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun SourceCard(title: String, detail: String, address: String) {
    val context = LocalContext.current
    val isGithub = address.startsWith("https://github.com/")
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(19.dp), elevation = CardDefaults.cardElevation(1.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(title, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 18.sp)
            if (isGithub) {
                TextButton(
                    onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(address))) } },
                    contentPadding = PaddingValues(horizontal = 0.dp, vertical = 2.dp)
                ) { Text(address, color = Green, fontSize = 11.sp, fontWeight = FontWeight.Medium) }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(address, Modifier.weight(1f), color = Green, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    TextButton(
                        onClick = {
                            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Alamat sumber QuranKu", address))
                            Toast.makeText(context, "Alamat disalin", Toast.LENGTH_SHORT).show()
                        },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) { Text("Salin", color = Green, fontSize = 11.sp) }
                }
            }
        }
    }
}

@Composable
private fun NativeAboutScreen(onBack: () -> Unit, version: String, onSources: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { NativePageHeader("Tentang QuranKu", onBack = onBack) }
        item {
            Column(Modifier.padding(horizontal = 18.dp, vertical = 20.dp), verticalArrangement = Arrangement.spacedBy(15.dp)) {
                Card(colors = CardDefaults.cardColors(containerColor = Forest), shape = RoundedCornerShape(25.dp)) {
                    Row(Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Image(painterResource(R.mipmap.ic_launcher), null, Modifier.size(56.dp).clip(RoundedCornerShape(17.dp)))
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("QuranKu", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Text("Aplikasi Android native · versi $version", color = Color.White.copy(alpha = 0.76f), fontSize = 12.sp)
                        }
                    }
                }
                InfoCard("Dirancang untuk Android", "Antarmuka utama dibangun dengan komponen Android native (Jetpack Compose), bukan halaman situs yang dibungkus di WebView atau Trusted Web Activity.")
                InfoCard("Privasi", "Data doa, Asmaul Husna, dan pilihan kota disimpan di perangkat. Teks Al-Qur'an dimuat dari EQuran.id dan disimpan lokal setelah dibuka. Aplikasi tidak meminta akun atau lokasi GPS.")
                Surface(onClick = onSources, shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface, tonalElevation = 1.dp) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Sumber Data", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                            Text("Kredit dan keterangan data", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                        Icon(Icons.Outlined.ChevronRight, null, tint = Green)
                    }
                }
                Text("Dibuat dengan perhatian untuk membantu menemani ibadah sehari-hari.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 18.sp)
            }
        }
    }
}

@Composable
private fun InfoCard(title: String, detail: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(19.dp), elevation = CardDefaults.cardElevation(1.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(title, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, lineHeight = 19.sp)
        }
    }
}

@Composable
private fun NativeSettingsScreen(onBack: () -> Unit) {
    val dark = androidx.compose.foundation.isSystemInDarkTheme()
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { NativePageHeader("Preferensi tampilan", onBack = onBack) }
        item {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                InfoCard("Tema otomatis", "Aplikasi mengikuti pilihan terang atau gelap pada pengaturan sistem Android. Tema akan berubah otomatis saat perangkat berganti mode.")
                InfoCard("Status tema saat ini", if (dark) "Mode gelap aktif." else "Mode terang aktif.")
                InfoCard("Kenyamanan membaca", "Ukuran huruf Al-Qur'an dapat disesuaikan langsung dari halaman bacaan dengan tombol A− dan A+.")
            }
        }
    }
}

@Composable
private fun QiblaScreen(city: City?, onBack: () -> Unit, onChooseCity: () -> Unit) {
    val bearing = city?.let { qiblaBearing(it.latitude, it.longitude) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { NativePageHeader("Arah Kiblat", city?.name ?: "Pilih kota untuk menghitung arah", onBack = onBack) }
        item {
            Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Spacer(Modifier.height(6.dp))
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(250.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface)) {
                    Canvas(Modifier.fillMaxSize().padding(16.dp)) {
                        drawCircle(Color(0xFFE5E9E2), style = Stroke(width = 1.5.dp.toPx()))
                        drawCircle(Green.copy(alpha = 0.08f), radius = size.minDimension * 0.33f)
                        val angle = Math.toRadians((bearing ?: 0.0) - 90.0)
                        val center = Offset(size.width / 2, size.height / 2)
                        val tip = Offset(center.x + kotlin.math.cos(angle).toFloat() * size.minDimension * 0.33f, center.y + kotlin.math.sin(angle).toFloat() * size.minDimension * 0.33f)
                        drawLine(Green, center, tip, strokeWidth = 3.dp.toPx(), cap = StrokeCap.Round)
                        drawCircle(Gold, radius = 4.dp.toPx(), center = center)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("⌖", color = Green, fontSize = 54.sp, fontWeight = FontWeight.Light)
                        Text(if (bearing == null) "—" else "${bearing.toInt()}°", color = MaterialTheme.colorScheme.onSurface, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text("dari arah utara", color = Muted, fontSize = 11.sp)
                    }
                    Text("U", Modifier.align(Alignment.TopCenter).padding(top = 21.dp), color = Green, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text("KIBLAT", Modifier.align(Alignment.BottomCenter).padding(bottom = 20.dp), color = Green, fontWeight = FontWeight.Bold, fontSize = 10.sp, letterSpacing = 1.sp)
                }
                if (city == null || bearing == null) {
                    Text("Pilih kota untuk menghitung arah kiblat dari koordinat pusat kota.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, textAlign = TextAlign.Center, lineHeight = 20.sp)
                } else {
                    Text("Arah kiblat dari ${city.name} sekitar ${bearing.toInt()}° dari utara.", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, textAlign = TextAlign.Center, lineHeight = 22.sp, fontWeight = FontWeight.Medium)
                }
                Surface(onClick = onChooseCity, color = Green, shape = RoundedCornerShape(15.dp)) {
                    Text(if (city == null) "Pilih kota" else "Ganti kota", Modifier.padding(horizontal = 22.dp, vertical = 13.dp), color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
                Text("Arah dihitung dari koordinat kota. Kompas ini tidak membaca sensor arah perangkat.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, textAlign = TextAlign.Center, lineHeight = 17.sp)
            }
        }
    }
}

private fun qiblaBearing(latitude: Double, longitude: Double): Double {
    val lat1 = Math.toRadians(latitude)
    val lon1 = Math.toRadians(longitude)
    val lat2 = Math.toRadians(21.4225)
    val lon2 = Math.toRadians(39.8262)
    val y = kotlin.math.sin(lon2 - lon1)
    val x = kotlin.math.cos(lat1) * kotlin.math.tan(lat2) - kotlin.math.sin(lat1) * kotlin.math.cos(lon2 - lon1)
    return (Math.toDegrees(kotlin.math.atan2(y, x)) + 360.0) % 360.0
}
