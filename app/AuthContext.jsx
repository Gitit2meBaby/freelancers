"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const checkAuth = () => {
      try {
        const storedIsUser = localStorage.getItem("isUser");
        const storedUser = localStorage.getItem("userData");

        if (storedIsUser === "true") {
          setIsLoggedIn(true);

          // Parse and set user data if available
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData) => {
    try {
      localStorage.setItem("isUser", "true");

      if (userData) {
        localStorage.setItem("userData", JSON.stringify(userData));
        setUser(userData);
      }

      setIsLoggedIn(true);
      localStorage.setItem("isLoggedIn", "true");
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("isUser");
      localStorage.removeItem("userData");
      localStorage.removeItem("isLoggedIn");
      setIsLoggedIn(false);
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const updateUser = (userData) => {
    try {
      localStorage.setItem("userData", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const value = {
    isLoggedIn,
    user,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
