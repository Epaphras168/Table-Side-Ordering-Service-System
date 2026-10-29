import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute, { HOME_BY_ROLE } from './components/layout/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './views/Login';
import KitchenView from './views/kitchen/KitchenView';
import ManagerLayout from './views/manager/ManagerLayout';
import ActivityTab from './views/manager/ActivityTab';
import MenuTab from './views/manager/MenuTab';
import ReportsTab from './views/manager/ReportsTab';
import StaffTab from './views/manager/StaffTab';
import TablesTab from './views/manager/TablesTab';
import WaiterView from './views/waiter/WaiterView';

function Home() {
  const { user } = useAuth();
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />

        <Route
          path="waiter"
          element={
            <ProtectedRoute roles={['waiter']}>
              <WaiterView />
            </ProtectedRoute>
          }
        />

        <Route
          path="kitchen"
          element={
            <ProtectedRoute roles={['kitchen']}>
              <KitchenView />
            </ProtectedRoute>
          }
        />

        <Route
          path="manager"
          element={
            <ProtectedRoute roles={['manager']}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="menu" replace />} />
          <Route path="menu" element={<MenuTab />} />
          <Route path="tables" element={<TablesTab />} />
          <Route path="staff" element={<StaffTab />} />
          <Route path="reports" element={<ReportsTab />} />
          <Route path="activity" element={<ActivityTab />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
