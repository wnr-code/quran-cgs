package id.cgs.quranku;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.annotation.RequiresApi;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Locale;
import android.media.MediaScannerConnection;

/** Saves generated PNG/JPG images to the public Pictures/QuranKu gallery folder. */
@CapacitorPlugin(
    name = "ImageGallery",
    permissions = {
        @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
    }
)
public final class ImageGalleryPlugin extends Plugin {
    private static final String DIRECTORY_NAME = "QuranKu";
    private static final int MAX_BASE64_CHARACTERS = 20 * 1024 * 1024;

    @PluginMethod
    public void saveImage(PluginCall call) {
        try {
            readImagePayload(call);
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage(), error);
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "saveImagePermissionCallback");
            return;
        }

        persistImage(call);
    }

    @PermissionCallback
    private void saveImagePermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            call.reject("Izin penyimpanan ditolak; gambar tidak disimpan.");
            return;
        }
        persistImage(call);
    }

    private void persistImage(PluginCall call) {
        final ImagePayload image;
        try {
            image = readImagePayload(call);
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage(), error);
            return;
        }

        execute(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    Uri uri = saveToMediaStore(image);
                    call.resolve(savedResult(image.filename, uri));
                } else {
                    saveAndIndexLegacyImage(call, image);
                }
            } catch (Exception error) {
                call.reject("Gambar tidak dapat disimpan ke Galeri.", error);
            }
        });
    }

    private ImagePayload readImagePayload(PluginCall call) {
        String mimeType = call.getString("mimeType", "").trim().toLowerCase(Locale.ROOT);
        if (!"image/png".equals(mimeType) && !"image/jpeg".equals(mimeType)) {
            throw new IllegalArgumentException("Format gambar tidak didukung.");
        }

        String encoded = call.getString("data", "").trim();
        if (encoded.isEmpty() || encoded.length() > MAX_BASE64_CHARACTERS) {
            throw new IllegalArgumentException("Data gambar kosong atau terlalu besar.");
        }

        final byte[] bytes;
        try {
            bytes = Base64.decode(encoded, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Data gambar tidak valid.", error);
        }
        if (bytes.length == 0) {
            throw new IllegalArgumentException("Data gambar kosong.");
        }

        String rawFilename = call.getString("filename", "quranku-image");
        String filename = rawFilename == null ? "quranku-image" : rawFilename.trim();
        filename = filename.replaceAll("[^A-Za-z0-9._-]", "-").replaceAll("^\\.+", "");
        filename = filename.replaceFirst("(?i)\\.(?:png|jpe?g)$", "");
        if (filename.isEmpty()) filename = "quranku-image";
        if (filename.length() > 100) filename = filename.substring(0, 100);
        filename += "image/jpeg".equals(mimeType) ? ".jpg" : ".png";

        return new ImagePayload(filename, mimeType, bytes);
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private Uri saveToMediaStore(ImagePayload image) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, image.filename);
        values.put(MediaStore.Images.Media.MIME_TYPE, image.mimeType);
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + DIRECTORY_NAME);
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri uri = resolver.insert(collection, values);
        if (uri == null) throw new IOException("MediaStore tidak dapat membuat berkas gambar.");

        try {
            try (OutputStream output = resolver.openOutputStream(uri, "w")) {
                if (output == null) throw new IOException("Berkas gambar tidak dapat dibuka untuk ditulis.");
                output.write(image.bytes);
                output.flush();
            }

            ContentValues ready = new ContentValues();
            ready.put(MediaStore.Images.Media.IS_PENDING, 0);
            if (resolver.update(uri, ready, null, null) <= 0) {
                throw new IOException("Gambar tersimpan tetapi tidak dapat diterbitkan ke Galeri.");
            }
            return uri;
        } catch (Exception error) {
            resolver.delete(uri, null, null);
            if (error instanceof IOException) throw (IOException) error;
            throw new IOException("Gambar tidak dapat ditulis ke Galeri.", error);
        }
    }

    @SuppressWarnings("deprecation")
    private void saveAndIndexLegacyImage(PluginCall call, ImagePayload image) throws IOException {
        File pictures = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
        File directory = new File(pictures, DIRECTORY_NAME);
        if (!directory.isDirectory() && !directory.mkdirs() && !directory.isDirectory()) {
            throw new IOException("Folder Pictures/QuranKu tidak dapat dibuat.");
        }

        File file = createUniqueFile(directory, image.filename);
        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(image.bytes);
            output.flush();
            output.getFD().sync();
        } catch (IOException error) {
            file.delete();
            throw error;
        }

        MediaScannerConnection.scanFile(
            getContext(),
            new String[] { file.getAbsolutePath() },
            new String[] { image.mimeType },
            (path, uri) -> {
                if (uri == null) {
                    file.delete();
                    call.reject("Gambar tidak dapat ditampilkan di Galeri.");
                    return;
                }
                call.resolve(savedResult(file.getName(), uri));
            }
        );
    }

    private static File createUniqueFile(File directory, String filename) {
        File file = new File(directory, filename);
        if (!file.exists()) return file;

        int extension = filename.lastIndexOf('.');
        String stem = extension > 0 ? filename.substring(0, extension) : filename;
        String suffix = extension > 0 ? filename.substring(extension) : "";
        for (int index = 1; ; index++) {
            file = new File(directory, stem + "-" + index + suffix);
            if (!file.exists()) return file;
        }
    }

    private static JSObject savedResult(String filename, Uri uri) {
        return new JSObject()
            .put("saved", true)
            .put("filename", filename)
            .put("uri", uri.toString());
    }

    private static final class ImagePayload {
        final String filename;
        final String mimeType;
        final byte[] bytes;

        ImagePayload(String filename, String mimeType, byte[] bytes) {
            this.filename = filename;
            this.mimeType = mimeType;
            this.bytes = bytes;
        }
    }
}
