// src/components/widgets/SensorComponent.jsx
import React from "react";
import { Typography, Box } from "@mui/material";
import useEntity from "../../hooks/useEntity";
import { evaluateValueTemplate } from "../../utils/templateEvaluator";

const SensorComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);
  const rawValue = entity?.value;
  const template = entity?.val_tpl;

  const displayValue = evaluateValueTemplate(template, rawValue);
  const unit = entity?.unit_of_meas || componentConfig?.unit_of_meas || "";
  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleString()
    : "Не оновлювалось";

  // ЗМІНА: Повністю перероблена структура для правильного заповнення простору
  // та адаптивного масштабування тексту.
  return (
    <Box
      sx={{
        // Встановлюємо Flexbox-контейнер, що заповнює весь доступний простір
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center", // Центруємо вміст по вертикалі
        alignItems: "center",      // Центруємо вміст по горизонталі
        minHeight: 0, // Важливо для правильної роботи Flexbox у вкладених контейнерах
        padding: 1,
        overflow: "hidden", // Запобігаємо виходу вмісту за межі
      }}
    >
      {/* Основний блок зі значенням та одиницями виміру */}
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline", // Вирівнюємо значення і одиниці по базовій лінії
          flexWrap: "nowrap",     // Забороняємо перенос рядка
          justifyContent: "center",
          width: "100%",
          overflow: "hidden",     // Ховаємо те, що не вміщається
          textAlign: "center",
        }}
      >
        {/* ЗМІНА: Використовуємо clamp() для адаптивного розміру шрифта */}
        <Typography
          component="span"
          sx={{
            fontWeight: "bold",
            // clamp(мінімум, бажаний розмір (залежить від ширини екрана), максимум)
            fontSize: "clamp(1.5rem, 8vw, 5rem)",
            lineHeight: 1.1,
            // Властивості для обрізання тексту, якщо він занадто довгий
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayValue ?? "---"}
        </Typography>

        {unit && (
          // ЗМІНА: Одиниці виміру також робимо адаптивними, але меншими
          <Typography
            component="span"
            sx={{
              ml: 0.5,
              fontWeight: 500,
              fontSize: "clamp(1rem, 4vw, 3rem)",
              whiteSpace: "nowrap",
            }}
          >
            {unit}
          </Typography>
        )}
      </Box>

      {/* ЗМІНА: Текст з часом оновлення притискаємо до низу */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          mt: "auto", // Притискаємо цей елемент до низу контейнера
          pt: 1, // Додаємо невеликий відступ зверху
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          width: '100%',
          textAlign: 'center',
          fontSize: "0.75rem", // Можна залишити фіксованим, бо це другорядна інформація
        }}
      >
        {lastUpdated}
      </Typography>
    </Box>
  );
};

export default SensorComponent;