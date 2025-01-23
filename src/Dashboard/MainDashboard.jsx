import { createTheme } from "@mui/material/styles";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import ComponentDialog from "../components/ComponentDialog";
import { useState } from "react";
import {
  Add,
  AddBox,
  AddCircleRounded,
  Lock,
  MoreVert,
} from "@mui/icons-material";
import useLocalStorage from "../hooks/useLocalStorage";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DashboardContent from "./DashboardContent";
import { Fab, IconButton, Menu } from "@mui/material";
import ModalDashSettings from "../components/ModalDashSettings";

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: { light: true, dark: true },
});

function MainDashboard({ router, ...props }) {
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

  function DashIcons({ lockMode, setLockMode }) {
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);

    const openMenu = (event) => {
      setMenuAnchorEl(event.currentTarget);
    };

    const closeMenu = () => {
      setMenuAnchorEl(null);
    };

    return (
      <>
        <IconButton type="button" aria-label="add" onClick={() => {setIsModalOpen(true); setEditComponent(null);}}>
          <Add />
        </IconButton>

        <IconButton type="button" aria-label="more" onClick={openMenu}>
          <MoreVert />
        </IconButton>

        <ModalDashSettings
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={closeMenu}
          lockMode={lockMode}
          setLockMode={setLockMode}
        />
      </>
    );
  }

  const { window } = props;
  // const router = useSimpleRouter("/home");
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
  const [lockMode, setLockMode] = useState(false);

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
      <DashboardLayout
        slots={{
          toolbarActions: () => (
            <DashIcons lockMode={lockMode} setLockMode={setLockMode} />
          ),
        }}
      >
        <DashboardContent
          router={router}
          lockMode={lockMode}
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
