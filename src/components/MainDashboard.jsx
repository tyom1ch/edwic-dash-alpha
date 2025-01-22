import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createTheme } from "@mui/material/styles";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import useSimpleRouter from "../hooks/useSimpleRouter";
import { IconButton, Menu, MenuItem, Button } from "@mui/material";
import Grid from "@mui/material/Grid2";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ComponentDialog from "./ComponentDialog";
import CustomComponent from "./CustomComponent";
import { useState } from "react";
import EntityManagerDebug from "./EntityManagerDebug";
import useLocalStorage from "../hooks/useLocalStorage";

import DashboardIcon from "@mui/icons-material/Dashboard";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import { AddBox } from "@mui/icons-material";
import AddDashboardPage from "./AddDashboardPage";

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: { light: true, dark: true },
});

function DashboardContent({
  dashboards,
  currentDashboardId,
  onAddComponent,
  onEditComponent,
  onDeleteComponent,
  onAddDashboard,
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
    return <AddDashboardPage onAddDashboard={onAddDashboard}/>;
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
          >
            <CustomComponent type={component.type} props={component} />
            <IconButton
              onClick={(e) => handleMenuOpen(e, component.id)}
              sx={{ position: "absolute", top: 8, right: 8 }}
            >
              <MoreVertIcon />
            </IconButton>
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
      <EntityManagerDebug
        onAddComponent={(component) =>
          onAddComponent(currentDashboardId, component)
        }
      />
    </Box>
  );
}

function MainDashboard(props) {
  const handleSaveComponent = (updatedComponent) => {
    setDashboards((prevState) => {
      const updatedDashboards = { ...prevState };
      Object.keys(updatedDashboards).forEach((dashboardId) => {
        updatedDashboards[dashboardId].components = updatedDashboards[
          dashboardId
        ].components.map((component) =>
          component.id === updatedComponent.id
            ? { ...component, label: updatedComponent.title }
            : component
        );
      });
      return updatedDashboards;
    });
  };

  const handleAddDashboardMenu = () => {
    setIsModalOpen(true); // Відкриваємо модальне вікно для введення назви
  };

  const { window } = props;
  const router = useSimpleRouter("/home");
  const [dashboards, setDashboards] = useLocalStorage("dashboards", {
    "dashboard-1": {
      title: "Default Dashboard",
      components: [],
    },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);

  const handleAddDashboard = (title) => {
    const newDashboardId = `dashboard-${Date.now()}`;
    setDashboards((prevState) => ({
      ...prevState,
      [newDashboardId]: {
        title,
        components: [],
      },
    }));
  };

  const handleAddComponent = (dashboardId, newComponent) => {
    setDashboards((prevState) => {
      const updatedDashboards = { ...prevState };
      if (updatedDashboards[dashboardId]) {
        updatedDashboards[dashboardId].components.push({
          ...newComponent,
          id: Date.now(),
        });
      }
      return updatedDashboards;
    });
  };

  const handleEditComponent = (id) => {
    const component = Object.values(dashboards)
      .flatMap((dashboard) => dashboard.components)
      .find((comp) => comp.id === id);
    setEditComponent(component);
    setIsModalOpen(true);
  };

  const handleDeleteComponent = (id) => {
    setDashboards((prevState) => {
      const updatedDashboards = { ...prevState };
      Object.keys(updatedDashboards).forEach((dashboardId) => {
        updatedDashboards[dashboardId].components = updatedDashboards[
          dashboardId
        ].components.filter((comp) => comp.id !== id);
      });
      return updatedDashboards;
    });
  };

  // Отримуємо ID дашборду з роута
  // Заміна на router.pathname
  const currentDashboardId = router.pathname.split("/")[1] || "dashboard-1";

  return (
    <AppProvider
      navigation={[
        {
          kind: "header",
          title: "Dashboards",
        },
        ...Object.entries(dashboards).map(([id, { title }]) => ({
          segment: id,
          icon: <DashboardIcon />,
          title,
        })),
        { kind: "divider" },
        {
          segment: "add-dash",
          title: "Add dashboard",
          icon: <AddBox />,
          onClick: handleAddDashboardMenu,
        },
      ]}
      branding={{
        logo: <img src="https://mui.com/static/logo.png" alt="MUI logo" />,
        title: "EdwIC",
      }}
      router={router}
      theme={demoTheme}
      window={window}
    >
      <DashboardLayout>
        <DashboardContent
          dashboards={dashboards}
          currentDashboardId={currentDashboardId}
          onAddComponent={handleAddComponent}
          onEditComponent={handleEditComponent}
          onDeleteComponent={handleDeleteComponent}
          onAddDashboard={handleAddDashboard}
        />
      </DashboardLayout>
      <ComponentDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveComponent}
        component={editComponent}
        isEdit={editComponent !== null}
      />
    </AppProvider>
  );
}

export default MainDashboard;
