import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");

    if (storedUser && !token) {
      localStorage.removeItem("user");
      setUser(null);
    } else if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = useCallback((userData) => {
    const normalizedUser = {
      ...userData,
      role: Array.isArray(userData.roles) ? userData.roles[0] || "CUSTOMER" : "CUSTOMER",
    };

    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));

    if (userData.token) {
      localStorage.setItem("accessToken", userData.token);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
