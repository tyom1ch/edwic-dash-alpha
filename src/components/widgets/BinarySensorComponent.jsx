import React from "react";
import { Card, CardContent, Typography } from "@mui/material";
import useEntity from "../../hooks/useEntity";
import { useFitText } from "../../hooks/useFitText";

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

  const displayValue = getStateText(isOn, device_class);
  const { containerRef, valueRef } = useFitText([displayValue]);
  
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
        display: "flex",
      }}
    >
      <CardContent
        ref={containerRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          p: 1,
        }}
      >
        <Typography sx={{ whiteSpace: "nowrap", textAlign: 'center' }}>
          {getShortLabel(componentConfig.label || entity?.name)}
        </Typography>
        <Typography
          ref={valueRef}
          component="span"
          sx={{
            fontWeight: "bold",
            lineHeight: 1,
            whiteSpace: "nowrap",
            fontSize: "4rem",
          }}
        >
          {displayValue}
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
