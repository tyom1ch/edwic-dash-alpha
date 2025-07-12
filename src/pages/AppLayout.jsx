// src/components/AppLayout.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  createTheme,
  Box,
  IconButton,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { AppProvider, DashboardLayout } from "@toolpad/core";
import Stack from "@mui/material/Stack";
import {
  Add,
  Settings,
  Dashboard as DashboardIcon,
  TravelExplore,
  CloudDone,
  CloudOff,
  Edit,
  CheckRounded,
  MoreVert,
  DriveFileRenameOutline,
  DeleteOutline,
  AddBox,
} from "@mui/icons-material";

import DashboardPage from "./DashboardPage";
import SettingsPage from "./SettingsPage";
import ComponentDialog from "../components/ComponentDialog";
import DiscoveryDialog from "../components/DiscoveryDialog";

function AppLayout({
  appConfig,
  setAppConfig,
  globalConnectionStatus,
  handlers,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // --- СТАН ---
  const [isComponentModalOpen, setComponentModalOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);

  // Новий стан для режиму редагування дашборду
  const [isEditMode, setIsEditMode] = useState(false);

  // Стани для діалогів додавання/редагування дашбордів
  const [isAddDashDialogOpen, setAddDashDialogOpen] = useState(false);
  const [newDashTitle, setNewDashTitle] = useState("");
  const [renameDashInfo, setRenameDashInfo] = useState({
    open: false,
    id: null,
    name: "",
  });

  // Стан для меню керування дашбордом
  const [dashMenuAnchorEl, setDashMenuAnchorEl] = useState(null);
  const [activeDashIdForMenu, setActiveDashIdForMenu] = useState(null);

  // --- НАВІГАЦІЯ ТА РОУТИНГ ---
  useEffect(() => {
    // Автоматична навігація при завантаженні
    if (
      location.pathname === "/" &&
      Object.keys(appConfig.dashboards).length > 0
    ) {
      navigate(`/${Object.keys(appConfig.dashboards)[0]}`);
    } else if (
      Object.keys(appConfig.dashboards).length === 0 &&
      !location.pathname.startsWith("/settings")
    ) {
      navigate("/settings");
    }
  }, [appConfig.dashboards, navigate, location.pathname]);

  const router = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      navigate: (path) =>
        path === "/add-dash" ? setAddDashDialogOpen(true) : navigate(path),
      pathname: location.pathname,
      searchParams: searchParams,
    };
  }, [navigate, location.pathname, location.search]);

  // --- ОБРОБНИКИ ДАШБОРДІВ ---
  const currentDashboardId = location.pathname.split("/")[1] || null;

  const handleAddDashboard = () => {
    if (newDashTitle.trim()) {
      const newId = `dashboard-${Date.now()}`;
      setAppConfig((p) => ({
        ...p,
        dashboards: {
          ...p.dashboards,
          [newId]: { title: newDashTitle.trim(), components: [] },
        },
      }));
      navigate(`/${newId}`);
      setAddDashDialogOpen(false);
      setNewDashTitle("");
    }
  };

  const handleRenameDashboard = () => {
    if (renameDashInfo.id && renameDashInfo.name.trim()) {
      setAppConfig((prev) => {
        const updatedDashboards = { ...prev.dashboards };
        updatedDashboards[renameDashInfo.id].title = renameDashInfo.name.trim();
        return { ...prev, dashboards: updatedDashboards };
      });
      setRenameDashInfo({ open: false, id: null, name: "" });
    }
  };

  const handleDeleteDashboard = (dashboardId) => {
    if (dashboardId && Object.keys(appConfig.dashboards).length > 1) {
      setAppConfig((prev) => {
        const updated = { ...prev.dashboards };
        delete updated[dashboardId];
        // Якщо видаляємо поточний дашборд, переходимо на перший з решти
        if (currentDashboardId === dashboardId) {
          navigate(`/${Object.keys(updated)[0]}`);
        }
        return { ...prev, dashboards: updated };
      });
    }
  };

  // --- ОБРОБНИКИ КОМПОНЕНТІВ ---
  const handleEditComponentClick = (id) => {
    const component = Object.values(appConfig.dashboards)
      .flatMap((d) => d.components)
      .find((c) => c.id === id);
    setEditComponent(component);
    setComponentModalOpen(true);
  };

  const handleLayoutChange = (newLayout) => {
    if (!currentDashboardId) return;
    setAppConfig((prev) => {
      if (!prev.dashboards[currentDashboardId]) return prev;
      const updatedDashboards = { ...prev.dashboards };
      const updatedDashboard = { ...updatedDashboards[currentDashboardId] };
      updatedDashboard.components = updatedDashboard.components.map(
        (component) => {
          const layoutItem = newLayout.find(
            (item) => String(item.i) === String(component.id)
          );
          return layoutItem
            ? {
                ...component,
                layout: {
                  x: layoutItem.x,
                  y: layoutItem.y,
                  w: layoutItem.w,
                  h: layoutItem.h,
                },
              }
            : component;
        }
      );
      updatedDashboards[currentDashboardId] = updatedDashboard;
      return { ...prev, dashboards: updatedDashboards };
    });
  };

  // --- ОБРОБНИКИ МЕНЮ ---
  const handleDashMenuOpen = (event, dashboardId) => {
    event.preventDefault();

    event.stopPropagation(); // Зупиняємо навігацію при кліку на іконку
    setDashMenuAnchorEl(event.currentTarget);
    setActiveDashIdForMenu(dashboardId);
  };

  const handleDashMenuClose = () => {
    setDashMenuAnchorEl(null);
    setActiveDashIdForMenu(null);
  };

  // --- UI КОМПОНЕНТИ ---
  const demoTheme = createTheme({
    cssVariables: { colorSchemeSelector: "data-toolpad-color-scheme" },
    colorSchemes: { light: true, dark: true },
  });

  const isOnline = globalConnectionStatus === "All online";
  const StatusIcon = isOnline ? CloudDone : CloudOff;

  const CustomAppTitle = () => (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Typography variant="h6">EdwIC</Typography>
      <Tooltip title={globalConnectionStatus}>
        <StatusIcon color={isOnline ? "success" : "error"} />
      </Tooltip>
    </Stack>
  );

  return (
    <AppProvider
      theme={demoTheme}
      router={router}
      branding={{ logo: false, title: "" }}
      navigation={[
        { kind: "header", title: "Мої дашборди" },
        ...Object.entries(appConfig.dashboards).map(([id, { title }]) => ({
          segment: id,
          icon: <DashboardIcon />,
          title,
          // Ось і наша нова фіча: кнопка дій для кожного дашборду
          action: (
            <IconButton size="small" onClick={(e) => handleDashMenuOpen(e, id)}>
              <MoreVert fontSize="small" />
            </IconButton>
          ),
        })),
        { kind: "divider" },
        { segment: "add-dash", title: "Додати дашборд", icon: <AddBox /> },
        { segment: "settings", title: "Налаштування", icon: <Settings /> },
      ]}
    >
      <DashboardLayout
        slots={{
          appTitle: CustomAppTitle,
          toolbarActions: () => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {!location.pathname.startsWith("/settings") &&
                (isEditMode ? (
                  <>
                    <Tooltip title="Додати віджет">
                      <IconButton onClick={() => setComponentModalOpen(true)}>
                        <Add />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Пошук пристроїв">
                      <IconButton onClick={() => setIsDiscoveryOpen(true)}>
                        <TravelExplore />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      startIcon={<CheckRounded />}
                      onClick={() => setIsEditMode(false)}
                      size="small"
                    >
                      Готово
                    </Button>
                  </>
                ) : (
                  <Tooltip title="Редагувати дашборд">
                    <IconButton onClick={() => setIsEditMode(true)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                ))}
            </Box>
          ),
        }}
      >
        <Routes>
          {Object.keys(appConfig.dashboards).map((id) => (
            <Route
              key={id}
              path={`/${id}`}
              element={
                <DashboardPage
                  dashboard={appConfig.dashboards[id]}
                  onEditComponent={handleEditComponentClick}
                  onDeleteComponent={handlers.handleDeleteComponent}
                  onLayoutChange={handleLayoutChange}
                  // Передаємо `isEditMode` як протилежність до `lockMode`
                  lockMode={!isEditMode}
                />
              }
            />
          ))}
          <Route
            path="/settings"
            element={
              <SettingsPage
                brokers={appConfig.brokers}
                setBrokers={handlers.handleSetBrokers}
              />
            }
          />
          <Route path="*" element={<div>404 - Сторінку не знайдено</div>} />
        </Routes>
      </DashboardLayout>

      {/* Меню для керування дашбордом */}
      <Menu
        anchorEl={dashMenuAnchorEl}
        open={Boolean(dashMenuAnchorEl)}
        onClose={handleDashMenuClose}
      >
        <MenuItem
          onClick={() => {
            const currentName =
              appConfig.dashboards[activeDashIdForMenu]?.title || "";
            setRenameDashInfo({
              open: true,
              id: activeDashIdForMenu,
              name: currentName,
            });
            handleDashMenuClose();
          }}
        >
          <ListItemIcon>
            <DriveFileRenameOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>Перейменувати</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDeleteDashboard(activeDashIdForMenu);
            handleDashMenuClose();
          }}
          disabled={Object.keys(appConfig.dashboards).length <= 1}
        >
          <ListItemIcon>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>Видалити</ListItemText>
        </MenuItem>
      </Menu>

      {/* Діалогові вікна */}
      <ComponentDialog
        isOpen={isComponentModalOpen}
        onClose={() => {
          setComponentModalOpen(false);
          setEditComponent(null);
        }}
        onSave={handlers.handleSaveComponent}
        onAdd={(newComp) =>
          handlers.handleAddComponent(newComp, currentDashboardId)
        }
        component={editComponent}
        isEdit={!!editComponent}
      />
      <DiscoveryDialog
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onAddEntity={(entity) =>
          handlers.handleAddComponent(entity, currentDashboardId)
        }
      />
      <Dialog
        open={isAddDashDialogOpen}
        onClose={() => setAddDashDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Додати новий дашборд</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Назва дашборду"
            type="text"
            fullWidth
            variant="standard"
            value={newDashTitle}
            onChange={(e) => setNewDashTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddDashboard()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDashDialogOpen(false)}>Відмінити</Button>
          <Button onClick={handleAddDashboard} disabled={!newDashTitle.trim()}>
            Додати
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={renameDashInfo.open}
        onClose={() => setRenameDashInfo({ open: false, id: null, name: "" })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Перейменувати дашборд</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Нова назва"
            type="text"
            fullWidth
            variant="standard"
            value={renameDashInfo.name}
            onChange={(e) =>
              setRenameDashInfo((p) => ({ ...p, name: e.target.value }))
            }
            onKeyPress={(e) => e.key === "Enter" && handleRenameDashboard()}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setRenameDashInfo({ open: false, id: null, name: "" })
            }
          >
            Відмінити
          </Button>
          <Button
            onClick={handleRenameDashboard}
            disabled={!renameDashInfo.name.trim()}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </AppProvider>
  );
}

export default AppLayout;
