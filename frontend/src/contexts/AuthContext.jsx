import { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    const normalizedUser = {
      ...userData,
      role: userData.roles?.[0] || "CUSTOMER",
    };

    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));

    // Lưu JWT token để các API có thể dùng Bearer auth
    if (userData.token) {
      localStorage.setItem("accessToken", userData.token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
  };

  const hasRole = (role) => {
    return user?.roles?.includes(role);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
