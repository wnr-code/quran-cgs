package id.cgs.quranku;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class CapacitorStartupTest {

    @Test
    public void bundledSharedHomePageLoads() throws Exception {
        AtomicReference<String> packageName = new AtomicReference<>();
        AtomicReference<String> homeText = new AtomicReference<>();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> packageName.set(activity.getPackageName()));
            assertEquals("id.cgs.quranku", packageName.get());

            for (int attempt = 0; attempt < 80; attempt++) {
                CountDownLatch evaluated = new CountDownLatch(1);
                scenario.onActivity(activity -> {
                    WebView webView = activity.getBridge().getWebView();
                    assertNotNull(webView);
                    webView.evaluateJavascript(
                        "(() => { const page = document.querySelector('.home-hero'); return page ? page.textContent : ''; })()",
                        value -> {
                            if (value != null) homeText.set(value);
                            evaluated.countDown();
                        }
                    );
                });
                evaluated.await(250, TimeUnit.MILLISECONDS);
                if (homeText.get() != null && homeText.get().contains("QuranKu")) break;
                Thread.sleep(150);
            }
            assertNotNull("Bundled home page did not render", homeText.get());
            assertTrue("Expected the shared QuranKu home UI", homeText.get().contains("QuranKu"));
            assertTrue("Expected the home salutation to render", homeText.get().contains("Assalamu"));
        }
    }
}
