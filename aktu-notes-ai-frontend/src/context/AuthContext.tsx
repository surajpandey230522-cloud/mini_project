"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  api,
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
} from "@/lib/api";
import { LoginPayload, RegisterPayload, User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const storedToken = getStoredAccessToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      setToken(storedToken);
      const userData = await api.users.getMe();
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch current user profile:", error);
      clearStoredTokens();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener("aktu:auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("aktu:auth-expired", handleAuthExpired);
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const resp = await api.auth.login(payload);
      setStoredTokens(resp.access_token, resp.refresh_token);
      setToken(resp.access_token);
      setUser(resp.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const resp = await api.auth.register(payload);
      setStoredTokens(resp.access_token, resp.refresh_token);
      setToken(resp.access_token);
      setUser(resp.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      await api.auth.logout(refreshToken || undefined);
    } catch (e) {
      console.warn("Logout notification error:", e);
    } finally {
      clearStoredTokens();
      setUser(null);
      setToken(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await api.users.getMe();
      setUser(userData);
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  };

  const updateProfile = async (fullName: string) => {
    const updated = await api.users.updateMe({ full_name: fullName });
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

