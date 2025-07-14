// src/components/AppLayout.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { createTheme, IconButton } from "@mui/material";
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

// Import new hooks and components
import { useDashboardManager } from "./AppLayoutParts/useDashboardManager";
import { useComponentManager } from "./AppLayoutParts/useComponentManager";
import { useDialogs } from "./AppLayoutParts/useDialogs";
import { AppToolbar, AppTitle } from "./AppLayoutParts/AppToolbar";
import { DashboardMenu } from "./AppLayoutParts/DashboardMenu";
import { AddDashboardDialog } from "./AppLayoutParts/AddDashboardDialog";
import { RenameDashboardDialog } from "./AppLayoutParts/RenameDashboardDialog";

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
