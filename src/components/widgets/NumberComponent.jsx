// src/components/widgets/NumberComponent.jsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Slider,
  TextField,
} from "@mui/material";
import useEntity from "../../hooks/useEntity";
import deviceRegistry from "../../core/DeviceRegistry";
import { ModernWidgetCard } from "./ModernWidgetCard";

const NumberComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const { min = 0, max = 100, step = 1, mode = "slider" } = componentConfig;

  const unit =
    entity?.unit_of_meas ||
    entity?.unit_of_measurement ||
    componentConfig?.unit_of_meas ||
    componentConfig?.unit_of_measurement ||
    "";

  const currentValue = entity?.value;
  const isReady = currentValue !== null && typeof currentValue !== "undefined";

  const [inputValue, setInputValue] = useState("");
  // --- LOCAL STATE FOR SLIDER ---
  const [sliderValue, setSliderValue] = useState(null);

  useEffect(() => {
    if (isReady) {
      setInputValue(String(currentValue));
      setSliderValue(Number(currentValue));
    } else {
      setSliderValue(null);
    }
  }, [currentValue, isReady]);
  // --- END LOCAL STATE ---

  const handleSetValue = (newValue) => {
    const numValue = parseFloat(newValue);
    if (!isReady || isNaN(numValue)) return;

    const clampedValue = Math.max(min, Math.min(max, numValue));

    // Refactored to use DeviceRegistry.sendCommand
    deviceRegistry.sendCommand(componentConfig.id, clampedValue);
  };

  const handleStepChange = (increment) => {
    if (!isReady) return;
    const newValue = parseFloat(currentValue) + increment * step;
    handleSetValue(
      newValue.toFixed(
        String(step).includes(".") ? String(step).split(".")[1].length : 0
      )
    );
  };

  const handleSliderChange = (event, newValue) => {
    setSliderValue(newValue); // Update local state immediately
  };

  let controls;
  if (mode === "box") {
    controls = (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          my: "auto",
        }}
      >
        <IconButton
          onClick={() => handleStepChange(-1)}
          disabled={!isReady || parseFloat(currentValue) <= min}
        >
          <Remove />
        </IconButton>
        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => handleSetValue(inputValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSetValue(inputValue);
          }}
          disabled={!isReady}
          variant="outlined"
          size="small"
          type="number"
          inputProps={{
            step: step,
            min: min,
            max: max,
            style: {
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "1.5rem",
              width: "100px",
            },
          }}
        />
        <IconButton
          onClick={() => handleStepChange(1)}
          disabled={!isReady || parseFloat(currentValue) >= max}
        >
          <Add />
        </IconButton>
      </Box>
    );
  } else {
    controls = (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          my: "auto",
          gap: 2,
        }}
      >
        <Slider
          value={sliderValue ?? (isReady ? Number(currentValue) : min)}
          onChange={handleSliderChange}
          onChangeCommitted={(e, val) => handleSetValue(val)}
          min={min}
          max={max}
          step={step}
          disabled={!isReady}
          valueLabelDisplay="auto"
          sx={{ flexGrow: 1 }}
        />
        <Typography variant="h6" sx={{ minWidth: "60px", textAlign: "right" }}>
          {isReady ? `${sliderValue ?? currentValue}${unit}` : `---${unit}`}
        </Typography>
      </Box>
    );
  }
  return (
    <ModernWidgetCard title={componentConfig.label || entity?.name || "Числове значення"}>
      <Box sx={{ flexGrow: 1, display: "flex", width: "100%" }}>{controls}</Box>
    </ModernWidgetCard>
  );
};

export default NumberComponent;