import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";

/**
 * A highly optimized component that scales text to fit its container natively via SVG ViewBox bounds, 
 * replacing the slow JavaScript ResizeObserver font-size loops.
 * 
 * This version uses a deterministic math approach to calculate virtual text width, 
 * completely avoiding the buggy SVG getBBox() which caused text overflowing.
 */
export const AutoScalableText = ({ 
  text, 
  unit = "", 
  color = "text.primary", 
  fontWeight = "bold",
  subText = ""
}) => {
  const textStr = String(text ?? "");
  const unitStr = String(unit ?? "");

  // Base fixed viewBox constants
  const VIEWBOX_WIDTH = 1000;
  const VIEWBOX_HEIGHT = 400;

  const fontSize = useMemo(() => {
    // Calculate approximate width in "em" units
    let emWidth = 0;
    for (let i = 0; i < textStr.length; i++) {
      const char = textStr[i];
      if (char >= '0' && char <= '9') emWidth += 0.6;
      else if (char === '.' || char === ',' || char === ':' || char === '-') emWidth += 0.3;
      else if (char === char.toUpperCase() && char !== char.toLowerCase()) emWidth += 0.75; // uppercase
      else emWidth += 0.55; // lowercase and others
    }
    
    // Add unit width (unit is 60% of base font size)
    let unitEmWidth = 0;
    for (let i = 0; i < unitStr.length; i++) {
      const char = unitStr[i];
      if (char >= '0' && char <= '9') unitEmWidth += 0.6;
      else if (char === '.' || char === ',' || char === ':' || char === '-') unitEmWidth += 0.3;
      else if (char === char.toUpperCase() && char !== char.toLowerCase()) unitEmWidth += 0.75;
      else unitEmWidth += 0.55;
    }
    // Plus a tiny gap between text and unit
    emWidth += (unitEmWidth * 0.6) + (unitStr ? 0.1 : 0);
    
    // We want to fit `emWidth` into VIEWBOX_WIDTH (leave some margin 5%)
    const availableWidth = VIEWBOX_WIDTH * 0.95; 
    const availableHeight = VIEWBOX_HEIGHT * 0.90;
    
    // Maximum font size that fits the width
    const maxFontSizeByWidth = emWidth > 0 ? availableWidth / emWidth : availableHeight;
    
    // Maximum font size that fits the height
    return Math.min(maxFontSizeByWidth, availableHeight);
  }, [textStr, unitStr]);

  return (
    <Box sx={{ 
      width: "100%", 
      flexGrow: 1, // Use flexGrow instead of hard height: 100% to correctly calculate remaining space
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      alignItems: "center", 
      overflow: "hidden", 
      color: color, 
      minHeight: 0,
      minWidth: 0
    }}>
      <Box sx={{ 
        flexGrow: 1, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        width: "100%", 
        minHeight: 0,
        minWidth: 0,
      }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: "hidden" }} // Force hidden to prevent leaking out of SVG
        >
          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            fill="currentColor"
            fontFamily="Roboto, Arial, sans-serif"
            style={{ 
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              // color is inherited dynamically from parent Box
            }}
          >
            {textStr}
            {unitStr && (
              <tspan dx={`${fontSize * 0.05}px`} fontSize="0.6em">
                {unitStr}
              </tspan>
            )}
          </text>
        </svg>
      </Box>
      {subText && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            mt: 'auto', 
            mb: 0, // CardContent already provides bottom padding, no need for extra margin here
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
