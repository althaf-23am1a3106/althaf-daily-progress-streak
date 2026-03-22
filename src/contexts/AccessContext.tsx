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
    
    // Only restore owner mode if we have a valid, non-expired token
    if (savedMode === 'owner' && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token expired — clear and force re-login
          sessionStorage.removeItem('ownerToken');
          sessionStorage.removeItem('accessMode');
        } else {
          setModeState('owner');
        }
      } catch {
        sessionStorage.removeItem('ownerToken');
        sessionStorage.removeItem('accessMode');
      }
    } else if (savedMode === 'viewer') {
      setModeState('viewer');
    }
  }, []);

  // Proactive token expiry detection — check every 60s
  useEffect(() => {
    if (mode !== 'owner') return;
    const interval = setInterval(() => {
      const token = sessionStorage.getItem('ownerToken');
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          setModeState(null);
          sessionStorage.clear();
        }
      } catch {
        // ignore parse errors
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [mode]);

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
