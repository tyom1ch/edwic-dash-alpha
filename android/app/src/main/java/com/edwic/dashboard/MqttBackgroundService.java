package com.edwic.dashboard;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.eclipse.paho.client.mqttv3.IMqttActionListener;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.IMqttToken;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class MqttBackgroundService extends Service {

    private static final String TAG = "MqttBgService";
    private static final String CHANNEL_ID = "mqtt_background_channel";
    private static final String ALERT_CHANNEL_ID = "mqtt_alert_channel";
    private static final int NOTIFICATION_ID = 9999;
    private static final int MAX_PAYLOAD_BYTES = 64 * 1024;
    private static final long RECONNECT_MIN_MS = 2000;
    private static final long RECONNECT_MAX_MS = 30_000;
    private static final long FLUSH_DELAY_MS = 50;
    private static final long FAST_FLUSH_MS = 16;
    private static final int MAX_PENDING = 2000;
    private static final int MAX_TRACKED = 4000;
    private static final int EXACT_MARK = 512;
    private static final long STATUS_TICK_MS = 60_000;
    private static final long MIN_ALERT_INTERVAL_MS = 5_000;

    public interface MqttEventListener {
        void onMessage(String brokerId, String topic, String payload);
        void onBrokerStatusChanged(String brokerId, String status);
    }

    public class LocalBinder extends Binder {
        public MqttBackgroundService getService() {
            return MqttBackgroundService.this;
        }
    }

    private final IBinder binder = new LocalBinder();
    private final Map<String, MqttAsyncClient> clients = new ConcurrentHashMap<>();
    private final Map<String, JSONObject> clientConfigs = new ConcurrentHashMap<>();
    private final Map<String, MqttConnectOptions> clientOptions = new ConcurrentHashMap<>();
    private final Map<String, Boolean> connecting = new ConcurrentHashMap<>();
    private final Map<String, Long> retryDelay = new ConcurrentHashMap<>();
    private final Map<String, Runnable> retryTasks = new ConcurrentHashMap<>();
    private final Object retryLock = new Object();
    private final Map<String, String> clientStatuses = new ConcurrentHashMap<>();
    private final Map<String, CopyOnWriteArrayList<String>> clientSubscriptions = new ConcurrentHashMap<>();
    private final List<JSONObject> alertRules = new ArrayList<>();
    private final Map<String, Long> alertLastFired = new ConcurrentHashMap<>();
    private final Map<String, JSONObject> pending = new ConcurrentHashMap<>();
    private final Map<String, String> lastPayload = new ConcurrentHashMap<>();

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable flushRunnable = this::flushPending;
    private final Runnable statusRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isRunning) return;
            updateNotification();
            mainHandler.postDelayed(this, STATUS_TICK_MS);
        }
    };

    private MqttEventListener eventListener;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean uiActive = false;
    private boolean flushQueued = false;
    private boolean isRunning = false;
    private long startedAtElapsed = 0;
    private long lastNetworkHurry = 0;

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
        watchNetwork();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!isRunning) {
            startedAtElapsed = SystemClock.elapsedRealtime();
            startForegroundNotification();
            mainHandler.postDelayed(statusRunnable, STATUS_TICK_MS);
            isRunning = true;
        }
        return START_STICKY;
    }

    @Override
    public void onTimeout(int startId) {
        isRunning = false;
        mainHandler.removeCallbacksAndMessages(null);
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        unwatchNetwork();
        mainHandler.removeCallbacksAndMessages(null);
        disconnectAll();
        super.onDestroy();
    }

    public void setEventListener(MqttEventListener listener) {
        this.eventListener = listener;
    }

    public void setUiActive(boolean active) {
        uiActive = active;
        if (!active) return;
        hurryAll();
        mainHandler.removeCallbacks(flushRunnable);
        flushQueued = false;
        mainHandler.post(flushRunnable);
    }

    private void watchNetwork() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (manager == null || networkCallback != null) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                long now = SystemClock.elapsedRealtime();
                if (now - lastNetworkHurry < RECONNECT_MIN_MS) return;
                lastNetworkHurry = now;
                mainHandler.post(() -> hurryAll());
            }
        };
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                manager.registerDefaultNetworkCallback(networkCallback);
            } else {
                NetworkRequest request = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                manager.registerNetworkCallback(request, networkCallback);
            }
        } catch (RuntimeException e) {
            Log.w(TAG, "network watch: " + e.getMessage());
            networkCallback = null;
        }
    }

    private void unwatchNetwork() {
        if (networkCallback == null) return;
        ConnectivityManager manager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        try {
            if (manager != null) manager.unregisterNetworkCallback(networkCallback);
        } catch (RuntimeException e) {
            Log.w(TAG, "network unwatch: " + e.getMessage());
        }
        networkCallback = null;
    }

    private void hurryAll() {
        List<String> due = new ArrayList<>();
        synchronized (retryLock) {
            for (String id : clients.keySet()) {
                MqttAsyncClient client = clients.get(id);
                if (client == null || client.isConnected() || connecting.containsKey(id)) continue;
                retryDelay.put(id, RECONNECT_MIN_MS);
                Runnable pendingRetry = retryTasks.remove(id);
                if (pendingRetry != null) mainHandler.removeCallbacks(pendingRetry);
                due.add(id);
            }
        }
        for (String id : due) connectNow(id);
    }

    private void scheduleRetry(String id) {
        synchronized (retryLock) {
            if (!isRunning || !clients.containsKey(id) || retryTasks.containsKey(id)) return;
            long delay = retryDelay.getOrDefault(id, RECONNECT_MIN_MS);
            Runnable task = () -> {
                synchronized (retryLock) {
                    retryTasks.remove(id);
                }
                connectNow(id);
            };
            retryTasks.put(id, task);
            mainHandler.postDelayed(task, delay);
            retryDelay.put(id, Math.min(RECONNECT_MAX_MS, Math.round(delay * 1.5)));
        }
    }

    private void cancelRetry(String id) {
        synchronized (retryLock) {
            Runnable pendingRetry = retryTasks.remove(id);
            if (pendingRetry != null) mainHandler.removeCallbacks(pendingRetry);
            retryDelay.remove(id);
        }
    }

    private void connectNow(String id) {
        MqttAsyncClient client = clients.get(id);
        MqttConnectOptions options = clientOptions.get(id);
        if (client == null || options == null || client.isConnected() || connecting.containsKey(id)) return;
        connecting.put(id, Boolean.TRUE);
        String status = clientStatuses.get(id);
        if (status == null) updateBrokerStatus(id, "connecting");
        try {
            client.connect(options, null, new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                    connecting.remove(id);
                    retryDelay.put(id, RECONNECT_MIN_MS);
                }

                @Override
                public void onFailure(IMqttToken asyncActionToken, Throwable exception) {
                    connecting.remove(id);
                    Log.w(TAG, "broker " + id + " failed: " +
                            (exception != null ? exception.getMessage() : "unknown"));
                    updateBrokerStatus(id, "error");
                    scheduleRetry(id);
                }
            });
        } catch (MqttException e) {
            connecting.remove(id);
            if (e.getReasonCode() == MqttException.REASON_CODE_CONNECT_IN_PROGRESS || client.isConnected()) return;
            Log.w(TAG, "broker " + id + " connect: " + e.getMessage());
            updateBrokerStatus(id, "error");
            scheduleRetry(id);
        }
    }

    public void configureBrokers(JSONArray brokersJson) {
        List<String> alive = new ArrayList<>();
        for (int i = 0; i < brokersJson.length(); i++) {
            JSONObject broker = brokersJson.optJSONObject(i);
            if (broker == null) continue;
            String id = broker.optString("id", "");
            if (id.isEmpty()) continue;
            alive.add(id);
        }

        for (String existingId : new ArrayList<>(clients.keySet())) {
            if (!alive.contains(existingId)) {
                removeBroker(existingId);
            }
        }

        for (int i = 0; i < brokersJson.length(); i++) {
            JSONObject broker = brokersJson.optJSONObject(i);
            if (broker == null) continue;
            String id = broker.optString("id", "");
            if (id.isEmpty()) continue;

            JSONObject previous = clientConfigs.get(id);
            if (previous != null && configsEqual(previous, broker)) {
                String status = clientStatuses.getOrDefault(id, "disconnected");
                if (eventListener != null) {
                    eventListener.onBrokerStatusChanged(id, status);
                }
                continue;
            }

            if (clients.containsKey(id)) {
                closeClient(id);
            }
            connectBroker(broker);
        }
    }

    public void configureAlerts(JSONArray alertsJson) {
        synchronized (alertRules) {
            alertRules.clear();
            for (int i = 0; i < alertsJson.length(); i++) {
                JSONObject alert = alertsJson.optJSONObject(i);
                if (alert != null && alert.optBoolean("enabled", true)) {
                    alertRules.add(alert);
                }
            }
        }
    }

    public void subscribe(String brokerId, String topic) {
        if (brokerId == null || topic == null || topic.isEmpty()) return;
        CopyOnWriteArrayList<String> subs = clientSubscriptions.computeIfAbsent(
                brokerId, key -> new CopyOnWriteArrayList<>());
        if (!subs.contains(topic)) {
            subs.add(topic);
        }
        MqttAsyncClient client = clients.get(brokerId);
        if (client == null || !client.isConnected()) return;
        try {
            client.subscribe(topic, 0);
        } catch (MqttException e) {
            Log.w(TAG, "subscribe " + topic + ": " + e.getMessage());
        }
    }

    public void unsubscribe(String brokerId, String topic) {
        CopyOnWriteArrayList<String> subs = clientSubscriptions.get(brokerId);
        if (subs != null) subs.remove(topic);
        MqttAsyncClient client = clients.get(brokerId);
        if (client == null || !client.isConnected()) return;
        try {
            client.unsubscribe(topic);
        } catch (MqttException e) {
            Log.w(TAG, "unsubscribe " + topic + ": " + e.getMessage());
        }
    }

    public void publish(String brokerId, String topic, String message) {
        MqttAsyncClient client = clients.get(brokerId);
        if (client == null || !client.isConnected() || message == null) return;
        try {
            MqttMessage mqttMessage = new MqttMessage(message.getBytes(StandardCharsets.UTF_8));
            mqttMessage.setQos(0);
            client.publish(topic, mqttMessage);
        } catch (MqttException e) {
            Log.w(TAG, "publish " + topic + ": " + e.getMessage());
        }
    }

    public JSONObject getStatus() {
        JSONObject status = new JSONObject();
        JSONObject brokers = new JSONObject();
        try {
            status.put("uptime", uptimeSeconds());
            for (Map.Entry<String, String> entry : clientStatuses.entrySet()) {
                brokers.put(entry.getKey(), entry.getValue());
            }
            status.put("brokers", brokers);
        } catch (JSONException e) {
            Log.w(TAG, "status: " + e.getMessage());
        }
        return status;
    }

    public List<JSONObject> drainMessageBuffer() {
        List<JSONObject> copy = new ArrayList<>();
        for (String key : new ArrayList<>(pending.keySet())) {
            JSONObject msg = pending.remove(key);
            if (msg != null) copy.add(msg);
        }
        return copy;
    }

    private void connectBroker(JSONObject brokerConfig) {
        String id = brokerConfig.optString("id", "");
        String host = brokerConfig.optString("host", "");
        if (id.isEmpty() || host.isEmpty()) return;

        int port = brokerConfig.optInt("port", 1883);
        boolean secure = brokerConfig.optBoolean("secure", false);
        String username = brokerConfig.optString("username", "");
        String password = brokerConfig.optString("password", "");
        String basepath = brokerConfig.optString("basepath", "");
        String serverUri = serverUri(host, port, secure, basepath);

        try {
            MqttAsyncClient client = new MqttAsyncClient(
                    serverUri, clientIdFor(id), new MemoryPersistence());
            MqttConnectOptions options = new MqttConnectOptions();
            options.setCleanSession(true);
            // Paho keeps one reconnect delay for the whole process and does not
            // retry a connect that never succeeded. The service schedules that itself.
            options.setAutomaticReconnect(false);
            options.setConnectionTimeout(10);
            options.setKeepAliveInterval(30);
            if (!username.isEmpty()) options.setUserName(username);
            if (!password.isEmpty()) options.setPassword(password.toCharArray());

            client.setCallback(new MqttCallbackExtended() {
                @Override
                public void connectComplete(boolean reconnect, String uri) {
                    retryDelay.put(id, RECONNECT_MIN_MS);
                    synchronized (retryLock) {
                        Runnable pendingRetry = retryTasks.remove(id);
                        if (pendingRetry != null) mainHandler.removeCallbacks(pendingRetry);
                    }
                    updateBrokerStatus(id, "connected");
                    resubscribe(id, client);
                }

                @Override
                public void connectionLost(Throwable cause) {
                    updateBrokerStatus(id, "disconnected");
                    scheduleRetry(id);
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    byte[] raw = message.getPayload();
                    if (raw == null || raw.length > MAX_PAYLOAD_BYTES) return;
                    String payload = raw.length == 0 ? "" : new String(raw, StandardCharsets.UTF_8);
                    evaluateAlerts(id, topic, payload);
                    queueForJs(id, topic, payload);
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                }
            });

            clients.put(id, client);
            clientConfigs.put(id, brokerConfig);
            clientOptions.put(id, options);
            retryDelay.put(id, RECONNECT_MIN_MS);
            connectNow(id);
        } catch (Exception e) {
            Log.w(TAG, "broker " + id + " setup: " + e.getMessage());
            updateBrokerStatus(id, "error");
        }
    }

    private void resubscribe(String brokerId, MqttAsyncClient client) {
        CopyOnWriteArrayList<String> subs = clientSubscriptions.get(brokerId);
        if (subs == null) return;
        for (String topic : subs) {
            try {
                client.subscribe(topic, 0);
            } catch (MqttException e) {
                Log.w(TAG, "resubscribe " + topic + ": " + e.getMessage());
            }
        }
    }

    private static String seenMark(String payload) {
        if (payload.length() <= EXACT_MARK) return payload;
        int hash = payload.length();
        int step = Math.max(1, payload.length() / 32);
        for (int i = 0; i < payload.length(); i += step) {
            hash = (hash * 33) + payload.charAt(i);
        }
        return hash + ":" + payload.substring(0, 24) + ":" + payload.substring(payload.length() - 24);
    }

    private static String evictOne(Map<String, ?> map, String keep, int max) {
        if (map.size() <= max) return null;
        for (String extra : map.keySet()) {
            if (!extra.equals(keep)) {
                map.remove(extra);
                return extra;
            }
        }
        return null;
    }

    private void dropTracked(String brokerId) {
        String prefix = brokerId + "\0";
        for (String key : new ArrayList<>(pending.keySet())) {
            if (key.startsWith(prefix)) pending.remove(key);
        }
        for (String key : new ArrayList<>(lastPayload.keySet())) {
            if (key.startsWith(prefix)) lastPayload.remove(key);
        }
    }

    private void queueForJs(String brokerId, String topic, String payload) {
        String key = brokerId + "\0" + topic;
        String mark = seenMark(payload);
        if (mark.equals(lastPayload.get(key))) return;
        JSONObject msg = new JSONObject();
        try {
            msg.put("brokerId", brokerId);
            msg.put("topic", topic);
            msg.put("payload", payload);
            msg.put("timestamp", System.currentTimeMillis());
        } catch (JSONException e) {
            return;
        }
        lastPayload.put(key, mark);
        evictOne(lastPayload, key, MAX_TRACKED);
        pending.put(key, msg);
        String dropped = evictOne(pending, key, MAX_PENDING);
        if (dropped != null) lastPayload.remove(dropped);
        if (!uiActive || flushQueued) return;
        flushQueued = true;
        long delay = pending.size() > 4 ? FLUSH_DELAY_MS : FAST_FLUSH_MS;
        mainHandler.postDelayed(flushRunnable, delay);
    }

    private void flushPending() {
        flushQueued = false;
        MqttEventListener listener = eventListener;
        if (!uiActive || listener == null) return;
        int sent = 0;
        for (String key : new ArrayList<>(pending.keySet())) {
            if (sent >= 40) break;
            JSONObject msg = pending.remove(key);
            if (msg == null) continue;
            listener.onMessage(
                    msg.optString("brokerId"),
                    msg.optString("topic"),
                    msg.optString("payload"));
            sent++;
        }
        if (!pending.isEmpty()) {
            flushQueued = true;
            mainHandler.postDelayed(flushRunnable, FLUSH_DELAY_MS);
        }
    }

    private void closeClient(String brokerId) {
        cancelRetry(brokerId);
        connecting.remove(brokerId);
        MqttAsyncClient client = clients.remove(brokerId);
        clientConfigs.remove(brokerId);
        clientOptions.remove(brokerId);
        clientStatuses.remove(brokerId);
        if (client == null) return;
        try {
            client.disconnectForcibly(0, 200);
        } catch (MqttException e) {
            Log.w(TAG, "disconnect " + brokerId + ": " + e.getMessage());
        }
        try {
            client.close(true);
        } catch (MqttException e) {
            Log.w(TAG, "close " + brokerId + ": " + e.getMessage());
        }
    }

    private void removeBroker(String brokerId) {
        closeClient(brokerId);
        clientSubscriptions.remove(brokerId);
        dropTracked(brokerId);
        if (eventListener != null) {
            eventListener.onBrokerStatusChanged(brokerId, "removed");
        }
    }

    private void disconnectAll() {
        for (String id : new ArrayList<>(clients.keySet())) {
            removeBroker(id);
        }
    }

    private void updateBrokerStatus(String brokerId, String status) {
        clientStatuses.put(brokerId, status);
        if (eventListener != null) {
            eventListener.onBrokerStatusChanged(brokerId, status);
        }
    }

    private void evaluateAlerts(String brokerId, String topic, String payload) {
        List<JSONObject> rules;
        synchronized (alertRules) {
            if (alertRules.isEmpty()) return;
            rules = new ArrayList<>(alertRules);
        }
        for (JSONObject alert : rules) {
            if (!brokerId.equals(alert.optString("brokerId")) || !topic.equals(alert.optString("topic"))) {
                continue;
            }
            if (!alertMatches(alert, payload)) continue;
            fireAlert(alert, payload);
        }
    }

    private boolean alertMatches(JSONObject alert, String payload) {
        String condition = alert.optString("condition", "");
        String threshold = alert.optString("threshold", "");
        Double value = parseNumber(payload);
        Double limit = parseNumber(threshold);
        boolean numeric = value != null && limit != null;
        switch (condition) {
            case ">":
                return numeric ? value > limit : payload.compareTo(threshold) > 0;
            case "<":
                return numeric ? value < limit : payload.compareTo(threshold) < 0;
            case "==":
                return numeric ? value.doubleValue() == limit.doubleValue() : payload.equals(threshold);
            case "!=":
                return numeric ? value.doubleValue() != limit.doubleValue() : !payload.equals(threshold);
            default:
                return false;
        }
    }

    private void fireAlert(JSONObject alert, String value) {
        String alertId = alert.optString("id", alert.optString("topic", "alert"));
        long now = System.currentTimeMillis();
        long intervalMs = Math.max(MIN_ALERT_INTERVAL_MS, alert.optLong("intervalMs", 5 * 60 * 1000));
        Long lastFired = alertLastFired.get(alertId);
        if (lastFired != null && now - lastFired < intervalMs) return;
        alertLastFired.put(alertId, now);

        String name = alert.optString("name", "Алерт");
        String topic = alert.optString("topic", "");
        String template = alert.optString("messageTemplate", "");
        String body = template.isEmpty()
                ? name + " (" + value + ")"
                : template.replace("{value}", value).replace("{topic}", topic);
        body = clip(body, 180);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        int notificationId = 10_000 + (alertId.hashCode() & 0x7fff);
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, notificationId, intent, PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setContentTitle(name)
                .setContentText(body)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build();
        manager.notify(notificationId, notification);
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel background = new NotificationChannel(
                CHANNEL_ID, "MQTT Background Service", NotificationManager.IMPORTANCE_LOW);
        background.setDescription("Keeps MQTT connections alive in background");
        background.setShowBadge(false);
        manager.createNotificationChannel(background);

        NotificationChannel alerts = new NotificationChannel(
                ALERT_CHANNEL_ID, "MQTT Алерти", NotificationManager.IMPORTANCE_HIGH);
        alerts.setDescription("Сповіщення про спрацювання правил моніторингу");
        alerts.enableVibration(true);
        alerts.setShowBadge(true);
        manager.createNotificationChannel(alerts);
    }

    private void startForegroundNotification() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void updateNotification() {
        if (!isRunning) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    private Notification buildNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        int connected = 0;
        for (String status : clientStatuses.values()) {
            if ("connected".equals(status)) connected++;
        }
        String text = formatUptime(uptimeSeconds());
        if (!clientStatuses.isEmpty()) {
            text += " | Брокери: " + connected + "/" + clientStatuses.size() + " ✓";
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("EdwIC працює у фоні")
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .build();
    }

    private int uptimeSeconds() {
        if (startedAtElapsed == 0) return 0;
        return (int) ((SystemClock.elapsedRealtime() - startedAtElapsed) / 1000);
    }

    private static String formatUptime(int totalSeconds) {
        int hours = totalSeconds / 3600;
        int minutes = (totalSeconds % 3600) / 60;
        int seconds = totalSeconds % 60;
        if (hours > 0) return String.format("⏱ %d год %02d хв", hours, minutes);
        if (minutes > 0) return String.format("⏱ %d хв %02d с", minutes, seconds);
        return String.format("⏱ %d с", seconds);
    }

    private static boolean websocketPort(int port) {
        switch (port) {
            case 8000:
            case 8080:
            case 8081:
            case 8083:
            case 8084:
            case 8090:
            case 8091:
            case 9001:
                return true;
            default:
                return false;
        }
    }

    private static String websocketPath(String basepath) {
        if (basepath == null || basepath.isEmpty() || "/".equals(basepath)) return "/";
        String path = basepath.startsWith("/") ? basepath : "/" + basepath;
        if (path.length() > 1 && path.endsWith("/")) path = path.substring(0, path.length() - 1);
        return path;
    }

    private static String serverUri(String host, int port, boolean secure, String basepath) {
        boolean websocket = websocketPort(port) || (basepath != null && !basepath.isEmpty());
        if (websocket) {
            return (secure ? "wss" : "ws") + "://" + host + ":" + port + websocketPath(basepath);
        }
        return (secure ? "ssl" : "tcp") + "://" + host + ":" + port;
    }

    private static String clientIdFor(String brokerId) {
        return "edwic-" + Integer.toHexString(brokerId.hashCode());
    }

    private static boolean configsEqual(JSONObject a, JSONObject b) {
        return a.optString("host").equals(b.optString("host"))
                && a.optInt("port") == b.optInt("port")
                && a.optBoolean("secure") == b.optBoolean("secure")
                && a.optString("username").equals(b.optString("username"))
                && a.optString("password").equals(b.optString("password"))
                && a.optString("basepath").equals(b.optString("basepath"));
    }

    private static Double parseNumber(String raw) {
        if (raw == null || raw.isEmpty()) return null;
        try {
            double value = Double.parseDouble(raw);
            return Double.isFinite(value) ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String clip(String value, int max) {
        if (value == null) return "";
        if (value.length() <= max) return value;
        return value.substring(0, max) + "…";
    }
}
