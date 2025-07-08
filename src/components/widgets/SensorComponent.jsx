import React, { useRef, useLayoutEffect } from "react";
import { Typography, Box, Card, CardContent } from "@mui/material";
import useEntity from "../../hooks/useEntity";
import { evaluateValueTemplate } from "../../utils/templateEvaluator";

const SensorComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);
  const rawValue = entity?.value;
  const template = entity?.val_tpl || componentConfig?.value_template;

  const displayValue = evaluateValueTemplate(template, rawValue);
  const unit = entity?.unit_of_meas || componentConfig?.unit_of_meas || "";
  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleString()
    : "Не оновлювалось";

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
      // 1. Скидаємо попередній inline-стиль, щоб повернутися до базового розміру з CSS (sx).
      value.style.fontSize = "";

      // 2. Вимірюємо ширину контейнера (вже з урахуванням його padding) та реальну ширину тексту.
      const containerWidth = container.clientWidth;
      const textWidth = value.scrollWidth;

      // 3. Якщо текст ширший за контейнер, обчислюємо та застосовуємо новий розмір.
      if (textWidth > containerWidth) {
        const baseFontSize = parseFloat(
          window.getComputedStyle(value).fontSize
        );
        const scale = containerWidth / textWidth;
        // Застосовуємо новий, зменшений розмір шрифту.
        // Додаємо `* 0.98` як невеликий запас, щоб текст гарантовано не торкався країв.
        value.style.fontSize = `${baseFontSize * scale * 0.80}px`;
      }
    };

    const resizeObserver = new ResizeObserver(fitText);
    resizeObserver.observe(container);

    fitText(); // Перший запуск

    return () => resizeObserver.disconnect();
  }, [displayValue, unit]); // Перераховуємо розмір, якщо змінився текст або одиниці виміру.

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
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          // Важливо: overflow: "hidden", щоб приховати проміжні стани рендерингу
          overflow: "hidden",
        }}
      >
        <Typography
          ref={valueRef}
          component="span"
          sx={{
            fontWeight: "bold",
            lineHeight: 1.1,
            whiteSpace: "nowrap", // Забороняємо перенос тексту, щоб scrollWidth працював коректно
            // --- КЛЮЧОВЕ ВИПРАВЛЕННЯ №2: Задаємо великий базовий розмір ---
            // Ми ставимо свідомо великий розмір, щоб логіка завжди зменшувала його, а не збільшувала.
            fontSize: "4rem",
          }}
        >
          {displayValue ?? "---"}
          {unit && (
            <span
              style={{
                fontSize: "0.6em", // Цей розмір буде масштабуватися разом з батьківським
                marginLeft: "4px",
                fontWeight: 500,
              }}
            >
              {unit}
            </span>
          )}
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

export default SensorComponent;
