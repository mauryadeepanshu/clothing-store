import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export function ProtectedRoute() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner className="min-h-[60vh]" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner className="min-h-screen" />;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner className="min-h-[60vh]" />;
  if (user) return <Navigate to={location.state?.from || (user.role === 'admin' ? '/admin' : '/account')} replace />;
  return <Outlet />;
}
