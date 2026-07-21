import React, { createContext, useContext, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  customerToken: string | null;
  adminToken: string | null;
  setCustomerToken: (token: string | null) => void;
  setAdminToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure auth token getter ONCE at module load time, BEFORE any React rendering.
// This is the only reliable place to avoid race conditions with React query.
const getStoredToken = () => {
  return localStorage.getItem("bb_admin_token") || localStorage.getItem("bb_customer_token");
};
setAuthTokenGetter(getStoredToken);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customerToken, setCustomerTokenState] = useState<string | null>(() => {
    return localStorage.getItem("bb_customer_token");
  });

  const [adminToken, setAdminTokenState] = useState<string | null>(() => {
    return localStorage.getItem("bb_admin_token");
  });

  const setCustomerToken = (token: string | null) => {
    if (token) {
      localStorage.setItem("bb_customer_token", token);
    } else {
      localStorage.removeItem("bb_customer_token");
    }
    setCustomerTokenState(token);
    // Refresh token getter so subsequent requests pick up the new token
    setAuthTokenGetter(getStoredToken);
  };

  const setAdminToken = (token: string | null) => {
    if (token) {
      localStorage.setItem("bb_admin_token", token);
    } else {
      localStorage.removeItem("bb_admin_token");
    }
    setAdminTokenState(token);
    setAuthTokenGetter(getStoredToken);
  };

  return (
    <AuthContext.Provider value={{ customerToken, adminToken, setCustomerToken, setAdminToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
