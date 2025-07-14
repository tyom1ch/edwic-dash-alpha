import React from "react";
import { Typography, Card, CardContent } from "@mui/material";
import useEntity from "../../hooks/useEntity";
import { useFitText } from "../../hooks/useFitText";
import { evaluateValueTemplate } from "../../utils/templateEvaluator";

const SensorComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);
  const rawValue = entity?.value;
  const template = entity?.val_tpl || componentConfig?.value_template;

  const displayValue = evaluateValueTemplate(template, rawValue);
  const unit =
    entity?.unit_of_meas ||
    entity?.unit_of_measurement ||
    componentConfig?.unit_of_meas ||
    componentConfig?.unit_of_measurement ||
    "";
  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleString()
    : "Не оновлювалось";

  const { containerRef, valueRef } = useFitText([displayValue, unit]);

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
          p: 1, // Add some padding
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
            fontSize: "4rem", // Start with a large base font size
          }}
        >
          {displayValue ?? "---"}
          {unit && (
            <span
              style={{
                fontSize: "0.5em",
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
