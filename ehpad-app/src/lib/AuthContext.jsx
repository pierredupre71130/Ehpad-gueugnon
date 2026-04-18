import React, { createContext, useContext } from 'react';

const AuthContext = createContext({
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  isAuthenticated: true,
  user: null,
});

export const AuthProvider = ({ children }) => (
  <AuthContext.Provider value={{
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    isAuthenticated: true,
    user: null,
    logout: () => {},
    navigateToLogin: () => {},
    checkAppState: () => {},
  }}>
    {children}
  </AuthContext.Provider>
);

export const useAuth = () => useContext(AuthContext);
