import { useState, useEffect, useCallback, useMemo } from "react";
import useLocalStorage from "./useLocalStorage";
import eventBus from "../core/EventBus";
import connectionManager from "../core/ConnectionManager"; // Імпортуємо для отримання статусу
import deviceRegistry from "../core/DeviceRegistry"; // Імпортуємо для синхронізації логіки

// Початкова конфігурація, яка буде використана, якщо в localStorage нічого немає
const initialConfig = {
  brokers: [],
  dashboards: {
    // Створюємо один дашборд за замовчуванням для нових користувачів
    "dashboard-1": {
      title: "Головний",
      components: [],
    },
  },
};

const useAppConfig = () => {
  const [storedConfig, setStoredConfig] = useLocalStorage(
    "appConfig",
    initialConfig
  );
  const [appConfig, setAppConfigState] = useState(storedConfig);

  // --- Стан для зберігання статусів брокерів, які ми отримуємо з ConnectionManager ---
  const [brokerStatuses, setBrokerStatuses] = useState({});

  // --- МОДИФІКОВАНА ФУНКЦІЯ ОНОВЛЕННЯ КОНФІГУРАЦІЇ ---
  // useCallback гарантує, що функція не буде перестворюватися при кожному рендері
  const setAppConfig = useCallback(
    (value) => {
      // Дозволяє передавати як нове значення, так і функцію-оновлювач (як у useState)
      const newConfig = typeof value === "function" ? value(appConfig) : value;

      // Оновлюємо внутрішній стан React
      setAppConfigState(newConfig);

      // Зберігаємо нову конфігурацію в localStorage
      setStoredConfig(newConfig);

      // --- ВІДПРАВЛЯЄМО ПОДІЮ, ЩО КОНФІГУРАЦІЯ ЗБЕРЕЖЕНА ---
      // Це дозволяє ConnectionManager та іншим сервісам реагувати на зміни
      eventBus.emit("config:saved", newConfig);
    },
    [appConfig, setStoredConfig]
  );

  // --- Логіка для визначення глобального статусу з'єднання ---
  const globalConnectionStatus = useMemo(() => {
    if (!appConfig.brokers || appConfig.brokers.length === 0) {
      return "Not Configured";
    }

    const statuses = appConfig.brokers.map(
      (b) => brokerStatuses[b.id] || "offline"
    );

    if (statuses.every((s) => s === "online")) {
      return "All online";
    }
    if (statuses.some((s) => s === "online")) {
      return "Partially online";
    }
    return "All offline";
  }, [appConfig.brokers, brokerStatuses]);

  // --- Ефект для підписки на події від ConnectionManager ---
  useEffect(() => {
    const updateStatusForBroker = (brokerId) => {
      // Отримуємо актуальний статус від менеджера
      const status = connectionManager.isConnected(brokerId)
        ? "online"
        : "offline";
      setBrokerStatuses((prev) => ({ ...prev, [brokerId]: status }));
    };

    const handleConnect = (brokerId) => updateStatusForBroker(brokerId);
    const handleDisconnect = (brokerId) => updateStatusForBroker(brokerId);

    // Підписуємось на події
    eventBus.on("broker:connected", handleConnect);
    eventBus.on("broker:disconnected", handleDisconnect);

    // Ініціалізуємо початкові статуси
    if (appConfig.brokers) {
      const initialStatuses = {};
      appConfig.brokers.forEach((b) => {
        initialStatuses[b.id] = connectionManager.isConnected(b.id)
          ? "online"
          : "offline";
      });
      setBrokerStatuses(initialStatuses);
    }

    // Відписуємось при розмонтуванні компонента
    return () => {
      eventBus.off("broker:connected", handleConnect);
      eventBus.off("broker:disconnected", handleDisconnect);
    };
  }, [appConfig.brokers]); // Пере-підписуємось, якщо список брокерів змінився

  // --- Обробники для маніпуляції конфігурацією (CRUD операції) ---
  // Залишаються в цьому хуці, оскільки вони є бізнес-логікою, пов'язаною з appConfig

  const handleSetBrokers = useCallback(
    (newBrokers) => {
      setAppConfig((prev) => ({ ...prev, brokers: newBrokers }));
    },
    [setAppConfig]
  );

  const handleAddComponent = useCallback(
    (newComponent, dashboardId) => {
      // Генеруємо унікальний ID для нового компонента
      const componentToAdd = { ...newComponent, id: `comp-${Date.now()}` };
      setAppConfig((prev) => {
        const newDashboards = { ...prev.dashboards };
        if (newDashboards[dashboardId]) {
          newDashboards[dashboardId].components.push(componentToAdd);
        } else {
          // Якщо раптом дашборда не існує, можна або створити його, або видати помилку
          console.warn(
            `Dashboard with id ${dashboardId} not found. Component not added.`
          );
        }
        return { ...prev, dashboards: newDashboards };
      });
    },
    [setAppConfig]
  );

  const handleDeleteComponent = useCallback(
    (componentId) => {
      setAppConfig((prev) => {
        const newDashboards = { ...prev.dashboards };
        for (const dashId in newDashboards) {
          newDashboards[dashId].components = newDashboards[
            dashId
          ].components.filter((c) => c.id !== componentId);
        }
        return { ...prev, dashboards: newDashboards };
      });
    },
    [setAppConfig]
  );

  const handleSaveComponent = useCallback(
    (updatedComponent) => {
      setAppConfig((prev) => {
        const newDashboards = { ...prev.dashboards };
        for (const dashId in newDashboards) {
          const index = newDashboards[dashId].components.findIndex(
            (c) => c.id === updatedComponent.id
          );
          if (index !== -1) {
            newDashboards[dashId].components[index] = updatedComponent;
            break; // Виходимо з циклу, як тільки знайшли та оновили компонент
          }
        }
        return { ...prev, dashboards: newDashboards };
      });
    },
    [setAppConfig]
  );

  useEffect(() => {
    console.log(
      "[useAppConfig | Logic] Dashboards or rules changed. Re-syncing logic."
    );
    deviceRegistry.syncFromAppConfig(appConfig);
  }, [appConfig.dashboards, appConfig.alertRules]);

  // Повертаємо все, що потрібно компонентам
  return {
    appConfig,
    setAppConfig,
    globalConnectionStatus,

    // Передаємо обробники в одному об'єкті для зручності
    handlers: {
      handleSetBrokers,
      handleAddComponent,
      handleDeleteComponent,
      handleSaveComponent,
    },
  };
};

export default useAppConfig;
