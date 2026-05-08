"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface AuthCtx {
  ready: boolean;
}

const AuthContext = createContext<AuthCtx>({ ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <AuthContext.Provider value={{ ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
