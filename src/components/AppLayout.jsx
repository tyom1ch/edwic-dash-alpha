import React, { useState, useMemo, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { IconButton, Snackbar, Alert, Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
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
import { Capacitor } from "@capacitor/core";

// Компонент для відстеження глобальних подій і показу сповіщень (нативний MUI)
function GlobalNotificationListener({ brokers, brokerStatuses, brokerErrors }) {
  const [snackPack, setSnackPack] = useState([]);
  const [open, setOpen] = useState(false);
  const [messageInfo, setMessageInfo] = useState(undefined);
  
  const activeErrorToasts = useRef(new Set()); // Уникнення постійного спаму про один і той самий брокер

  // Базова функція для додавання сповіщення в чергу
  const pushToast = (message, severity = "info") => {
    setSnackPack((prev) => [...prev, { message, severity, key: new Date().getTime() + Math.random() }]);
  };

  // 1. Черга MUI Snackbar (стандартний патерн)
  useEffect(() => {
    if (snackPack.length && !messageInfo) {
      setMessageInfo({ ...snackPack[0] });
      setSnackPack((prev) => prev.slice(1));
      setOpen(true);
    } else if (snackPack.length && messageInfo && open) {
      setOpen(false); // Закриваємо поточний, щоб показати наступний
    }
  }, [snackPack, messageInfo, open]);

  // 2. Відстеження статусів брокерів
  useEffect(() => {
    Object.entries(brokerStatuses).forEach(([brokerId, status]) => {
      const broker = brokers?.find((b) => b.id === brokerId);
      const brokerName = broker ? (broker.name || broker.host) : brokerId;
      const errorMsg = brokerErrors[brokerId];

      if (status === "error" || (status === "offline" && errorMsg)) {
        if (!activeErrorToasts.current.has(brokerId)) {
          pushToast(`Помилка підключення до "${brokerName}": ${errorMsg || 'Брокер недоступний'}`, "error");
          activeErrorToasts.current.add(brokerId);
        }
      } else if (status === "connected") {
        if (activeErrorToasts.current.has(brokerId)) {
          pushToast(`З'єднання з "${brokerName}" встановлено!`, "success");
          activeErrorToasts.current.delete(brokerId);
        }
      } else if (status === "connecting" || status === "reconnecting") {
        activeErrorToasts.current.delete(brokerId);
      }
    });
  }, [brokers, brokerStatuses, brokerErrors]);

  // 3. Відстеження користувацьких Алертів з фону (ТІЛЬКИ на Web — на Android пуш-нотифікації від нативного сервісу)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // Нативний сервіс сам робить пуші
    const handleAlerts = ({ alert, message }) => {
      pushToast(message, "warning");
    };

    eventBus.on("app:alert_triggered", handleAlerts);
    return () => {
      eventBus.off("app:alert_triggered", handleAlerts);
    };
  }, []);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleExited = () => {
    setMessageInfo(undefined);
  };

  return (
    <Snackbar
      key={messageInfo ? messageInfo.key : undefined}
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ zIndex: 9999 }}
    >
      <Alert onClose={handleClose} severity={messageInfo?.severity || "info"} sx={{ width: '100%' }} variant="filled">
        {messageInfo ? messageInfo.message : ""}
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
  
  // Section delete with confirmation
  const [confirmDeleteSection, setConfirmDeleteSection] = useState(null);
  const handleDeleteSection = (sectionId) => setConfirmDeleteSection(sectionId);
  const confirmDeleteSectionAction = () => {
    if (confirmDeleteSection) {
      handlers.handleDeleteSection(currentDashboardId, confirmDeleteSection);
      setConfirmDeleteSection(null);
    }
  };
  
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
      branding={{ logo: null, title: "EdwIC" }}
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
      
      {/* Підтвердження видалення секції */}
      <Dialog open={!!confirmDeleteSection} onClose={() => setConfirmDeleteSection(null)}>
        <DialogTitle>Видалити секцію?</DialogTitle>
        <DialogContent>
          <Typography>
            Ви впевнені, що хочете видалити цю секцію? Всі віджети всередині неї будуть також видалені. Цю дію неможливо скасувати.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteSection(null)}>Скасувати</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteSectionAction}>
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </AppProvider>
  );
}

export default AppLayout;