import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/client';
import { FullPageSpinner } from '../../components/ui/Spinner';

function isAuthed() {
  return !!localStorage.getItem('accessToken');
}

/**
 * AuthGuard — Protects all authenticated routes.
 * Redirects to /login if no token is found.
 * Restores session from API on refresh if token exists but no user in store.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, setUser, isLoading, setLoading, logout } = useAuthStore();

  useEffect(() => {
    if (isAuthed() && !user) {
      setLoading(true);
      authApi.me()
        .then(setUser)
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else if (!isAuthed()) {
      setLoading(false);
    }
  }, [user, setUser, setLoading, logout]);

  if (!isAuthed()) return <Navigate to="/login" replace />;
  if (isLoading) return <FullPageSpinner />;

  return <>{children}</>;
}
