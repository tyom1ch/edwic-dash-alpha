import React, { useEffect, useState } from "react";
import { Typography, Card, CardContent, ButtonBase } from "@mui/material";
import MQTTCore from "../core/MQTTCore";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const hapticsImpactLight = async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
};

const SwitchControl = ({ stateTopic, commandTopic, label }) => {
  const [state, setState] = useState(null); // Стан пристрою
  const [loading, setLoading] = useState(true); // Прапорець завантаження

  useEffect(() => {
    const subscribeToTopic = () => {
      console.log(`🔔 Підписка на ${stateTopic}`);
      MQTTCore.subscribe(stateTopic, handleUpdate);
    };

    const handleUpdate = (newState) => {
      if (newState === "FORCE_UPDATE") {
        console.log(`🔄 FORCE_UPDATE для ${stateTopic}, перевідписка...`);
        MQTTCore.unsubscribe(stateTopic, handleUpdate);
        subscribeToTopic();
        return;
      }

      setState(newState);
      setLoading(false);
    };

    subscribeToTopic();

    return () => {
      MQTTCore.unsubscribe(stateTopic, handleUpdate);
    };
  }, [stateTopic]);

  const handleToggle = () => {
    hapticsImpactLight();

    if (state === null) return; // Запобігаємо відправленню, якщо стан невідомий

    const newState = state === "ON" ? "OFF" : "ON";
    MQTTCore.sendMessage(commandTopic, newState);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        minWidth: 275,
        height: 100,
        mb: 2,
        overflow: "hidden",
        transition: "background-color 0.3s ease",
      }}
    >
      <ButtonBase
        onClick={handleToggle}
        sx={{
          width: "100%",
          height: "100%",
          display: "block",
          textAlign: "left",
        }}
      >
        <CardContent>
          <Typography color="textSecondary" variant="h6" sx={{ paddingRight: 6 }}>
            {label}
          </Typography>
          {loading ? (
            <Typography color="textSecondary">Завантаження...</Typography>
          ) : (
            <Typography
              color={state === "ON" ? "textPrimary" : "textSecondary"}
              variant="h5"
            >
              {state}
            </Typography>
          )}
        </CardContent>
      </ButtonBase>
    </Card>
  );
};

export default SwitchControl;
