package com.edwic.dashboard;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.eclipse.paho.client.mqttv3.IMqttActionListener;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.IMqttToken;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MqttBackgroundService extends Service {

    private static final String TAG = "MqttBgService";
    private static final String CHANNEL_ID = "mqtt_background_channel";
    private static final int NOTIFICATION_ID = 9999;

    private final IBinder binder = new LocalBinder();
    private final Map<String, MqttAsyncClient> clients = new ConcurrentHashMap<>();
    private final Map<String, JSONObject> clientConfigs = new ConcurrentHashMap<>();
    private final Map<String, String> clientStatuses = new ConcurrentHashMap<>();
    private final Map<String, List<String>> clientSubscriptions = new ConcurrentHashMap<>();

    // Message buffer for when WebView is sleeping
    private final List<JSONObject> messageBuffer = new ArrayList<>();
    private static final int MAX_BUFFER_SIZE = 500;

    private PowerManager.WakeLock wakeLock;
    private Handler uptimeHandler;
    private int uptimeSeconds = 0;
    private boolean isRunning = false;

    // Callback interface for communicating with the Plugin
    public interface MqttEventListener {
        void onMessage(String brokerId, String topic, String payload);
        void onBrokerStatusChanged(String brokerId, String status);
    }

    private MqttEventListener eventListener;

    public void setEventListener(MqttEventListener listener) {
        this.eventListener = listener;
    }

    public class LocalBinder extends Binder {
        public MqttBackgroundService getService() {
            return MqttBackgroundService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Log.i(TAG, "Service created.");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!isRunning) {
            startForegroundNotification();
            acquireWakeLock();
            startUptimeTimer();
            isRunning = true;
            Log.i(TAG, "Service started in foreground.");
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        if (uptimeHandler != null) {
            uptimeHandler.removeCallbacksAndMessages(null);
        }
        disconnectAll();
        releaseWakeLock();
        Log.i(TAG, "Service destroyed.");
    }

    // ---- PUBLIC API (called from NativeMqttPlugin) ----

    public void configureBrokers(JSONArray brokersJson) {
        Log.i(TAG, "Configuring " + brokersJson.length() + " broker(s)...");

        // Determine which brokers to remove
        List<String> existingIds = new ArrayList<>(clients.keySet());
        List<String> newIds = new ArrayList<>();

        for (int i = 0; i < brokersJson.length(); i++) {
            try {
                JSONObject broker = brokersJson.getJSONObject(i);
                String id = broker.getString("id");
                newIds.add(id);
            } catch (JSONException e) {
                Log.e(TAG, "Error parsing broker config at index " + i, e);
            }
        }

        // Remove old brokers that aren't in new config
        for (String existingId : existingIds) {
            if (!newIds.contains(existingId)) {
                disconnectBroker(existingId);
            }
        }

        // Add or update brokers
        for (int i = 0; i < brokersJson.length(); i++) {
            try {
                JSONObject broker = brokersJson.getJSONObject(i);
                String id = broker.getString("id");

                JSONObject existingConfig = clientConfigs.get(id);
                if (existingConfig != null && configsEqual(existingConfig, broker)) {
                    Log.d(TAG, "Broker " + id + " config unchanged, skipping.");
                    continue;
                }

                // Disconnect old one if exists
                if (clients.containsKey(id)) {
                    disconnectBroker(id);
                }

                connectBroker(broker);
            } catch (JSONException e) {
                Log.e(TAG, "Error configuring broker at index " + i, e);
            }
        }
    }

    public void subscribe(String brokerId, String topic) {
        MqttAsyncClient client = clients.get(brokerId);
        if (client != null && client.isConnected()) {
            try {
                client.subscribe(topic, 0);
                List<String> subs = clientSubscriptions.computeIfAbsent(brokerId, k -> new ArrayList<>());
                if (!subs.contains(topic)) {
                    subs.add(topic);
                }
                Log.d(TAG, "Subscribed to " + topic + " on broker " + brokerId);
            } catch (MqttException e) {
                Log.e(TAG, "Error subscribing to " + topic, e);
            }
        } else {
            // Buffer subscriptions — they'll be applied on connect
            List<String> subs = clientSubscriptions.computeIfAbsent(brokerId, k -> new ArrayList<>());
            if (!subs.contains(topic)) {
                subs.add(topic);
            }
            Log.d(TAG, "Buffered subscription for " + topic + " on broker " + brokerId);
        }
    }

    public void unsubscribe(String brokerId, String topic) {
        MqttAsyncClient client = clients.get(brokerId);
        if (client != null && client.isConnected()) {
            try {
                client.unsubscribe(topic);
                Log.d(TAG, "Unsubscribed from " + topic + " on broker " + brokerId);
            } catch (MqttException e) {
                Log.e(TAG, "Error unsubscribing from " + topic, e);
            }
        }
        List<String> subs = clientSubscriptions.get(brokerId);
        if (subs != null) {
            subs.remove(topic);
        }
    }

    public void publish(String brokerId, String topic, String message) {
        MqttAsyncClient client = clients.get(brokerId);
        if (client != null && client.isConnected()) {
            try {
                MqttMessage msg = new MqttMessage(message.getBytes());
                msg.setQos(0);
                client.publish(topic, msg);
                Log.d(TAG, "Published to " + topic + " on broker " + brokerId);
            } catch (MqttException e) {
                Log.e(TAG, "Error publishing to " + topic, e);
            }
        } else {
            Log.w(TAG, "Broker " + brokerId + " not connected, cannot publish.");
        }
    }

    public JSONObject getStatus() {
        JSONObject status = new JSONObject();
        try {
            status.put("uptime", uptimeSeconds);
            JSONObject brokers = new JSONObject();
            for (Map.Entry<String, String> entry : clientStatuses.entrySet()) {
                brokers.put(entry.getKey(), entry.getValue());
            }
            status.put("brokers", brokers);
        } catch (JSONException e) {
            Log.e(TAG, "Error building status", e);
        }
        return status;
    }

    public List<JSONObject> drainMessageBuffer() {
        synchronized (messageBuffer) {
            List<JSONObject> copy = new ArrayList<>(messageBuffer);
            messageBuffer.clear();
            return copy;
        }
    }

    // ---- PRIVATE MQTT LOGIC ----

    private void connectBroker(JSONObject brokerConfig) {
        try {
            String id = brokerConfig.getString("id");
            String host = brokerConfig.getString("host");
            int port = brokerConfig.optInt("port", 1883);
            boolean secure = brokerConfig.optBoolean("secure", false);
            String username = brokerConfig.optString("username", "");
            String password = brokerConfig.optString("password", "");
            String basepath = brokerConfig.optString("basepath", "");
            String name = brokerConfig.optString("name", host);

            // Build server URI — use tcp:// for native MQTT (more reliable than ws://)
            String protocol = secure ? "ssl" : "tcp";
            String serverUri = protocol + "://" + host + ":" + port;

            String clientId = "edwic-native-" + id.substring(0, Math.min(8, id.length()));

            Log.i(TAG, "Connecting broker " + id + " (" + name + ") to " + serverUri);

            MqttAsyncClient client = new MqttAsyncClient(serverUri, clientId, new MemoryPersistence());

            MqttConnectOptions options = new MqttConnectOptions();
            options.setCleanSession(true);
            options.setAutomaticReconnect(true);
            options.setConnectionTimeout(10);
            options.setKeepAliveInterval(15);

            if (!username.isEmpty()) {
                options.setUserName(username);
            }
            if (!password.isEmpty()) {
                options.setPassword(password.toCharArray());
            }

            client.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    Log.w(TAG, "Broker " + id + " connection lost: " +
                            (cause != null ? cause.getMessage() : "unknown"));
                    updateBrokerStatus(id, "disconnected");
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    String payload = new String(message.getPayload());
                    Log.d(TAG, "Message on " + id + " topic=" + topic + " len=" + payload.length());

                    // Try to notify JS immediately
                    if (eventListener != null) {
                        eventListener.onMessage(id, topic, payload);
                    }

                    // Also buffer for when WebView wakes up
                    synchronized (messageBuffer) {
                        try {
                            JSONObject msg = new JSONObject();
                            msg.put("brokerId", id);
                            msg.put("topic", topic);
                            msg.put("payload", payload);
                            msg.put("timestamp", System.currentTimeMillis());
                            messageBuffer.add(msg);
                            while (messageBuffer.size() > MAX_BUFFER_SIZE) {
                                messageBuffer.remove(0);
                            }
                        } catch (JSONException e) {
                            Log.e(TAG, "Error buffering message", e);
                        }
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                    // Not needed for subscribers
                }
            });

            clients.put(id, client);
            clientConfigs.put(id, brokerConfig);
            updateBrokerStatus(id, "connecting");

            client.connect(options, null, new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                    Log.i(TAG, "Broker " + id + " connected successfully!");
                    updateBrokerStatus(id, "connected");

                    // Re-subscribe to all buffered topics
                    List<String> subs = clientSubscriptions.get(id);
                    if (subs != null) {
                        for (String topic : subs) {
                            try {
                                client.subscribe(topic, 0);
                                Log.d(TAG, "Re-subscribed to " + topic + " on " + id);
                            } catch (MqttException e) {
                                Log.e(TAG, "Error re-subscribing to " + topic, e);
                            }
                        }
                    }
                }

                @Override
                public void onFailure(IMqttToken asyncActionToken, Throwable exception) {
                    Log.e(TAG, "Broker " + id + " connection failed: " +
                            (exception != null ? exception.getMessage() : "unknown"));
                    updateBrokerStatus(id, "error");
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "Error setting up broker connection", e);
        }
    }

    private void disconnectBroker(String brokerId) {
        MqttAsyncClient client = clients.remove(brokerId);
        clientConfigs.remove(brokerId);
        clientStatuses.remove(brokerId);
        if (client != null) {
            try {
                if (client.isConnected()) {
                    client.disconnect();
                }
                client.close();
            } catch (MqttException e) {
                Log.e(TAG, "Error disconnecting broker " + brokerId, e);
            }
        }
        Log.i(TAG, "Broker " + brokerId + " disconnected and removed.");
        if (eventListener != null) {
            eventListener.onBrokerStatusChanged(brokerId, "removed");
        }
    }

    private void disconnectAll() {
        for (String id : new ArrayList<>(clients.keySet())) {
            disconnectBroker(id);
        }
    }

    private void updateBrokerStatus(String brokerId, String status) {
        clientStatuses.put(brokerId, status);
        updateNotification();
        if (eventListener != null) {
            eventListener.onBrokerStatusChanged(brokerId, status);
        }
    }

    private boolean configsEqual(JSONObject a, JSONObject b) {
        try {
            return a.optString("host").equals(b.optString("host")) &&
                    a.optInt("port") == b.optInt("port") &&
                    a.optBoolean("secure") == b.optBoolean("secure") &&
                    a.optString("username").equals(b.optString("username")) &&
                    a.optString("password").equals(b.optString("password"));
        } catch (Exception e) {
            return false;
        }
    }

    // ---- NOTIFICATION ----

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "MQTT Background Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps MQTT connections alive in background");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundNotification() {
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);
    }

    private void updateNotification() {
        if (!isRunning) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0,
                notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        // Build status text
        StringBuilder statusText = new StringBuilder();
        statusText.append(formatUptime(uptimeSeconds));

        int connectedCount = 0;
        int totalCount = clientStatuses.size();
        for (String status : clientStatuses.values()) {
            if ("connected".equals(status)) connectedCount++;
        }

        if (totalCount > 0) {
            statusText.append(" | Брокери: ").append(connectedCount).append("/").append(totalCount).append(" ✓");
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("EdwIC працює у фоні")
                .setContentText(statusText.toString())
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .build();
    }

    private String formatUptime(int totalSeconds) {
        int hours = totalSeconds / 3600;
        int minutes = (totalSeconds % 3600) / 60;
        int seconds = totalSeconds % 60;
        if (hours > 0) {
            return String.format("⏱ %d год %02d хв", hours, minutes);
        } else if (minutes > 0) {
            return String.format("⏱ %d хв %02d с", minutes, seconds);
        } else {
            return String.format("⏱ %d с", seconds);
        }
    }

    // ---- WAKELOCK ----

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,
                    "EdwIC::MqttBackgroundService");
            wakeLock.acquire();
            Log.i(TAG, "Wakelock acquired.");
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
            Log.i(TAG, "Wakelock released.");
        }
    }

    // ---- UPTIME TIMER ----

    private void startUptimeTimer() {
        uptimeHandler = new Handler(Looper.getMainLooper());
        uptimeHandler.post(new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    uptimeSeconds++;
                    if (uptimeSeconds % 5 == 0) { // Update notification every 5 seconds
                        updateNotification();
                    }
                    uptimeHandler.postDelayed(this, 1000);
                }
            }
        });
    }
}
