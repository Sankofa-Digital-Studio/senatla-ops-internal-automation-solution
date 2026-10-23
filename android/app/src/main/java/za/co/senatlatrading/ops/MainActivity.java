package za.co.senatlatrading.ops;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SenatlaDocumentScannerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
