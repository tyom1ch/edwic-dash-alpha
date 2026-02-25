import React from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import useEntity from "../../hooks/useEntity";
import deviceRegistry from "../../core/DeviceRegistry";
import { AutoScalableText } from "./AutoScalableText";
import { ModernWidgetCard } from "./ModernWidgetCard";
import { PowerSettingsNew } from "@mui/icons-material";

const hapticsImpactLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    /* Ігноруємо помилки на платформах без тактильного відгуку */
  }
};

const SwitchComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const {
    payload_on = "ON", // Якщо в конфігу немає, вважаємо 'ON'
    payload_off = "OFF", // Якщо в конфігу немає, вважаємо 'OFF'
  } = componentConfig;

  const state = entity?.value;

  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleTimeString()
    : "Невідомо";

  const isOn = String(state) === String(payload_on);
  const isUnknown = state === null || typeof state === "undefined";

  const handleToggle = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isUnknown) return;

    hapticsImpactLight();

    const commandValue = isOn ? payload_off : payload_on;

    deviceRegistry.sendCommand(componentConfig.id, commandValue);
  };

  const label = componentConfig.label || entity?.name || "Перемикач";

  return (
    <ModernWidgetCard 
      title={label} 
      highlightColor={isOn ? "#ffb300" : "transparent"} // Amber for ON
      onClick={handleToggle}
      statusIcon={<PowerSettingsNew color={isOn ? "warning" : "disabled"} />}
    >
      <AutoScalableText
        text={isUnknown ? "---" : (isOn ? "УВІМК" : "ВИМК")}
        subText={`Оновлено: ${lastUpdated}`}
        color={isOn ? "text.primary" : "text.secondary"}
      />
    </ModernWidgetCard>
  );
};

export default SwitchComponent;
