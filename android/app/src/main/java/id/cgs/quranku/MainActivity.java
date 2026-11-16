package id.cgs.quranku;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LegacyMigrationPlugin.class);
        registerPlugin(PrayerNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
