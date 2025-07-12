// src/components/widgets/BinarySensorComponent.jsx
import React, { useLayoutEffect, useRef } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  SensorDoor,
  MeetingRoom,
  MotionPhotosAuto,
  HelpOutline,
} from "@mui/icons-material";
import useEntity from "../../hooks/useEntity";

// Функція для вибору іконки на основі device_class
const getDeviceClassIcon = (deviceClass) => {
  switch (deviceClass) {
    case "door":
    case "garage_door":
    case "window":
      return <SensorDoor sx={{ fontSize: 60 }} />;
    case "motion":
    case "presence":
      return <MotionPhotosAuto sx={{ fontSize: 60 }} />;
    case "opening":
      return <MeetingRoom sx={{ fontSize: 60 }} />;
    default:
      return <HelpOutline sx={{ fontSize: 60 }} />;
  }
};

// Функція для отримання текстового представлення стану
const getStateText = (isOn, deviceClass) => {
  if (isOn === null) return "---";
  switch (deviceClass) {
    case "door":
    case "window":
      return isOn ? "Відчинено" : "Зачинено";
    case "motion":
      return isOn ? "Рух" : "Немає руху";
    case "presence":
      return isOn ? "Присутній" : "Відсутній";
    case "plug":
      return isOn ? "В розетці" : "Вимкнено";
    default:
      return isOn ? "ON" : "OFF";
  }
};

const BinarySensorComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const {
    payload_on = "ON",
    payload_off = "OFF",
    device_class,
  } = componentConfig;

  const state = entity?.value;
  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleString()
    : "Не оновлювалось";

  const isOn =
    state !== null && state !== undefined
      ? String(state) === String(payload_on)
      : null;

  const isReady = isOn !== null;

  // Ref для контейнера, в якому знаходиться текст (CardContent)
  const containerRef = useRef(null);
  // Ref для самого тексту, розмір якого ми будемо змінювати
  const valueRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const value = valueRef.current;

    if (!container || !value) {
      return;
    }

    const fitText = () => {
      // 1. Скидаємо попередній inline-стиль, щоб повернутися до базового розміру з CSS.
      // Це необхідно для коректного вимірювання "переповнення".
      value.style.fontSize = "";

      // 2. Вимірюємо розміри контейнера та тексту.
      const containerWidth = container.clientWidth; // Внутрішня ширина контейнера
      const containerHeight = container.clientHeight; // Внутрішня висота контейнера

      const textWidth = value.scrollWidth; // Реальна ширина тексту
      const textHeight = value.scrollHeight; // Реальна висота тексту

      // 3. Перевіряємо, чи текст виходить за межі контейнера по ширині АБО по висоті.
      // 4. Обчислюємо коефіцієнти масштабування для ширини та висоти.
      const widthScale = containerWidth / textWidth;
      const heightScale = containerHeight / textHeight;

      const scale = Math.min(widthScale, heightScale);

      // 6. Обчислюємо та застосовуємо новий розмір шрифту.
      const baseFontSize = parseFloat(window.getComputedStyle(value).fontSize);

      value.style.fontSize = `${baseFontSize * scale * 0.5}px`;
    };

    const resizeObserver = new ResizeObserver(fitText);
    resizeObserver.observe(container);

    fitText(); // Перший запуск

    return () => resizeObserver.disconnect();
  }, [valueRef]); // Перераховуємо розмір, якщо змінився текст або одиниці виміру.

  const getShortLabel = (text) => {
    if (!text) return "Сенсор";
    return text.length > 25 ? text.slice(0, 25) + "…" : text;
  };

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        height: "100%",
        display: "flex", // Додано для розтягування CardContent
      }}
    >
      <CardContent
        // --- КЛЮЧОВЕ ВИПРАВЛЕННЯ №1: Переносимо ref сюди ---
        // Тепер ми вимірюємо ширину саме області контенту, а не всієї картки.
        ref={containerRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1, // Дозволяє CardContent зайняти весь простір Card
          alignItems: "center",
          justifyContent: "center",
          // Важливо: overflow: "hidden", щоб приховати проміжні стани рендерингу
          overflow: "hidden",
        }}
      >
        <Typography sx={{ whiteSpace: "nowrap" }}>
          {getShortLabel(componentConfig.label || entity?.name)}
        </Typography>
        <Typography
          ref={valueRef}
          component="span"
          sx={{
            fontWeight: "bold",
            lineHeight: 1.1,
            whiteSpace: "nowrap", // Забороняємо перенос тексту, щоб scrollWidth працював коректно
            fontSize: ".1rem",
          }}
        >
          {state ?? "---"}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            pt: 1,
            whiteSpace: "nowrap",
            width: "100%",
            textAlign: "center",
            fontSize: "0.75rem",
          }}
        >
          {lastUpdated}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BinarySensorComponent;
