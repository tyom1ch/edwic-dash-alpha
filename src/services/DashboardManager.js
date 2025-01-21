import useLocalStorage from '../hooks/useLocalStorage';

const initialDashboards = {
  dashboards: {
    'dashboard-1': { title: 'Dashboard 1', components: [] },
    'dashboard-2': { title: 'Dashboard 2', components: [] },
  },
};

const DashboardManager = () => {
  const [dashboards, setDashboards] = useLocalStorage('dashboards', initialDashboards);

  const addDashboard = (title) => {
    const id = `dashboard-${Date.now()}`;
    const newDashboard = { [id]: { title, components: [] } };
    setDashboards((prevState) => ({
      dashboards: { ...prevState.dashboards, ...newDashboard },
    }));
  };

  const removeDashboard = (id) => {
    const updatedDashboards = { ...dashboards.dashboards };
    delete updatedDashboards[id];
    setDashboards({ dashboards: updatedDashboards });
  };

  const addComponentToDashboard = (dashboardId, component) => {
    const updatedDashboards = { ...dashboards.dashboards };
    updatedDashboards[dashboardId].components.push(component);
    setDashboards({ dashboards: updatedDashboards });
  };

  const removeComponentFromDashboard = (dashboardId, componentId) => {
    const updatedDashboards = { ...dashboards.dashboards };
    updatedDashboards[dashboardId].components = updatedDashboards[dashboardId].components.filter(
      (comp) => comp.id !== componentId
    );
    setDashboards({ dashboards: updatedDashboards });
  };

  return {
    dashboards: dashboards.dashboards,
    addDashboard,
    removeDashboard,
    addComponentToDashboard,
    removeComponentFromDashboard,
  };
};

export default DashboardManager;
