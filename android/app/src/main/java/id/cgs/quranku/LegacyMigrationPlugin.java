package id.cgs.quranku;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Reads only the former QuranKu Compose app's private cache so it can be moved into the shared web stores. */
@CapacitorPlugin(name = "LegacyMigration")
public final class LegacyMigrationPlugin extends Plugin {

    private static final String LEGACY_PREFS = "quranku_native";
    private static final String MIGRATION_COMPLETE = "_capacitor_web_migration_v1";
    private static final Pattern SURAH_FILE = Pattern.compile("surah-(\\d+)\\.json");
    private static final int MAX_CACHE_BYTES = 2 * 1024 * 1024;

    @PluginMethod
    public void getLegacyData(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE);
        JSObject values = new JSObject();
        copyInt(preferences, values, "last_surah");
        copyInt(preferences, values, "last_ayah");
        copyInt(preferences, values, "tasbih_count");
        copyInt(preferences, values, "tasbih_target");
        if (preferences.contains("city_name")) values.put("city_name", preferences.getString("city_name", ""));

        JSArray chapters = new JSArray();
        File directory = new File(getContext().getFilesDir(), "quran");
        File[] files = directory.listFiles((dir, name) -> SURAH_FILE.matcher(name).matches());
        if (files != null) {
            Arrays.sort(files, Comparator.comparingInt((File file) -> surahNumber(file.getName())));
            for (File file : files) {
                int number = surahNumber(file.getName());
                if (number >= 1 && number <= 114 && file.isFile() && file.length() <= MAX_CACHE_BYTES) {
                    chapters.put(number);
                }
            }
        }

        JSObject result = new JSObject();
        result.put("preferences", values);
        result.put("surahs", chapters);
        result.put("complete", preferences.getBoolean(MIGRATION_COMPLETE, false));
        call.resolve(result);
    }

    @PluginMethod
    public void getLegacySurah(PluginCall call) {
        Integer number = call.getInt("number");
        if (number == null || number < 1 || number > 114) {
            call.reject("Nomor surah tidak valid");
            return;
        }

        File directory = new File(getContext().getFilesDir(), "quran");
        File cache = new File(directory, "surah-" + number + ".json");
        try {
            String directoryPath = directory.getCanonicalPath() + File.separator;
            if (!cache.getCanonicalPath().startsWith(directoryPath) || !cache.isFile() || cache.length() > MAX_CACHE_BYTES) {
                call.reject("Cache surah lama tidak tersedia");
                return;
            }
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (FileInputStream input = new FileInputStream(cache)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    bytes.write(buffer, 0, read);
                    if (bytes.size() > MAX_CACHE_BYTES) {
                        call.reject("Cache surah lama terlalu besar");
                        return;
                    }
                }
            }
            String content = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            call.resolve(new JSObject().put("content", content));
        } catch (IOException error) {
            call.reject("Cache surah lama tidak dapat dibaca", error);
        }
    }

    @PluginMethod
    public void completeLegacyMigration(PluginCall call) {
        boolean saved = getContext()
            .getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(MIGRATION_COMPLETE, true)
            .commit();
        if (!saved) {
            call.reject("Penanda migrasi tidak dapat disimpan");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void clearLegacyData(PluginCall call) {
        boolean preferencesCleared = getContext()
            .getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit();
        File directory = new File(getContext().getFilesDir(), "quran");
        File[] files = directory.listFiles((dir, name) -> SURAH_FILE.matcher(name).matches());
        boolean cacheCleared = true;
        if (files != null) {
            for (File file : files) cacheCleared &= !file.exists() || file.delete();
        }
        if (!preferencesCleared || !cacheCleared) {
            call.reject("Sebagian data Android lama tidak dapat dihapus");
            return;
        }
        call.resolve();
    }

    private static void copyInt(SharedPreferences source, JSObject destination, String key) {
        if (source.contains(key)) destination.put(key, source.getInt(key, 0));
    }

    private static int surahNumber(String filename) {
        Matcher matcher = SURAH_FILE.matcher(filename);
        return matcher.matches() ? Integer.parseInt(matcher.group(1)) : -1;
    }
}
