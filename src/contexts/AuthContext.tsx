import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../services/api";
import type { LoggedInUser, LoginRequest, AuthStatus, InitialSetupResponse } from "../types";

interface AuthContextType {
  user: LoggedInUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; message: string; isFirstLogin?: boolean }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  companyId: string | null;
  needsInitialSetup: boolean;
  initialSetupData: InitialSetupResponse | null;
  completeSetup: () => void;
  isFirstLogin: boolean;
  completeFirstLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [initialSetupData, setInitialSetupData] = useState<InitialSetupResponse | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const checkAuth = async () => {
    try {
      // First check if initial setup is needed
      const setupStatus = await api.auth.checkInitialSetup();
      if (setupStatus.needs_setup) {
        setNeedsInitialSetup(true);
        setInitialSetupData(setupStatus);
        setIsLoading(false);
        return;
      }

      const status: AuthStatus = await api.auth.checkAuth();
      if (status.is_authenticated && status.user) {
        setUser(status.user);
        setCompanyId(status.user.company_id);
        setIsFirstLogin(status.user.is_first_login);
      } else {
        setUser(null);
        setCompanyId(null);
        setIsFirstLogin(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setCompanyId(null);
      setIsFirstLogin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; message: string; isFirstLogin?: boolean }> => {
    try {
      const response = await api.auth.login(credentials);
      if (response.success && response.user) {
        setUser(response.user);
        setCompanyId(response.user.company_id);
        setIsFirstLogin(response.user.is_first_login);
        return { success: true, message: response.message, isFirstLogin: response.user.is_first_login };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Erreur de connexion" };
    }
  };

  const completeSetup = () => {
    setNeedsInitialSetup(false);
    setInitialSetupData(null);
    checkAuth();
  };

  const completeFirstLogin = () => {
    setIsFirstLogin(false);
    if (user) {
      const updatedUser = { ...user, is_first_login: false };
      setUser(updatedUser);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
      setUser(null);
      setCompanyId(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
        companyId,
        needsInitialSetup,
        initialSetupData,
        completeSetup,
        isFirstLogin,
        completeFirstLogin,
      }}
    >
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
