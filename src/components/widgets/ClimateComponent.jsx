// src/components/widgets/ClimateComponent.jsx
// HA-faithful thermostat card — circular SVG ring dial
import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, IconButton, Chip } from "@mui/material";
import { Add, Remove, AcUnit, WbSunny, Air, PowerSettingsNew } from "@mui/icons-material";
import useEntity from "../../hooks/useEntity";
import commandDispatcher from "../../core/CommandDispatcher";

// ─── HA design tokens ────────────────────────────────────────────────────────
const ACTION_COLORS = {
  heating: "#e2572a",   // HA warm orange
  cooling: "#0288d1",   // HA cool blue
  fan:     "#6d9e3c",
  drying:  "#078484",
  idle:    "rgba(255,255,255,0.28)",
  off:     "rgba(255,255,255,0.12)",
};

const MODE_ICONS = {
  heat:      <WbSunny fontSize="small" />,
  cool:      <AcUnit fontSize="small" />,
  heat_cool: <></>,
  fan_only:  <Air fontSize="small" />,
  dry:       <></>,
  off:       <PowerSettingsNew fontSize="small" />,
  auto:      <></>,
};

// ─── SVG Ring Dial ────────────────────────────────────────────────────────────
// Replicates HA's round thermostat dial
const RADIUS = 66;
const STROKE  = 5;
const VIEWBOX = 160;
const CX = VIEWBOX / 2;
const CY = VIEWBOX / 2;
// Arc spans 270° (−225° to +45°, so gap at bottom-right)
const START_ANGLE = -225;
const END_ANGLE   =   45;
const ARC_RANGE   = END_ANGLE - START_ANGLE;

function polarToXY(angleDeg, r = RADIUS) {
  const θ = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: CX + r * Math.cos(θ),
    y: CY + r * Math.sin(θ),
  };
}

function describeArc(startDeg, endDeg, r = RADIUS) {
  const start = polarToXY(startDeg, r);
  const end   = polarToXY(endDeg, r);
  const span  = ((endDeg - startDeg + 360) % 360);
  const large = span > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

function tempToAngle(temp, min, max) {
  const clamped = Math.min(Math.max(temp, min), max);
  return START_ANGLE + ((clamped - min) / (max - min)) * ARC_RANGE;
}

function RingDial({ currentTemp, targetTemp, min, max, actionColor, isOff }) {
  const hasCurrent = typeof currentTemp === "number" && !isNaN(currentTemp);
  const hasTarget  = typeof targetTemp  === "number" && !isNaN(targetTemp);

  // Track arc (background)
  const trackPath = describeArc(START_ANGLE, END_ANGLE);

  // Active arc from start to target position
  const targetAngle  = hasTarget ? tempToAngle(targetTemp, min, max) : START_ANGLE;
  const activePath   = hasTarget && !isOff ? describeArc(START_ANGLE, targetAngle) : null;

  // Thumb dot at target position
  const thumbPos     = hasTarget ? polarToXY(targetAngle) : null;

  // Current marker
  const currentAngle = hasCurrent ? tempToAngle(currentTemp, min, max) : null;
  const currentPos   = currentAngle !== null ? polarToXY(currentAngle) : null;

  const activeColor  = isOff ? "rgba(255,255,255,0.12)" : (actionColor || ACTION_COLORS.idle);

  return (
    <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} style={{ width: "100%", height: "auto", maxWidth: 200 }}>
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      {/* Active fill arc */}
      {activePath && (
        <path
          d={activePath}
          fill="none"
          stroke={activeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          style={{ transition: "stroke 0.3s" }}
        />
      )}
      {/* TARGET temperature dot */}
      {thumbPos && !isOff && (
        <circle cx={thumbPos.x} cy={thumbPos.y} r={STROKE + 1} fill={activeColor} />
      )}
      {/* CURRENT temperature hash mark */}
      {currentPos && (
        <>
          <circle cx={currentPos.x} cy={currentPos.y} r={3} fill="white" opacity={0.7} />
        </>
      )}
      {/* Center: current temp */}
      <text
        x={CX}
        y={CY - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="32"
        fontWeight="300"
        fontFamily="inherit"
        opacity={isOff ? 0.4 : 1}
      >
        {hasCurrent ? `${currentTemp}°` : "—"}
      </text>
      <text
        x={CX}
        y={CY + 22}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.55)"
        fontSize="13"
        fontFamily="inherit"
      >
        поточна
      </text>
    </svg>
  );
}

// ─── ClimateComponent ────────────────────────────────────────────────────────
const ClimateComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);

  const {
    min_temp = 10,
    max_temp = 30,
    temp_step = 0.5,
    preset_modes = [],
  } = componentConfig;

  const currentTemperature = entity?.current_temperature ?? null;
  const mode               = entity?.mode ?? "off";
  const action             = entity?.action ?? "idle";
  const presetMode         = entity?.preset_mode;
  const targetTemperature  = entity?.temperature ?? null;

  const isOff = mode === "off";
  const label = componentConfig.label || entity?.name || "Клімат";

  const getModesArray = () => {
    const m = componentConfig.modes;
    if (Array.isArray(m) && m.length > 0) return m;
    if (typeof m === "string" && m.trim()) return m.split(",").map(s => s.trim());
    return ["off", "heat", "cool"];
  };
  const modes = getModesArray();

  const handleTempChange = useCallback((delta) => {
    if (targetTemperature === null) return;
    const newTemp = parseFloat(targetTemperature) + delta;
    if (newTemp >= min_temp && newTemp <= max_temp) {
      commandDispatcher.dispatch({
        entityId: componentConfig.id,
        commandKey: "set_temperature",
        value: newTemp.toFixed(1),
      });
    }
  }, [targetTemperature, min_temp, max_temp, componentConfig.id]);

  const cycleMode = useCallback(() => {
    const idx = modes.indexOf(mode);
    const next = modes[(idx + 1) % modes.length];
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      commandKey: "set_mode",
      value: next,
    });
  }, [mode, modes, componentConfig.id]);

  const handlePresetChange = useCallback((preset) => {
    commandDispatcher.dispatch({
      entityId: componentConfig.id,
      commandKey: "set_preset_mode",
      value: preset,
    });
  }, [componentConfig.id]);

  const actionColor = ACTION_COLORS[action] ?? ACTION_COLORS.idle;
  const modeIcon    = MODE_ICONS[mode] ?? null;

  const parsedCurrent = currentTemperature !== null ? parseFloat(currentTemperature) : null;
  const parsedTarget  = targetTemperature  !== null ? parseFloat(targetTemperature)  : null;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
        overflow: "hidden",
        minHeight: 0,
        boxSizing: "border-box",
      }}
    >
      {/* ── Name row ─────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
        <Typography
          variant="caption"
          noWrap
          sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: "0.78rem" }}
        >
          {label}
        </Typography>
        {/* Mode chip — click to cycle */}
        <Chip
          icon={modeIcon}
          label={mode}
          size="small"
          onClick={cycleMode}
          sx={{
            fontSize: "0.7rem",
            height: 22,
            bgcolor: isOff ? "rgba(255,255,255,0.08)" : `${actionColor}33`,
            color: isOff ? "rgba(255,255,255,0.4)" : actionColor,
            border: `1px solid ${isOff ? "rgba(255,255,255,0.08)" : actionColor}44`,
            textTransform: "capitalize",
            cursor: "pointer",
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
      </Box>

      {/* ── Dial ─────────────────────────────────── */}
      <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RingDial
          currentTemp={parsedCurrent}
          targetTemp={parsedTarget}
          min={min_temp}
          max={max_temp}
          actionColor={actionColor}
          isOff={isOff}
        />
      </Box>

      {/* ── Target temp controls ──────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          opacity: isOff ? 0.4 : 1,
        }}
      >
        <IconButton
          size="small"
          onClick={() => handleTempChange(-temp_step)}
          disabled={isOff || parsedTarget === null}
          sx={{ color: "rgba(255,255,255,0.7)", p: "4px" }}
        >
          <Remove fontSize="small" />
        </IconButton>

        <Box sx={{ textAlign: "center", minWidth: 60 }}>
          <Typography
            variant="h6"
            sx={{
              lineHeight: 1,
              fontWeight: 400,
              color: isOff ? "rgba(255,255,255,0.4)" : "white",
            }}
          >
            {parsedTarget !== null ? `${parsedTarget.toFixed(1)}°` : "—"}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem" }}>
            цільова
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={() => handleTempChange(temp_step)}
          disabled={isOff || parsedTarget === null}
          sx={{ color: "rgba(255,255,255,0.7)", p: "4px" }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Box>

      {/* ── Action status bar ──────────────────────── */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          mt: 0.5,
          py: 0.5,
          borderRadius: 1.5,
          bgcolor: isOff ? "rgba(255,255,255,0.04)" : `${actionColor}22`,
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: isOff ? "rgba(255,255,255,0.2)" : actionColor,
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: isOff ? "rgba(255,255,255,0.3)" : actionColor,
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {action}
        </Typography>
      </Box>

      {/* ── Preset chips ──────────────────────────── */}
      {preset_modes.length > 0 && !isOff && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center", mt: 0.5 }}>
          {preset_modes.map((p) => (
            <Chip
              key={p}
              label={p}
              size="small"
              clickable
              onClick={() => handlePresetChange(p)}
              sx={{
                fontSize: "0.65rem",
                height: 20,
                bgcolor: presetMode === p ? `${actionColor}55` : "rgba(255,255,255,0.06)",
                color: presetMode === p ? "white" : "rgba(255,255,255,0.5)",
                border: `1px solid ${presetMode === p ? actionColor : "transparent"}`,
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ClimateComponent;
