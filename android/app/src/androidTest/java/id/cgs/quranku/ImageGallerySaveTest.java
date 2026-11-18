package id.cgs.quranku;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;
import androidx.annotation.RequiresApi;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Exercises the ImageGallery bridge end to end: the shared UI calls it, MediaStore receives a real
 * image in Pictures/QuranKu, and invalid payloads reject instead of reporting success.
 */
@RunWith(AndroidJUnit4.class)
@RequiresApi(Build.VERSION_CODES.Q)
public final class ImageGallerySaveTest {
    private static final String DIRECTORY = "Pictures/QuranKu";

    @Before
    public void requireScopedStorage() {
        assumeTrue("MediaStore scoped storage memerlukan Android 10 ke atas", Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q);
    }

    @Test
    public void savesImageToPublicGallery() throws Exception {
        String filename = "quranku-uji-galeri-" + System.currentTimeMillis();
        String payload = "data: " + quote(tinyPngBase64()) + ", mimeType: 'image/png', filename: '" + filename + "'";
        Uri saved = null;

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitForBridge(scenario);
            String result = callBridge(scenario, "saveImage", payload);
            assertTrue("Penyimpanan galeri gagal: " + result, result.startsWith("OK "));
            assertTrue("Hasil tidak menandai gambar tersimpan: " + result, result.contains("true"));
            assertTrue("Hasil tidak memuat URI MediaStore: " + result, result.contains("content://media"));

            saved = findSavedImage(filename + ".png");
            assertNotNull("Baris MediaStore untuk gambar tersimpan tidak ditemukan", saved);
        } finally {
            if (saved != null) {
                ContentResolver resolver = ApplicationProvider.getApplicationContext().getContentResolver();
                resolver.delete(saved, null, null);
            }
        }
    }

    @Test
    public void rejectsInvalidPayloads() throws Exception {
        String png = quote(tinyPngBase64());

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitForBridge(scenario);
            String wrongFormat = callBridge(
                scenario,
                "saveImage",
                "data: " + png + ", mimeType: 'text/plain', filename: 'quranku-uji'"
            );
            assertTrue("Format tidak didukung seharusnya ditolak: " + wrongFormat, wrongFormat.startsWith("ERR "));
            assertTrue(wrongFormat, wrongFormat.contains("Format gambar tidak didukung"));

            String emptyData = callBridge(scenario, "saveImage", "data: '', mimeType: 'image/png', filename: 'quranku-uji'");
            assertTrue("Data kosong seharusnya ditolak: " + emptyData, emptyData.startsWith("ERR "));
            assertTrue(emptyData, emptyData.contains("Data gambar kosong"));
        }
    }

    private static Uri findSavedImage(String displayName) {
        Context context = ApplicationProvider.getApplicationContext();
        ContentResolver resolver = context.getContentResolver();
        Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        String[] columns = {
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.RELATIVE_PATH
        };
        try (Cursor cursor = resolver.query(
            collection,
            columns,
            MediaStore.Images.Media.DISPLAY_NAME + "=?",
            new String[] { displayName },
            null
        )) {
            assertNotNull("Kueri MediaStore mengembalikan null", cursor);
            assertTrue("MediaStore tidak menyimpan " + displayName, cursor.moveToFirst());
            String relativePath = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH));
            assertTrue("Gambar tersimpan di " + relativePath, relativePath != null && relativePath.startsWith(DIRECTORY));
            return ContentUris.withAppendedId(collection, cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)));
        }
    }

    private static void waitForBridge(ActivityScenario<MainActivity> scenario) throws InterruptedException {
        for (int attempt = 0; attempt < 120; attempt++) {
            String available = evaluate(
                scenario,
                "Boolean(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ImageGallery)"
            );
            if ("true".equals(available)) return;
            Thread.sleep(250);
        }
        throw new AssertionError("Jembatan ImageGallery tidak tersedia di WebView setelah 30 detik");
    }

    private static String callBridge(ActivityScenario<MainActivity> scenario, String method, String args) throws InterruptedException {
        String call =
            "(function () {" +
            "  window.__galleryResult = null;" +
            "  window.Capacitor.Plugins.ImageGallery." + method + "({ " + args + " })" +
            "    .then(function (r) { window.__galleryResult = 'OK ' + JSON.stringify(r); })" +
            "    .catch(function (e) { window.__galleryResult = 'ERR ' + ((e && (e.message || e.errorMessage)) || String(e)); });" +
            "  return true;" +
            "})()";
        evaluate(scenario, call);

        for (int attempt = 0; attempt < 80; attempt++) {
            String value = evaluate(scenario, "window.__galleryResult");
            if (value != null && !"null".equals(value) && !"undefined".equals(value)) {
                return unquoteJsonString(value);
            }
            Thread.sleep(250);
        }
        throw new AssertionError("Panggilan ImageGallery." + method + " tidak selesai setelah 20 detik");
    }

    private static String evaluate(ActivityScenario<MainActivity> scenario, String script) throws InterruptedException {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        scenario.onActivity(activity -> {
            WebView webView = activity.getBridge().getWebView();
            assertNotNull(webView);
            webView.evaluateJavascript(script, value -> {
                result.set(value);
                done.countDown();
            });
        });
        done.await(10, TimeUnit.SECONDS);
        return result.get();
    }

    /** evaluateJavascript returns a JSON string literal; strip the outer quotes and escapes. */
    private static String unquoteJsonString(String value) {
        String text = value;
        if (text.length() >= 2 && text.startsWith("\"") && text.endsWith("\"")) {
            text = text.substring(1, text.length() - 1);
        }
        return text.replace("\\\"", "\"").replace("\\n", "\n").replace("\\/", "/").replace("\\\\", "\\");
    }

    private static String quote(String value) {
        return "'" + value + "'";
    }

    private static String tinyPngBase64() {
        Bitmap bitmap = Bitmap.createBitmap(8, 8, Bitmap.Config.ARGB_8888);
        bitmap.eraseColor(Color.rgb(11, 61, 46));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
        bitmap.recycle();
        return Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
    }
}
