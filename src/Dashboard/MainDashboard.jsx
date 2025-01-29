import { createTheme } from "@mui/material/styles";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import ComponentDialog from "../components/ComponentDialog";
import { useEffect, useState } from "react";
import { Add, AddBox, MoreVert, Settings } from "@mui/icons-material";
import useLocalStorage from "../hooks/useLocalStorage";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DashboardContent from "./DashboardContent";
import { Fab, IconButton, Menu } from "@mui/material";
import ModalDashSettings from "../components/ModalDashSettings";
import SettingsPage from "./SettingsPage";

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
            ? { ...component, ...updatedComponent }
            : component
        );
      });
      return updatedDashboards;
    });
  };

  const handleDeleteDashboard = () => {
    if (Object.keys(dashboards).length > 1) {
      setDashboards((prevState) => {
        const updatedDashboards = { ...prevState };
        delete updatedDashboards[currentDashboardId];

        // Якщо видалено поточний дашборд, перевести на перший доступний дашборд або "dashboard-1".
        const remainingDashboardIds = Object.keys(updatedDashboards);
        const nextDashboardId = remainingDashboardIds[0] || "dashboard";

        router.navigate(`/${nextDashboardId}`); // Змінити маршрут на новий поточний дашборд

        return updatedDashboards;
      });
    }
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
        <IconButton
          type="button"
          aria-label="add"
          onClick={() => {
            setIsModalOpen(true);
            setEditComponent(null);
          }}
        >
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
          onDeleteDashboard={handleDeleteDashboard}
        />
      </>
    );
  }

  const { window } = props;

  const [dashboards, setDashboards] = useLocalStorage("dashboards", {
    dashboard: {
      title: "Головна",
      components: [],
    },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);

  const handleAddDashboard = (title) => {
    const newDashboardId = `dashboard-${Date.now()}`;
    router.navigate(`/${newDashboardId}`); // Змінити маршрут на новий поточний дашборд

    setDashboards((prevState) => ({
      ...prevState,
      [newDashboardId]: {
        title,
        components: [],
      },
    }));
  };

  const handleAddComponent = (newComponent) => {
    setDashboards((prevState) => {
      const updatedDashboards = { ...prevState };

      if (updatedDashboards[currentDashboardId]) {
        updatedDashboards[currentDashboardId] = {
          ...updatedDashboards[currentDashboardId],
          components: [
            ...updatedDashboards[currentDashboardId].components,
            {
              ...newComponent,
              id: Date.now(), // Генеруємо унікальний ID для компонента
            },
          ],
        };
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
  const currentDashboardId = router.pathname.split("/")[1] || "dashboard";
  const [lockMode, setLockMode] = useState(false);

  return (
    <AppProvider
      navigation={[
        {
          kind: "header",
          title: "Мої дашборди",
        },
        ...Object.entries(dashboards).map(([id, { title }]) => ({
          segment: id,
          icon: <DashboardIcon />,
          title,
        })),
        { kind: "divider" },
        {
          segment: "add-dash",
          title: "Додати дашборд",
          icon: <AddBox />,
        },
        {
          segment: "settings",
          title: "Налаштування",
          icon: <Settings />,
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
        {currentDashboardId === "settings" ? (
          <SettingsPage />
        ) : (
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
        )}

        {/* <DashboardContent
          router={router}
          lockMode={lockMode}
          dashboards={dashboards}
          currentDashboardId={currentDashboardId}
          onAddComponent={handleAddComponent}
          onEditComponent={handleEditComponent}
          onDeleteComponent={handleDeleteComponent}
          onAddDashboard={handleAddDashboard}
        /> */}
      </DashboardLayout>
      <ComponentDialog
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSave={handleSaveComponent}
        onAdd={handleAddComponent}
        component={editComponent}
        isEdit={editComponent !== null}
      />
    </AppProvider>
  );
}

export default MainDashboard;
