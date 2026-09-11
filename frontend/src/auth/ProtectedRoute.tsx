import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { SkeletonBlock } from '../components/ui/Feedback';

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div style={{ padding: '2rem' }}>
        <SkeletonBlock height={28} width={220} />
        <div style={{ height: 16 }} />
        <SkeletonBlock height={160} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
