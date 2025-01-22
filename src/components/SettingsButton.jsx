import React from "react";
import { IconButton } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const SettingsButton = ({ onClick }) => {
  return (
    <IconButton
      onClick={onClick}
      sx={{ position: "absolute", top: 16, right: 16 }}
    >
      <MoreVertIcon />
    </IconButton>
  );
};

export default SettingsButton;
