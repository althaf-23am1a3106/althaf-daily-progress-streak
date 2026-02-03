import React, { createContext, useContext, useState, useEffect } from 'react';

type AccessMode = 'viewer' | 'owner' | null;

interface AccessContextType {
  mode: AccessMode;
  setMode: (mode: AccessMode) => void;
  isOwner: boolean;
  isViewer: boolean;
  logout: () => void;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AccessMode>(null);

  useEffect(() => {
    // Check for existing session
    const savedMode = sessionStorage.getItem('accessMode') as AccessMode;
    if (savedMode) {
      setModeState(savedMode);
    }
  }, []);

  const setMode = (newMode: AccessMode) => {
    setModeState(newMode);
    if (newMode) {
      sessionStorage.setItem('accessMode', newMode);
    } else {
      sessionStorage.removeItem('accessMode');
    }
  };

  const logout = () => {
    setMode(null);
    sessionStorage.removeItem('ownerAuthenticated');
  };

  return (
    <AccessContext.Provider
      value={{
        mode,
        setMode,
        isOwner: mode === 'owner',
        isViewer: mode === 'viewer',
        logout,
      }}
    >
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
}
