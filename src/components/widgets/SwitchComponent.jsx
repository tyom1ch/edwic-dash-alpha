// src/components/widgets/SwitchComponent.jsx
import React from "react";
import { Card, CardContent, Typography, Box, ButtonBase } from "@mui/material";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import useEntity from "../../hooks/useEntity";
import commandDispatcher from "../../core/CommandDispatcher";

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
    payload_on = "ON", // Якщо в конфігу немає, вважаємо '1'
    payload_off = "OFF", // Якщо в конфігу немає, вважаємо '0'
  } = componentConfig;

  const state = entity?.value;

  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleString()
    : "Не оновлювалось";

  const isOn = String(state) === String(payload_on);

  const displayState =
    state !== null && state !== undefined ? String(state) : "---";

  const handleToggle = () => {
    if (state === null || typeof state === "undefined") return;

    hapticsImpactLight();

    // --- ЗМІНА: Визначаємо команду на основі isOn та payload_on/off ---
    const commandValue = isOn ? payload_off : payload_on;
    // --- КІНЕЦЬ ЗМІНИ ---

    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      value: commandValue,
    });
  };

  return (
    <Card
      sx={{
        height: "100%",
        backgroundColor: isOn ? "action.hover" : "transparent",
        transition: "background-color 0.3s",
      }}
    >
      <ButtonBase
        onClick={handleToggle}
        disabled={state === null || typeof state === "undefined"} // Блокуємо кнопку, поки не отримано стан
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          textAlign: "left",
          padding: 0,
        }}
      >
        <CardContent
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* --- ЗМІНА: Тепер можемо показувати 'ON'/'OFF' для кращої візуалізації --- */}
            <Typography
              variant="h3"
              component="span"
              sx={{
                color: isOn ? "text.primary" : "text.secondary",
                fontWeight: "bold",
              }}
            >
              {state !== null && state !== undefined
                ? isOn
                  ? "ON"
                  : "OFF"
                : "---"}
            </Typography>
            {/* --- КІНЕЦЬ ЗМІНИ --- */}
          </Box>
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
      </ButtonBase>
    </Card>
  );
};

export default SwitchComponent;
