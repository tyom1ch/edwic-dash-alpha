import React from "react";
import { Box, Typography } from "@mui/material";

export const AutoScalableText = ({ 
  text, 
  unit = "", 
  color = "text.primary", 
  fontWeight = "bold",
  subText = ""
}) => {
  const textStr = String(text ?? "");
  const unitStr = String(unit ?? "");

  return (
    <Box sx={{ 
      width: "100%", 
      height: "100%", // ОБОВ'ЯЗКОВО для containerType
      flexGrow: 1,
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      alignItems: "center", 
      // МАГІЯ ТУТ: кажемо, що це контейнер для cqmin
      containerType: "size", 
      overflow: "hidden", 
      color: color, 
    }}>
      <Box sx={{ 
        flexGrow: 1, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        width: "100%", 
        overflow: "hidden"
      }}>
        <Typography
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis", // Обріже довгий текст: /battery/...
            maxWidth: "100%", // Щоб ellipsis спрацював
            lineHeight: 1,
            fontWeight: fontWeight,
            // Тепер 25cqmin рахується від розміру віджета, а не екрана
            fontSize: "clamp(1rem, 25cqmin, 5rem)" 
          }}
        >
          {textStr}
          {unitStr && (
            <Typography
              component="span"
              sx={{ fontSize: "0.5em", marginLeft: "0.08em", fontWeight: "normal" }}
            >
              {unitStr}
            </Typography>
          )}
        </Typography>
      </Box>

      {subText && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            mt: "auto", 
            mb: 0,
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis",
            maxWidth: "100%",
            display: "block",
            lineHeight: 1.2
          }}
        >
          {subText}
        </Typography>
      )}
    </Box>
  );
};

export default AutoScalableText;