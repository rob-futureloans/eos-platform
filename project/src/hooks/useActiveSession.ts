import { useAuth } from '../contexts/AuthContext';

export function useActiveSession() {
  const { isSuperUser, loading } = useAuth();
  return { isSuperUser, loading };
}
