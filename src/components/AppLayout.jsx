// src/components/AppLayout.jsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  IconButton,
  Box,
  Button,
  Tooltip,
  Stack,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { AppProvider, DashboardLayout } from "@toolpad/core";
import {
  Settings,
  Dashboard as DashboardIcon,
  MoreVert,
  AddBox,
  Add,
  TravelExplore,
  Edit,
  CheckRounded,
  CloudDone,
  CloudOff,
  DriveFileRenameOutline,
  DeleteOutline,
} from "@mui/icons-material";

import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";
import ComponentDialog from "./ComponentDialog";
import DiscoveryDialog from "./DiscoveryDialog";

// --- Start of inlined file: src/components/AppLayoutParts/useDashboardManager.js ---
const useDashboardManager = (appConfig, setAppConfig, currentDashboardId) => {
  const navigate = useNavigate();
  const [newDashTitle, setNewDashTitle] = useState("");
  const [renameDashInfo, setRenameDashInfo] = useState({
    open: false,
    id: null,
    name: "",
  });
  const [dashMenuAnchorEl, setDashMenuAnchorEl] = useState(null);
  const [activeDashIdForMenu, setActiveDashIdForMenu] = useState(null);

  const handleAddDashboard = useCallback(() => {
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
      setNewDashTitle("");
    }
  }, [newDashTitle, setAppConfig, navigate]);

  const handleRenameDashboard = useCallback(() => {
    if (renameDashInfo.id && renameDashInfo.name.trim()) {
      setAppConfig((prev) => {
        const updatedDashboards = { ...prev.dashboards };
        updatedDashboards[renameDashInfo.id].title =
          renameDashInfo.name.trim();
        return { ...prev, dashboards: updatedDashboards };
      });
      setRenameDashInfo({ open: false, id: null, name: "" });
    }
  }, [renameDashInfo, setAppConfig]);

  const handleDeleteDashboard = useCallback(
    (dashboardId) => {
      if (dashboardId && Object.keys(appConfig.dashboards).length > 1) {
        setAppConfig((prev) => {
          const updated = { ...prev.dashboards };
          delete updated[dashboardId];
          if (currentDashboardId === dashboardId) {
            navigate(`/${Object.keys(updated)[0]}`);
          }
          return { ...prev, dashboards: updated };
        });
      }
    },
    [appConfig.dashboards, currentDashboardId, setAppConfig, navigate]
  );

  const handleDashMenuOpen = useCallback((event, dashboardId) => {
    event.preventDefault();
    event.stopPropagation();
    setDashMenuAnchorEl(event.currentTarget);
    setActiveDashIdForMenu(dashboardId);
  }, []);

  const handleDashMenuClose = useCallback(() => {
    setDashMenuAnchorEl(null);
    setActiveDashIdForMenu(null);
  }, []);

  return {
    newDashTitle,
    setNewDashTitle,
    renameDashInfo,
    setRenameDashInfo,
    dashMenuAnchorEl,
    activeDashIdForMenu,
    handleAddDashboard,
    handleRenameDashboard,
    handleDeleteDashboard,
    handleDashMenuOpen,
    handleDashMenuClose,
  };
};
// --- End of inlined file: src/components/AppLayoutParts/useDashboardManager.js ---

// --- Start of inlined file: src/components/AppLayoutParts/useComponentManager.js ---
const useComponentManager = (setAppConfig, currentDashboardId, handlers) => {
  const handleLayoutChange = useCallback(
    (newLayout) => {
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
    },
    [currentDashboardId, setAppConfig]
  );

  const handleAddComponent = useCallback(
    (newComponent) => {
      handlers.handleAddComponent(newComponent, currentDashboardId);
    },
    [handlers, currentDashboardId]
  );

  return {
    handleLayoutChange,
    handleAddComponent,
    handleSaveComponent: handlers.handleSaveComponent,
    handleDeleteComponent: handlers.handleDeleteComponent,
  };
};
// --- End of inlined file: src/components/AppLayoutParts/useComponentManager.js ---

// --- Start of inlined file: src/components/AppLayoutParts/useDialogs.js ---
const useDialogs = (appConfig) => {
  const [isComponentModalOpen, setComponentModalOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isAddDashDialogOpen, setAddDashDialogOpen] = useState(false);
  const [editComponent, setEditComponent] = useState(null);

  const handleEditComponentClick = useCallback(
    (id) => {
      const component = Object.values(appConfig.dashboards)
        .flatMap((d) => d.components)
        .find((c) => c.id === id);
      setEditComponent(component);
      setComponentModalOpen(true);
    },
    [appConfig.dashboards]
  );

  const closeComponentDialog = useCallback(() => {
    setComponentModalOpen(false);
    setEditComponent(null);
  }, []);

  return {
    isComponentModalOpen,
    openComponentDialog: () => setComponentModalOpen(true),
    closeComponentDialog,
    isDiscoveryOpen,
    openDiscoveryDialog: () => setIsDiscoveryOpen(true),
    closeDiscoveryDialog: () => setIsDiscoveryOpen(false),
    isAddDashDialogOpen,
    openAddDashDialog: () => setAddDashDialogOpen(true),
    closeAddDashDialog: () => setAddDashDialogOpen(false),
    editComponent,
    handleEditComponentClick,
  };
};
// --- End of inlined file: src/components/AppLayoutParts/useDialogs.js ---

// --- Start of inlined file: src/components/AppLayoutParts/AppToolbar.jsx ---
const AppToolbar = ({
  isEditMode,
  setIsEditMode,
  openComponentDialog,
  openDiscoveryDialog,
  isSettingsPage,
}) => {
  if (isSettingsPage) {
    return null;
  }

  return isEditMode ? (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Tooltip title="Додати віджет">
        <IconButton onClick={openComponentDialog}>
          <Add />
        </IconButton>
      </Tooltip>
      <Tooltip title="Пошук пристроїв">
        <IconButton onClick={openDiscoveryDialog}>
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
    </Box>
  ) : (
    <Tooltip title="Редагувати дашборд">
      <IconButton onClick={() => setIsEditMode(true)}>
        <Edit />
      </IconButton>
    </Tooltip>
  );
};

const AppTitle = ({ status }) => (
  <Stack direction="row" alignItems="center" spacing={2}>
    <Typography variant="h6">EdwIC</Typography>
    <Tooltip title={status}>
      {status === "All online" ? (
        <CloudDone color="success" />
      ) : (
        <CloudOff color="error" />
      )}
    </Tooltip>
  </Stack>
);
// --- End of inlined file: src/components/AppLayoutParts/AppToolbar.jsx ---

// --- Start of inlined file: src/components/AppLayoutParts/DashboardMenu.jsx ---
const DashboardMenu = ({ anchorEl, onClose, onRename, onDelete, canDelete }) => {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <MenuItem onClick={onRename}>
        <ListItemIcon>
          <DriveFileRenameOutline fontSize="small" />
        </ListItemIcon>
        <ListItemText>Перейменувати</ListItemText>
      </MenuItem>
      <MenuItem onClick={onDelete} disabled={!canDelete}>
        <ListItemIcon>
          <DeleteOutline fontSize="small" />
        </ListItemIcon>
        <ListItemText>Видалити</ListItemText>
      </MenuItem>
    </Menu>
  );
};
// --- End of inlined file: src/components/AppLayoutParts/DashboardMenu.jsx ---

// --- Start of inlined file: src/components/AppLayoutParts/AddDashboardDialog.jsx ---
const AddDashboardDialog = ({ isOpen, onClose, onAdd, title, setTitle }) => {
  const handleAdd = () => {
    onAdd();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Додати новий дашборд</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Назва дашборду"
          type="text"
          fullWidth
          variant="standard"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAdd()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Відмінити</Button>
        <Button onClick={handleAdd} disabled={!title.trim()}>
          Додати
        </Button>
      </DialogActions>
    </Dialog>
  );
};
// --- End of inlined file: src/components/AppLayoutParts/AddDashboardDialog.jsx ---

// --- Start of inlined file: src/components/AppLayoutParts/RenameDashboardDialog.jsx ---
const RenameDashboardDialog = ({
  isOpen,
  onClose,
  onRename,
  renameInfo,
  setRenameInfo,
}) => {
  const handleRename = () => {
    onRename();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Перейменувати дашборд</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Нова назва"
          type="text"
          fullWidth
          variant="standard"
          value={renameInfo.name}
          onChange={(e) => setRenameInfo((p) => ({ ...p, name: e.target.value }))}
          onKeyPress={(e) => e.key === "Enter" && handleRename()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Відмінити</Button>
        <Button onClick={handleRename} disabled={!renameInfo.name.trim()}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};
// --- End of inlined file: src/components/AppLayoutParts/RenameDashboardDialog.jsx ---

function AppLayout({
  appConfig,
  setAppConfig,
  globalConnectionStatus,
  handlers,
  themeMode,
  setThemeMode,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentDashboardId = location.pathname.split("/")[1] || null;

  const [isEditMode, setIsEditMode] = useState(false);

  const {
    isComponentModalOpen,
    openComponentDialog,
    closeComponentDialog,
    isDiscoveryOpen,
    openDiscoveryDialog,
    closeDiscoveryDialog,
    isAddDashDialogOpen,
    openAddDashDialog,
    closeAddDashDialog,
    editComponent,
    handleEditComponentClick,
  } = useDialogs(appConfig);

  const {
    newDashTitle,
    setNewDashTitle,
    renameDashInfo,
    setRenameDashInfo,
    dashMenuAnchorEl,
    activeDashIdForMenu,
    handleAddDashboard,
    handleRenameDashboard,
    handleDeleteDashboard,
    handleDashMenuOpen,
    handleDashMenuClose,
  } = useDashboardManager(appConfig, setAppConfig, currentDashboardId);

  const {
    handleLayoutChange,
    handleAddComponent,
    handleSaveComponent,
    handleDeleteComponent,
  } = useComponentManager(setAppConfig, currentDashboardId, handlers);

  useEffect(() => {
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

  const router = useMemo(
    () => ({
      navigate: (path) =>
        path === "/add-dash" ? openAddDashDialog() : navigate(path),
      pathname: location.pathname,
      searchParams: new URLSearchParams(location.search),
    }),
    [navigate, location.pathname, openAddDashDialog]
  );

  return (
    <AppProvider
      router={router}
      branding={{ logo: false, title: "" }}
      navigation={[
        { kind: "header", title: "Мої дашборди" },
        ...Object.entries(appConfig.dashboards).map(([id, { title }]) => ({
          segment: id,
          icon: <DashboardIcon />,
          title,
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
          appTitle: () => <AppTitle status={globalConnectionStatus} />,
          toolbarActions: () => (
            <AppToolbar
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              openComponentDialog={openComponentDialog}
              openDiscoveryDialog={openDiscoveryDialog}
              isSettingsPage={location.pathname.startsWith("/settings")}
            />
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
                  onDeleteComponent={handleDeleteComponent}
                  onLayoutChange={handleLayoutChange}
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
                themeMode={themeMode}
                setThemeMode={setThemeMode}
              />
            }
          />
          <Route path="*" element={<div>404 - Сторінку не знайдено</div>} />
        </Routes>
      </DashboardLayout>

      <DashboardMenu
        anchorEl={dashMenuAnchorEl}
        onClose={handleDashMenuClose}
        onRename={() => {
          const currentName =
            appConfig.dashboards[activeDashIdForMenu]?.title || "";
          setRenameDashInfo({
            open: true,
            id: activeDashIdForMenu,
            name: currentName,
          });
          handleDashMenuClose();
        }}
        onDelete={() => {
          handleDeleteDashboard(activeDashIdForMenu);
          handleDashMenuClose();
        }}
        canDelete={Object.keys(appConfig.dashboards).length > 1}
      />

      <ComponentDialog
        isOpen={isComponentModalOpen}
        onClose={closeComponentDialog}
        onSave={handleSaveComponent}
        onAdd={handleAddComponent}
        component={editComponent}
        isEdit={!!editComponent}
      />
      <DiscoveryDialog
        isOpen={isDiscoveryOpen}
        onClose={closeDiscoveryDialog}
        onAddEntity={handleAddComponent}
      />
      <AddDashboardDialog
        isOpen={isAddDashDialogOpen}
        onClose={closeAddDashDialog}
        onAdd={handleAddDashboard}
        title={newDashTitle}
        setTitle={setNewDashTitle}
      />
      <RenameDashboardDialog
        isOpen={renameDashInfo.open}
        onClose={() => setRenameDashInfo({ open: false, id: null, name: "" })}
        onRename={handleRenameDashboard}
        renameInfo={renameDashInfo}
        setRenameInfo={setRenameDashInfo}
      />
    </AppProvider>
  );
}

export default AppLayout;