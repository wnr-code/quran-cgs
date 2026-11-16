package id.cgs.quranku;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Streams the selected full azan in a media-playback foreground service with audio focus and Stop action. */
public final class PrayerPlaybackService extends Service {
    public static final String ACTION_START = "id.cgs.quranku.action.START_AZAN_PLAYBACK";
    public static final String ACTION_STOP = "id.cgs.quranku.action.STOP_AZAN_PLAYBACK";
    private static final String CHANNEL_ID = "qk_azan_playback";
    private static final int NOTIFICATION_ID = 0x514a;
    private static final int STOP_REQUEST_CODE = 0x514b;
    private static final String TAG = "QuranKuAzan";

    private MediaPlayer player;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private AudioManager.OnAudioFocusChangeListener focusListener;
    private float playbackVolume = 1.0f;
    private boolean pausedForFocus;

    public static void start(Context context, String key, String voice, float volume) {
        Intent intent = new Intent(context, PrayerPlaybackService.class)
            .setAction(ACTION_START)
            .putExtra("key", key == null ? "uji" : key)
            .putExtra("voice", voice == null ? "a9" : voice)
            .putExtra("volume", Math.max(0.0f, Math.min(1.0f, volume)));
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent);
            else context.startService(intent);
        } catch (RuntimeException error) {
            Log.w(TAG, "Android tidak mengizinkan layanan pemutar azan dimulai", error);
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
        }
    }

    public static void stop(Context context) {
        try { context.stopService(new Intent(context, PrayerPlaybackService.class)); } catch (RuntimeException ignored) {}
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopPlayback();
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction())) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }

        String key = intent.getStringExtra("key");
        String voice = intent.getStringExtra("voice");
        playbackVolume = Math.max(0.0f, Math.min(1.0f, intent.getFloatExtra("volume", 1.0f)));
        stopPlayer();
        try {
            Notification notification = playbackNotification(key, voice);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            if (!requestAudioFocus()) {
                stopPlayback();
                stopSelf(startId);
                return START_NOT_STICKY;
            }
            startStream(voice);
        } catch (RuntimeException error) {
            Log.w(TAG, "Pemutaran azan native gagal dimulai", error);
            stopPlayback();
            stopSelf(startId);
        }
        return START_NOT_STICKY;
    }

    private void startStream(String voice) {
        final MediaPlayer next = new MediaPlayer();
        player = next;
        try {
            next.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
            next.setOnPreparedListener(prepared -> {
                if (player != prepared) return;
                prepared.setVolume(playbackVolume, playbackVolume);
                try { prepared.start(); } catch (IllegalStateException error) { finishPlayback(); }
            });
            next.setOnCompletionListener(done -> finishPlayback());
            next.setOnErrorListener((failed, what, extra) -> {
                Log.w(TAG, "Audio azan tidak dapat dimuat; periksa koneksi internet");
                finishPlayback();
                return true;
            });
            next.setDataSource(audioUrl(voice));
            next.prepareAsync();
        } catch (Exception error) {
            Log.w(TAG, "Audio azan tidak dapat dimuat; periksa koneksi internet", error);
            finishPlayback();
        }
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return false;
        focusListener = change -> {
            if (change == AudioManager.AUDIOFOCUS_LOSS) {
                stopPlayback();
                stopSelf();
            } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                if (player != null && player.isPlaying()) {
                    try { player.pause(); pausedForFocus = true; } catch (IllegalStateException ignored) {}
                }
            } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
                if (player != null) player.setVolume(playbackVolume * 0.2f, playbackVolume * 0.2f);
            } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
                if (player != null) {
                    player.setVolume(playbackVolume, playbackVolume);
                    if (pausedForFocus) {
                        try { player.start(); } catch (IllegalStateException ignored) {}
                        pausedForFocus = false;
                    }
                }
            }
        };
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setOnAudioFocusChangeListener(focusListener)
                .setAcceptsDelayedFocusGain(false)
                .build();
            return audioManager.requestAudioFocus(focusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
        return audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC,
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void finishPlayback() {
        stopPlayer();
        abandonAudioFocus();
        stopForeground(true);
        stopSelf();
    }

    private void stopPlayback() {
        stopPlayer();
        abandonAudioFocus();
        stopForeground(true);
        NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID);
    }

    private void stopPlayer() {
        MediaPlayer old = player;
        player = null;
        pausedForFocus = false;
        if (old != null) {
            try { if (old.isPlaying()) old.stop(); } catch (IllegalStateException ignored) {}
            try { old.reset(); } catch (IllegalStateException ignored) {}
            try { old.release(); } catch (IllegalStateException ignored) {}
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null || focusListener == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
            focusRequest = null;
        } else {
            audioManager.abandonAudioFocus(focusListener);
        }
        focusListener = null;
    }

    private Notification playbackNotification(String key, String voice) {
        Intent stop = new Intent(this, PrayerPlaybackService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(this, STOP_REQUEST_CODE, stop,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String prayer = prayerName(key);
        String title = "Adzan " + prayer;
        String voiceName = voiceName(voice);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_icon)
            .setColor(0xFF0B3D2E)
            .setContentTitle(title)
            .setContentText("Sedang diputar · " + voiceName)
            .setStyle(new NotificationCompat.BigTextStyle().bigText("Sedang diputar · " + voiceName))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(R.drawable.ic_notification_icon, "Hentikan", stopIntent)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                    "Pemutaran azan", NotificationManager.IMPORTANCE_LOW);
                channel.setDescription("Kontrol untuk audio azan yang sedang diputar");
                channel.setSound(null, null);
                channel.enableVibration(false);
                manager.createNotificationChannel(channel);
            }
        }
    }

    private static String audioUrl(String voice) {
        String id;
        if ("a11".equals(voice)) id = "a11-mansour-al-zahrani";
        else if ("a4".equals(voice) || "a7".equals(voice) || "a1".equals(voice) || "a2".equals(voice)) id = voice;
        else id = "a9";
        return "https://cdn.aladhan.com/audio/adhans/" + id + ".mp3";
    }

    private static String voiceName(String voice) {
        if ("a4".equals(voice)) return "Mishary Rashid Alafasy (Dubai One TV)";
        if ("a7".equals(voice)) return "Mishary Rashid Alafasy (versi lain)";
        if ("a1".equals(voice)) return "Ahmad al-Nafees";
        if ("a2".equals(voice)) return "Hafiz Mustafa Özcan";
        if ("a11".equals(voice)) return "Mansour Al-Zahrani";
        return "Mishary Rashid Alafasy";
    }

    private static String prayerName(String key) {
        if ("subuh".equals(key)) return "Subuh";
        if ("zuhur".equals(key)) return "Zuhur";
        if ("asar".equals(key)) return "Asar";
        if ("magrib".equals(key)) return "Magrib";
        if ("isya".equals(key)) return "Isya";
        return "QuranKu";
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        stopPlayer();
        abandonAudioFocus();
        super.onDestroy();
    }
}
