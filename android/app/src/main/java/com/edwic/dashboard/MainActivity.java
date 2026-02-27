package com.edwic.dashboard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the NativeMqtt plugin before bridge initialization
        registerPlugin(NativeMqttPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
