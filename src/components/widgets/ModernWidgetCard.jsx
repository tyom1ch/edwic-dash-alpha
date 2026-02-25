import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

export const ModernWidgetCard = ({ title, children, highlightColor, statusIcon, onClick }) => {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.2s, border-color 0.2s",
        "&:hover": onClick ? { boxShadow: 4, borderColor: "primary.main" } : {},
      }}
    >


      {/* Modern Widget Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, pb: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </Typography>
        {statusIcon && (
          <Box sx={{ color: "text.secondary", display: "flex" }}>
            {statusIcon}
          </Box>
        )}
      </Box>

      {/* Main Content Area */}
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          p: 1.5,
          "&:last-child": { pb: 1.5 },
          overflow: "hidden", // КАТЕГОРИЧНО заборонено виходити за межі
          minHeight: 0, // Необхідно для правильного flex-shrink
          minWidth: 0,
          width: "100%",
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};
