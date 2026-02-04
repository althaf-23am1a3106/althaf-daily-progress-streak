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
    const token = sessionStorage.getItem('ownerToken');
    
    // Only restore owner mode if we have a valid token
    if (savedMode === 'owner' && token) {
      setModeState('owner');
    } else if (savedMode === 'viewer') {
      setModeState('viewer');
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
    setModeState(null);
    // Clear all session data on logout
    sessionStorage.clear();
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
