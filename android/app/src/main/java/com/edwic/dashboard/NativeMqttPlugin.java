package com.edwic.dashboard;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

@CapacitorPlugin(name = "NativeMqtt")
public class NativeMqttPlugin extends Plugin {

    private static final String TAG = "NativeMqttPlugin";
    private MqttBackgroundService mqttService;
    private boolean isBound = false;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            MqttBackgroundService.LocalBinder binder = (MqttBackgroundService.LocalBinder) service;
            mqttService = binder.getService();
            isBound = true;

            // Set up event listener to forward events to JS
            mqttService.setEventListener(new MqttBackgroundService.MqttEventListener() {
                @Override
                public void onMessage(String brokerId, String topic, String payload) {
                    JSObject data = new JSObject();
                    data.put("brokerId", brokerId);
                    data.put("topic", topic);
                    data.put("payload", payload);
                    data.put("timestamp", System.currentTimeMillis());
                    notifyListeners("mqttMessage", data);
                }

                @Override
                public void onBrokerStatusChanged(String brokerId, String status, String errorMessage) {
                    JSObject data = new JSObject();
                    data.put("brokerId", brokerId);
                    data.put("status", status);
                    if (errorMessage != null) {
                        data.put("message", errorMessage);
                    }
                    notifyListeners("brokerStatus", data);
                }

                @Override
                public void onAlertFired(String alertDataJson) {
                    try {
                        JSObject ret = new JSObject(alertDataJson);
                        notifyListeners("alertFired", ret);
                    } catch (Exception e) {
                        Log.e(TAG, "Error notifying JS about alert", e);
                    }
                }
            });

            Log.i(TAG, "Bound to MqttBackgroundService.");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            mqttService = null;
            isBound = false;
            Log.w(TAG, "Disconnected from MqttBackgroundService.");
        }
    };

    @PluginMethod
    public void startService(PluginCall call) {
        JSArray brokersArr = call.getArray("brokers");
        if (brokersArr == null) {
            call.reject("Missing 'brokers' parameter");
            return;
        }

        JSArray alertsArr = call.getArray("alerts"); // Optional alerts

        try {
            JSONArray brokersJson = new JSONArray(brokersArr.toString());
            JSONArray alertsJson = alertsArr != null ? new JSONArray(alertsArr.toString()) : new JSONArray();

            Context context = getContext();
            Intent serviceIntent = new Intent(context, MqttBackgroundService.class);

            // Start Foreground Service
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            // Bind to it
            context.bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);

            // Wait a bit for binding, then configure
            getActivity().getWindow().getDecorView().postDelayed(() -> {
                if (mqttService != null) {
                    mqttService.configureBrokers(brokersJson);
                    mqttService.configureAlerts(alertsJson);
                    Log.i(TAG, "Brokers + alerts configured via startService.");
                } else {
                    Log.w(TAG, "Service not yet bound, retrying in 500ms...");
                    getActivity().getWindow().getDecorView().postDelayed(() -> {
                        if (mqttService != null) {
                            mqttService.configureBrokers(brokersJson);
                            mqttService.configureAlerts(alertsJson);
                            Log.i(TAG, "Brokers + alerts configured (retry).");
                        } else {
                            Log.e(TAG, "Service still not bound after retry!");
                        }
                    }, 500);
                }
            }, 300);

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error starting service", e);
            call.reject("Error starting service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Context context = getContext();
            if (isBound) {
                context.unbindService(serviceConnection);
                isBound = false;
            }
            context.stopService(new Intent(context, MqttBackgroundService.class));
            mqttService = null;
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping service", e);
            call.reject("Error stopping service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateBrokers(PluginCall call) {
        if (mqttService == null) {
            call.reject("Service not running");
            return;
        }
        JSArray brokersArr = call.getArray("brokers");
        if (brokersArr == null) {
            call.reject("Missing 'brokers' parameter");
            return;
        }
        try {
            JSONArray brokersJson = new JSONArray(brokersArr.toString());
            mqttService.configureBrokers(brokersJson);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void configureAlerts(PluginCall call) {
        if (mqttService == null) {
            call.reject("Service not running");
            return;
        }
        JSArray alertsArr = call.getArray("alerts");
        if (alertsArr == null) {
            call.reject("Missing 'alerts' parameter");
            return;
        }
        try {
            JSONArray alertsJson = new JSONArray(alertsArr.toString());
            mqttService.configureAlerts(alertsJson);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void subscribe(PluginCall call) {
        if (mqttService == null) {
            call.reject("Service not running");
            return;
        }
        String brokerId = call.getString("brokerId");
        String topic = call.getString("topic");
        if (brokerId == null || topic == null) {
            call.reject("Missing brokerId or topic");
            return;
        }
        mqttService.subscribe(brokerId, topic);
        call.resolve();
    }

    @PluginMethod
    public void unsubscribe(PluginCall call) {
        if (mqttService == null) {
            call.reject("Service not running");
            return;
        }
        String brokerId = call.getString("brokerId");
        String topic = call.getString("topic");
        if (brokerId == null || topic == null) {
            call.reject("Missing brokerId or topic");
            return;
        }
        mqttService.unsubscribe(brokerId, topic);
        call.resolve();
    }

    @PluginMethod
    public void publish(PluginCall call) {
        if (mqttService == null) {
            call.reject("Service not running");
            return;
        }
        String brokerId = call.getString("brokerId");
        String topic = call.getString("topic");
        String message = call.getString("message", "");
        if (brokerId == null || topic == null) {
            call.reject("Missing brokerId or topic");
            return;
        }
        mqttService.publish(brokerId, topic, message);
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        if (mqttService == null) {
            JSObject result = new JSObject();
            result.put("running", false);
            call.resolve(result);
            return;
        }
        try {
            JSONObject status = mqttService.getStatus();
            JSObject result = new JSObject(status.toString());
            result.put("running", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void drainBuffer(PluginCall call) {
        if (mqttService == null) {
            JSObject result = new JSObject();
            result.put("messages", new JSArray());
            call.resolve(result);
            return;
        }
        List<JSONObject> buffered = mqttService.drainMessageBuffer();
        JSArray arr = new JSArray();
        for (JSONObject msg : buffered) {
            arr.put(msg);
        }
        JSObject result = new JSObject();
        result.put("messages", arr);
        call.resolve(result);
    }

    @PluginMethod
    public void drainAlerts(PluginCall call) {
        if (mqttService == null) {
            JSObject result = new JSObject();
            result.put("alerts", new JSArray());
            call.resolve(result);
            return;
        }
        List<JSONObject> buffered = mqttService.drainAlertBuffer();
        JSArray arr = new JSArray();
        for (JSONObject msg : buffered) {
            arr.put(msg);
        }
        JSObject result = new JSObject();
        result.put("alerts", arr);
        call.resolve(result);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            Context context = getContext();
            android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
            String packageName = context.getPackageName();

            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(android.net.Uri.parse("package:" + packageName));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                Log.i(TAG, "Opened battery optimization settings for " + packageName);
                call.resolve();
            } else {
                Log.i(TAG, "Already ignoring battery optimizations.");
                JSObject result = new JSObject();
                result.put("alreadyIgnoring", true);
                call.resolve(result);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization exemption", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkBatteryOptimization(PluginCall call) {
        try {
            Context context = getContext();
            android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
            String packageName = context.getPackageName();
            boolean isIgnoring = (pm != null && pm.isIgnoringBatteryOptimizations(packageName));

            JSObject result = new JSObject();
            result.put("isIgnoring", isIgnoring);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking battery optimization", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (isBound) {
            try {
                getContext().unbindService(serviceConnection);
            } catch (Exception e) {
                Log.w(TAG, "Error unbinding service on destroy", e);
            }
            isBound = false;
        }
    }
}
