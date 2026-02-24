import React from "react";
import useEntity from "../../hooks/useEntity";
import { AutoScalableText } from "./AutoScalableText";
import { ModernWidgetCard } from "./ModernWidgetCard";
import { Sensors } from "@mui/icons-material";

const BinarySensorComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const {
    payload_on = "ON",
    payload_off = "OFF",
    device_class,
  } = componentConfig;

  const state = entity?.value;
  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleTimeString()
    : "Невідомо";

  const isOn =
    state !== null && state !== undefined
      ? String(state) === String(payload_on)
      : null;

  const getStateText = (isOn, deviceClass) => {
    if (isOn === null) return "---";
    switch (deviceClass) {
      case "door":
      case "window":
        return isOn ? "Відчинено" : "Зачинено";
      case "motion":
        return isOn ? "Рух" : "Спокій";
      case "presence":
        return isOn ? "Присутній" : "Відсутній";
      case "plug":
        return isOn ? "В розетці" : "Вимкнено";
      default:
        return isOn ? "ON" : "OFF";
    }
  };

  const displayValue = getStateText(isOn, device_class);
  const label = componentConfig.label || entity?.name || "Датчик";

  return (
    <ModernWidgetCard 
      title={label} 
      highlightColor={isOn ? "#f44336" : "transparent"} // Red/alert color for active binary sensor
      statusIcon={<Sensors color={isOn ? "error" : "disabled"} />}
    >
      <AutoScalableText
        text={displayValue}
        subText={`Оновлено: ${lastUpdated}`}
        color={isOn ? "error.main" : "text.secondary"}
      />
    </ModernWidgetCard>
  );
};

export default BinarySensorComponent;
