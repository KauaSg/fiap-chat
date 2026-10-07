import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from 'firebase/auth';
import { observeAuth } from '../services/authService';

export type AuthContextValue = {
  user: User | null;
  initializing: boolean;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return observeAuth((nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
  }, []);

  const value = useMemo(() => ({ user, initializing }), [user, initializing]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
