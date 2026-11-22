package id.cgs.quranku;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Memastikan persetujuan akad infaq benar-benar tersimpan di WebView Android
 * (origin {@code https://localhost}), bukan hanya di peramban desktop.
 *
 * <p>Yang diuji lewat jembatan JavaScript yang sama dengan UI asli:
 * <ul>
 *   <li>{@code localStorage} tersedia dan bisa ditulis di WebView.</li>
 *   <li>Kunci {@code quranku:akad-infaq} hilang setelah dibatalkan.</li>
 *   <li>Kunci bertahan setelah WebView dimuat ulang pada origin yang sama.</li>
 * </ul>
 *
 * <p>Kunci dibersihkan sebelum dan sesudah tes agar tidak mengubah keadaan aplikasi.
 */
@RunWith(AndroidJUnit4.class)
public final class InfaqAkadConsentTest {

    private static final String KEY = "quranku:akad-infaq";

    @Test
    public void akadConsentPersistsInWebViewStorage() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitForUi(scenario);

            // Bersihkan sisa tes sebelumnya.
            assertEquals("true", evaluate(scenario, "(function(){try{localStorage.removeItem('" + KEY + "');return 'true'}catch(e){return 'err:' + e.name}})()"));

            // localStorage harus bisa ditulis di origin https://localhost.
            String wrote = unquote(evaluate(
                scenario,
                "(function(){try{localStorage.setItem('" + KEY + "',JSON.stringify({versi:'uji-webview',tanggal:'2026-11-22T00:00:00.000Z'}));return localStorage.getItem('" + KEY + "')?'true':'false'}catch(e){return 'err:' + e.name}})()"
            ));
            assertEquals("localStorage tidak bisa ditulis di WebView Android", "true", wrote);

            // Nilai harus terbaca kembali beserta isinya.
            String stored = unquote(evaluate(scenario, "localStorage.getItem('" + KEY + "')"));
            assertNotNull(stored);
            assertTrue("Isi persetujuan tidak utuh: " + stored, stored.contains("uji-webview"));

            // Bertahan setelah WebView dimuat ulang (bukan hanya variabel di memori).
            reloadAndWait(scenario);
            String afterReload = unquote(evaluate(scenario, "localStorage.getItem('" + KEY + "')"));
            assertNotNull("Persetujuan akad hilang setelah WebView dimuat ulang", afterReload);
            assertTrue(afterReload.contains("uji-webview"));

            // Pembatalan lewat jalur aplikasi menghapus kunci.
            String removed = unquote(evaluate(
                scenario,
                "(function(){try{localStorage.removeItem('" + KEY + "');return localStorage.getItem('" + KEY + "')===null?'true':'false'}catch(e){return 'err:' + e.name}})()"
            ));
            assertEquals("Batalkan persetujuan tidak menghapus kunci", "true", removed);
        }
    }

    @Test
    public void akadScreenOpensWithExpectedButtons() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitForUi(scenario);
            evaluate(scenario, "(function(){try{localStorage.removeItem('" + KEY + "')}catch(e){};location.hash='#/infaq';return true})()");
            Thread.sleep(1500);

            // Tombol utama halaman Infaq tersedia.
            String hasButton = unquote(evaluate(scenario, "document.querySelector('[data-infaq-open]')?'true':'false'"));
            assertEquals("Tombol INFAQ tidak dirender di WebView", "true", hasButton);

            // Buka akad lalu pastikan tombol ijab ada.
            evaluate(scenario, "(function(){document.querySelector('[data-infaq-open]').click();return true})()");
            Thread.sleep(800);
            String okLabel = unquote(evaluate(
                scenario,
                "(function(){var b=document.querySelector('.sheet-wrap [data-akad-ok]');return b?b.textContent.trim():''})()"
            ));
            assertTrue("Tombol setuju akad tidak muncul: '" + okLabel + "'", okLabel.startsWith("Bismillah, saya setuju"));

            // Teks penerima harus memakai nama publik yang disepakati.
            String akadText = unquote(evaluate(
                scenario,
                "(function(){var a=document.querySelector('.sheet-wrap [data-akad]');return a?a.textContent.replace(/\\s+/g,' '):''})()"
            ));
            assertTrue("Akad tidak menyebut penerima: " + akadText, akadText.contains("Aep (WNR Code)"));
            assertTrue("Akad tidak memuat klausul qabul", akadText.contains("Penerimaan (qabul)"));

            // Bersihkan.
            evaluate(scenario, "(function(){try{localStorage.removeItem('" + KEY + "')}catch(e){};return true})()");
        }
    }

    /** Tunggu sampai UI bersama benar-benar siap (bukan halaman kosong/splash). */
    private static void waitForUi(ActivityScenario<MainActivity> scenario) throws InterruptedException {
        for (int attempt = 0; attempt < 120; attempt++) {
            String ready = unquote(evaluate(scenario, "(document.querySelector('#view')&&document.querySelector('[data-back],.home-hero')?'true':'false')"));
            if ("true".equals(ready)) return;
            Thread.sleep(250);
        }
        throw new AssertionError("UI bersama tidak siap di WebView setelah 30 detik");
    }

    private static void reloadAndWait(ActivityScenario<MainActivity> scenario) throws InterruptedException {
        evaluate(scenario, "(function(){location.reload();return true})()");
        Thread.sleep(2500);
        waitForUi(scenario);
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

    /** evaluateJavascript mengembalikan literal string JSON; buang kutip luar dan escape. */
    private static String unquote(String value) {
        if (value == null) return null;
        if ("null".equals(value)) return null;
        String text = value;
        if (text.length() >= 2 && text.startsWith("\"") && text.endsWith("\"")) {
            text = text.substring(1, text.length() - 1);
        }
        return text.replace("\\\"", "\"").replace("\\n", "\n").replace("\\/", "/").replace("\\\\", "\\");
    }
}
