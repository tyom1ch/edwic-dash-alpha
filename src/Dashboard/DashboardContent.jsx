import Box from "@mui/material/Box";
import { useState } from "react";
import { IconButton, Menu, MenuItem, Button } from "@mui/material";
import Grid from "@mui/material/Grid2";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CustomComponent from "../customComponent/CustomComponent";
import EntityManagerDebug from "../entities/EntityManagerDebug";
import AddDashboardPage from "./AddDashboardPage";

function DashboardContent({
  dashboards,
  currentDashboardId,
  onAddComponent,
  onEditComponent,
  onDeleteComponent,
  onAddDashboard,
  router,
  lockMode
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  const handleMenuOpen = (event, id) => {
    setAnchorEl(event.currentTarget);
    setSelectedComponentId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const currentDashboard = dashboards[currentDashboardId];

  if (!currentDashboard) {
    return <AddDashboardPage onAddDashboard={onAddDashboard} router={router} />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Box sx={{ width: "100%" }}>
        <Grid
          container
          spacing={2}
          padding={2}
          justifyContent={"center"}
          alignItems={"flex-end"}
        >
          {currentDashboard.components.map((component) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={component.id}
              style={{ position: "relative" }}
              sx={{ width: { xs: "1", sm: "auto", md: "auto" } }}
            >
              <CustomComponent type={component.type} props={component} />
              { lockMode ?
                <IconButton
                  onClick={(e) => handleMenuOpen(e, component.id)}
                  sx={{ position: "absolute", top: 8, right: 8 }}
                >
                  <MoreVertIcon />
                </IconButton> : true
              }
              <Menu
                anchorEl={anchorEl}
                open={selectedComponentId === component.id && anchorEl !== null}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
              >
                <MenuItem onClick={() => onEditComponent(component.id)}>
                  Редагувати
                </MenuItem>
                <MenuItem onClick={() => onDeleteComponent(component.id)}>
                  Видалити
                </MenuItem>
              </Menu>
            </Grid>
          ))}
        </Grid>
      </Box>


    </Box>
  );
}

export default DashboardContent;
