package za.co.senatlatrading.ops;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "SenatlaDocumentScanner")
public final class SenatlaDocumentScannerPlugin extends Plugin {
    private static final int MAX_PAGES = 5;
    private static final long MAX_PAGE_BYTES = 15L * 1024L * 1024L;
    private static final int MAX_RECOGNITION_LANGUAGES = 8;
    private static final Pattern BCP_47_LANGUAGE = Pattern.compile("^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$");
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private boolean scanInProgress;

    @Override
    public void load() {
        ioExecutor.execute(() -> {
            try {
                ScanCacheSafety.deleteAllSessions(getContext().getCacheDir());
            } catch (IOException | IllegalArgumentException | SecurityException ignored) {
                // Private paths and cleanup details must not be written to application logs.
            }
        });
    }
    @PluginMethod
    public void isAvailable(PluginCall call) {
        ActivityManager manager = (ActivityManager) getContext().getSystemService(Activity.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        boolean sufficientMemory = manager != null;
        if (manager != null) {
            manager.getMemoryInfo(memoryInfo);
            sufficientMemory = memoryInfo.totalMem >= DocumentScannerActivity.MINIMUM_TOTAL_MEMORY_BYTES;
        }
        boolean playServicesEnabled;
        try {
            playServicesEnabled = getContext().getPackageManager().getApplicationInfo("com.google.android.gms", 0).enabled;
        } catch (Exception exception) {
            playServicesEnabled = false;
        }
        boolean cameraAvailable = getContext()
            .getPackageManager()
            .hasSystemFeature(android.content.pm.PackageManager.FEATURE_CAMERA_ANY);
        JSObject result = new JSObject();
        result.put("available", sufficientMemory && playServicesEnabled && cameraAvailable);
        result.put("platform", "android");
        result.put("maxPages", MAX_PAGES);
        result.put("onDeviceOcr", true);
        if (!sufficientMemory) {
            result.put("reason", "unsupported_platform");
        } else if (!playServicesEnabled) {
            result.put("reason", "service_unavailable");
        } else if (!cameraAvailable) {
            result.put("reason", "camera_unavailable");
        }
        call.resolve(result);
    }

    @PluginMethod
    public synchronized void scan(PluginCall call) {
        if (scanInProgress) {
            call.reject("A document scan is already in progress.", "NATIVE_FAILURE");
            return;
        }
        String sessionId;
        try {
            sessionId = ScanCacheSafety.requireCanonicalUuid(call.getString("sessionId"), "sessionId");
        } catch (IllegalArgumentException exception) {
            call.reject(exception.getMessage(), "INVALID_OPTIONS");
            return;
        }
        Object rawMaxPages = call.getData().opt("maxPages");
        Object rawGalleryAllowed = call.getData().opt("galleryImportAllowed");
        JSArray languages = call.getArray("recognitionLanguages");
        if (!(rawMaxPages instanceof Number)
            || ((Number) rawMaxPages).doubleValue() != ((Number) rawMaxPages).intValue()
            || !(rawGalleryAllowed instanceof Boolean)
            || languages == null
            || languages.length() > MAX_RECOGNITION_LANGUAGES) {
            call.reject("Scan options do not match the native scanner contract.", "INVALID_OPTIONS");
            return;
        }
        int maxPages = ((Number) rawMaxPages).intValue();
        if (maxPages < 1 || maxPages > MAX_PAGES) {
            call.reject("maxPages must be between 1 and 5.", "INVALID_OPTIONS");
            return;
        }
        Set<String> uniqueLanguages = new HashSet<>();
        for (int index = 0; index < languages.length(); index++) {
            Object language = languages.opt(index);
            if (!(language instanceof String)
                || !BCP_47_LANGUAGE.matcher((String) language).matches()
                || !uniqueLanguages.add((String) language)) {
                call.reject("recognitionLanguages must contain unique BCP-47 language tags.", "INVALID_OPTIONS");
                return;
            }
        }

        scanInProgress = true;
        Intent intent = new Intent(getContext(), DocumentScannerActivity.class);
        intent.putExtra(DocumentScannerActivity.EXTRA_MAX_PAGES, maxPages);
        intent.putExtra(DocumentScannerActivity.EXTRA_GALLERY_ALLOWED, ((Boolean) rawGalleryAllowed));
        intent.putExtra("sessionId", sessionId);
        startActivityForResult(call, intent, "handleScanResult");
    }

    @ActivityCallback
    private synchronized void handleScanResult(PluginCall call, ActivityResult activityResult) {
        if (call == null) {
            scanInProgress = false;
            return;
        }
        Intent data = activityResult.getData();
        if (activityResult.getResultCode() == Activity.RESULT_CANCELED) {
            scanInProgress = false;
            call.reject("Document scanning was cancelled.", "USER_CANCELLED");
            return;
        }
        if (activityResult.getResultCode() == Activity.RESULT_FIRST_USER) {
            scanInProgress = false;
            String code = data == null ? "NATIVE_FAILURE" : data.getStringExtra(DocumentScannerActivity.EXTRA_ERROR_CODE);
            String message = data == null ? "Document scanning could not be started." : data.getStringExtra(DocumentScannerActivity.EXTRA_ERROR_MESSAGE);
            call.reject(message == null ? "Document scanning could not be started." : message, code == null ? "NATIVE_FAILURE" : code);
            return;
        }
        if (activityResult.getResultCode() != Activity.RESULT_OK || data == null) {
            scanInProgress = false;
            call.reject("Document scanning returned an invalid result.", "MALFORMED_RESULT");
            return;
        }
        GmsDocumentScanningResult result = GmsDocumentScanningResult.fromActivityResultIntent(data);
        int requestedMaxPages = call.getInt("maxPages", MAX_PAGES);
        if (result == null
            || result.getPages() == null
            || result.getPages().isEmpty()
            || result.getPages().size() > requestedMaxPages
            || result.getPages().size() > MAX_PAGES) {
            call.reject("Document scanning returned an invalid page set.", "MALFORMED_RESULT");
            return;
        }
        String sessionId = call.getString("sessionId");
        ioExecutor.execute(() -> preparePages(call, sessionId, result.getPages()));
    }

    @PluginMethod
    public void release(PluginCall call) {
        String sessionId;
        try {
            sessionId = ScanCacheSafety.requireCanonicalUuid(call.getString("sessionId"), "sessionId");
        } catch (IllegalArgumentException exception) {
            call.reject(exception.getMessage(), "INVALID_OPTIONS");
            return;
        }
        Object rawArtifactIds = call.getData().opt("artifactIds");
        JSArray artifactIds = call.getArray("artifactIds");
        if ((rawArtifactIds != null && artifactIds == null) || (artifactIds != null && artifactIds.length() > MAX_PAGES)) {
            call.reject("artifactIds must be an array containing at most five UUIDs.", "INVALID_OPTIONS");
            return;
        }
        ioExecutor.execute(() -> {
            try {
                if (artifactIds == null) {
                    ScanCacheSafety.deleteSession(getContext().getCacheDir(), sessionId);
                } else {
                    List<String> validatedArtifactIds = new ArrayList<>();
                    for (int index = 0; index < artifactIds.length(); index++) {
                        Object rawId = artifactIds.opt(index);
                        if (!(rawId instanceof String)) {
                            throw new IllegalArgumentException("artifactIds must contain only UUID strings.");
                        }
                        String artifactId = ScanCacheSafety.requireCanonicalUuid((String) rawId, "artifactId");
                        if (validatedArtifactIds.contains(artifactId)) {
                            throw new IllegalArgumentException("artifactIds must not contain duplicates.");
                        }
                        validatedArtifactIds.add(artifactId);
                    }
                    for (String artifactId : validatedArtifactIds) {
                        ScanCacheSafety.deleteArtifact(getContext().getCacheDir(), sessionId, artifactId);
                    }
                }
                getBridge().executeOnMainThread(() -> call.resolve());
            } catch (IllegalArgumentException | SecurityException exception) {
                getBridge().executeOnMainThread(() -> call.reject(exception.getMessage(), "INVALID_OPTIONS"));
            } catch (IOException exception) {
                getBridge().executeOnMainThread(() -> call.reject("Scan artifacts could not be released.", "CLEANUP_FAILED"));
            }
        });
    }

    private void preparePages(PluginCall call, String sessionId, List<GmsDocumentScanningResult.Page> sourcePages) {
        File sessionDirectory = null;
        List<PageWork> pages = new ArrayList<>();
        try {
            sessionDirectory = ScanCacheSafety.requireSessionDirectory(getContext().getCacheDir(), sessionId);
            if (!sessionDirectory.exists() && !sessionDirectory.mkdirs()) {
                throw new IOException("Could not create scan cache directory.");
            }
            int count = Math.min(MAX_PAGES, sourcePages.size());
            for (int index = 0; index < count; index++) {
                String artifactId = UUID.randomUUID().toString();
                File target = ScanCacheSafety.requireArtifactFile(sessionDirectory, artifactId);
                String sha256 = copyPage(sourcePages.get(index).getImageUri(), target);
                BitmapFactory.Options dimensions = new BitmapFactory.Options();
                dimensions.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(target.getAbsolutePath(), dimensions);
                if (dimensions.outWidth <= 0 || dimensions.outHeight <= 0 || !"image/jpeg".equals(dimensions.outMimeType)) {
                    throw new IOException("Scanner returned an invalid JPEG image.");
                }
                pages.add(new PageWork(artifactId, target, sha256, target.length(), dimensions.outWidth, dimensions.outHeight));
            }
            if (pages.isEmpty()) {
                throw new IOException("Scanner returned no usable pages.");
            }
            recognizePages(call, sessionDirectory, pages, 0, new JSArray(), TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS));
        } catch (Exception exception) {
            cleanupFailedSession(sessionDirectory, sessionId);
            getBridge().executeOnMainThread(() -> {
                synchronized (SenatlaDocumentScannerPlugin.this) {
                    scanInProgress = false;
                }
                call.reject("Scanned pages could not be prepared.", "NATIVE_FAILURE");
            });
        }
    }

    private String copyPage(Uri source, File target) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        long copied = 0;
        InputStream sourceStream = getContext().getContentResolver().openInputStream(source);
        if (sourceStream == null) {
            throw new IOException("Scanner page could not be opened.");
        }
        try (
            InputStream input = new BufferedInputStream(sourceStream);
            OutputStream output = new BufferedOutputStream(new FileOutputStream(target, false))
        ) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                copied += read;
                if (copied > MAX_PAGE_BYTES) {
                    throw new IOException("Scanner page exceeded the 15 MiB safety limit.");
                }
                digest.update(buffer, 0, read);
                output.write(buffer, 0, read);
            }
        } catch (IOException | RuntimeException exception) {
            target.delete();
            throw exception;
        }
        if (copied == 0) {
            target.delete();
            throw new IOException("Scanner returned an empty page.");
        }
        return ScanCacheSafety.lowerHex(digest.digest());
    }

    private void recognizePages(PluginCall call, File sessionDirectory, List<PageWork> pages, int index, JSArray output, TextRecognizer recognizer) {
        if (index >= pages.size()) {
            recognizer.close();
            JSObject response = new JSObject();
            response.put("sessionId", call.getString("sessionId"));
            response.put("pages", output);
            getBridge().executeOnMainThread(() -> {
                synchronized (SenatlaDocumentScannerPlugin.this) {
                    scanInProgress = false;
                }
                call.resolve(response);
            });
            return;
        }
        PageWork page = pages.get(index);
        try {
            InputImage image = InputImage.fromFilePath(getContext(), Uri.fromFile(page.file));
            recognizer
                .process(image)
                .addOnSuccessListener(text -> {
                    output.put(buildPageResult(page, text));
                    recognizePages(call, sessionDirectory, pages, index + 1, output, recognizer);
                })
                .addOnFailureListener(exception -> {
                    recognizer.close();
                    cleanupFailedSession(sessionDirectory, call.getString("sessionId"));
                    getBridge().executeOnMainThread(() -> {
                        synchronized (SenatlaDocumentScannerPlugin.this) {
                            scanInProgress = false;
                        }
                        call.reject("Text recognition failed for a scanned page.", "NATIVE_FAILURE");
                    });
                });
        } catch (IOException exception) {
            recognizer.close();
            cleanupFailedSession(sessionDirectory, call.getString("sessionId"));
            getBridge().executeOnMainThread(() -> {
                synchronized (SenatlaDocumentScannerPlugin.this) {
                    scanInProgress = false;
                }
                call.reject("A scanned page could not be opened for recognition.", "NATIVE_FAILURE");
            });
        }
    }

    private JSObject buildPageResult(PageWork page, Text text) {
        JSArray blocks = new JSArray();
        for (Text.TextBlock block : text.getTextBlocks()) {
            JSObject blockResult = new JSObject();
            blockResult.put("text", block.getText());
            Rect bounds = block.getBoundingBox();
            if (bounds != null) {
                JSObject box = new JSObject();
                double left = clampUnit(bounds.left / (double) page.width);
                double top = clampUnit(bounds.top / (double) page.height);
                double right = clampUnit(bounds.right / (double) page.width);
                double bottom = clampUnit(bounds.bottom / (double) page.height);
                box.put("x", left);
                box.put("y", top);
                box.put("width", Math.max(0d, right - left));
                box.put("height", Math.max(0d, bottom - top));
                blockResult.put("bounds", box);
            }
            blocks.put(blockResult);
        }
        JSObject result = new JSObject();
        result.put("artifactId", page.artifactId);
        result.put("uri", Uri.fromFile(page.file).toString());
        result.put("mimeType", "image/jpeg");
        result.put("width", page.width);
        result.put("height", page.height);
        result.put("sha256", page.sha256);
        result.put("byteSize", page.byteSize);
        result.put("text", text.getText());
        result.put("textBlocks", blocks);
        return result;
    }

    private static double clampUnit(double value) {
        return Math.max(0d, Math.min(1d, value));
    }

    private void cleanupFailedSession(File sessionDirectory, String sessionId) {
        try {
            if (sessionDirectory != null || sessionId != null) {
                ScanCacheSafety.deleteSession(getContext().getCacheDir(), sessionId);
            }
        } catch (Exception ignored) {
            // Cleanup failure is intentionally not logged because paths are private scan metadata.
        }
    }

    @Override
    protected void handleOnDestroy() {
        ioExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    private static final class PageWork {
        final String artifactId;
        final File file;
        final String sha256;
        final long byteSize;
        final int width;
        final int height;

        PageWork(String artifactId, File file, String sha256, long byteSize, int width, int height) {
            this.artifactId = artifactId;
            this.file = file;
            this.sha256 = sha256;
            this.byteSize = byteSize;
            this.width = width;
            this.height = height;
        }
    }
}
