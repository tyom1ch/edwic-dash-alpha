package com.edwic.dashboard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Примусово не зупиняємо (resume) таймери JavaScript, щоб фонові сервіси та інтервали працювали!
        // За замовчуванням Capacitor робить bridge.getWebView().pauseTimers() в onPause
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().resumeTimers();
        }
    }
}
