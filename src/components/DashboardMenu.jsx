import React from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const DashboardMenu = ({ anchorEl, selectedComponentId, setAnchorEl, setEditComponent, setIsModalOpen, component, dashboards, setDashboards, activeDashboardId }) => (
  <Menu
    anchorEl={anchorEl}
    open={selectedComponentId === component.id && Boolean(anchorEl)}
    onClose={() => setAnchorEl(null)}
  >
    <MenuItem
      onClick={() => {
        setEditComponent(component);
        setIsModalOpen(true);
        setAnchorEl(null);
      }}
    >
      Edit
    </MenuItem>
    <MenuItem
      onClick={() => {
        const updatedDashboards = dashboards.map((dashboard) =>
          dashboard.id === activeDashboardId
            ? {
                ...dashboard,
                components: dashboard.components.filter((comp) => comp.id !== component.id),
              }
            : dashboard
        );
        setDashboards(updatedDashboards);
        setAnchorEl(null);
      }}
    >
      Delete
    </MenuItem>
  </Menu>
);

export default DashboardMenu;
