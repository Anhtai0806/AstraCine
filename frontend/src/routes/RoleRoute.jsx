import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RoleRoute({ allowRoles, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
