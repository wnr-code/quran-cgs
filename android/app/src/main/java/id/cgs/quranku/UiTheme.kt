package id.cgs.quranku

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

internal val Forest = Color(0xFF103B31)
internal val Green = Color(0xFF17634F)
internal val GreenSoft = Color(0xFF347B64)
internal val Gold = Color(0xFFC9A961)
internal val CanvasLight = Color(0xFFF6F5F0)
internal val CardLight = Color(0xFFFFFEFB)
internal val MintLight = Color(0xFFE7F0EA)
internal val Ink = Color(0xFF20342C)
internal val Muted = Color(0xFF738078)
internal val Line = Color(0xFFE6E7DF)

@Composable
fun QuranKuTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val scheme = if (dark) {
        darkColorScheme(
            primary = Color(0xFF83C8A6),
            onPrimary = Color(0xFF073B2D),
            secondary = Color(0xFFE2C780),
            onSecondary = Color(0xFF3E3212),
            background = Color(0xFF111A16),
            onBackground = Color(0xFFE3E9E4),
            surface = Color(0xFF1A2620),
            onSurface = Color(0xFFE3E9E4),
            surfaceVariant = Color(0xFF29362F),
            onSurfaceVariant = Color(0xFFC0CBC3),
            outline = Color(0xFF47564D)
        )
    } else {
        lightColorScheme(
            primary = Green,
            onPrimary = Color.White,
            secondary = Gold,
            onSecondary = Forest,
            background = CanvasLight,
            onBackground = Ink,
            surface = CardLight,
            onSurface = Ink,
            surfaceVariant = MintLight,
            onSurfaceVariant = Muted,
            outline = Line
        )
    }
    MaterialTheme(colorScheme = scheme, content = content)
}
