# **EdwIC Project: Style Guide & Architecture**

Цей документ слугує єдиним джерелом правди щодо стандартів кодування, архітектурних рішень та принципів розробки проєкту "EdwIC".

## 1. Core Philosophy & Technology Stack

**"EdwIC"** — це повністю автономний дашборд для моніторингу та керування MQTT-пристроями, що працює виключно у браузері користувача (**Frontend-Only**).

#### **Key Architectural Principles:**

*   **No Backend Dependency:** Весь додаток виконується у браузері. Немає проміжного Node.js серверу для обробки даних чи API.
*   **Direct MQTT Connection:** React-додаток підключається до MQTT брокера (напр., EMQX) напряму через WebSockets.
*   **Local Persistence:** Вся конфігурація (брокери, дашборди, віджети) зберігається у `localStorage` браузера користувача.
*   **Event-Driven:** Використання внутрішньої шини подій (`EventBus`) для асинхронної комунікації між модулями, що усуває необхідність у постійному опитуванні (polling).
*   **Externalized History & Alerting:** Передбачається, що розширені функції, такі як довготривале зберігання історії та надійні алерти, реалізуються на стороні MQTT брокера (напр., EMQX Rule Engine + InfluxDB). Дашборд є споживачем цих даних.

#### **Technology Stack:**

*   **Framework:** React (Vite)
*   **UI Components:** Material-UI (MUI), React Grid Layout
*   **MQTT Client:** `mqtt.js`
*   **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`) та кастомні хуки.
*   **Local Storage:** Кастомний хук `useLocalStorage`.
*   **Charting:** `react-chartjs-2`
*   **Development Language:** JavaScript (ES6+)

---

## 2. General Coding Standards

*   **Simplicity & Readability:** Код має бути максимально простим, чистим і самодокументованим. Віддавайте перевагу зрозумілості над хитромудрими оптимізаціями.
*   **Modularity:** Кожен файл/модуль повинен мати одну, чітко визначену відповідальність (Single Responsibility Principle).
*   **Immutability:** Завжди працюйте з копіями об'єктів та масивів стану, а не мутуйте їх напряму. Використовуйте спред-оператор (`...`) для створення нових екземплярів.
*   **Consistent Naming:**
    *   Компоненти: `PascalCase` (напр., `ClimateComponent.jsx`).
    *   Хуки: `camelCase` з префіксом `use` (напр., `useEntity.js`).
    *   Змінні та функції: `camelCase` (напр., `handleModeChange`).
    *   Константи: `UPPER_SNAKE_CASE` (напр., `WIDGET_REGISTRY`).

---

## 3. React & Hooks Best Practices

*   **Functional Components:** Увесь UI будується на функціональних компонентах з використанням хуків. Класові компоненти не використовуються.
*   **Custom Hooks:** Логіка, що повторюється, або керування складним станом виноситься в кастомні хуки (напр., `useEntity`, `useAppConfig`, `useLocalStorage`).
*   **Dependency Management:** Ретельно керуйте масивами залежностей в `useEffect`, `useCallback` та `useMemo`, щоб уникнути зайвих рендерів та зациклень.
*   **Props Drilling:** Уникайте глибокого "прокидання" пропсів. Для глобальних сервісів (`DeviceRegistry`, `CommandDispatcher`) використовується прямий імпорт синглтонів. Для стану, що оновлюється в реальному часі, використовується `EventBus` та хук `useEntity`.

---

## 4. Core Architecture Integration

Це серце нашого проєкту. Дотримання цих правил є критично важливим для стабільності та масштабованості.

#### **Core Services (`src/core/`)**

*   **Singletons:** Усі основні сервіси (`ConnectionManager`, `DeviceRegistry`, `CommandDispatcher`, `EventBus`) реалізовані як синглтони (один екземпляр на весь додаток). Це забезпечує єдине джерело правди для стану та з'єднань.
*   **EventBus is the Central Nervous System:**
    *   Низькорівневі сервіси (як `ConnectionManager`) **емітують** події (`mqtt:raw_message`, `broker:connected`).
    *   Високорівневі сервіси (як `DeviceRegistry`) **підписуються** на ці події, обробляють їх та **емітують** більш абстрактні, нормалізовані події (`entity:update`).
    *   UI-компоненти (через хук `useEntity`) **підписуються** на високорівневі події для оновлення.
*   **`widgetRegistry.js` is the Brain:**
    *   Це **єдине місце**, де описується логіка та можливості кожного типу віджетів.
    *   При додаванні нового віджета, **забороняється** змінювати `DeviceRegistry` або `CommandDispatcher`. Вся нова логіка описується декларативно в `widgetRegistry`.
    *   Кожен віджет повинен експортувати:
        *   `type`: унікальний ідентифікатор.
        *   `label`: назва для UI.
        *   `component`: React-компонент для рендерингу.
        *   `topicFields`: масив рядків, що описує поля для ручного редагування в `ComponentDialog`.
        *   `getTopicMappings(config)`: функція, що повертає мапу `{'entity_property': 'config_topic_key'}`.
        *   `getCommandMappings(config)`: функція, що повертає мапу `{'commandKey': 'config_topic_key'}`.

#### **Data Flow Example: Receiving a Message**

1.  `MqttClientWrapper` отримує повідомлення -> `ConnectionManager`.
2.  `ConnectionManager` емітує `mqtt:raw_message` на `EventBus`.
3.  `DeviceRegistry` слухає `mqtt:raw_message`, знаходить відповідний віджет через `widgetRegistry`, оновлює потрібну властивість (`entity.temperature`, `entity.value` тощо) і емітує `entity:update`.
4.  Хук `useEntity` в UI-компоненті слухає `entity:update` і викликає ререндер.

#### **Data Flow Example: Sending a Command**

1.  UI-компонент (напр., `ClimateComponent`) викликає `commandDispatcher.dispatch({ entityId: '...', commandKey: 'set_temperature', value: 22 })`.
2.  `CommandDispatcher` отримує `entityId`, `commandKey` і `value`.
3.  Він знаходить конфіг віджета в `DeviceRegistry`, звертається до `widgetRegistry`, щоб отримати мапінг команд (`getCommandMappings`).
4.  Він знаходить топік, що відповідає `commandKey: 'set_temperature'`, і передає запит на публікацію в `ConnectionManager`.

---

## 5. UI/Component Library (Material-UI)

*   **Consistency:** Використовуйте компоненти з бібліотеки Material-UI для забезпечення єдиного візуального стилю.
*   **Theming:** Глобальні налаштування теми (палітра, типографіка) повинні бути налаштовані в `App.jsx` через `ThemeProvider`.
*   **Responsiveness:** Використовуйте систему `Grid` та хук `useMediaQuery` від MUI для створення адаптивних інтерфейсів.

---