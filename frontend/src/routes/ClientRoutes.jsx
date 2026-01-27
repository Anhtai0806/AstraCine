// routes/ClientRoutes.jsx
import { Route } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import ProfilePage from "../pages/Profile/ProfilePage";
import ProtectedRoute from "./ProtectedRoute";

export default function ClientRoutes() {
  return (
    <Route element={<ClientLayout />}>
      <Route index element={<Home />} />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route
        path="profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
    </Route>
  );
}
