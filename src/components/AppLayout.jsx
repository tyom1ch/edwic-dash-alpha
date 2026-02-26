import React, { useState, useMemo, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { IconButton, Snackbar, Alert, Box } from "@mui/material";
import { AppProvider, DashboardLayout } from "@toolpad/core";
import {
  Settings,
  Dashboard as DashboardIcon,
  MoreVert,
  AddBox,
} from "@mui/icons-material";

import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";
import ComponentDialog from "./ComponentDialog";
import DiscoveryDialog from "./DiscoveryDialog";

import { useDashboardManager } from "../hooks/useDashboardManager";
import { useComponentManager } from "../hooks/useComponentManager";
import { useDialogs } from "../hooks/useDialogs";
import { AppToolbar, AppTitle } from "./layout/AppToolbar";
import { DashboardMenu } from "./layout/DashboardMenu";
import { AddDashboardDialog } from "./dialogs/AddDashboardDialog";
import { RenameDashboardDialog } from "./dialogs/RenameDashboardDialog";
import eventBus from "../core/EventBus";

// Компонент для відстеження глобальних подій і показу сповіщень (нативний MUI)
function GlobalNotificationListener({ brokers, brokerStatuses, brokerErrors }) {
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const activeErrorToasts = useRef(new Set()); // Уникнення спаму

  useEffect(() => {
    Object.entries(brokerStatuses).forEach(([brokerId, status]) => {
      const broker = brokers?.find((b) => b.id === brokerId);
      const brokerName = broker ? (broker.name || broker.host) : brokerId;
      const errorMsg = brokerErrors[brokerId];

      if (status === "error" || (status === "offline" && errorMsg)) {
        if (!activeErrorToasts.current.has(brokerId)) {
          setToast({
            open: true,
            message: `Помилка підключення до "${brokerName}": ${errorMsg || 'Брокер недоступний'}`,
            severity: "error"
          });
          activeErrorToasts.current.add(brokerId);
        }
      } else if (status === "connected") {
        if (activeErrorToasts.current.has(brokerId)) {
          setToast({
            open: true,
            message: `З'єднання з "${brokerName}" встановлено!`,
            severity: "success"
          });
          activeErrorToasts.current.delete(brokerId);
        }
      } else if (status === "connecting" || status === "reconnecting") {
        // Очищаємо трекер, щоб сповіщення могло з'явитись знову після редагування брокера
        activeErrorToasts.current.delete(brokerId);
      }
    });
  }, [brokers, brokerStatuses, brokerErrors]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast(prev => ({ ...prev, open: false }));
  };

  return (
    <Snackbar
      open={toast.open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ zIndex: 9999 }}
    >
      <Alert onClose={handleClose} severity={toast.severity} sx={{ width: '100%' }} variant="filled">
        {toast.message}
      </Alert>
    </Snackbar>
  );
}

function AppLayout({
  appConfig,
  setAppConfig,
  globalConnectionStatus,
  brokerStatuses,
  brokerErrors,
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
    handleDragEnd,
    handleAddComponent,
    handleSaveComponent,
    handleDeleteComponent,
  } = useComponentManager(setAppConfig, currentDashboardId, handlers);

  // Which section the user clicked [+ Add widget] in
  const pendingSectionIdRef = React.useRef(null);

  // Called from SectionColumn's [+] button
  const handleAddToSection = (sectionId) => {
    pendingSectionIdRef.current = sectionId;
    openComponentDialog();
  };

  // Wrapped add – ensures component goes into the right section
  const handleAddComponentToSection = (newComponent, dashId = currentDashboardId) => {
    handlers.handleAddComponent(newComponent, dashId, pendingSectionIdRef.current);
    pendingSectionIdRef.current = null;
  };

  // Section-level handlers
  const handleAddSection = () => handlers.handleAddSection(currentDashboardId);
  const handleDeleteSection = (sectionId) => handlers.handleDeleteSection(currentDashboardId, sectionId);
  const handleRenameSection = (sectionId, newTitle) => handlers.handleRenameSection(currentDashboardId, sectionId, newTitle);

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
      <Box sx={{
        minHeight: '100dvh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
        transition: 'background-color 0.3s',
        pt: 'env(safe-area-inset-top, 0px)',
        pb: 'env(safe-area-inset-bottom, 0px)',
        pl: 'env(safe-area-inset-left, 0px)',
        pr: 'env(safe-area-inset-right, 0px)'
      }}>
      <DashboardLayout
        slots={{
          appTitle: () => (
            <AppTitle 
              status={globalConnectionStatus} 
              brokers={appConfig.brokers}
              brokerStatuses={brokerStatuses}
              brokerErrors={brokerErrors}
            />
          ),
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
                  onDragEnd={handleDragEnd}
                  onAddSection={handleAddSection}
                  onDeleteSection={handleDeleteSection}
                  onRenameSection={handleRenameSection}
                  onAddComponentToSection={handleAddToSection}
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
        <GlobalNotificationListener 
          brokers={appConfig.brokers} 
          brokerStatuses={brokerStatuses} 
          brokerErrors={brokerErrors} 
        />
      </DashboardLayout>
      </Box>

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
        onAdd={handleAddComponentToSection}
        component={editComponent}
        isEdit={!!editComponent}
        brokers={appConfig.brokers}
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