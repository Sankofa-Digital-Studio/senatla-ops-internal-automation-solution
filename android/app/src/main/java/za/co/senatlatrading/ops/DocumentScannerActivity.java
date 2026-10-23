package za.co.senatlatrading.ops;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import com.google.mlkit.common.MlKitException;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;

/** Internal trampoline that adapts ML Kit's IntentSender flow to Capacitor's activity callback. */
public final class DocumentScannerActivity extends AppCompatActivity {
    static final String EXTRA_MAX_PAGES = "maxPages";
    static final String EXTRA_GALLERY_ALLOWED = "galleryImportAllowed";
    static final String EXTRA_ERROR_CODE = "errorCode";
    static final String EXTRA_ERROR_MESSAGE = "errorMessage";
    static final long MINIMUM_TOTAL_MEMORY_BYTES = 1_700_000_000L;

    private ActivityResultLauncher<IntentSenderRequest> scannerLauncher;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        scannerLauncher = registerForActivityResult(new StartIntentSenderForResult(), result -> {
            setResult(result.getResultCode(), result.getData());
            finish();
        });

        if (savedInstanceState != null) {
            return;
        }
        if (!hasSufficientMemory()) {
            finishWithError("UNSUPPORTED_PLATFORM", "Document scanning requires at least 1.7 GB of device memory.");
            return;
        }
        if (!hasEnabledGooglePlayServices()) {
            finishWithError("UNSUPPORTED_PLATFORM", "Google Play services is required for document scanning.");
            return;
        }

        int maxPages = Math.max(1, Math.min(5, getIntent().getIntExtra(EXTRA_MAX_PAGES, 5)));
        boolean galleryAllowed = getIntent().getBooleanExtra(EXTRA_GALLERY_ALLOWED, false);
        GmsDocumentScannerOptions options = new GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(galleryAllowed)
            .setPageLimit(maxPages)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build();
        GmsDocumentScanner scanner = GmsDocumentScanning.getClient(options);
        scanner
            .getStartScanIntent(this)
            .addOnSuccessListener(intentSender -> scannerLauncher.launch(new IntentSenderRequest.Builder(intentSender).build()))
            .addOnFailureListener(this::handleScannerStartFailure);
    }

    private boolean hasSufficientMemory() {
        ActivityManager manager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
        if (manager == null) {
            return false;
        }
        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        manager.getMemoryInfo(memoryInfo);
        return memoryInfo.totalMem >= MINIMUM_TOTAL_MEMORY_BYTES;
    }

    private boolean hasEnabledGooglePlayServices() {
        try {
            ApplicationInfo info = getPackageManager().getApplicationInfo("com.google.android.gms", 0);
            return info.enabled;
        } catch (PackageManager.NameNotFoundException exception) {
            return false;
        }
    }

    private void handleScannerStartFailure(Exception exception) {
        if (exception instanceof MlKitException && ((MlKitException) exception).getErrorCode() == MlKitException.UNSUPPORTED) {
            finishWithError("UNSUPPORTED_PLATFORM", "Document scanning is not supported on this device.");
            return;
        }
        finishWithError(
            "NATIVE_FAILURE",
            "The on-device scanner could not be prepared. Check Google Play services and retry."
        );
    }

    private void finishWithError(String code, String message) {
        Intent result = new Intent();
        result.putExtra(EXTRA_ERROR_CODE, code);
        result.putExtra(EXTRA_ERROR_MESSAGE, message);
        setResult(Activity.RESULT_FIRST_USER, result);
        finish();
    }
}
