import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RoleRoute({ allowRoles, children }) {
  const { user } = useAuth();

  // Chưa login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Không có role hợp lệ
  const hasPermission = user.roles?.some(role =>
    allowRoles.includes(role)
  );

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  return children;
}
