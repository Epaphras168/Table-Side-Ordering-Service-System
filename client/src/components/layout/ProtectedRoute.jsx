import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';

export const HOME_BY_ROLE = {
  waiter: '/waiter',
  kitchen: '/kitchen',
  manager: '/manager/menu',
};

export default function ProtectedRoute({ roles, children }) {
  const { user, status } = useAuth();

  if (status === 'loading') return <Spinner label="Loading TOSS…" />;
  if (status === 'signed-out') return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  return children;
}
